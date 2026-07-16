import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { billingCustomers, subscriptions, productEntitlements } from "@/db/schema"
import { eq, desc } from "drizzle-orm"
import { dodo } from "@/lib/dodo"
import { resolveAccessState } from "@/lib/entitlements"

export const dynamic = "force-dynamic"

// Define a minimal interface for Dodo Subscription based on SDK types
interface DodoSubscriptionShim {
  subscription_id: string
  status: string
  currency: string
  created_at: string
  previous_billing_date: string | null
  next_billing_date: string | null
  cancel_at_next_billing_date: boolean
  product_id: string
  metadata?: Record<string, any>
  customer: {
    customer_id: string
    email: string
    name: string
  }
}

async function handleSubscriptionChange(dodoSub: DodoSubscriptionShim) {
  // 1. Resolve userId from Dodo metadata or billing_customer record
  let userId = (dodoSub.metadata?.userId as string) || ""
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
        provider: "dodopayments",
        providerCustomerId: customerId,
      })
      .onConflictDoNothing()
  }

  // 2. Resolve planKey based on product_id
  const productId = dodoSub.product_id || ""
  const annualProductId = process.env.DODO_PRODUCT_ANNUAL_ID || "p_annual_placeholder"
  const planKey = productId === annualProductId ? "personal_annual" : "personal_monthly"

  const currentPeriodStart = new Date(dodoSub.previous_billing_date || dodoSub.created_at || new Date())
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
        status: dodoSub.status,
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
      status: dodoSub.status,
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

  // Query latest sub
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

  try {
    const rawBody = await req.text()
    
    // Unwrap webhook using Dodo SDK (validates signature)
    const event = dodo.webhooks.unwrap(rawBody, {
      headers: {
        "webhook-id": webhookId,
        "webhook-signature": signature,
        "webhook-timestamp": webhookTimestamp,
      },
      key: webhookSecret,
    })

    console.log(`[webhook] Received Dodo event: ${event.type}`)

    if (event.type.startsWith("subscription.")) {
      const subscription = event.data as any
      await handleSubscriptionChange(subscription)
    }

    return NextResponse.json({ received: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[webhook] error handling webhook:", msg)
    return NextResponse.json({ error: `Webhook Error: ${msg}` }, { status: 400 })
  }
}
