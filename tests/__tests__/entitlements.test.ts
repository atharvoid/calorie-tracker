import { describe, it, expect } from "vitest"
import { resolveAccessState } from "@/lib/entitlements"
import type { productEntitlements, subscriptions } from "@/db/schema"

type DbEntitlement = typeof productEntitlements.$inferSelect
type DbSubscription = typeof subscriptions.$inferSelect

describe("resolveAccessState", () => {
  const mockEntitlement = (overrides?: Partial<DbEntitlement>): DbEntitlement => ({
    id: "ent-id",
    userId: "user-1",
    trialStartedAt: new Date("2026-07-01T00:00:00Z"),
    trialEndsAt: new Date("2026-07-08T00:00:00Z"),
    trialAiLogsUsed: 10,
    trialAiLogLimit: 50,
    paidAiLogsToday: 0,
    paidAiLogDate: null,
    accessState: "trial",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  })

  const mockSubscription = (overrides?: Partial<DbSubscription>): DbSubscription => ({
    id: "sub-id",
    userId: "user-1",
    providerSubscriptionId: "sub_stripe_123",
    providerPriceId: "price_123",
    status: "active",
    planKey: "personal_monthly",
    currency: "usd",
    currentPeriodStart: new Date("2026-07-01T00:00:00Z"),
    currentPeriodEnd: new Date("2026-08-01T00:00:00Z"),
    cancelAtPeriodEnd: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  })

  it("returns blocked when entitlement state is explicitly blocked", () => {
    const ent = mockEntitlement({ accessState: "blocked" })
    const state = resolveAccessState(ent, null, new Date())
    expect(state).toBe("blocked")
  })

  it("returns active when active subscription exists", () => {
    const sub = mockSubscription({ status: "active" })
    const state = resolveAccessState(null, sub, new Date("2026-07-15T00:00:00Z"))
    expect(state).toBe("active")
  })

  it("returns grace if subscription is past_due within 3 days of period end", () => {
    const sub = mockSubscription({
      status: "past_due",
      currentPeriodEnd: new Date("2026-08-01T00:00:00Z"),
    })
    const now = new Date("2026-08-03T00:00:00Z") // 2 days past due
    const state = resolveAccessState(null, sub, now)
    expect(state).toBe("grace")
  })

  it("returns expired if subscription is past_due by more than 3 days", () => {
    const sub = mockSubscription({
      status: "past_due",
      currentPeriodEnd: new Date("2026-08-01T00:00:00Z"),
    })
    const now = new Date("2026-08-05T00:00:00Z") // 4 days past due
    const state = resolveAccessState(null, sub, now)
    expect(state).toBe("expired")
  })

  it("returns active if subscription is canceled but still before currentPeriodEnd", () => {
    const sub = mockSubscription({
      status: "canceled",
      currentPeriodEnd: new Date("2026-08-01T00:00:00Z"),
    })
    const now = new Date("2026-07-15T00:00:00Z")
    const state = resolveAccessState(null, sub, now)
    expect(state).toBe("active")
  })

  it("returns expired if subscription is canceled and currentPeriodEnd is in past", () => {
    const sub = mockSubscription({
      status: "canceled",
      currentPeriodEnd: new Date("2026-08-01T00:00:00Z"),
    })
    const now = new Date("2026-08-02T00:00:00Z")
    const state = resolveAccessState(null, sub, now)
    expect(state).toBe("expired")
  })

  it("returns pre_trial if no entitlement or subscription row exists", () => {
    const state = resolveAccessState(null, null, new Date())
    expect(state).toBe("pre_trial")
  })

  it("returns expired if free trial period has elapsed", () => {
    const ent = mockEntitlement({
      trialEndsAt: new Date("2026-07-08T00:00:00Z"),
    })
    const now = new Date("2026-07-09T00:00:00Z")
    const state = resolveAccessState(ent, null, now)
    expect(state).toBe("expired")
  })

  it("returns expired if free trial log count matches or exceeds limits", () => {
    const ent = mockEntitlement({
      trialAiLogsUsed: 50,
      trialAiLogLimit: 50,
      trialEndsAt: new Date("2026-07-08T00:00:00Z"),
    })
    const now = new Date("2026-07-05T00:00:00Z") // before end date
    const state = resolveAccessState(ent, null, now)
    expect(state).toBe("expired")
  })

  it("returns trial if free trial is still active and count is within limits", () => {
    const ent = mockEntitlement({
      trialAiLogsUsed: 25,
      trialAiLogLimit: 50,
      trialEndsAt: new Date("2026-07-08T00:00:00Z"),
    })
    const now = new Date("2026-07-05T00:00:00Z")
    const state = resolveAccessState(ent, null, now)
    expect(state).toBe("trial")
  })
})
