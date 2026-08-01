/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { extractNutrition } from "@/lib/nutrition"
import { generateObject } from "ai"
import { getModel } from "@/lib/ai"
import {
	assertCanUseAiLog,
	resolveApiKeyForUser,
	recordAiUsage,
	recordByokSuccess,
	recordByokFailure,
} from "@/lib/entitlements"
import { assertByokRateLimit } from "@/lib/byok-rate-limit"

// Mock the AI SDK
vi.mock("ai", () => ({
	generateObject: vi.fn(),
}))

// Mock the AI model getter
vi.mock("@/lib/ai", () => ({
	MODEL_ID: "gemini-2.5-flash",
	getModel: vi.fn(),
}))

// Mock entitlements library
vi.mock("@/lib/entitlements", () => {
	class MockEntitlementError extends Error {
		code: string
		userMessage: string
		constructor(code: string, userMessage: string) {
			super(`${code}: ${userMessage}`)
			this.name = "EntitlementError"
			this.code = code
			this.userMessage = userMessage
		}
	}

	return {
		assertCanUseAiLog: vi.fn(),
		resolveApiKeyForUser: vi.fn(),
		recordAiUsage: vi.fn(),
		recordByokSuccess: vi.fn(),
		recordByokFailure: vi.fn(),
		EntitlementError: MockEntitlementError,
	}
})

// Mock BYOK rate limit library
vi.mock("@/lib/byok-rate-limit", () => {
	class MockByokRateLimitError extends Error {
		constructor(message: string, _retryAfter: number) {
			super(message)
			this.name = "ByokRateLimitError"
		}
	}

	return {
		assertByokRateLimit: vi.fn(),
		ByokRateLimitError: MockByokRateLimitError,
	}
})

