import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/db"
import { billingCustomers } from "@/db/schema"
import { eq } from "drizzle-orm"
import { dodo } from "@/lib/dodo"

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

    // 1. Resolve Dodo Product ID based on plan type
    let productId = ""
    if (plan === "monthly") {
      productId = process.env.DODO_PRODUCT_MONTHLY_ID || "p_monthly_placeholder"
    } else {
      productId = process.env.DODO_PRODUCT_ANNUAL_ID || "p_annual_placeholder"
    }

    // 2. Create Dodo Checkout Session
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const checkoutSession = await dodo.checkoutSessions.create({
      product_cart: [{ product_id: productId, quantity: 1 }],
      customer: {
        email: userEmail,
        name: userName,
      },
      metadata: { userId },
      return_url: `${appUrl}/?tab=settings&checkout=success`,
      cancel_url: `${appUrl}/?tab=settings&checkout=cancel`,
    })

    if (!checkoutSession.checkout_url) {
      throw new Error("Dodo Payments checkout failed to generate redirect URL")
    }

    return NextResponse.json({ url: checkoutSession.checkout_url })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[billing-checkout] failed to create checkout session:", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
