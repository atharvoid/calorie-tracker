import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { billingCustomers, subscriptions, productEntitlements } from "@/db/schema"
import { eq, desc } from "drizzle-orm"
import { stripe } from "@/lib/stripe"
import { resolveAccessState } from "@/lib/entitlements"
import type Stripe from "stripe"

export const dynamic = "force-dynamic"

interface StripeSubscriptionShim {
  id: string
  customer: string | object
  status: string
  currency: string
  current_period_start: number
  current_period_end: number
  cancel_at_period_end: boolean
  metadata?: Record<string, string>
  items: {
    data: Array<{
      price: {
        id: string
      }
    }>
  }
}

async function handleSubscriptionChange(rawSub: Stripe.Subscription) {
  const stripeSub = rawSub as unknown as StripeSubscriptionShim
  // 1. Resolve userId from Stripe metadata or billing_customer record
  let userId = (stripeSub.metadata?.userId as string) || ""
  if (!userId) {
    const [custRow] = await db
      .select()
      .from(billingCustomers)
      .where(eq(billingCustomers.providerCustomerId, String(stripeSub.customer)))
      .limit(1)
    userId = custRow?.userId || ""
  }
  if (!userId) {
    console.error("[webhook] Could not resolve userId for customer:", stripeSub.customer)
    return
  }

  // 2. Resolve planKey based on price ID
  const priceId = stripeSub.items.data[0]?.price.id || ""
  const annualPriceId = process.env.STRIPE_PRICE_ANNUAL_USD || "price_dummy_annual"
  const planKey = priceId === annualPriceId ? "personal_annual" : "personal_monthly"

  const currentPeriodStart = new Date(stripeSub.current_period_start * 1000)
  const currentPeriodEnd = new Date(stripeSub.current_period_end * 1000)

  // 3. Upsert subscription table record
  const [existingSub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.providerSubscriptionId, stripeSub.id))
    .limit(1)

  if (existingSub) {
    await db
      .update(subscriptions)
      .set({
        status: stripeSub.status,
        providerPriceId: priceId,
        planKey,
        currency: stripeSub.currency,
        currentPeriodStart,
        currentPeriodEnd,
        cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, existingSub.id))
  } else {
    await db.insert(subscriptions).values({
      userId,
      providerSubscriptionId: stripeSub.id,
      providerPriceId: priceId,
      status: stripeSub.status,
      planKey,
      currency: stripeSub.currency,
      currentPeriodStart,
      currentPeriodEnd,
      cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
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
  const signature = req.headers.get("stripe-signature")
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Missing signature or secret key" }, { status: 400 })
  }

  try {
    const rawBody = await req.text()
    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)

    console.log(`[webhook] Received event: ${event.type} (id: ${event.id})`)

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const subscriptionId = session.subscription as string
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId)
          await handleSubscriptionChange(subscription)
        }
        break
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionChange(subscription)
        break
      }
      case "invoice.paid": {
        const invoice = event.data.object as unknown as { subscription: string | null }
        const subscriptionId = invoice.subscription
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId)
          await handleSubscriptionChange(subscription)
        }
        break
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as unknown as { subscription: string | null }
        const subscriptionId = invoice.subscription
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId)
          await handleSubscriptionChange(subscription)
        }
        break
      }
      default:
        console.log(`[webhook] Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[webhook] error handling webhook:", msg)
    return NextResponse.json({ error: `Webhook Error: ${msg}` }, { status: 400 })
  }
}
