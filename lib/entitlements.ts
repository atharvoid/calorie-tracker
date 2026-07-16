import { db } from "@/db"
import { productEntitlements, subscriptions, usageEvents } from "@/db/schema"
import { eq, desc } from "drizzle-orm"
import { localDate } from "./nutrition-date"

// Configuration constants loaded from environment variables or defaults
export const FREE_TRIAL_DAYS = Number(process.env.FREE_TRIAL_DAYS || "7")
export const FREE_TRIAL_AI_LOG_LIMIT = Number(process.env.FREE_TRIAL_AI_LOG_LIMIT || "50")
export const PAID_DAILY_AI_LOG_LIMIT = Number(process.env.PAID_DAILY_AI_LOG_LIMIT || "25")

// Gemini 2.5 Flash pricing in USD per token ( micros = millionths of a USD )
// $0.075 / 1M input tokens = 0.075 micros per token
// $0.30 / 1M output tokens = 0.30 micros per token
const INPUT_TOKEN_MICRO_RATE = 0.075
const OUTPUT_TOKEN_MICRO_RATE = 0.30

export type AccessState = "pre_trial" | "trial" | "active" | "grace" | "expired" | "blocked"

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
}

/**
 * Deterministically resolves the current access state based on entitlement and subscription data.
 */
export function resolveAccessState(
  ent: typeof productEntitlements.$inferSelect | null,
  sub: typeof subscriptions.$inferSelect | null,
  now: Date = new Date()
): AccessState {
  // 1. If blocked by admin
  if (ent?.accessState === "blocked") {
    return "blocked"
  }

  // 2. Active paid subscription check
  if (sub) {
    const status = sub.status
    if (status === "active" || status === "trialing") {
      return "active"
    }

    if (status === "past_due") {
      // 3 days grace period
      const gracePeriodDays = 3
      const checkDate = sub.currentPeriodEnd
        ? new Date(sub.currentPeriodEnd.getTime() + gracePeriodDays * 24 * 60 * 60 * 1000)
        : new Date(sub.updatedAt.getTime() + gracePeriodDays * 24 * 60 * 60 * 1000)
      return now <= checkDate ? "grace" : "expired"
    }

    // For canceled or unpaid, they remain active until currentPeriodEnd (if in future)
    if (sub.currentPeriodEnd) {
      return now <= sub.currentPeriodEnd ? "active" : "expired"
    }
  }

  // 3. Free Trial check
  if (!ent) {
    return "pre_trial"
  }

  if (ent.trialEndsAt && now > ent.trialEndsAt) {
    return "expired"
  }

  if (ent.trialAiLogsUsed >= ent.trialAiLogLimit) {
    return "expired"
  }

  return "trial"
}

/**
 * Fetches the user's active entitlement and subscription details.
 */
export async function getUserEntitlement(userId: string, now: Date = new Date()): Promise<UserEntitlement> {
  const [ent] = await db
    .select()
    .from(productEntitlements)
    .where(eq(productEntitlements.userId, userId))
    .limit(1)

  // Get the latest subscription (newest first)
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .orderBy(desc(subscriptions.createdAt))
    .limit(1)

  const activeState = resolveAccessState(ent || null, sub || null, now)

  return {
    userId,
    accessState: activeState,
    trialStartedAt: ent?.trialStartedAt || null,
    trialEndsAt: ent?.trialEndsAt || null,
    trialAiLogsUsed: ent?.trialAiLogsUsed || 0,
    trialAiLogLimit: ent?.trialAiLogLimit || FREE_TRIAL_AI_LOG_LIMIT,
    paidAiLogsToday: ent?.paidAiLogsToday || 0,
    paidAiLogDate: ent?.paidAiLogDate || null,
    subscriptionStatus: sub?.status || null,
    subscriptionEnd: sub?.currentPeriodEnd || null,
  }
}

/**
 * Atomically initializes the free trial on the user's first committed meal.
 */
