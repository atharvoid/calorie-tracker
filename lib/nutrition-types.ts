// Nutrition domain types — pure data shapes, no server imports

import { z } from "zod"

/**
 * Extraction schemas live here, not in `lib/nutrition.ts`.
 *
 * `db/schema.ts` needs `NutritionResult` to type the `pending_capture.payload`
 * JSON column, and it used to import that type from `lib/nutrition.ts`. That
 * inverted the dependency direction: the database layer pulled in the AI SDK,
 * the model client, and the whole extraction prompt just to name a type. Both
 * layers can depend on this module without either depending on the other.
 * See docs/IMPLEMENTATION_PLAN.md, task S-6.
 */

/**
 * Models occasionally return `weight`/`protein`/`carbs`/`fat` instead of the
 * requested `grams`/`protein_g`/`carbs_g`/`fat_g`. Normalising here rather than
 * loosening the schema keeps the stored shape stable.
 */
export const foodItemSchema = z.preprocess(
	(val: unknown) => {
		if (!val || typeof val !== "object") return val
		const copy = { ...(val as Record<string, unknown>) }
		if ("weight" in copy && copy.grams === undefined) {
			copy.grams = copy.weight
		}
		if ("protein" in copy && copy.protein_g === undefined) {
			copy.protein_g = copy.protein
		}
		if ("carbs" in copy && copy.carbs_g === undefined) {
			copy.carbs_g = copy.carbs
		}
		if ("fat" in copy && copy.fat_g === undefined) {
			copy.fat_g = copy.fat
		}
		return copy
	},
	z.object({
		name: z.string().catch("Unknown item").describe("Cleaned item name, Title Case"),
		grams: z
			.number()
			.nullable()
			.default(null)
			.catch(null)
			.describe("Weight in grams, approximated if not stated"),
		kcal: z.number().default(0).catch(0).describe("Estimated kilocalories"),
		protein_g: z.number().default(0).catch(0).describe("Protein in grams"),
		carbs_g: z.number().default(0).catch(0).describe("Carbohydrates in grams"),
		fat_g: z.number().default(0).catch(0).describe("Fat in grams"),
		notes: z
			.string()
			.nullable()
			.default(null)
			.catch(null)
			.describe("Short note on assumptions, e.g. assumed raw, portion approx"),
	})
)

export const mealSchema = z.preprocess(
	(val: unknown) => {
		if (!val || typeof val !== "object") return val
		const copy = { ...(val as Record<string, unknown>) }
		if (!("meal_type" in copy) || copy.meal_type === undefined) {
			copy.meal_type = null
		}
		return copy
	},
	z.object({
		meal_type: z
			.enum(["Breakfast", "Lunch", "Dinner", "Snack"])
			.nullable()
			.optional()
			.default(null)
			.catch(null),
		time_hint: z.string().nullable().optional().default(null).catch(null),
		items: z.array(foodItemSchema).min(1),
	})
)

export const nutritionSchema = z.object({
	meals: z.array(mealSchema).min(1),
})

export type NutritionResult = z.infer<typeof nutritionSchema>
export type FoodItem = z.infer<typeof foodItemSchema>

export type NutritionTotals = {
	kcal: number
	proteinG: number
	carbsG: number
	fatG: number
	itemCount: number
}

export type ResolvedNutritionGoal = {
	date: string
	maintenanceKcal: number | null
	targetKcal: number | null
	proteinTargetG: number | null
	carbsTargetG: number | null
	fatTargetG: number | null
	toleranceKcal: number | null
	source: "override" | "default" | "unconfigured"
}

export type DailyNutritionStatus = "no-data" | "unconfigured" | "under" | "within" | "over"

export type DailyNutritionSummary = {
	date: string
	totals: NutritionTotals | null
	goal: ResolvedNutritionGoal
	remainingToTarget: number | null
	targetDelta: number | null
	maintenanceBalance: number | null
	status: DailyNutritionStatus
	mealCount: number
	assumptionCount: number
}

export type MealItemDTO = {
	id: string
	name: string
	grams: number | null
	kcal: number
	proteinG: number
	carbsG: number
	fatG: number
	notes: string | null
	source: string
	createdAt: string
}

export type MealGroupDTO = {
	mealType: string | null
	timeHint: string | null
	items: MealItemDTO[]
	subtotal: NutritionTotals
}
