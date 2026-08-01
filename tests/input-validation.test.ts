import { describe, it, expect, vi } from "vitest"
import { GET as getAnalytics } from "@/app/api/nutrition/analytics/route"
import { GET as getDay, POST as postDay } from "@/app/api/nutrition/day/route"
import {
	GET as getOverride,
	PUT as putOverride,
	DELETE as deleteOverride,
} from "@/app/api/nutrition/day-override/route"
import { POST as postExtract } from "@/app/api/nutrition/extract/route"
import { GET as getHistory } from "@/app/api/nutrition/history/route"
import { PATCH as patchItem, DELETE as deleteItem } from "@/app/api/nutrition/items/[id]/route"
import { PUT as putSettings } from "@/app/api/nutrition/settings/route"
import { POST as postTelegram } from "@/app/api/telegram/route"
import { NextRequest } from "next/server"

// Mock the session auth
vi.mock("@/auth", () => ({
	auth: vi.fn().mockResolvedValue({
		user: {
			id: "user-1",
			email: "user@example.com",
		},
	}),
}))

describe("Input Validation and Body Size Caps", () => {
	// Helper to create NextRequest with JSON body
	function createRequest(
		url: string,
		method: string,
		body?: unknown,
		headers?: Record<string, string>
	): NextRequest {
		return new NextRequest(url, {
			method,
			headers: {
				"content-type": "application/json",
				...headers,
			},
			body: body ? JSON.stringify(body) : undefined,
		})
	}

	// Helper to create Request with oversized raw string
	function createOversizedRequest(
		url: string,
		method: string,
		sizeBytes: number,
		headers?: Record<string, string>
	): NextRequest {
		const raw = "x".repeat(sizeBytes)
		return new NextRequest(url, {
			method,
			headers: {
				"content-type": "application/json",
				...headers,
			},
			body: raw,
		})
	}

	describe("GET /api/nutrition/analytics", () => {
		it("rejects invalid range", async () => {
			const req = createRequest("http://localhost/api/nutrition/analytics?range=invalid", "GET")
			const res = await getAnalytics(req)
			expect(res.status).toBe(400)
			const json = await res.json()
			expect(json.error.code).toBe("INVALID_QUERY")
		})

		it("rejects invalid custom dates", async () => {
			const req = createRequest(
				"http://localhost/api/nutrition/analytics?range=custom&start=2026-13-40",
				"GET"
			)
			const res = await getAnalytics(req)
			expect(res.status).toBe(400)
		})
	})

	describe("GET /api/nutrition/day", () => {
		it("rejects invalid date format", async () => {
			const req = createRequest("http://localhost/api/nutrition/day?date=2026-12", "GET")
			const res = await getDay(req)
			expect(res.status).toBe(400)
			const json = await res.json()
			expect(json.error.code).toBe("INVALID_QUERY")
		})
	})

	describe("POST /api/nutrition/day", () => {
		it("rejects oversized body > 64KB", async () => {
			const req = createOversizedRequest("http://localhost/api/nutrition/day", "POST", 70000)
			const res = await postDay(req)
			expect(res.status).toBe(400)
			const json = await res.json()
			expect(json.error.code).toBe("PAYLOAD_TOO_LARGE")
		})

		it("rejects invalid json", async () => {
			const req = new NextRequest("http://localhost/api/nutrition/day", {
				method: "POST",
				body: "not-json",
			})
			const res = await postDay(req)
			expect(res.status).toBe(400)
			const json = await res.json()
			expect(json.error.code).toBe("INVALID_JSON")
		})

		it("rejects invalid date", async () => {
			const req = createRequest("http://localhost/api/nutrition/day", "POST", {
				logDate: "2026-07-35",
				nutrition: { meals: [] },
			})
			const res = await postDay(req)
			expect(res.status).toBe(422)
			const json = await res.json()
			expect(json.error.code).toBe("VALIDATION_ERROR")
		})
	})

	describe("GET /api/nutrition/day-override", () => {
		it("rejects invalid date format", async () => {
			const req = createRequest(
				"http://localhost/api/nutrition/day-override?date=2026-07-35",
				"GET"
			)
			const res = await getOverride(req)
			expect(res.status).toBe(400)
		})
	})

	describe("PUT /api/nutrition/day-override", () => {
		it("rejects oversized body > 4KB", async () => {
			const req = createOversizedRequest("http://localhost/api/nutrition/day-override", "PUT", 5000)
			const res = await putOverride(req)
			expect(res.status).toBe(400)
			const json = await res.json()
			expect(json.error.code).toBe("PAYLOAD_TOO_LARGE")
		})

		it("rejects invalid data constraints", async () => {
			const req = createRequest("http://localhost/api/nutrition/day-override", "PUT", {
				date: "2026-07-01",
				maintenanceKcal: 50, // min is 800
			})
			const res = await putOverride(req)
			expect(res.status).toBe(422)
		})
	})

	describe("DELETE /api/nutrition/day-override", () => {
		it("rejects invalid date", async () => {
			const req = createRequest(
				"http://localhost/api/nutrition/day-override?date=invalid",
				"DELETE"
			)
			const res = await deleteOverride(req)
			expect(res.status).toBe(400)
		})
	})

	describe("POST /api/nutrition/extract", () => {
		it("rejects oversized body > 8KB", async () => {
			const req = createOversizedRequest("http://localhost/api/nutrition/extract", "POST", 9000)
			const res = await postExtract(req)
			expect(res.status).toBe(400)
			const json = await res.json()
			expect(json.error.code).toBe("PAYLOAD_TOO_LARGE")
		})

		it("rejects empty text", async () => {
			const req = createRequest("http://localhost/api/nutrition/extract", "POST", {
				text: "",
				logDate: "2026-07-01",
			})
			const res = await postExtract(req)
			expect(res.status).toBe(422)
		})

		it("rejects oversized text > 2000 chars", async () => {
			const req = createRequest("http://localhost/api/nutrition/extract", "POST", {
				text: "x".repeat(2001),
				logDate: "2026-07-01",
			})
			const res = await postExtract(req)
			expect(res.status).toBe(422)
		})
	})

	describe("GET /api/nutrition/history", () => {
		it("rejects invalid start date", async () => {
			const req = createRequest(
				"http://localhost/api/nutrition/history?start=invalid&end=2026-07-02",
				"GET"
			)
			const res = await getHistory(req)
			expect(res.status).toBe(400)
		})

		it("rejects end before start", async () => {
			const req = createRequest(
				"http://localhost/api/nutrition/history?start=2026-07-05&end=2026-07-02",
				"GET"
			)
			const res = await getHistory(req)
			expect(res.status).toBe(400)
			const json = await res.json()
			expect(json.error.code).toBe("INVALID_RANGE")
		})
	})

	describe("PATCH /api/nutrition/items/[id]", () => {
		const ctx = { params: Promise.resolve({ id: "invalid-uuid" }) }

		it("rejects invalid non-UUID path parameter", async () => {
			const req = createRequest("http://localhost/api/nutrition/items/invalid-uuid", "PATCH", {
				name: "Apple",
			})
			const res = await patchItem(req, ctx)
			expect(res.status).toBe(400)
			const json = await res.json()
			expect(json.error.code).toBe("INVALID_PARAMS")
		})

		it("rejects oversized body > 4KB", async () => {
			const validCtx = { params: Promise.resolve({ id: "3f336683-11a5-4927-aa8f-37617cfa1590" }) }
			const req = createOversizedRequest(
				"http://localhost/api/nutrition/items/3f336683-11a5-4927-aa8f-37617cfa1590",
				"PATCH",
				5000
			)
			const res = await patchItem(req, validCtx)
			expect(res.status).toBe(400)
		})
	})

	describe("DELETE /api/nutrition/items/[id]", () => {
		const ctx = { params: Promise.resolve({ id: "invalid-uuid" }) }

		it("rejects invalid non-UUID path parameter", async () => {
			const req = createRequest("http://localhost/api/nutrition/items/invalid-uuid", "DELETE")
			const res = await deleteItem(req, ctx)
			expect(res.status).toBe(400)
		})
	})

	describe("PUT /api/nutrition/settings", () => {
		it("rejects oversized body > 4KB", async () => {
			const req = createOversizedRequest("http://localhost/api/nutrition/settings", "PUT", 5000)
			const res = await putSettings(req)
			expect(res.status).toBe(400)
		})

		it("rejects invalid timezone", async () => {
			const req = createRequest("http://localhost/api/nutrition/settings", "PUT", {
				timezone: "Invalid/Timezone",
				targetKcal: 2000,
			})
			const res = await putSettings(req)
			expect(res.status).toBe(422)
		})
	})

	describe("POST /api/telegram", () => {
		const secret = "tg-secret"

		it("rejects oversized webhook payload > 64KB", async () => {
			process.env.TELEGRAM_WEBHOOK_SECRET = secret
			const req = createOversizedRequest("http://localhost/api/telegram", "POST", 70000, {
				"X-Telegram-Bot-Api-Secret-Token": secret,
			})
			const res = await postTelegram(req)
			expect(res.status).toBe(400)
			const json = await res.json()
			expect(json.error.code).toBe("PAYLOAD_TOO_LARGE")
		})

		it("rejects malformed update payload", async () => {
			process.env.TELEGRAM_WEBHOOK_SECRET = secret
			const req = createRequest(
				"http://localhost/api/telegram",
				"POST",
				{ message: "hello" }, // no update_id
				{ "X-Telegram-Bot-Api-Secret-Token": secret }
			)
			const res = await postTelegram(req)
			expect(res.status).toBe(422)
		})
	})
})
