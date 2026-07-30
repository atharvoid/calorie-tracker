import { db } from "@/db"
import {
	nutritionSettings,
	productEntitlements,
	subscriptions,
	usageEvents,
	type AccessState,
	type KeyOwner,
	type LogSource,
} from "@/db/schema"
import { eq, desc, sql } from "drizzle-orm"
import { localDate } from "./nutrition-date"
import { MODEL_PRICING_USD_PER_MTOK } from "./ai"
import { decryptApiKey, isByokEnabled } from "./byok"

export type { AccessState }

// ── Configuration ───────────────────────────────────────────────────────────

/**
 * Reads a positive integer from the environment. A typo previously produced
 * NaN silently, which made every limit comparison false and effectively removed
 * the limit.
 */
function envInt(name: string, fallback: number): number {
	const raw = process.env[name]
	if (raw === undefined || raw === "") return fallback
	const parsed = Number(raw)
	if (!Number.isInteger(parsed) || parsed <= 0) {
		throw new Error(`${name} must be a positive integer. Received: ${JSON.stringify(raw)}`)
	}
	return parsed
}

export const FREE_TRIAL_DAYS = envInt("FREE_TRIAL_DAYS", 7)
export const FREE_TRIAL_AI_LOG_LIMIT = envInt("FREE_TRIAL_AI_LOG_LIMIT", 50)
export const PAID_DAILY_AI_LOG_LIMIT = envInt("PAID_DAILY_AI_LOG_LIMIT", 25)

/** Days a `past_due` subscriber keeps access while a payment retries. */
export const PAST_DUE_GRACE_DAYS = 3

/** Fallback timezone when a user has no nutrition settings row yet. */
export const DEFAULT_TIMEZONE = process.env.DEFAULT_TIMEZONE || "Asia/Kolkata"

/**
 * Cost per token in micro-USD.
 *
 * A micro-USD is one millionth of a dollar, and provider pricing is quoted per
 * million tokens — so "USD per 1M tokens" and "micro-USD per token" are the
 * same number. Sourced from lib/ai.ts so the rate can never drift from the
 * model actually being called.
 */
const INPUT_TOKEN_MICRO_RATE = MODEL_PRICING_USD_PER_MTOK.input
const OUTPUT_TOKEN_MICRO_RATE = MODEL_PRICING_USD_PER_MTOK.output

// ── Errors ────────────────────────────────────────────────────────────────

export type EntitlementErrorCode =
	| "account_blocked"
	| "trial_ended"
	| "trial_quota_exhausted"
	| "daily_limit_reached"
	| "byok_key_invalid"

/**
 * Carries a stable machine-readable code so callers can branch on the reason
 * (e.g. show an upgrade CTA vs a "come back tomorrow" notice) and so the copy
 * can be localised at the edge instead of baked into a thrown string.
 */
export class EntitlementError extends Error {
	readonly code: EntitlementErrorCode
	/** Safe to show a user verbatim. */
	readonly userMessage: string

	constructor(code: EntitlementErrorCode, userMessage: string) {
		super(`${code}: ${userMessage}`)
		this.name = "EntitlementError"
		this.code = code
		this.userMessage = userMessage
	}
}

// ── Types ─────────────────────────────────────────────────────────────────

export type UserEntitlement = {
	userId: string
	accessState: AccessState
	trialStartedAt: Date | null
	trialEndsAt: Date | null
	trialAiLogsUsed: number
	trialAiLogLimit: number
	paidAiLogsToday: number
	paidAiLogDate: string | null
	subscriptionStatus: string | null
	subscriptionEnd: Date | null
	/** True when the user has a verified key of their own on file. */
	hasByokKey: boolean
	/** Last four characters of the stored key, for display only. */
	byokKeyLast4: string | null
	/** IANA timezone used for all daily-window arithmetic for this user. */
	timezone: string
}

/** States in which a user may make an AI call. */
const ALLOWED_STATES: ReadonlySet<AccessState> = new Set<AccessState>([
	"pre_trial",
	"trial",
	"byok",
	"active",
	"grace",
])

export function canLog(state: AccessState): boolean {
	return ALLOWED_STATES.has(state)
}

