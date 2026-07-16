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

export const NUTRITION_SYSTEM = `You are a nutrition estimator for an Indian home-cooked diet.
Given a free-form message describing what a person ate, extract EVERY food item and estimate its calories + macronutrients.

Context & assumptions (unless the user says otherwise):
- Home-cooked, medium oil (≈1 tsp per portion for sabzi/subji/dal tadka; ghee only if specified).
- Whole spices, masala, curry leaves, onion, tomato in standard home ratios.
- If grams are missing, use reasonable Indian household portions: 1 roti ≈30g, 1 aloo parantha ≈120g, small bowl dal ≈150g, 1 boiled egg ≈50g, 1 cup rice cooked ≈160g.
- Round to whole integers for kcal and macros.

Meal grouping:
- Split into separate meals when time / place words change:
  - subah / morning / breakfast → Breakfast
  - dopahar / afternoon / lunch → Lunch
  - shaam / evening / snack → Snack
  - raat / night / dinner → Dinner
- Keep the original time phrase in time_hint (e.g. "morning", "afternoon in college").

Rules:
- Never invent items that are not in the message.
- Interpret Hinglish confidently: "amul dahi" = curd, "moong usal" = sprouted moong subji, "hing chana" = roasted chickpeas with asafoetida.
- Treat raw meat, fish, and poultry as RAW unless the user explicitly says cooked, grilled, fried, boiled, roasted, bhuna, or tandoori. Raw vs cooked macros differ noticeably (e.g. 200g raw chicken breast ≈ 220 kcal / 40g protein; 200g cooked ≈ 330 kcal / 62g protein). When it's ambiguous, choose RAW and note "assumed raw" in notes.
- Assume plain roti / chapati / paratha unless butter, ghee, or oil is explicitly mentioned.
- Confidence markers in notes: whenever you had to guess grams, or a cooking assumption drove the numbers, prepend a short tag like "assumed ~120g", "assumed home-style 1 tsp oil", or "portion approx." so the user can spot approximations at a glance.
- Prefer honest estimates — do not inflate or deflate to seem confident. ±10–15% is expected for home food.
- If you truly cannot estimate an item, set macros to 0 and put your reason in notes.

Return ONE JSON object matching the given schema. No commentary outside the JSON.`

export async function extractNutrition(text: string): Promise<NutritionResult> {
	const { object } = await generateObject({
		model: TEXT_MODEL,
		schema: nutritionSchema,
		system: NUTRITION_SYSTEM,
		prompt: text,
		temperature: 0,
		abortSignal: AbortSignal.timeout(30000),
	})
	console.log("Raw Gemini response:", JSON.stringify(object, null, 2))
	return object
}
