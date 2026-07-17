import { z } from "zod"
import { generateObject } from "ai"
import { TEXT_MODEL } from "@/lib/ai"

const foodItemSchema = z.preprocess(
	(val: any) => {
		if (!val || typeof val !== "object") return val;
		const copy = { ...val };
		if ("weight" in copy && copy.grams === undefined) {
			copy.grams = copy.weight;
		}
		if ("protein" in copy && copy.protein_g === undefined) {
			copy.protein_g = copy.protein;
		}
		if ("carbs" in copy && copy.carbs_g === undefined) {
			copy.carbs_g = copy.carbs;
		}
		if ("fat" in copy && copy.fat_g === undefined) {
			copy.fat_g = copy.fat;
		}
		return copy;
	},
	z.object({
		name: z.string().catch("Unknown item").describe("Cleaned item name, Title Case"),
		grams: z.number().nullable().default(null).catch(null).describe("Weight in grams, approximated if not stated"),
		kcal: z.number().default(0).catch(0).describe("Estimated kilocalories"),
		protein_g: z.number().default(0).catch(0).describe("Protein in grams"),
		carbs_g: z.number().default(0).catch(0).describe("Carbohydrates in grams"),
		fat_g: z.number().default(0).catch(0).describe("Fat in grams"),
		notes: z.string().nullable().default(null).catch(null).describe("Short note on assumptions, e.g. assumed raw, portion approx"),
	})
)

const mealSchema = z.preprocess(
	(val: any) => {
		if (!val || typeof val !== "object") return val;
		const copy = { ...val };
		if (!("meal_type" in copy) || copy.meal_type === undefined) {
			copy.meal_type = null;
		}
		return copy;
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

export const NUTRITION_SYSTEM = `You are a global nutrition estimator.
Given a free-form message describing what a person ate, extract EVERY food item and estimate its calories + macronutrients (protein, carbs, fat in grams).

Input & Translation Guidelines:
- Support natural language descriptions. Users may write in English, Hinglish, or mix other languages.
- Support food names from different cuisines in their original form (e.g. tacos, sushi, shawarma, roti, paneer, jollof rice).
- Do not translate or transliterate food names in the final JSON output; preserve the user's specific food names.
- Responses and notes must be in English.

Estimation Rules:
- Support home-cooked meals, restaurant dishes, packaged foods, and brand names.
- If the user specifies explicit raw vs cooked weights (e.g. "200g raw chicken breast"), calculate values for that state.
- Interpret household measurements (cups, spoons, bowls, slices, pieces) using standard weights.
- Take preparation methods (fried, boiled, baked, grilled, steamed) into account.
- For mixed recipes/dishes (e.g. burrito bowls, stir-fry, pasta, dal tadka), estimate based on standard home-cooked or restaurant preparation ratios.
- Material assumptions must be noted in 'notes' (e.g. "assumed raw", "portion approx", "medium oil", "standard recipe").
- If serving details are completely missing, assume a standard single-serving portion and state the assumed grams in the notes.
- Never invent metrics not defined in the schema.
- If you cannot estimate a food item, set its macros and calories to 0 and state the reason in notes.

Small Balanced Reference Set (Use for calorie/macro scaling, not hardcoded outputs):
- Eggs: 1 large egg ≈ 70 kcal | P 6g C 0g F 5g
- Toast: 1 slice white/whole wheat ≈ 75 kcal | P 3g C 15g F 1g
- Greek Yogurt (plain, low-fat): 100g ≈ 60 kcal | P 10g C 4g F 0g
- Chicken Breast (cooked): 100g ≈ 165 kcal | P 31g C 0g F 3.6g
- White Rice (cooked): 100g ≈ 130 kcal | P 2.7g C 28g F 0.3g
- Tacos (beef, hard shell): 1 standard taco ≈ 150-200 kcal | P 8g C 16g F 10g
- Burrito Bowl (chicken, rice, beans): 1 standard bowl ≈ 650 kcal | P 40g C 70g F 22g
- Hummus: 1 tbsp (15g) ≈ 25 kcal | P 1g C 2g F 2g
- Pita Bread: 1 standard pocket ≈ 150 kcal | P 5g C 30g F 1g
- Jollof Rice: 1 cup ≈ 300 kcal | P 6g C 50g F 8g
- Roti/Chapati: 1 standard plain roti ≈ 85 kcal | P 3g C 18g F 0.5g
- Dal Tadka: 1 small bowl (150g) ≈ 120 kcal | P 5g C 16g F 4g (assumed 1 tsp oil)
- Paneer Sabji: 1 portion (150g) ≈ 250 kcal | P 12g C 8g F 18g

Meal Classification Rules:
- Always set meal_type to one of: Breakfast, Lunch, Dinner, Snack. Only leave it null if there is absolutely no context clue.
- Infer from: explicit keywords (breakfast, lunch, dinner, snack, supper, brunch, chai, evening snack), time references (morning → Breakfast, noon/midday → Lunch, evening → Dinner or Snack, night → Dinner), or food type (oats/poha/idli → Breakfast, rice+dal+sabji → Lunch or Dinner, fruit/nuts/shake → Snack).
- When unsure between Lunch and Dinner for a rice+dal meal, default to Dinner.
- Always set time_hint to the literal time or time-of-day phrase the user mentioned (e.g. "9:00", "morning", "afternoon", "in the evening"). Only leave it null if no time was mentioned.

Return ONE JSON object matching the given schema. No commentary outside the JSON.`

export async function extractNutrition(
	text: string,
	userId: string,
	requestId: string,
	source: "web" | "telegram" = "telegram"
): Promise<NutritionResult> {
	// 1. Assert entitlement first before calling Gemini API
	const { assertCanUseAiLog, recordAiUsage } = await import("@/lib/entitlements")
	await assertCanUseAiLog(userId)

	const modelName = "gemini-2.5-flash"
	try {
		const { object, usage } = await generateObject({
			model: TEXT_MODEL,
			schema: nutritionSchema,
			system: NUTRITION_SYSTEM,
			prompt: text,
			temperature: 0,
			abortSignal: AbortSignal.timeout(30000),
		})
		console.log("Raw Gemini response:", JSON.stringify(object, null, 2))

		// 2. Record success usage event
		await recordAiUsage(userId, {
			requestId,
			source,
			model: modelName,
			inputTokens: usage?.inputTokens || 0,
			outputTokens: usage?.outputTokens || 0,
			success: true,
		})

		return object
	} catch (err: any) {
		const isEntitlementError = err.message?.includes("free trial") || err.message?.includes("limit reached")
		if (!isEntitlementError) {
			await recordAiUsage(userId, {
				requestId,
				source,
				model: modelName,
				success: false,
				failureCategory: err.message || String(err),
			})
		}
		throw err
	}
}
