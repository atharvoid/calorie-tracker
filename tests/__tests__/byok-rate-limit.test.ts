import { describe, it, expect } from "vitest"
import {
	BYOK_RATE_WINDOW_SECONDS,
	ByokRateLimitError,
	DEFAULT_BYOK_RATE_LIMIT_PER_MINUTE,
	byokRateLimitMessage,
	byokRateLimitPerMinute,
	evaluateByokRateLimit,
	windowStart,
} from "@/lib/byok-rate-limit"

// The policy is deliberately split from the database query so it can be tested
// exhaustively without a Postgres connection. assertByokRateLimit itself is a
// thin wrapper: one indexed count plus evaluateByokRateLimit.

describe("byokRateLimitPerMinute", () => {
	it("defaults to 10 when the variable is unset", () => {
		expect(byokRateLimitPerMinute(undefined)).toBe(DEFAULT_BYOK_RATE_LIMIT_PER_MINUTE)
		expect(DEFAULT_BYOK_RATE_LIMIT_PER_MINUTE).toBe(10)
	})

	it("defaults when the variable is blank or whitespace", () => {
		expect(byokRateLimitPerMinute("")).toBe(10)
		expect(byokRateLimitPerMinute("   ")).toBe(10)
	})

	it("reads a valid integer", () => {
		expect(byokRateLimitPerMinute("1")).toBe(1)
		expect(byokRateLimitPerMinute("60")).toBe(60)
		expect(byokRateLimitPerMinute("1000")).toBe(1000)
	})

	it("tolerates surrounding whitespace", () => {
		expect(byokRateLimitPerMinute("  25  ")).toBe(25)
	})

	it("honours 0 as a deliberate kill switch rather than treating it as unset", () => {
		// This matters: 0 must not silently become the default, or an operator
		// trying to stop BYOK traffic would still be serving 10 requests a minute.
		expect(byokRateLimitPerMinute("0")).toBe(0)
	})

	it("rejects exponent notation instead of quietly inflating the limit", () => {
		// Number("1e3") is 1000. Accepting that would turn a fat-fingered value
		// into a 100x higher limit, which is the most dangerous direction to fail
		// in, so it must fall back to the default instead.
		expect(byokRateLimitPerMinute("1e3")).toBe(DEFAULT_BYOK_RATE_LIMIT_PER_MINUTE)
	})

	it.each(["abc", "10.5", "-1", "1e3", "NaN", "ten", "10abc", "0x10", "+5", "Infinity"])(
		"falls back to the default for unparseable value %s",
		(raw) => {
			expect(byokRateLimitPerMinute(raw)).toBe(DEFAULT_BYOK_RATE_LIMIT_PER_MINUTE)
		}
	)

	it("reads process.env when no argument is given", () => {
		const previous = process.env.BYOK_RATE_LIMIT_PER_MINUTE
		try {
			process.env.BYOK_RATE_LIMIT_PER_MINUTE = "3"
			expect(byokRateLimitPerMinute()).toBe(3)
			delete process.env.BYOK_RATE_LIMIT_PER_MINUTE
			expect(byokRateLimitPerMinute()).toBe(10)
		} finally {
			if (previous === undefined) delete process.env.BYOK_RATE_LIMIT_PER_MINUTE
			else process.env.BYOK_RATE_LIMIT_PER_MINUTE = previous
		}
	})
})

describe("evaluateByokRateLimit", () => {
	it("allows a first request", () => {
		expect(evaluateByokRateLimit({ recentCallCount: 0, limit: 10 })).toEqual({
			allowed: true,
			remaining: 10,
		})
	})

	it("allows the request that exactly reaches the limit", () => {
		// 9 already made, limit 10 => this one is the tenth and must pass.
		expect(evaluateByokRateLimit({ recentCallCount: 9, limit: 10 })).toEqual({
			allowed: true,
			remaining: 1,
		})
	})

	it("blocks the request after the limit is reached", () => {
		expect(evaluateByokRateLimit({ recentCallCount: 10, limit: 10 })).toEqual({
			allowed: false,
			remaining: 0,
		})
	})

	it("never reports negative remaining when the count overshoots", () => {
		// Concurrent requests can both pass the check before either writes a row,
		// so the stored count can exceed the limit. Remaining must clamp at 0.
		expect(evaluateByokRateLimit({ recentCallCount: 25, limit: 10 })).toEqual({
			allowed: false,
			remaining: 0,
		})
	})

	it("blocks everything when the limit is 0", () => {
		expect(evaluateByokRateLimit({ recentCallCount: 0, limit: 0 })).toEqual({
			allowed: false,
			remaining: 0,
		})
	})

	it("allows a single request when the limit is 1", () => {
		expect(evaluateByokRateLimit({ recentCallCount: 0, limit: 1 }).allowed).toBe(true)
		expect(evaluateByokRateLimit({ recentCallCount: 1, limit: 1 }).allowed).toBe(false)
	})
})

describe("windowStart", () => {
	it("is exactly one minute behind the given time", () => {
		const now = new Date("2026-07-31T12:00:00.000Z")
		expect(windowStart(now).toISOString()).toBe("2026-07-31T11:59:00.000Z")
		expect(BYOK_RATE_WINDOW_SECONDS).toBe(60)
	})

	it("is a sliding window, not a calendar minute", () => {
		// A fixed calendar minute would let a user send 2x the limit across a
		// boundary. Two calls 30s apart must land in the same window.
		const now = new Date("2026-07-31T12:00:30.000Z")
		expect(windowStart(now).toISOString()).toBe("2026-07-31T11:59:30.000Z")
	})

	it("does not mutate the date it is given", () => {
		const now = new Date("2026-07-31T12:00:00.000Z")
		windowStart(now)
		expect(now.toISOString()).toBe("2026-07-31T12:00:00.000Z")
	})
})

describe("byokRateLimitMessage", () => {
	it("names the limit and pluralises correctly", () => {
		expect(byokRateLimitMessage(10)).toContain("10 AI requests per minute")
		expect(byokRateLimitMessage(1)).toContain("1 AI request per minute")
	})

	it("makes clear the user's own quota is not the problem", () => {
		// Users paying Google directly will otherwise assume their key is broken.
		expect(byokRateLimitMessage(10).toLowerCase()).toContain(
			"your own api key still has its full quota"
		)
	})

	it("tells the user the situation resolves on its own", () => {
		expect(byokRateLimitMessage(10).toLowerCase()).toContain("try again")
	})
})

describe("ByokRateLimitError", () => {
	it("carries the code the API and bot branch on", () => {
		const error = new ByokRateLimitError("slow down", 60)
		expect(error.code).toBe("byok_rate_limited")
		expect(error.name).toBe("ByokRateLimitError")
		expect(error.userMessage).toBe("slow down")
		expect(error.retryAfterSeconds).toBe(60)
	})

	it("is a real Error so existing catch blocks keep working", () => {
		const error = new ByokRateLimitError("slow down", 60)
		expect(error).toBeInstanceOf(Error)
		expect(error.message).toBe("slow down")
	})
})
