/**
 * Server-only nutrition query functions.
 * ALL functions require userId derived from session — never from client input.
 * Uses drizzle ORM with type-safe queries.
 */
import { and, eq, gte, lte } from "drizzle-orm"
import { db } from "@/db"
import {
  nutritionSettings,
  nutritionDayOverrides,
  mealItems,
} from "@/db/schema"
import { z } from "zod"

// ── Settings ──────────────────────────────────────────────────────────────────

export type SettingsInput = {
  maintenanceKcal?: number | null
  targetKcal?: number | null
  proteinTargetG?: number | null
  carbsTargetG?: number | null
  fatTargetG?: number | null
  targetToleranceKcal?: number | null
  timezone?: string
}

export const settingsInputSchema = z.object({
  maintenanceKcal: z.number().int().min(800).max(8000).nullable().optional(),
  targetKcal: z.number().int().min(800).max(8000).nullable().optional(),
  proteinTargetG: z.number().min(0).max(500).nullable().optional(),
  carbsTargetG: z.number().min(0).max(1000).nullable().optional(),
  fatTargetG: z.number().min(0).max(500).nullable().optional(),
  targetToleranceKcal: z.number().int().min(0).max(1000).nullable().optional(),
  timezone: z.string().optional(),
})

export async function getSettings(
  userId: string
): Promise<typeof nutritionSettings.$inferSelect | null> {
  const [row] = await db
    .select()
    .from(nutritionSettings)
    .where(eq(nutritionSettings.userId, userId))
    .limit(1)
  return row ?? null
}

export async function upsertSettings(
  userId: string,
  data: SettingsInput
): Promise<typeof nutritionSettings.$inferSelect> {
  const existing = await getSettings(userId)
  if (existing) {
    const [updated] = await db
      .update(nutritionSettings)
      .set({
        maintenanceKcal:
          data.maintenanceKcal !== undefined
            ? data.maintenanceKcal
            : existing.maintenanceKcal,
        targetKcal:
          data.targetKcal !== undefined ? data.targetKcal : existing.targetKcal,
        proteinTargetG:
          data.proteinTargetG !== undefined
            ? data.proteinTargetG !== null
              ? String(data.proteinTargetG)
              : null
            : existing.proteinTargetG,
        carbsTargetG:
          data.carbsTargetG !== undefined
            ? data.carbsTargetG !== null
              ? String(data.carbsTargetG)
              : null
            : existing.carbsTargetG,
        fatTargetG:
          data.fatTargetG !== undefined
            ? data.fatTargetG !== null
              ? String(data.fatTargetG)
              : null
            : existing.fatTargetG,
        targetToleranceKcal:
          data.targetToleranceKcal !== undefined
            ? data.targetToleranceKcal
            : existing.targetToleranceKcal,
        timezone: data.timezone ?? existing.timezone,
        updatedAt: new Date(),
      })
      .where(eq(nutritionSettings.userId, userId))
      .returning()
    return updated
  }

  const [inserted] = await db
    .insert(nutritionSettings)
    .values({
      userId,
      maintenanceKcal: data.maintenanceKcal ?? null,
      targetKcal: data.targetKcal ?? null,
      proteinTargetG:
        data.proteinTargetG !== null && data.proteinTargetG !== undefined
          ? String(data.proteinTargetG)
          : null,
      carbsTargetG:
        data.carbsTargetG !== null && data.carbsTargetG !== undefined
          ? String(data.carbsTargetG)
          : null,
      fatTargetG:
        data.fatTargetG !== null && data.fatTargetG !== undefined
          ? String(data.fatTargetG)
          : null,
      targetToleranceKcal: data.targetToleranceKcal ?? null,
      timezone: data.timezone ?? "Asia/Kolkata",
    })
    .returning()
  return inserted
}

// ── Day Overrides ─────────────────────────────────────────────────────────────

export type OverrideInput = {
  maintenanceKcal?: number | null
  targetKcal?: number | null
  proteinTargetG?: number | null
  carbsTargetG?: number | null
  fatTargetG?: number | null
  reason?: string | null
}

export const overrideInputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  maintenanceKcal: z.number().int().min(800).max(8000).nullable().optional(),
  targetKcal: z.number().int().min(800).max(8000).nullable().optional(),
  proteinTargetG: z.number().min(0).max(500).nullable().optional(),
  carbsTargetG: z.number().min(0).max(1000).nullable().optional(),
  fatTargetG: z.number().min(0).max(500).nullable().optional(),
  reason: z.string().max(200).nullable().optional(),
})

export async function getDayOverride(
  userId: string,
  date: string
): Promise<typeof nutritionDayOverrides.$inferSelect | null> {
  const [row] = await db
    .select()
    .from(nutritionDayOverrides)
    .where(
      and(
        eq(nutritionDayOverrides.userId, userId),
        eq(nutritionDayOverrides.date, date)
      )
    )
    .limit(1)
  return row ?? null
}

