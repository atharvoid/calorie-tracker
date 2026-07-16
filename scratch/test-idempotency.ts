import { config } from "dotenv"
import { resolve } from "path"
config({ path: resolve(__dirname, "../.env.local") })

// Set the IPv4 override BEFORE importing anything from db/commit
process.env.DATABASE_URL = "postgresql://postgres.lbnhpmoqmqrryyqiwwhg:Dh8kP92sLm41qRzYvB5x@13.200.110.68:5432/postgres"

async function run() {
  const { commitNutrition } = await import("../lib/commit")
  const { db } = await import("../db")
  const { mealItems } = await import("../db/schema")
  const { eq } = await import("drizzle-orm")

  const userId = "d1bea204-7a1d-4aef-b40d-3a5452c328f2"
  const captureId = "test-capture-id-12345"

  console.log("Cleaning up previous test data if any...")
  await db.delete(mealItems).where(eq(mealItems.captureId, captureId))

  const nutritionPayload = {
    meals: [
      {
        meal_type: "Breakfast" as const,
        time_hint: "09:00",
        items: [
          {
            name: "Idli",
            grams: 120,
            kcal: 180,
            protein_g: 4,
            carbs_g: 36,
            fat_g: 1,
            notes: "estimated first idli",
          },
          {
            name: "Idli",
            grams: 120,
            kcal: 180,
            protein_g: 4,
            carbs_g: 36,
            fat_g: 1,
            notes: "estimated second idli",
          }
        ]
      }
    ]
  }

  console.log("First commit attempt...")
  const res1 = await commitNutrition({
    userId,
    nutrition: nutritionPayload,
    captureId,
    source: "telegram-test",
  })
  console.log("First commit result:", {
    rowCount: res1.rowCount,
    insertedIds: res1.insertedIds,
    syncWarning: res1.syncWarning,
  })

  console.log("Second commit attempt (concurrent replay or double click simulation)...")
  const res2 = await commitNutrition({
    userId,
    nutrition: nutritionPayload,
    captureId,
    source: "telegram-test",
  })
  console.log("Second commit result:", {
    rowCount: res2.rowCount,
    insertedIds: res2.insertedIds,
    syncWarning: res2.syncWarning,
  })

  // Verify DB count
  const dbRows = await db
    .select()
    .from(mealItems)
    .where(eq(mealItems.captureId, captureId))

  console.log(`Verification: Found ${dbRows.length} rows in database for captureId: ${captureId}`)
  if (dbRows.length === 2 && res2.rowCount === 0) {
    console.log("✅ SUCCESS! DB-level Telegram idempotency works perfectly. Duplicates were ignored by index and didn't throw an error.")
  } else {
    console.error("❌ FAILED! Expected exactly 2 rows (first attempt only) and second attempt rowCount to be 0.")
  }

  // Clean up
  await db.delete(mealItems).where(eq(mealItems.captureId, captureId))
  console.log("Cleaned up test data.")
}

run().catch((err) => {
  console.error("Execution error:", err)
})
