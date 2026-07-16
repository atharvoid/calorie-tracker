import { db } from "@/db"
import { mealItems } from "@/db/schema"
import { appendMealRows, type MealRow } from "@/lib/sheets-sync"
import type { NutritionResult } from "@/lib/nutrition"

function todayIST(): string {
	return new Date()
		.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })
}

export async function commitNutrition(
	userId: string,
	nutrition: NutritionResult,
	source = "telegram"
): Promise<{ rowCount: number; spreadsheetId: string }> {
	const date = todayIST()
	const dbRows: (typeof mealItems.$inferInsert)[] = []
	const sheetRows: MealRow[] = []

	for (const meal of nutrition.meals) {
		for (const item of meal.items) {
			const base = {
				userId,
				date,
				mealType: meal.meal_type,
				timeHint: meal.time_hint,
				name: item.name,
				grams: item.grams != null ? String(item.grams) : null,
				kcal: String(item.kcal),
				proteinG: String(item.protein_g),
				carbsG: String(item.carbs_g),
				fatG: String(item.fat_g),
				notes: item.notes,
				source,
			}
			dbRows.push(base)
			sheetRows.push({
				date,
				mealType: meal.meal_type,
				timeHint: meal.time_hint,
				name: item.name,
				grams: item.grams,
				kcal: item.kcal,
				proteinG: item.protein_g,
				carbsG: item.carbs_g,
				fatG: item.fat_g,
				notes: item.notes,
				source,
			})
		}
	}

	// Write to DB
	if (dbRows.length > 0) {
		await db.insert(mealItems).values(dbRows)
	}

	// Write to Sheet
	const spreadsheetId = await appendMealRows(userId, sheetRows)

	return { rowCount: dbRows.length, spreadsheetId }
}
