import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/db"
import { sql } from "drizzle-orm"

export const dynamic = "force-dynamic"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Optional: Restrict to admin emails or local development
  const isDev = process.env.NODE_ENV === "development"
  const userEmail = session.user.email || ""
  const isAdmin = isDev || userEmail.includes("atharva") || userEmail === "admin@example.com"

  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    // 1. Total registered users
    const usersCount = (await db.execute(sql`SELECT count(*)::int as count FROM "user"`)) as unknown as { count: number }[]
    const totalUsers = usersCount[0]?.count ?? 0

    // 2. Active Subscribers count
    const subscribersCount = (await db.execute(
      sql`SELECT count(DISTINCT user_id)::int as count FROM "subscription" WHERE status IN ('active', 'trialing')`
    )) as unknown as { count: number }[]
    const activeSubscribers = subscribersCount[0]?.count ?? 0

    // 3. Trials started count
    const trialsCount = (await db.execute(
      sql`SELECT count(*)::int as count FROM "product_entitlement" WHERE trial_started_at IS NOT NULL`
    )) as unknown as { count: number }[]
    const trialsStarted = trialsCount[0]?.count ?? 0

    // 4. Daily Active Users (DAU) - users who committed meals or triggered usage in the last 24h
    const dauCount = (await db.execute(
      sql`
        SELECT count(DISTINCT user_id)::int as count FROM (
          SELECT user_id FROM "meal_item" WHERE created_at > now() - interval '24 hours'
          UNION
          SELECT user_id FROM "usage_event" WHERE created_at > now() - interval '24 hours'
        ) active_users
      `
    )) as unknown as { count: number }[]
    const dau = dauCount[0]?.count ?? 0

    // 5. Activation Rate: users who have committed at least 1 meal / total users
    const activatedUsersCount = (await db.execute(
      sql`SELECT count(DISTINCT user_id)::int as count FROM "meal_item"`
    )) as unknown as { count: number }[]
    const activatedUsers = activatedUsersCount[0]?.count ?? 0
    const activationRate = totalUsers > 0 ? Math.round((activatedUsers / totalUsers) * 100) : 0

    // 6. Token counters & AI Cost Metering (from usage events)
    const usageStatsResult = (await db.execute(
      sql`
        SELECT 
          coalesce(sum(input_tokens), 0)::int as input,
          coalesce(sum(output_tokens), 0)::int as output,
          coalesce(sum(estimated_cost_micros), 0)::bigint as cost_micros
        FROM "usage_event"
      `
    )) as unknown as { input: number; output: number; cost_micros: string | number }[]
    const usageStats = usageStatsResult[0]
    const inputTokens = usageStats?.input ?? 0
    const outputTokens = usageStats?.output ?? 0
    const aiCostMicros = Number(usageStats?.cost_micros ?? 0)
    const aiCostUsd = aiCostMicros / 1000000

    // 7. Financial Calculations (Estimated Monthly Revenue & Gross Margin)
    const estimatedMonthlyRev = activeSubscribers * 2.99
    // Gross margin = Monthly revenue - AI cost (approximated for display)
    const grossMarginPercent =
      estimatedMonthlyRev > 0
        ? Math.round(((estimatedMonthlyRev - aiCostUsd) / estimatedMonthlyRev) * 100)
        : 0

    return NextResponse.json({
      metrics: {
        totalUsers,
        activeSubscribers,
        trialsStarted,
        dau,
        activationRatePercent: activationRate,
        tokens: {
          input: inputTokens,
          output: outputTokens,
        },
        costs: {
          aiCostUsd,
          databaseHostingEstimateUsd: 5.0, // base baseline references
        },
        financials: {
          estimatedMonthlyRevenueUsd: estimatedMonthlyRev,
          grossMarginPercent,
        },
      },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[admin-dashboard] failed to compile business metrics:", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
