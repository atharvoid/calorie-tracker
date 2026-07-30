import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { billingCustomers, subscriptions, productEntitlements } from "@/db/schema"
import type { BillingProvider, SubscriptionStatus } from "@/db/schema"
import { eq, desc } from "drizzle-orm"
import { dodo } from "@/lib/dodo"
import { resolveAccessState } from "@/lib/entitlements"

export const dynamic = "force-dynamic"

/**
 * This row previously wrote the literal "dodopayments", but BillingProvider is
 * "stripe" | "dodo". Every billing_customer row created by this webhook carried
 * a provider value no other code path recognises.
 */
const PROVIDER: BillingProvider = "dodo"

/**
 * Dodo's status vocabulary is not ours, so `status as SubscriptionStatus` was
 * asserting something untrue — "on_hold" and "cancelled" would have been
 * written verbatim into a column typed as neither.
 *
 * Unrecognised values fail closed to "incomplete" rather than "active". An
 * unknown billing status must never be the reason someone gets free access.
 */
const DODO_STATUS_MAP: Record<string, SubscriptionStatus> = {
  pending: "incomplete",
  trialing: "trialing",
  active: "active",
  on_hold: "past_due",
  past_due: "past_due",
  paused: "paused",
  cancelled: "canceled",
  canceled: "canceled",
  expired: "canceled",
  failed: "unpaid",
  unpaid: "unpaid",
}

function toSubscriptionStatus(raw: string): SubscriptionStatus {
  const mapped = DODO_STATUS_MAP[raw]
  if (!mapped) {
    console.warn(`[webhook] unrecognised Dodo status "${raw}"; treating as incomplete`)
    return "incomplete"
  }
  return mapped
}

// Minimal shape of the Dodo subscription payload we rely on.
interface DodoSubscriptionShim {
  subscription_id: string
  status: string
  currency: string
  created_at: string
  previous_billing_date: string | null
  next_billing_date: string | null
  cancel_at_next_billing_date: boolean
  product_id: string
  metadata?: Record<string, unknown>
  customer: {
    customer_id: string
    email: string
    name: string
  }
}

function readUserIdFromMetadata(metadata: Record<string, unknown> | undefined): string {
  const value = metadata?.userId
  return typeof value === "string" ? value : ""
}

async function handleSubscriptionChange(dodoSub: DodoSubscriptionShim) {
  // 1. Resolve userId from Dodo metadata or billing_customer record
  let userId = readUserIdFromMetadata(dodoSub.metadata)
  const customerId = dodoSub.customer?.customer_id || ""

  if (!userId && customerId) {
    const [custRow] = await db
      .select()
      .from(billingCustomers)
      .where(eq(billingCustomers.providerCustomerId, customerId))
      .limit(1)
    userId = custRow?.userId || ""
  }

  if (!userId) {
    console.error("[webhook] Could not resolve userId for customer:", customerId)
    return
  }

  // Ensure customer is saved in billing_customer table
  if (customerId) {
    await db
      .insert(billingCustomers)
      .values({
        userId,
        provider: PROVIDER,
        providerCustomerId: customerId,
      })
      .onConflictDoNothing()
  }

  // 2. Resolve planKey based on product_id
  const productId = dodoSub.product_id || ""
  const annualProductId = process.env.DODO_PRODUCT_ANNUAL_ID || "p_annual_placeholder"
  const planKey = productId === annualProductId ? "personal_annual" : "personal_monthly"

  const status = toSubscriptionStatus(dodoSub.status)
  const currentPeriodStart = new Date(
    dodoSub.previous_billing_date || dodoSub.created_at || new Date()
  )
  const currentPeriodEnd = new Date(dodoSub.next_billing_date || new Date())

  // 3. Upsert subscription table record
  const [existingSub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.providerSubscriptionId, dodoSub.subscription_id))
    .limit(1)

  if (existingSub) {
    await db
      .update(subscriptions)
      .set({
        status,
        providerPriceId: productId,
        planKey,
        currency: dodoSub.currency || "USD",
        currentPeriodStart,
        currentPeriodEnd,
        cancelAtPeriodEnd: dodoSub.cancel_at_next_billing_date || false,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, existingSub.id))
  } else {
    await db.insert(subscriptions).values({
      userId,
      providerSubscriptionId: dodoSub.subscription_id,
      providerPriceId: productId,
      status,
      planKey,
      currency: dodoSub.currency || "USD",
      currentPeriodStart,
      currentPeriodEnd,
      cancelAtPeriodEnd: dodoSub.cancel_at_next_billing_date || false,
    })
  }

  // 4. Update the access state inside product_entitlement
  const [ent] = await db
    .select()
    .from(productEntitlements)
    .where(eq(productEntitlements.userId, userId))
    .limit(1)

  const [latestSub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .orderBy(desc(subscriptions.createdAt))
    .limit(1)

  const activeState = resolveAccessState(ent || null, latestSub || null)

  await db
    .insert(productEntitlements)
    .values({
      userId,
      accessState: activeState,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: productEntitlements.userId,
      set: {
        accessState: activeState,
        updatedAt: new Date(),
      },
    })

  console.log(`[webhook] Updated entitlement for user ${userId} to accessState: ${activeState}`)
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get("webhook-signature")
  const webhookId = req.headers.get("webhook-id")
  const webhookTimestamp = req.headers.get("webhook-timestamp")
  const webhookSecret = process.env.DODO_PAYMENTS_WEBHOOK_KEY

  if (!signature || !webhookSecret || !webhookId || !webhookTimestamp) {
    return NextResponse.json({ error: "Missing signature headers or secret key" }, { status: 400 })
  }

  const rawBody = await req.text()

  // Signature verification is separated from processing on purpose. Previously
  // both returned 400, so a transient database error looked identical to a
  // forged request — and Dodo stops retrying on 4xx, meaning a real payment
  // event could be dropped permanently because the database blipped.
  let event: { type: string; data: unknown }
  try {
    event = dodo.webhooks.unwrap(rawBody, {
      headers: {
        "webhook-id": webhookId,
        "webhook-signature": signature,
        "webhook-timestamp": webhookTimestamp,
      },
      key: webhookSecret,
    }) as { type: string; data: unknown }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[webhook] signature verification failed:", msg)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  try {
    console.log(`[webhook] Received Dodo event: ${event.type}`)

    if (event.type.startsWith("subscription.")) {
      await handleSubscriptionChange(event.data as DodoSubscriptionShim)
    }

    return NextResponse.json({ received: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[webhook] error handling verified webhook:", msg)
    // 5xx so Dodo retries. The subscription upsert is keyed on
    // provider_subscription_id, so replaying the same event is safe.
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}
