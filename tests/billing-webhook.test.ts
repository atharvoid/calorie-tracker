/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { POST as webhookHandler } from "@/app/api/billing/webhook/route"
import { dodo } from "@/lib/dodo"
import { db } from "@/db"
import { NextRequest } from "next/server"
import { subscriptions } from "@/db/schema"

// Mock auth module
vi.mock("@/auth", () => ({
	auth: vi.fn(),
}))

// Mock Dodo SDK webhooks.unwrap
vi.mock("@/lib/dodo", () => {
	return {
		dodo: {
			webhooks: {
				unwrap: vi.fn(),
			},
		},
	}
})

// Mock the database client
vi.mock("@/db", () => {
	const chain: any = {
		select: vi.fn(),
		from: vi.fn(),
		where: vi.fn(),
		orderBy: vi.fn(),
		limit: vi.fn(),
		insert: vi.fn(),
		values: vi.fn(),
		onConflictDoNothing: vi.fn(),
		onConflictDoUpdate: vi.fn(),
		update: vi.fn(),
		set: vi.fn(),
		then: vi.fn(),
	}
	chain.select.mockReturnValue(chain)
	chain.from.mockReturnValue(chain)
	chain.where.mockReturnValue(chain)
	chain.orderBy.mockReturnValue(chain)
	chain.limit.mockReturnValue(chain)
	chain.insert.mockReturnValue(chain)
	chain.values.mockReturnValue(chain)
	chain.onConflictDoNothing.mockReturnValue(chain)
	chain.onConflictDoUpdate.mockReturnValue(chain)
	chain.update.mockReturnValue(chain)
	chain.set.mockReturnValue(chain)

	return {
		db: chain,
	}
})

