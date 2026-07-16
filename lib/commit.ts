import { db } from "@/db"
import { mealItems } from "@/db/schema"
import { appendMealRows, type MealRow } from "@/lib/sheets-sync"
import { nutritionSchema, type NutritionResult } from "@/lib/nutrition"
import { broadcastNutritionChanged } from "@/lib/realtime"
import { localDate } from "@/lib/nutrition-date"
// Use globalThis.crypto which is available in Node 19+/Next.js runtime
function newId(): string {
  return globalThis.crypto.randomUUID()
}

type CommitInput = {
  userId: string
  nutrition: NutritionResult
  source?: string
  captureId?: string
  timezone?: string
}

type CommitResult = {
  rowCount: number
  date: string
  spreadsheetId: string
  syncWarning?: string
  insertedIds: string[]
}

export async function commitNutrition({
  userId,
  nutrition,
  source = "telegram",
  captureId,
  timezone = "Asia/Kolkata",
}: CommitInput): Promise<CommitResult> {
  // Runtime validation — reject if nutrition data is malformed
  const validated = nutritionSchema.safeParse(nutrition)
  if (!validated.success) {
    throw new Error(
      `Invalid nutrition payload: ${validated.error.issues.map((i) => i.message).join(", ")}`
    )
  }

  const date = localDate(timezone)
  const dbRows: (typeof mealItems.$inferInsert)[] = []
  const sheetRows: MealRow[] = []

  for (const meal of validated.data.meals) {
    for (const item of meal.items) {
      dbRows.push({
        userId,
        date,
        mealType: meal.meal_type ?? null,
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
      })
      sheetRows.push({
        date,
        mealType: meal.meal_type ?? null,
        timeHint: meal.time_hint ?? null,
        name: item.name,
        grams: item.grams,
        kcal: item.kcal,
        proteinG: item.protein_g,
        carbsG: item.carbs_g,
        fatG: item.fat_g,
        notes: item.notes ?? null,
        source,
      })
    }
  }

  // Write to DB first
  let insertedIds: string[] = []
  if (dbRows.length > 0) {
    const inserted = await db
      .insert(mealItems)
      .values(dbRows)
      .returning({ id: mealItems.id })
    insertedIds = inserted.map((r) => r.id)
  }

  // Broadcast nutrition_changed event (non-blocking)
  if (insertedIds.length > 0) {
    void broadcastNutritionChanged(userId, {
      eventId: newId(),
      occurredAt: new Date().toISOString(),
      date,
      mutation: "insert",
      itemIds: insertedIds,
    })
  }

  // Write to Sheet — if it fails, preserve DB rows and return sync warning
  let spreadsheetId = ""
  let syncWarning: string | undefined
  try {
    spreadsheetId = await appendMealRows(userId, sheetRows)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[commit] Sheets sync failed (DB rows preserved):", msg)
    syncWarning = `Sheet sync failed: ${msg}`
    spreadsheetId = ""
  }

  return { rowCount: dbRows.length, date, spreadsheetId, syncWarning, insertedIds }
}
