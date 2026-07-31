import { and, count, eq, gte } from "drizzle-orm"
import { db } from "@/db"
import { usageEvents } from "@/db/schema"

/**
 * Fair-use throttle for BYOK users (issue #10, task B-12).
 *
 * A user-owned key costs the platform nothing per call, so this is not about
 * cost. It is about the shared surfaces around the call: database connections,
 * serverless concurrency, and the Telegram webhook budget. A runaway script
 * pointed at /api/nutrition/extract would degrade the service for everyone
 * else even though the AI spend lands on someone else's Google bill.
 *
 * Counting is done against `usage_event` rather than an in-memory map. The app
 * runs on serverless instances, so a per-instance counter would let the real
 * rate scale with however many instances happen to be warm — which is the
 * opposite of a limit. `usage_event` already records every call with a
 * timestamp and an index on (user_id, created_at), so the count is one indexed
 * query and is correct across every instance.
 *
 * Note the deliberate consequence: a *failed* call still counts, because
 * `recordAiUsage` writes a row either way. Someone hammering the endpoint with
 * broken input cannot use those failures to reset their own budget.
 */

export const DEFAULT_BYOK_RATE_LIMIT_PER_MINUTE = 10
export const BYOK_RATE_WINDOW_SECONDS = 60

export class ByokRateLimitError extends Error {
	readonly code = "byok_rate_limited" as const
	readonly userMessage: string
	readonly retryAfterSeconds: number

	constructor(userMessage: string, retryAfterSeconds: number) {
		super(userMessage)
		this.name = "ByokRateLimitError"
		this.userMessage = userMessage
		this.retryAfterSeconds = retryAfterSeconds
	}
}

/**
 * Reads BYOK_RATE_LIMIT_PER_MINUTE.
 *
 * Falls back to the default on anything unparseable rather than throwing: a
 * malformed limit should not take meal logging down, and the default is the
 * safe direction to fail in. `0` is honoured as "no BYOK calls allowed", which
 * is a legitimate kill switch.
 *
 * Only plain digits are accepted. `Number()` alone would happily turn "1e3"
 * into 1000, so a fat-fingered value could silently raise the limit a hundred
 * fold instead of falling back to the safe default.
 */
export function byokRateLimitPerMinute(
	raw: string | undefined = process.env.BYOK_RATE_LIMIT_PER_MINUTE
): number {
	if (raw === undefined) return DEFAULT_BYOK_RATE_LIMIT_PER_MINUTE
	const trimmed = raw.trim()
	if (!/^\d+$/.test(trimmed)) return DEFAULT_BYOK_RATE_LIMIT_PER_MINUTE
	const parsed = Number(trimmed)
	if (!Number.isSafeInteger(parsed)) return DEFAULT_BYOK_RATE_LIMIT_PER_MINUTE
	return parsed
}

/**
 * Pure decision function, separated from the query so the policy can be tested
 * without a database.
 */
export function evaluateByokRateLimit(args: { recentCallCount: number; limit: number }): {
	allowed: boolean
	remaining: number
} {
	const { recentCallCount, limit } = args
	const allowed = recentCallCount < limit
	return { allowed, remaining: Math.max(0, limit - recentCallCount) }
}

export function byokRateLimitMessage(limit: number): string {
	return (
		`You've hit the fair-use limit of ${limit} AI request${limit === 1 ? "" : "s"} per minute. ` +
		`Your own API key still has its full quota — this limit protects the shared service. ` +
		`Please wait a moment and try again.`
	)
}

export function windowStart(now: Date = new Date()): Date {
	return new Date(now.getTime() - BYOK_RATE_WINDOW_SECONDS * 1000)
}

/**
 * Throws ByokRateLimitError when a BYOK user has exceeded the per-minute
 * allowance. Only call this for keyOwner === "user"; platform-key users are
 * already bounded by their trial or daily entitlement caps.
 */
export async function assertByokRateLimit(userId: string, now: Date = new Date()): Promise<void> {
	const limit = byokRateLimitPerMinute()

	const [row] = await db
		.select({ value: count() })
		.from(usageEvents)
		.where(
			and(
				eq(usageEvents.userId, userId),
				eq(usageEvents.keyOwner, "user"),
				gte(usageEvents.createdAt, windowStart(now))
			)
		)

	const { allowed } = evaluateByokRateLimit({ recentCallCount: row?.value ?? 0, limit })
	if (!allowed) {
		throw new ByokRateLimitError(byokRateLimitMessage(limit), BYOK_RATE_WINDOW_SECONDS)
	}
}
