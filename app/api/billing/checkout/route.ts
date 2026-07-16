import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/db"
import { billingCustomers } from "@/db/schema"
import { eq } from "drizzle-orm"
import { stripe } from "@/lib/stripe"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { plan } = await req.json()
    if (plan !== "monthly" && plan !== "annual") {
      return NextResponse.json({ error: "Invalid plan selection" }, { status: 400 })
    }

    const userId = session.user.id
    const userEmail = session.user.email || ""
    const userName = session.user.name || ""

    // 1. Resolve Stripe Customer ID
    let stripeCustomerId = ""
    const [customerRow] = await db
      .select()
      .from(billingCustomers)
      .where(eq(billingCustomers.userId, userId))
      .limit(1)

    if (customerRow) {
      stripeCustomerId = customerRow.providerCustomerId
    } else {
      // Create new customer in Stripe
      const customer = await stripe.customers.create({
        email: userEmail,
        name: userName,
        metadata: { userId },
      })
      stripeCustomerId = customer.id

      // Store in DB
      await db.insert(billingCustomers).values({
        userId,
        provider: "stripe",
        providerCustomerId: stripeCustomerId,
      })
    }

    // 2. Select Price ID based on plan type
    let priceId = ""
    if (plan === "monthly") {
      priceId = process.env.STRIPE_PRICE_MONTHLY_USD || "price_dummy_monthly"
    } else {
      priceId = process.env.STRIPE_PRICE_ANNUAL_USD || "price_dummy_annual"
    }

    // 3. Create Stripe Checkout Session
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/?tab=settings&checkout=success`,
      cancel_url: `${appUrl}/?tab=settings&checkout=cancel`,
      metadata: { userId },
    })

    if (!checkoutSession.url) {
      throw new Error("Stripe checkout failed to generate redirect URL")
    }

    return NextResponse.json({ url: checkoutSession.url })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[billing-checkout] failed to create checkout session:", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
