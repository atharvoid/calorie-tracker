import { describe, expect, it, vi } from "vitest"
import { logger } from "@/lib/logger"

describe("logger error serialization", () => {
	it("serializes top-level and nested Error objects with message, name, and stack", () => {
		const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

		const err = new Error("Decryption failed: bad key")
		logger.error("[nutrition] failed to resolve BYOK key", { error: err, userId: "user-123" })

		expect(consoleSpy).toHaveBeenCalledOnce()
		const rawLog = consoleSpy.mock.calls[0][0]
		const parsed = JSON.parse(rawLog)

		expect(parsed.level).toBe("error")
		expect(parsed.message).toBe("[nutrition] failed to resolve BYOK key")
		expect(parsed.userId).toBe("user-123")
		expect(parsed.error).toBeDefined()
		expect(parsed.error.name).toBe("Error")
		expect(parsed.error.message).toBe("Decryption failed: bad key")
		expect(parsed.error.stack).toBeTypeOf("string")

		consoleSpy.mockRestore()
	})
})