describe("POST /api/billing/webhook", () => {
	beforeEach(() => {
		vi.resetAllMocks()

		// Re-initialize mock chain return values after resetAllMocks
		const dbMock = db as any
		dbMock.select.mockReturnValue(dbMock)
		dbMock.from.mockReturnValue(dbMock)
		dbMock.where.mockReturnValue(dbMock)
		dbMock.orderBy.mockReturnValue(dbMock)
		dbMock.limit.mockReturnValue(dbMock)
		dbMock.insert.mockReturnValue(dbMock)
		dbMock.values.mockReturnValue(dbMock)
		dbMock.onConflictDoNothing.mockReturnValue(dbMock)
		dbMock.onConflictDoUpdate.mockReturnValue(dbMock)
		dbMock.update.mockReturnValue(dbMock)
		dbMock.set.mockReturnValue(dbMock)

		process.env.DODO_PAYMENTS_WEBHOOK_KEY = "test_webhook_secret"
		process.env.DODO_PRODUCT_ANNUAL_ID = "p_annual_123"
	})

	function createRequest(headers: Record<string, string>, body: string): NextRequest {
		return new NextRequest("http://localhost/api/billing/webhook", {
			method: "POST",
			headers,
			body,
		})
	}

	it("returns 400 if headers or secret are missing", async () => {
		const req = createRequest({}, "{}")
		const res = await webhookHandler(req)
		expect(res.status).toBe(400)
		const json = await res.json()
		expect(json.error).toBe("Missing signature headers or secret key")
	})

	it("returns 400 if signature verification fails", async () => {
		vi.mocked(dodo.webhooks.unwrap).mockImplementationOnce(() => {
			throw new Error("Invalid signature")
		})

		const headers = {
			"webhook-signature": "invalid_sig",
			"webhook-id": "wh_123",
			"webhook-timestamp": "1234567890",
		}
		const req = createRequest(headers, "{}")
		const res = await webhookHandler(req)
		expect(res.status).toBe(400)
		const json = await res.json()
		expect(json.error).toBe("Invalid signature")
	})

	it("maps Dodo annual subscription to personal_annual and updates entitlement", async () => {
		const mockEvent = {
			type: "subscription.created",
			data: {
				subscription_id: "sub_annual_999",
				status: "active",
				currency: "USD",
				created_at: "2026-08-01T00:00:00Z",
				previous_billing_date: "2026-08-01T00:00:00Z",
				next_billing_date: "2027-08-01T00:00:00Z",
				cancel_at_next_billing_date: false,
				product_id: "p_annual_123", // Matches annualProductId
				metadata: { userId: "user-annual-1" },
				customer: {
					customer_id: "cust_annual_1",
					email: "annual@example.com",
					name: "Annual User",
				},
			},
		}

		vi.mocked(dodo.webhooks.unwrap).mockReturnValueOnce(mockEvent as any)

		// Stub DB queries for subscription upsert and entitlement check
		const dbMock = db as any
		dbMock.then.mockImplementationOnce((resolve: any) => resolve([])) // existing customer query (empty)
		dbMock.then.mockImplementationOnce((resolve: any) => resolve([])) // insert customer -> resolving
		dbMock.then.mockImplementationOnce((resolve: any) => resolve([])) // select existingSub (empty)
		dbMock.then.mockImplementationOnce((resolve: any) => resolve([])) // insert subscription
		dbMock.then.mockImplementationOnce((resolve: any) => resolve([])) // select productEntitlement (empty)
		dbMock.then.mockImplementationOnce((resolve: any) => resolve([])) // select latestSub for entitlement calculation
		dbMock.then.mockImplementationOnce((resolve: any) => resolve([])) // upsert productEntitlement

		const headers = {
			"webhook-signature": "valid_sig",
			"webhook-id": "wh_123",
			"webhook-timestamp": "1234567890",
		}
		const req = createRequest(headers, JSON.stringify(mockEvent))
		const res = await webhookHandler(req)
		expect(res.status).toBe(200)
		const json = await res.json()
		expect(json.received).toBe(true)

		// Verify db.insert was called for subscriptions with planKey: "personal_annual"
		expect(dbMock.insert).toHaveBeenCalledWith(subscriptions)

		// Verify that subscriptions values inserted personal_annual
		const valuesCalls = dbMock.values.mock.calls
		const subValuesCall = valuesCalls.find((call: any) => call[0]?.planKey === "personal_annual")
		expect(subValuesCall).toBeDefined()
		expect(subValuesCall[0].providerPriceId).toBe("p_annual_123")
	})

	it("maps Dodo monthly subscription to personal_monthly and updates entitlement", async () => {
		const mockEvent = {
			type: "subscription.created",
			data: {
				subscription_id: "sub_monthly_888",
				status: "active",
				currency: "USD",
				created_at: "2026-08-01T00:00:00Z",
				previous_billing_date: "2026-08-01T00:00:00Z",
				next_billing_date: "2026-09-01T00:00:00Z",
				cancel_at_next_billing_date: false,
				product_id: "p_monthly_123", // Does not match annualProductId
				metadata: { userId: "user-monthly-1" },
				customer: {
					customer_id: "cust_monthly_1",
					email: "monthly@example.com",
					name: "Monthly User",
				},
			},
		}

		vi.mocked(dodo.webhooks.unwrap).mockReturnValueOnce(mockEvent as any)

		// Stub DB queries
		const dbMock = db as any
		dbMock.then.mockImplementationOnce((resolve: any) => resolve([])) // existing customer query (empty)
		dbMock.then.mockImplementationOnce((resolve: any) => resolve([])) // insert customer
		dbMock.then.mockImplementationOnce((resolve: any) => resolve([])) // select existingSub (empty)
		dbMock.then.mockImplementationOnce((resolve: any) => resolve([])) // insert subscription
		dbMock.then.mockImplementationOnce((resolve: any) => resolve([])) // select productEntitlement (empty)
		dbMock.then.mockImplementationOnce((resolve: any) => resolve([])) // select latestSub
		dbMock.then.mockImplementationOnce((resolve: any) => resolve([])) // upsert productEntitlement

		const headers = {
			"webhook-signature": "valid_sig",
			"webhook-id": "wh_123",
			"webhook-timestamp": "1234567890",
		}
		const req = createRequest(headers, JSON.stringify(mockEvent))
		const res = await webhookHandler(req)
		expect(res.status).toBe(200)

		// Verify subscriptions values inserted personal_monthly
		const valuesCalls = dbMock.values.mock.calls
		const subValuesCall = valuesCalls.find((call: any) => call[0]?.planKey === "personal_monthly")
		expect(subValuesCall).toBeDefined()
		expect(subValuesCall[0].providerPriceId).toBe("p_monthly_123")
	})
})
