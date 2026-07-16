import { db } from "@/db"
import { mealItems } from "@/db/schema"
import { appendMealRows, type MealRow } from "@/lib/sheets-sync"
import { nutritionSchema, type NutritionResult } from "@/lib/nutrition"
import { broadcastNutritionChanged } from "@/lib/realtime"
import { localDate } from "@/lib/nutrition-date"


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

  // Intermediate shape before we have IDs
  type PendingSheetRow = Omit<MealRow, "id">
  const pendingSheetRows: PendingSheetRow[] = []

  let idx = 0
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
        itemIndex: captureId ? idx : null,
      })
      pendingSheetRows.push({
        date,
        mealType: meal.meal_type ?? null,
        timeHint: meal.time_hint ?? null,
        name: item.name,
        grams: item.grams ?? null,
        kcal: item.kcal,
        proteinG: item.protein_g,
        carbsG: item.carbs_g,
        fatG: item.fat_g,
        notes: item.notes ?? null,
        source,
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

  // Pair DB IDs into sheet rows (same order guaranteed by Postgres RETURNING)
  const sheetRows: MealRow[] = pendingSheetRows.map((r, i) => ({
    ...r,
    id: insertedIds[i],
  }))

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

  // Write to Sheet — if it fails, preserve DB rows and return sync warning.
  // We only sync if rows were actually inserted (insertedIds.length > 0).
  // This prevents duplicating rows in Google Sheets on Telegram double-tap replays.
  let spreadsheetId = ""
  let syncWarning: string | undefined
  if (insertedIds.length > 0) {
    try {
      spreadsheetId = await appendMealRows(userId, sheetRows)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error("[commit] Sheets sync failed (DB rows preserved):", msg)
      syncWarning = `Sheet sync failed: ${msg}`
      spreadsheetId = ""
    }
  }

  return { rowCount: insertedIds.length, date, spreadsheetId, syncWarning, insertedIds }
}
