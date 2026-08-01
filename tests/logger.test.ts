import { describe, expect, it, vi } from "vitest"
import { logger } from "@/lib/logger"
import { POST as cspReportHandler } from "@/app/api/csp-report/route"
import { NextRequest } from "next/server"

describe("logger hardening", () => {
	it("serializes top-level Error objects with message, name, and stack", () => {
		const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

		const err = new Error("Decryption failed: bad key")
		logger.error("[nutrition] failed to resolve BYOK key", { error: err, userId: "user-123" })

		expect(consoleSpy).toHaveBeenCalledOnce()
		const parsed = JSON.parse(consoleSpy.mock.calls[0][0])

		expect(parsed.level).toBe("error")
		expect(parsed.message).toBe("[nutrition] failed to resolve BYOK key")
		expect(parsed.userId).toBe("user-123")
		expect(parsed.error.name).toBe("Error")
		expect(parsed.error.message).toBe("Decryption failed: bad key")
		expect(parsed.error.stack).toBeTypeOf("string")

		consoleSpy.mockRestore()
	})

	it("serializes Error objects inside arrays", () => {
		const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

		const err1 = new Error("Batch item 1 failed")
		const err2 = new Error("Batch item 2 failed")
		logger.error("Batch operation partial failure", { errors: [err1, err2] })

		expect(consoleSpy).toHaveBeenCalledOnce()
		const parsed = JSON.parse(consoleSpy.mock.calls[0][0])

		expect(Array.isArray(parsed.errors)).toBe(true)
		expect(parsed.errors[0].name).toBe("Error")
		expect(parsed.errors[0].message).toBe("Batch item 1 failed")
		expect(parsed.errors[1].message).toBe("Batch item 2 failed")

		consoleSpy.mockRestore()
	})

	it("handles circular objects gracefully without throwing or crashing", () => {
		const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

		const circularObj: Record<string, unknown> = { name: "test" }
		circularObj.self = circularObj

		expect(() => {
			logger.error("Circular log test", { data: circularObj })
		}).not.toThrow()

		expect(consoleSpy).toHaveBeenCalledOnce()
		const parsed = JSON.parse(consoleSpy.mock.calls[0][0])
		expect(parsed.data.name).toBe("test")
		expect(parsed.data.self).toBe("[Circular]")

		consoleSpy.mockRestore()
	})

	it("never throws when logging fails and falls back safely", () => {
		const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

		// Object with getter that throws on access
		const throwingObj = {
			get fail() {
				throw new Error("Property getter crash")
			},
		}

		expect(() => {
			logger.error("Throwing object test", throwingObj as unknown as Record<string, unknown>)
		}).not.toThrow()

		expect(consoleSpy).toHaveBeenCalled()
		consoleSpy.mockRestore()
	})
})

describe("app/api/csp-report/route hardening", () => {
	it("rejects requests with unsupported content-type", async () => {
		const req = new NextRequest("http://localhost:3000/api/csp-report", {
			method: "POST",
			headers: { "content-type": "text/plain" },
			body: "hello",
		})
		const res = await cspReportHandler(req)
		expect(res.status).toBe(415)
	})

	it("rejects oversized payload (>16KB)", async () => {
		const largeBody = JSON.stringify({
			"csp-report": {
				"document-uri": "http://localhost",
				sample: "x".repeat(20000),
			},
		})
		const req = new NextRequest("http://localhost:3000/api/csp-report", {
			method: "POST",
			headers: { "content-type": "application/csp-report" },
			body: largeBody,
		})
		const res = await cspReportHandler(req)
		expect(res.status).toBe(400)
		const body = await res.json()
		expect(body.error.code).toBe("PAYLOAD_TOO_LARGE")
	})

	it("rejects malformed non-CSP JSON body", async () => {
		const req = new NextRequest("http://localhost:3000/api/csp-report", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ randomField: 12345 }),
		})
		const res = await cspReportHandler(req)
		expect(res.status).toBe(422)
	})

	it("accepts valid CSP report and returns 204 No Content", async () => {
		const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

		const validReport = {
			"csp-report": {
				"document-uri": "http://localhost:3000/",
				referrer: "",
				"blocked-uri": "http://evil.com/script.js",
				"violated-directive": "script-src",
			},
		}
		const req = new NextRequest("http://localhost:3000/api/csp-report", {
			method: "POST",
			headers: { "content-type": "application/csp-report" },
			body: JSON.stringify(validReport),
		})
		const res = await cspReportHandler(req)
		expect(res.status).toBe(204)
		expect(consoleSpy).toHaveBeenCalledOnce()

		consoleSpy.mockRestore()
	})
})
