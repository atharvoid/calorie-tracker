import { describe, it, expect, vi, beforeEach } from "vitest"
import { POST as checkoutHandler } from "@/app/api/billing/checkout/route"
import { dodo } from "@/lib/dodo"
import { auth } from "@/auth"
import { NextRequest } from "next/server"

vi.mock("@/auth", () => ({
	auth: vi.fn(),
}))

vi.mock("@/lib/dodo", () => {
	return {
		dodo: {
			checkoutSessions: {
				create: vi.fn(),
			},
		},
	}
})

describe("POST /api/billing/checkout", () => {
	beforeEach(() => {
		vi.resetAllMocks()
	})

	function createRequest(body: any): NextRequest {
		return new NextRequest("http://localhost/api/billing/checkout", {
			method: "POST",
			headers: {
				"content-type": "application/json",
			},
			body: JSON.stringify(body),
		})
	}

	it("returns 401 if unauthenticated", async () => {
		vi.mocked(auth as any).mockResolvedValueOnce(null)
		const req = createRequest({ plan: "monthly" })
		const res = await checkoutHandler(req)
		expect(res.status).toBe(401)
		const json = await res.json()
		expect(json.error).toBe("Unauthorized")
	})

	it("rejects annual plan selection", async () => {
		vi.mocked(auth as any).mockResolvedValueOnce({
			user: { id: "user-1", email: "user@example.com" },
		})
		const req = createRequest({ plan: "annual" })
		const res = await checkoutHandler(req)
		expect(res.status).toBe(400)
		const json = await res.json()
		expect(json.error).toBe("Invalid plan selection")
	})

	it("accepts monthly plan and creates checkout session", async () => {
		vi.mocked(auth as any).mockResolvedValueOnce({
			user: { id: "user-1", email: "user@example.com", name: "John Doe" },
		})
		vi.mocked(dodo.checkoutSessions.create).mockResolvedValueOnce({
			checkout_url: "https://test.dodo.payments/checkout/123",
		} as any)

		const req = createRequest({ plan: "monthly" })
		const res = await checkoutHandler(req)
		expect(res.status).toBe(200)
		const json = await res.json()
		expect(json.url).toBe("https://test.dodo.payments/checkout/123")

		expect(dodo.checkoutSessions.create).toHaveBeenCalledWith({
			product_cart: [{ product_id: "p_monthly_placeholder", quantity: 1 }],
			customer: {
				email: "user@example.com",
				name: "John Doe",
			},
			metadata: { userId: "user-1" },
			return_url: "http://localhost:3000/?tab=settings&checkout=success",
			cancel_url: "http://localhost:3000/?tab=settings&checkout=cancel",
		})
	})
})