export async function startTrialOnFirstMeal(userId: string, now: Date = new Date()): Promise<UserEntitlement> {
  const trialEndsAt = new Date(now.getTime() + FREE_TRIAL_DAYS * 24 * 60 * 60 * 1000)

  // Atomic upsert: only insert if it doesn't exist to prevent double-starting
  await db
    .insert(productEntitlements)
    .values({
      userId,
      trialStartedAt: now,
      trialEndsAt,
      trialAiLogsUsed: 0,
      trialAiLogLimit: FREE_TRIAL_AI_LOG_LIMIT,
      accessState: "trial",
      updatedAt: now,
    })
    .onConflictDoNothing()

  return getUserEntitlement(userId, now)
}

/**
 * Asserts that a user has remaining entitlement logs available.
 * Throws a descriptive error if trial is expired, limits are reached, or user is blocked.
 */
export async function assertCanUseAiLog(userId: string, now: Date = new Date()): Promise<void> {
  const ent = await getUserEntitlement(userId, now)

  if (ent.accessState === "blocked") {
    throw new Error("Your account has been suspended due to policy violations.")
  }

  if (ent.accessState === "expired") {
    throw new Error("Your free trial has ended. Please upgrade to continue logging meals.")
  }

  if (ent.accessState === "pre_trial") {
    // pre_trial is allowed (it will transition to trial on commit)
    return
  }

  if (ent.accessState === "trial") {
    if (ent.trialAiLogsUsed >= ent.trialAiLogLimit) {
      throw new Error(`Trial limit reached (${ent.trialAiLogLimit} logs used). Please upgrade to continue.`)
    }
    return
  }

  // Active / Grace tier check daily fair-use limits
  if (ent.accessState === "active" || ent.accessState === "grace") {
    const todayStr = localDate("Asia/Kolkata")
    if (ent.paidAiLogDate === todayStr && ent.paidAiLogsToday >= PAID_DAILY_AI_LOG_LIMIT) {
      throw new Error(`Daily limit reached (${PAID_DAILY_AI_LOG_LIMIT} logs). Please wait until tomorrow or contact support.`)
    }
  }
}

/**
 * Increments usage metrics and records a structured cost/billing event.
 */
export async function recordAiUsage(
  userId: string,
  event: {
    requestId: string
    source: "web" | "telegram"
    model: string
    inputTokens?: number
    outputTokens?: number
    success: boolean
    failureCategory?: string
  },
  now: Date = new Date()
): Promise<void> {
  const inputTokens = event.inputTokens || 0
  const outputTokens = event.outputTokens || 0
  const costMicros = Math.round(
    inputTokens * INPUT_TOKEN_MICRO_RATE + outputTokens * OUTPUT_TOKEN_MICRO_RATE
  )

  // 1. Insert detailed usage event
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
      success: event.success,
      failureCategory: event.failureCategory || null,
      createdAt: now,
    })
    .onConflictDoNothing()

  // 2. Increment counters in product_entitlement if success is true
  if (event.success) {
    const ent = await getUserEntitlement(userId, now)
    const todayStr = localDate("Asia/Kolkata")

    if (ent.accessState === "trial" || ent.accessState === "pre_trial") {
      // Increment trial usage
      await db
        .insert(productEntitlements)
        .values({
          userId,
          trialAiLogsUsed: 1,
          trialAiLogLimit: FREE_TRIAL_AI_LOG_LIMIT,
          accessState: "trial",
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: productEntitlements.userId,
          set: {
            trialAiLogsUsed: ent.trialAiLogsUsed + 1,
            updatedAt: now,
          },
        })
    } else if (ent.accessState === "active" || ent.accessState === "grace") {
      // Increment paid usage
      const newPaidLogsToday = ent.paidAiLogDate === todayStr ? ent.paidAiLogsToday + 1 : 1
      await db
        .update(productEntitlements)
        .set({
          paidAiLogsToday: newPaidLogsToday,
          paidAiLogDate: todayStr,
          updatedAt: now,
        })
        .where(eq(productEntitlements.userId, userId))
    }
  }
}
