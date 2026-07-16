import { eq } from "drizzle-orm"
import { db } from "@/db"
import { sheetConnections } from "@/db/schema"
import { getGoogleAuth, sheetsClient } from "./google"
import type { NormalizedRow } from "./types"

// ─── Legacy Orders helpers (kept for backwards-compat with any stale routes) ──

const ORDERS_HEADER = [
	"Customer",
	"Quantity",
	"Unit",
	"Rate",
	"Amount",
	"Date",
	"Status",
	"Source",
]

export async function getConnection(userId: string) {
	const [conn] = await db
		.select()
		.from(sheetConnections)
		.where(eq(sheetConnections.userId, userId))
		.limit(1)
	return conn ?? null
}

// ─── Calorie Tracker sheet helpers ────────────────────────────────────────────

const MEALS_HEADER = [
	"Item ID",
	"Date",
	"Meal",
	"Time",
	"Item",
	"Grams",
	"kcal",
	"Protein (g)",
	"Carbs (g)",
	"Fat (g)",
	"Notes",
	"Source",
]

export async function ensureMealSheet(userId: string): Promise<string> {
	const existing = await getConnection(userId)
	if (existing) return existing.spreadsheetId

	const sheets = sheetsClient(await getGoogleAuth(userId))
	const created = await sheets.spreadsheets.create({
		requestBody: {
			properties: { title: "Calorie Tracker — Data Assistant" },
			sheets: [{ properties: { title: "Meals" } }],
		},
	})
	const spreadsheetId = created.data.spreadsheetId as string

	await sheets.spreadsheets.values.update({
		spreadsheetId,
		range: "Meals!A1",
		valueInputOption: "RAW",
		requestBody: { values: [MEALS_HEADER] },
	})

	await db
		.insert(sheetConnections)
		.values({ userId, spreadsheetId, sheetTitle: "Meals" })
	return spreadsheetId
}

export type MealRow = {
	id?: string			// meal_item.id — included for new rows; absent for legacy rows
	date: string
	mealType: string | null
	timeHint: string | null
	name: string
	grams: number | null
	kcal: number
	proteinG: number
	carbsG: number
	fatG: number
	notes: string | null
	source: string
}

export async function appendMealRows(
	userId: string,
	rows: MealRow[]
): Promise<string> {
	const spreadsheetId = await ensureMealSheet(userId)
	const sheets = sheetsClient(await getGoogleAuth(userId))
	const values = rows.map((r) => [
		r.id ?? "",		// Item ID — empty for rows committed before this migration
		r.date,
		r.mealType ?? "",
		r.timeHint ?? "",
		r.name,
		r.grams ?? "",
		r.kcal,
		r.proteinG,
		r.carbsG,
		r.fatG,
		r.notes ?? "",
		r.source,
	])
	await sheets.spreadsheets.values.append({
		spreadsheetId,
		range: "Meals!A1",
		valueInputOption: "USER_ENTERED",
		requestBody: { values },
	})
	return spreadsheetId
}

export async function readMealRows(userId: string, limit = 100) {
	const conn = await getConnection(userId)
	if (!conn)
		return {
			header: MEALS_HEADER,
			rows: [] as string[][],
			spreadsheetId: null,
		}
	const sheets = sheetsClient(await getGoogleAuth(userId))
	const res = await sheets.spreadsheets.values.get({
		spreadsheetId: conn.spreadsheetId,
		range: "Meals!A1:K",
	})
	const all = res.data.values ?? []
	const body = all.slice(1)
	return {
		header: all[0] ?? MEALS_HEADER,
		rows: body.slice(-limit) as string[][],
		spreadsheetId: conn.spreadsheetId,
	}
}

// ─── Legacy append/read (kept for any existing routes) ────────────────────────

export async function appendRows(
	userId: string,
	rows: NormalizedRow[],
	source = "site"
): Promise<string> {
	const spreadsheetId = await ensureMealSheet(userId)
	const sheets = sheetsClient(await getGoogleAuth(userId))
	const values = rows.map((r) => [
		r.customer,
		r.quantity,
		r.unit,
		r.rate,
		r.amount,
		r.date,
		r.status,
		source,
	])
	await sheets.spreadsheets.values.append({
		spreadsheetId,
		range: "Meals!A1",
		valueInputOption: "USER_ENTERED",
		requestBody: { values },
	})
	return spreadsheetId
}

export async function readRows(userId: string, limit = 100) {
	return readMealRows(userId, limit)
}
