import { db } from "@/db"
import { mealItems } from "@/db/schema"
import { nutritionSchema, type NutritionResult } from "@/lib/nutrition"
import { broadcastNutritionChanged } from "@/lib/realtime"
import { localDate } from "@/lib/nutrition-date"

// Derived from the schema rather than restated, so these cannot drift from the
// column definitions the way a hand-copied union would.
type MealItemInsert = typeof mealItems.$inferInsert
type DbMealType = MealItemInsert["mealType"]
type DbLogSource = MealItemInsert["source"]

type CommitInput = {
	userId: string
	nutrition: NutritionResult
	source?: DbLogSource
	captureId?: string
	timezone?: string
	logDate?: string
}

type CommitResult = {
	rowCount: number
	date: string
	insertedIds: string[]
}

export async function commitNutrition({
	userId,
	nutrition,
	source = "telegram",
	captureId,
	timezone = "Asia/Kolkata",
	logDate,
}: CommitInput): Promise<CommitResult> {
	// Runtime validation — reject if nutrition data is malformed
	const validated = nutritionSchema.safeParse(nutrition)
	if (!validated.success) {
		throw new Error(
			`Invalid nutrition payload: ${validated.error.issues.map((i) => i.message).join(", ")}`
		)
	}

	const date = logDate || localDate(timezone)
	const dbRows: MealItemInsert[] = []

	let idx = 0
	for (const meal of validated.data.meals) {
		// nutritionSchema has already constrained meal_type, but Zod infers it as a
		// plain string. Narrowing here is safe because of that validation; if the
		// schema ever widens, this is the line that should start failing.
		const mealType = (meal.meal_type ?? null) as DbMealType

		for (const item of meal.items) {
			dbRows.push({
				userId,
				date,
				mealType,
				timeHint: meal.time_hint ?? null,
				name: item.name,
				grams: item.grams != null ? String(item.grams) : null,
				kcal: String(item.kcal),
				proteinG: String(item.protein_g),
				carbsG: String(item.carbs_g),
				fatG: String(item.fat_g),
				notes: item.notes ?? null,
				source,
				captureId: captureId ?? null,
				itemIndex: captureId ? idx : null,
			})
			idx++
		}
	}

	// Write to DB first — get stable IDs back.
	// onConflictDoNothing handles concurrent Telegram double-tap: the partial unique
	// index on (user_id, capture_id, item_index) WHERE capture_id IS NOT NULL silently
	// discards duplicate rows instead of throwing a constraint error.
	let insertedIds: string[] = []
	if (dbRows.length > 0) {
		const inserted = await db
			.insert(mealItems)
			.values(dbRows)
			.onConflictDoNothing()
			.returning({ id: mealItems.id })
		insertedIds = inserted.map((r) => r.id)

		if (insertedIds.length > 0) {
			// Trigger trial start on first committed meal
			const { getUserEntitlement, startTrialOnFirstMeal } = await import("@/lib/entitlements")
			try {
				const ent = await getUserEntitlement(userId)
				if (ent.accessState === "pre_trial") {
					await startTrialOnFirstMeal(userId)
				}
			} catch (err) {
				console.error("[commit] Failed to start free trial:", err)
			}
		}
	}

	// Broadcast nutrition_changed event (non-blocking)
	if (insertedIds.length > 0) {
		void broadcastNutritionChanged(userId, {
			eventId: globalThis.crypto.randomUUID(),
			occurredAt: new Date().toISOString(),
			date,
			mutation: "insert",
			itemIds: insertedIds,
		})
	}

	return {
		rowCount: insertedIds.length,
		date,
		insertedIds,
	}
}