describe("extractNutrition - BYOK and billing paths", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("byok user -> user key used, recordByokSuccess called, estimated_cost_micros = 0", async () => {
		// 1. Setup mocks
		vi.mocked(resolveApiKeyForUser).mockResolvedValue({
			apiKey: "user-decrypted-key",
			keyOwner: "user",
		})
		vi.mocked(assertCanUseAiLog).mockResolvedValue({} as any)
		vi.mocked(generateObject).mockResolvedValue({
			object: { meals: [] },
			usage: { inputTokens: 10, outputTokens: 20 },
		} as any)
		vi.mocked(getModel).mockReturnValue("mocked-user-model" as any)

		// 2. Call function
		const result = await extractNutrition("ate eggs", "user-1", "req-1", "web")

		// 3. Assertions
		expect(assertCanUseAiLog).toHaveBeenCalledWith("user-1")
		expect(resolveApiKeyForUser).toHaveBeenCalledWith("user-1")
		expect(assertByokRateLimit).toHaveBeenCalledWith("user-1")
		expect(getModel).toHaveBeenCalledWith("user-decrypted-key")
		expect(generateObject).toHaveBeenCalled()

		expect(recordAiUsage).toHaveBeenCalledWith("user-1", {
			requestId: "req-1",
			source: "web",
			model: "gemini-2.5-flash",
			inputTokens: 10,
			outputTokens: 20,
			success: true,
			keyOwner: "user",
		})
		expect(recordByokSuccess).toHaveBeenCalledWith("user-1")
		expect(result).toEqual({ meals: [] })
	})

	it("trial user -> platform key used, real cost recorded, keyOwner = 'platform'", async () => {
		// 1. Setup mocks
		vi.mocked(resolveApiKeyForUser).mockResolvedValue({
			apiKey: null,
			keyOwner: "platform",
		})
		vi.mocked(assertCanUseAiLog).mockResolvedValue({} as any)
		vi.mocked(generateObject).mockResolvedValue({
			object: { meals: [] },
			usage: { inputTokens: 15, outputTokens: 25 },
		} as any)
		vi.mocked(getModel).mockReturnValue("mocked-platform-model" as any)

		// 2. Call function
		const result = await extractNutrition("ate toast", "user-2", "req-2", "telegram")

		// 3. Assertions
		expect(assertCanUseAiLog).toHaveBeenCalledWith("user-2")
		expect(resolveApiKeyForUser).toHaveBeenCalledWith("user-2")
		expect(assertByokRateLimit).not.toHaveBeenCalled()
		expect(getModel).toHaveBeenCalledWith(null)
		expect(generateObject).toHaveBeenCalled()

		expect(recordAiUsage).toHaveBeenCalledWith("user-2", {
			requestId: "req-2",
			source: "telegram",
			model: "gemini-2.5-flash",
			inputTokens: 15,
			outputTokens: 25,
			success: true,
			keyOwner: "platform",
		})
		expect(recordByokSuccess).not.toHaveBeenCalled()
		expect(result).toEqual({ meals: [] })
	})

	it("provider returns 401/403 for a byok user -> recordByokFailure called, EntitlementError 'byok_key_invalid' thrown, and NO retry on the platform key", async () => {
		// 1. Setup mocks
		vi.mocked(resolveApiKeyForUser).mockResolvedValue({
			apiKey: "bad-user-key",
			keyOwner: "user",
		})
		vi.mocked(assertCanUseAiLog).mockResolvedValue({} as any)

		const providerError = new Error("Invalid API key")
		Object.assign(providerError, { statusCode: 401 })
		vi.mocked(generateObject).mockRejectedValue(providerError)
		vi.mocked(getModel).mockReturnValue("mocked-bad-model" as any)

		// 2. Call function & expect throw
		await expect(extractNutrition("ate rice", "user-3", "req-3", "web")).rejects.toThrow(
			/byok_key_invalid/
		)

		// 3. Assertions
		expect(assertCanUseAiLog).toHaveBeenCalledWith("user-3")
		expect(resolveApiKeyForUser).toHaveBeenCalledWith("user-3")
		expect(getModel).toHaveBeenCalledTimes(1)
		expect(getModel).toHaveBeenCalledWith("bad-user-key") // only the bad key, never null
		expect(recordByokFailure).toHaveBeenCalledWith("user-3")
		expect(recordAiUsage).not.toHaveBeenCalled() // bypassed for auth-like provider errors on user keys
	})

	it("BYOK_ENCRYPTION_KEY rotated so decryption throws -> byok_key_invalid, not a 500", async () => {
		// 1. Setup mocks
		vi.mocked(resolveApiKeyForUser).mockRejectedValue(new Error("Decryption failed: bad key"))
		vi.mocked(assertCanUseAiLog).mockResolvedValue({} as any)

		// 2. Call function & expect throw
		await expect(extractNutrition("ate salad", "user-4", "req-4", "web")).rejects.toThrow(
			/byok_key_invalid/
		)

		// 3. Assertions
		expect(assertCanUseAiLog).toHaveBeenCalledWith("user-4")
		expect(resolveApiKeyForUser).toHaveBeenCalledWith("user-4")
		expect(getModel).not.toHaveBeenCalled()
		expect(generateObject).not.toHaveBeenCalled()
		expect(recordByokFailure).not.toHaveBeenCalled()
		expect(recordAiUsage).not.toHaveBeenCalled()
	})

	it("byok user over the rate limit -> byok_rate_limited, and NO usage_event row written", async () => {
		// 1. Setup mocks
		vi.mocked(resolveApiKeyForUser).mockResolvedValue({
			apiKey: "user-key",
			keyOwner: "user",
		})
		vi.mocked(assertCanUseAiLog).mockResolvedValue({} as any)

		const { ByokRateLimitError } = await import("@/lib/byok-rate-limit")
		vi.mocked(assertByokRateLimit).mockRejectedValue(new ByokRateLimitError("Rate limited", 60))

		// 2. Call function & expect throw
		await expect(extractNutrition("ate soup", "user-5", "req-5", "web")).rejects.toThrow(
			"Rate limited"
		)

		// 3. Assertions
		expect(assertCanUseAiLog).toHaveBeenCalledWith("user-5")
		expect(resolveApiKeyForUser).toHaveBeenCalledWith("user-5")
		expect(assertByokRateLimit).toHaveBeenCalledWith("user-5")
		expect(getModel).not.toHaveBeenCalled()
		expect(generateObject).not.toHaveBeenCalled()
		expect(recordAiUsage).not.toHaveBeenCalled()
		expect(recordByokFailure).not.toHaveBeenCalled()
		expect(recordByokSuccess).not.toHaveBeenCalled()
	})
})