// ── State resolution ───────────────────────────────────────────────────────

/**
 * Pure, deterministic access-state resolution. Every branch returns explicitly;
 * there is no implicit fall-through.
 *
 * Precedence, highest first:
 *   1. Admin block — overrides everything.
 *   2. Paid subscription — they are paying, so use the platform key even if a
 *      BYOK key is also on file.
 *   3. BYOK — a verified key of their own means unlimited access at no cost to
 *      either party, and it survives trial expiry.
 *   4. Free trial — time window and log allowance.
 */
export function resolveAccessState(
	ent: typeof productEntitlements.$inferSelect | null,
	sub: typeof subscriptions.$inferSelect | null,
	now: Date = new Date()
): AccessState {
	if (ent?.accessState === "blocked") {
		return "blocked"
	}

	const subState = resolveSubscriptionState(sub, now)
	if (subState === "active" || subState === "grace") {
		return subState
	}

	// A verified own-key beats an expired trial or a lapsed subscription.
	if (hasVerifiedByokKey(ent)) {
		return "byok"
	}

	if (subState === "lapsed") {
		return "trial_ended"
	}

	if (!ent) {
		return "pre_trial"
	}

	if (ent.trialEndsAt && now > ent.trialEndsAt) {
		return "trial_ended"
	}

	// Distinct from trial_ended: the window is still open but the allowance is
	// spent. Previously both returned "expired", so users who burned their logs
	// were told their trial had ended, which was not true.
	if (ent.trialAiLogsUsed >= ent.trialAiLogLimit) {
		return "quota_exhausted"
	}

	return "trial"
}

type SubscriptionState = "active" | "grace" | "lapsed" | "none"

function resolveSubscriptionState(
	sub: typeof subscriptions.$inferSelect | null,
	now: Date
): SubscriptionState {
	if (!sub) return "none"

	switch (sub.status) {
		case "active":
		case "trialing":
			return "active"

		case "past_due": {
			// Anchor the grace window to the end of the paid period. `updatedAt`
			// must not be used: it mutates on every webhook, which let the window
			// slide forward indefinitely.
			if (!sub.currentPeriodEnd) return "grace"
			const graceEnd = addDaysToDate(sub.currentPeriodEnd, PAST_DUE_GRACE_DAYS)
			return now <= graceEnd ? "grace" : "lapsed"
		}

		case "canceled":
		case "paused":
			// Cancelled but paid through the end of the period.
			if (!sub.currentPeriodEnd) return "lapsed"
			return now <= sub.currentPeriodEnd ? "active" : "lapsed"

		case "unpaid":
			// Never treat unpaid as active. This previously granted full access to
			// anyone whose period end happened to be in the future.
			return "lapsed"

		case "incomplete":
			// Checkout never completed, so no entitlement was ever granted. Fall
			// back to whatever the trial says.
			return "none"

		default:
			// Unknown provider status. Fail closed rather than falling through
			// silently, but keep trial access available.
			return "none"
	}
}

function hasVerifiedByokKey(
	ent: typeof productEntitlements.$inferSelect | null
): boolean {
	if (!ent) return false
	return Boolean(ent.byokKeyEnvelope && ent.byokVerifiedAt)
}

function addDaysToDate(date: Date, days: number): Date {
	return new Date(date.getTime() + days * 24 * 60 * 60 * 1000)
}

// ── Reads ─────────────────────────────────────────────────────────────────

/**
 * The user's IANA timezone. All daily-limit windows use this instead of a
 * hardcoded "Asia/Kolkata", which previously reset every user's daily quota at
 * midnight IST regardless of where they lived.
 */
export async function getUserTimezone(userId: string): Promise<string> {
	const [settings] = await db
		.select({ timezone: nutritionSettings.timezone })
		.from(nutritionSettings)
		.where(eq(nutritionSettings.userId, userId))
		.limit(1)
	return settings?.timezone ?? DEFAULT_TIMEZONE
}