export async function upsertDayOverride(
  userId: string,
  date: string,
  data: OverrideInput
): Promise<typeof nutritionDayOverrides.$inferSelect> {
  const [row] = await db
    .insert(nutritionDayOverrides)
    .values({
      userId,
      date,
      maintenanceKcal: data.maintenanceKcal ?? null,
      targetKcal: data.targetKcal ?? null,
      proteinTargetG:
        data.proteinTargetG !== null && data.proteinTargetG !== undefined
          ? String(data.proteinTargetG)
          : null,
      carbsTargetG:
        data.carbsTargetG !== null && data.carbsTargetG !== undefined
          ? String(data.carbsTargetG)
          : null,
      fatTargetG:
        data.fatTargetG !== null && data.fatTargetG !== undefined
          ? String(data.fatTargetG)
          : null,
      reason: data.reason ?? null,
    })
    .onConflictDoUpdate({
      target: [nutritionDayOverrides.userId, nutritionDayOverrides.date],
      set: {
        maintenanceKcal: data.maintenanceKcal ?? null,
        targetKcal: data.targetKcal ?? null,
        proteinTargetG:
          data.proteinTargetG !== null && data.proteinTargetG !== undefined
            ? String(data.proteinTargetG)
            : null,
        carbsTargetG:
          data.carbsTargetG !== null && data.carbsTargetG !== undefined
            ? String(data.carbsTargetG)
            : null,
        fatTargetG:
          data.fatTargetG !== null && data.fatTargetG !== undefined
            ? String(data.fatTargetG)
            : null,
        reason: data.reason ?? null,
        updatedAt: new Date(),
      },
    })
    .returning()
  return row
}

export async function deleteDayOverride(
  userId: string,
  date: string
): Promise<void> {
  await db
    .delete(nutritionDayOverrides)
    .where(
      and(
        eq(nutritionDayOverrides.userId, userId),
        eq(nutritionDayOverrides.date, date)
      )
    )
}

// ── Meal Items ────────────────────────────────────────────────────────────────

export async function getMealItemsForDate(
  userId: string,
  date: string
): Promise<(typeof mealItems.$inferSelect)[]> {
  return db
    .select()
    .from(mealItems)
    .where(and(eq(mealItems.userId, userId), eq(mealItems.date, date)))
    .orderBy(mealItems.createdAt)
}

export async function getMealItemsForRange(
  userId: string,
  start: string,
  end: string
): Promise<(typeof mealItems.$inferSelect)[]> {
  return db
    .select()
    .from(mealItems)
    .where(
      and(
        eq(mealItems.userId, userId),
        gte(mealItems.date, start),
        lte(mealItems.date, end)
      )
    )
    .orderBy(mealItems.date, mealItems.createdAt)
}

export type ItemUpdateInput = {
  name?: string
  grams?: number | null
  kcal?: number
  proteinG?: number
  carbsG?: number
  fatG?: number
  notes?: string | null
  mealType?: string | null
}

export async function updateMealItem(
  userId: string,
  id: string,
  data: ItemUpdateInput
): Promise<typeof mealItems.$inferSelect> {
  const [existing] = await db
    .select()
    .from(mealItems)
    .where(and(eq(mealItems.id, id), eq(mealItems.userId, userId)))
    .limit(1)
  if (!existing) {
    throw new Error("Item not found or access denied")
  }

  const [updated] = await db
    .update(mealItems)
    .set({
      name: data.name ?? existing.name,
      grams:
        data.grams !== undefined
          ? data.grams !== null
            ? String(data.grams)
            : null
          : existing.grams,
      kcal:
        data.kcal !== undefined ? String(data.kcal) : existing.kcal,
      proteinG:
        data.proteinG !== undefined
          ? String(data.proteinG)
          : existing.proteinG,
      carbsG:
        data.carbsG !== undefined ? String(data.carbsG) : existing.carbsG,
      fatG: data.fatG !== undefined ? String(data.fatG) : existing.fatG,
      notes: data.notes !== undefined ? data.notes : existing.notes,
      mealType: data.mealType !== undefined ? data.mealType : existing.mealType,
    })
    .where(and(eq(mealItems.id, id), eq(mealItems.userId, userId)))
    .returning()
  return updated
}

export async function deleteMealItem(
  userId: string,
  id: string
): Promise<void> {
  const [existing] = await db
    .select({ id: mealItems.id })
    .from(mealItems)
    .where(and(eq(mealItems.id, id), eq(mealItems.userId, userId)))
    .limit(1)
  if (!existing) {
    throw new Error("Item not found or access denied")
  }
  await db
    .delete(mealItems)
    .where(and(eq(mealItems.id, id), eq(mealItems.userId, userId)))
}

/** Get day overrides for a date range in a single query */
export async function getDayOverridesForRange(
  userId: string,
  start: string,
  end: string
): Promise<(typeof nutritionDayOverrides.$inferSelect)[]> {
  return db
    .select()
    .from(nutritionDayOverrides)
    .where(
      and(
        eq(nutritionDayOverrides.userId, userId),
        gte(nutritionDayOverrides.date, start),
        lte(nutritionDayOverrides.date, end)
      )
    )
}
