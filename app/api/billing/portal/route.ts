import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/db"
import { billingCustomers } from "@/db/schema"
import { eq } from "drizzle-orm"
import { stripe } from "@/lib/stripe"

export const dynamic = "force-dynamic"

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const userId = session.user.id
    const [customerRow] = await db
      .select()
      .from(billingCustomers)
      .where(eq(billingCustomers.userId, userId))
      .limit(1)

    if (!customerRow) {
      return NextResponse.json(
        { error: "No active billing profile found. Please subscribe first." },
        { status: 400 }
      )
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerRow.providerCustomerId,
      return_url: `${appUrl}/?tab=settings`,
    })

    if (!portalSession.url) {
      throw new Error("Stripe portal failed to generate redirect URL")
    }

    return NextResponse.json({ url: portalSession.url })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[billing-portal] failed to create portal session:", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