export async function getUserEntitlement(
	userId: string,
	now: Date = new Date()
): Promise<UserEntitlement> {
	const [[ent], [sub], timezone] = await Promise.all([
		db
			.select()
			.from(productEntitlements)
			.where(eq(productEntitlements.userId, userId))
			.limit(1),
		db
			.select()
			.from(subscriptions)
			.where(eq(subscriptions.userId, userId))
			.orderBy(desc(subscriptions.createdAt))
			.limit(1),
		getUserTimezone(userId),
	])

	return {
		userId,
		accessState: resolveAccessState(ent ?? null, sub ?? null, now),
		trialStartedAt: ent?.trialStartedAt ?? null,
		trialEndsAt: ent?.trialEndsAt ?? null,
		trialAiLogsUsed: ent?.trialAiLogsUsed ?? 0,
		trialAiLogLimit: ent?.trialAiLogLimit ?? FREE_TRIAL_AI_LOG_LIMIT,
		paidAiLogsToday: ent?.paidAiLogsToday ?? 0,
		paidAiLogDate: ent?.paidAiLogDate ?? null,
		subscriptionStatus: sub?.status ?? null,
		subscriptionEnd: sub?.currentPeriodEnd ?? null,
		hasByokKey: hasVerifiedByokKey(ent ?? null),
		byokKeyLast4: ent?.byokKeyLast4 ?? null,
		timezone,
	}
}

/**
 * Returns the decrypted API key to use for this user's request, or null when the
 * platform key should be used. The plaintext must not be logged, persisted, or
 * returned to the client.
 */
export async function resolveApiKeyForUser(userId: string): Promise<{
	apiKey: string | null
	keyOwner: KeyOwner
}> {
	if (!isByokEnabled()) {
		return { apiKey: null, keyOwner: "platform" }
	}

	const [ent] = await db
		.select({
			envelope: productEntitlements.byokKeyEnvelope,
			verifiedAt: productEntitlements.byokVerifiedAt,
		})
		.from(productEntitlements)
		.where(eq(productEntitlements.userId, userId))
		.limit(1)

	if (!ent?.envelope || !ent.verifiedAt) {
		return { apiKey: null, keyOwner: "platform" }
	}

	return { apiKey: decryptApiKey(ent.envelope), keyOwner: "user" }
}

// ── Writes ───────────────────────────────────────────────────────────────

/** Initialises the free trial on the user's first committed meal. */
export async function startTrialOnFirstMeal(
	userId: string,
	now: Date = new Date()
): Promise<UserEntitlement> {
	const trialEndsAt = addDaysToDate(now, FREE_TRIAL_DAYS)

	// onConflictDoNothing makes this genuinely idempotent, so concurrent first
	// meals cannot double-start a trial or reset the end date.
	await db
		.insert(productEntitlements)
		.values({
			userId,
			trialStartedAt: now,
			trialEndsAt,
			trialAiLogsUsed: 0,
			trialAiLogLimit: FREE_TRIAL_AI_LOG_LIMIT,
			accessState: "trial",
		})
		.onConflictDoNothing({ target: productEntitlements.userId })

	return getUserEntitlement(userId, now)
}

/**
 * Throws an EntitlementError if the user may not make an AI call right now.
 * BYOK users are never rate-limited on quota here — they are paying their own
 * provider bill — only on platform fair-use, which is enforced separately.
 */
export async function assertCanUseAiLog(
	userId: string,
	now: Date = new Date()
): Promise<UserEntitlement> {
	const ent = await getUserEntitlement(userId, now)

	switch (ent.accessState) {
		case "blocked":
			throw new EntitlementError(
				"account_blocked",
				"Your account has been suspended. Contact support if you think this is a mistake."
			)

		case "trial_ended":
			throw new EntitlementError(
				"trial_ended",
				"Your free trial has ended. Add your own AI API key to keep logging for free, or upgrade to a subscription."
			)

		case "quota_exhausted":
			throw new EntitlementError(
				"trial_quota_exhausted",
				`You have used all ${ent.trialAiLogLimit} trial logs. Add your own AI API key to keep logging for free, or upgrade to a subscription.`
			)

		case "byok":
			// Unlimited: the user's own provider account is being billed.
			return ent

		case "pre_trial":
		case "trial":
			// The trial window and allowance were already validated by
			// resolveAccessState; reaching here means there is headroom.
			return ent

		case "active":
		case "grace": {
			const today = localDate(ent.timezone)
			if (ent.paidAiLogDate === today && ent.paidAiLogsToday >= PAID_DAILY_AI_LOG_LIMIT) {
				throw new EntitlementError(
					"daily_limit_reached",
					`You have hit today's fair-use limit of ${PAID_DAILY_AI_LOG_LIMIT} AI logs. It resets at midnight in your timezone.`
				)
			}
			return ent
		}
	}
}

