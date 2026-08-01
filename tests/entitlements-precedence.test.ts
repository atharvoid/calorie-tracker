import { describe, it, expect } from "vitest"
import { resolveAccessState, canLog, PAST_DUE_GRACE_DAYS } from "@/lib/entitlements"
import type { productEntitlements, subscriptions } from "@/db/schema"

type DbEntitlement = typeof productEntitlements.$inferSelect
type DbSubscription = typeof subscriptions.$inferSelect

const ent = (overrides?: Partial<DbEntitlement>): DbEntitlement => ({
	id: "ent-id",
	userId: "user-1",
	trialStartedAt: new Date("2026-07-01T00:00:00Z"),
	trialEndsAt: new Date("2026-07-08T00:00:00Z"),
	trialAiLogsUsed: 0,
	trialAiLogLimit: 50,
	paidAiLogsToday: 0,
	paidAiLogDate: null,
	accessState: "trial",
	byokProvider: null,
	byokKeyEnvelope: null,
	byokKeyLast4: null,
	byokVerifiedAt: null,
	byokFailureCount: 0,
	byokLastFailureAt: null,
	createdAt: new Date(),
	updatedAt: new Date(),
	...overrides,
})

const sub = (overrides?: Partial<DbSubscription>): DbSubscription => ({
	id: "sub-id",
	userId: "user-1",
	providerSubscriptionId: "sub_123",
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

/** A key counts as usable only when it is both stored and verified. */
const withVerifiedKey = (overrides?: Partial<DbEntitlement>) =>
	ent({
		byokProvider: "google",
		byokKeyEnvelope: "v1.abc",
		byokKeyLast4: "cdef",
		byokVerifiedAt: new Date("2026-07-02T00:00:00Z"),
		...overrides,
	})

const PERIOD_END = new Date("2026-08-01T00:00:00Z")
const DAY_MS = 24 * 60 * 60 * 1000

describe("resolveAccessState — BYOK precedence", () => {
	it("keeps a verified own-key working after the trial window closes", () => {
		// The whole point of BYOK is that it outlives the trial.
		const state = resolveAccessState(
			withVerifiedKey({ trialEndsAt: new Date("2026-07-08T00:00:00Z") }),
			null,
			new Date("2026-09-01T00:00:00Z")
		)
		expect(state).toBe("byok")
	})

	it("keeps a verified own-key working after the trial allowance is spent", () => {
		const state = resolveAccessState(
			withVerifiedKey({ trialAiLogsUsed: 50, trialAiLogLimit: 50 }),
			null,
			new Date("2026-07-05T00:00:00Z")
		)
		expect(state).toBe("byok")
	})

	it("prefers a paid subscription over a stored key", () => {
		// A subscriber is paying us, so the platform key must be used even though
		// a key of their own is on file.
		const state = resolveAccessState(
			withVerifiedKey(),
			sub({ status: "active" }),
			new Date("2026-07-15T00:00:00Z")
		)
		expect(state).toBe("active")
	})

	it("lets a blocked account override a verified key", () => {
		const state = resolveAccessState(
			withVerifiedKey({ accessState: "blocked" }),
			null,
			new Date("2026-07-05T00:00:00Z")
		)
		expect(state).toBe("blocked")
	})

	it("lets a blocked account override an active subscription", () => {
		const state = resolveAccessState(
			ent({ accessState: "blocked" }),
			sub({ status: "active" }),
			new Date("2026-07-15T00:00:00Z")
		)
		expect(state).toBe("blocked")
	})

	it("ignores a stored key that was never verified", () => {
		// An unverified envelope must not grant access — it may be a bad key.
		const state = resolveAccessState(
			ent({ byokProvider: "google", byokKeyEnvelope: "v1.abc", byokVerifiedAt: null }),
			null,
			new Date("2026-09-01T00:00:00Z")
		)
		expect(state).toBe("trial_ended")
	})

	it("falls back to BYOK rather than trial_ended when a subscription lapses", () => {
		const state = resolveAccessState(
			withVerifiedKey(),
			sub({ status: "unpaid" }),
			new Date("2026-07-15T00:00:00Z")
		)
		expect(state).toBe("byok")
	})
})

describe("resolveAccessState — subscription statuses that must not grant access", () => {
	it("never treats unpaid as active, even inside the paid period", () => {
		// Regression guard: this previously granted full access to anyone whose
		// period end happened to be in the future.
		const state = resolveAccessState(
			null,
			sub({ status: "unpaid", currentPeriodEnd: PERIOD_END }),
			new Date("2026-07-15T00:00:00Z")
		)
		expect(state).toBe("trial_ended")
		expect(canLog(state)).toBe(false)
	})

	it("treats an incomplete checkout as no subscription at all", () => {
		// Checkout never completed, so the trial should still apply.
		const state = resolveAccessState(
			ent({ trialAiLogsUsed: 1 }),
			sub({ status: "incomplete" }),
			new Date("2026-07-05T00:00:00Z")
		)
		expect(state).toBe("trial")
	})

	it("treats an unknown provider status as no subscription", () => {
		const state = resolveAccessState(
			ent({ trialAiLogsUsed: 1 }),
			sub({ status: "something_new" as DbSubscription["status"] }),
			new Date("2026-07-05T00:00:00Z")
		)
		expect(state).toBe("trial")
	})

	it("lapses a paused subscription once the paid period has passed", () => {
		const state = resolveAccessState(
			null,
			sub({ status: "paused", currentPeriodEnd: PERIOD_END }),
			new Date("2026-08-02T00:00:00Z")
		)
		expect(state).toBe("trial_ended")
	})

	it("honours a paused subscription until the paid period ends", () => {
		const state = resolveAccessState(
			null,
			sub({ status: "paused", currentPeriodEnd: PERIOD_END }),
			new Date("2026-07-20T00:00:00Z")
		)
		expect(state).toBe("active")
	})

	it("lapses a cancelled subscription with no recorded period end", () => {
		const state = resolveAccessState(
			null,
			sub({ status: "canceled", currentPeriodEnd: null }),
			new Date("2026-07-15T00:00:00Z")
		)
		expect(state).toBe("trial_ended")
	})
})

describe("resolveAccessState — past_due grace window", () => {
	it("anchors the grace window to the period end, not to updatedAt", () => {
		// updatedAt moves on every webhook. If the window were anchored to it, a
		// chatty provider could extend free access indefinitely.
		const state = resolveAccessState(
			null,
			sub({
				status: "past_due",
				currentPeriodEnd: PERIOD_END,
				updatedAt: new Date("2026-09-01T00:00:00Z"),
			}),
			new Date("2026-09-02T00:00:00Z")
		)
		expect(state).toBe("trial_ended")
	})

	it("still grants grace exactly on the boundary", () => {
		const boundary = new Date(PERIOD_END.getTime() + PAST_DUE_GRACE_DAYS * DAY_MS)
		const state = resolveAccessState(
			null,
			sub({ status: "past_due", currentPeriodEnd: PERIOD_END }),
			boundary
		)
		expect(state).toBe("grace")
	})

	it("withdraws grace one millisecond past the boundary", () => {
		const justAfter = new Date(PERIOD_END.getTime() + PAST_DUE_GRACE_DAYS * DAY_MS + 1)
		const state = resolveAccessState(
			null,
			sub({ status: "past_due", currentPeriodEnd: PERIOD_END }),
			justAfter
		)
		expect(state).toBe("trial_ended")
	})

	it("grants grace when the provider sent no period end", () => {
		// Fail open only here: they were paying, and the missing field is our
		// data-quality problem rather than theirs.
		const state = resolveAccessState(
			null,
			sub({ status: "past_due", currentPeriodEnd: null }),
			new Date("2026-09-01T00:00:00Z")
		)
		expect(state).toBe("grace")
	})
})

describe("canLog", () => {
	it("permits exactly the states that should be able to spend an AI call", () => {
		expect(canLog("pre_trial")).toBe(true)
		expect(canLog("trial")).toBe(true)
		expect(canLog("byok")).toBe(true)
		expect(canLog("active")).toBe(true)
		expect(canLog("grace")).toBe(true)
	})

	it("refuses every state that must not spend an AI call", () => {
		expect(canLog("blocked")).toBe(false)
		expect(canLog("trial_ended")).toBe(false)
		expect(canLog("quota_exhausted")).toBe(false)
	})
})
