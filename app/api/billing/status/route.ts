import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getUserEntitlement } from "@/lib/entitlements"

export const dynamic = "force-dynamic"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const entitlement = await getUserEntitlement(session.user.id)
    return NextResponse.json(entitlement)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[billing-status] failed to get entitlement:", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