/**
 * Records a usage event and increments the relevant counter.
 *
 * Counters are incremented with SQL expressions rather than read-modify-write in
 * application code. The previous implementation computed `used + 1` in
 * JavaScript, so two concurrent logs both read the same value and one increment
 * was lost — letting users exceed their allowance.
 */
export async function recordAiUsage(
	userId: string,
	event: {
		requestId: string
		source: LogSource
		model: string
		inputTokens?: number
		outputTokens?: number
		success: boolean
		failureCategory?: string
		/** Whose API key paid for this call. Defaults to the platform's. */
		keyOwner?: KeyOwner
	},
	now: Date = new Date()
): Promise<void> {
	const inputTokens = event.inputTokens ?? 0
	const outputTokens = event.outputTokens ?? 0
	const keyOwner = event.keyOwner ?? "platform"

	// BYOK calls are free to the platform, so attributing a cost to them would
	// corrupt unit-economics reporting.
	const costMicros =
		keyOwner === "user"
			? 0
			: Math.round(
					inputTokens * INPUT_TOKEN_MICRO_RATE + outputTokens * OUTPUT_TOKEN_MICRO_RATE
				)

	await db
		.insert(usageEvents)
		.values({
			userId,
			eventType: "ai_extraction",
			requestId: event.requestId,
			source: event.source,
			model: event.model,
			inputTokens,
			outputTokens,
			estimatedCostMicros: costMicros,
			keyOwner,
			success: event.success,
			failureCategory: event.failureCategory ?? null,
			createdAt: now,
		})
		.onConflictDoNothing({ target: usageEvents.requestId })

	if (!event.success) return

	// BYOK usage is unmetered, so there is no counter to move.
	if (keyOwner === "user") return

	const ent = await getUserEntitlement(userId, now)

	if (ent.accessState === "trial" || ent.accessState === "pre_trial") {
		await db
			.insert(productEntitlements)
			.values({
				userId,
				trialAiLogsUsed: 1,
				trialAiLogLimit: FREE_TRIAL_AI_LOG_LIMIT,
				accessState: "trial",
			})
			.onConflictDoUpdate({
				target: productEntitlements.userId,
				set: {
					// Atomic: computed by Postgres, not by this process.
					trialAiLogsUsed: sql`${productEntitlements.trialAiLogsUsed} + 1`,
				},
			})
		return
	}

	if (ent.accessState === "active" || ent.accessState === "grace") {
		const today = localDate(ent.timezone)
		await db
			.update(productEntitlements)
			.set({
				// Reset to 1 when the stored date is not today, otherwise increment.
				// Done in a single statement so a day rollover cannot race.
				paidAiLogsToday: sql`CASE WHEN ${productEntitlements.paidAiLogDate} = ${today} THEN ${productEntitlements.paidAiLogsToday} + 1 ELSE 1 END`,
				paidAiLogDate: today,
			})
			.where(eq(productEntitlements.userId, userId))
	}
}

/**
 * Records that a user's own API key was rejected by the provider. We never fall
 * back to the platform key on failure — that would quietly move their bill onto
 * us — so the user is told to rotate the key instead.
 */
export async function recordByokFailure(userId: string, now: Date = new Date()): Promise<void> {
	await db
		.update(productEntitlements)
		.set({
			byokFailureCount: sql`${productEntitlements.byokFailureCount} + 1`,
			byokLastFailureAt: now,
		})
		.where(eq(productEntitlements.userId, userId))
}

/** Clears the failure counter after a successful BYOK call. */
export async function recordByokSuccess(userId: string): Promise<void> {
	await db
		.update(productEntitlements)
		.set({ byokFailureCount: 0, byokLastFailureAt: null })
		.where(eq(productEntitlements.userId, userId))
}
