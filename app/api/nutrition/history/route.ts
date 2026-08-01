export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getSettings, getMealItemsForRange, getDayOverridesForRange } from "@/lib/nutrition-queries"
import { computeDailySummary } from "@/lib/nutrition-calculations"
import { dateRange } from "@/lib/nutrition-date"
import type { DailyNutritionSummary } from "@/lib/nutrition-types"
import { z } from "zod"
import { parseAndValidateQuery } from "@/lib/validation"

export const runtime = "nodejs"

type ErrorBody = { error: { code: string; message: string } }

function errResponse(code: string, message: string, status: number): NextResponse<ErrorBody> {
	return NextResponse.json({ error: { code, message } }, { status })
}

export async function GET(req: NextRequest): Promise<NextResponse> {
	const session = await auth()
	if (!session?.user?.id) return errResponse("UNAUTHORIZED", "Not signed in", 401)

	const queryResult = parseAndValidateQuery(
		req.url,
		z.object({
			start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
			end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
			sort: z.enum(["newest", "oldest", "kcal-high", "kcal-low"]).optional().default("newest"),
			status: z
				.enum(["all", "logged", "no-data", "unconfigured", "under", "within", "over"])
				.optional()
				.default("all"),
		})
	)
	if (!queryResult.success) return queryResult.response
	const { start, end, sort, status: statusFilter } = queryResult.data

	if (end < start) {
		return errResponse("INVALID_RANGE", "end must be >= start", 400)
	}

	const dates = dateRange(start, end) // max 366
	if (dates.length > 366) {
		return errResponse("RANGE_TOO_LARGE", "Max 366 days per request", 400)
	}

	const userId = session.user.id

	// 3 queries, no N+1
	const [allItems, settings, allOverrides] = await Promise.all([
		getMealItemsForRange(userId, start, end),
		getSettings(userId),
		getDayOverridesForRange(userId, start, end),
	])

	// Group items by date
	const itemsByDate = new Map<string, typeof allItems>()
	for (const item of allItems) {
		const existing = itemsByDate.get(item.date)
		if (existing) {
			existing.push(item)
		} else {
			itemsByDate.set(item.date, [item])
		}
	}

	// Index overrides by date
	const overrideByDate = new Map(allOverrides.map((o) => [o.date, o]))

	// Build summaries for ALL dates (missing = totals: null)
	let summaries: DailyNutritionSummary[] = dates.map((date) => {
		const items = itemsByDate.get(date) ?? []
		const override = overrideByDate.get(date) ?? null
		return computeDailySummary(date, items, settings, override)
	})

	// Filter
	if (statusFilter === "logged") {
		summaries = summaries.filter((s) => s.totals !== null)
	} else if (statusFilter !== "all") {
		summaries = summaries.filter((s) => s.status === statusFilter)
	}

	// Sort
	switch (sort) {
		case "oldest":
			summaries.sort((a, b) => a.date.localeCompare(b.date))
			break
		case "kcal-high":
			summaries.sort((a, b) => (b.totals?.kcal ?? -1) - (a.totals?.kcal ?? -1))
			break
		case "kcal-low":
			summaries.sort((a, b) => (a.totals?.kcal ?? 999999) - (b.totals?.kcal ?? 999999))
			break
		default: // "newest"
			summaries.sort((a, b) => b.date.localeCompare(a.date))
	}

	return NextResponse.json({ summaries, total: dates.length })
}
