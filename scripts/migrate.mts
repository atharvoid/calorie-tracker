import { config } from "dotenv"
config({ path: ".env.local" })

import postgres from "postgres"

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) throw new Error("DATABASE_URL not set")

const sql = postgres(DATABASE_URL)

try {
  await sql`
    CREATE TABLE IF NOT EXISTS "nutrition_settings" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "user_id" text NOT NULL UNIQUE REFERENCES "user"("id") ON DELETE CASCADE,
      "maintenance_kcal" integer,
      "target_kcal" integer,
      "protein_target_g" numeric,
      "carbs_target_g" numeric,
      "fat_target_g" numeric,
      "target_tolerance_kcal" integer,
      "timezone" text NOT NULL DEFAULT 'Asia/Kolkata',
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    )
  `
  console.log("✓ nutrition_settings table created/exists")

  await sql`
    CREATE TABLE IF NOT EXISTS "nutrition_day_override" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
      "date" text NOT NULL,
      "maintenance_kcal" integer,
      "target_kcal" integer,
      "protein_target_g" numeric,
      "carbs_target_g" numeric,
      "fat_target_g" numeric,
      "reason" text,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL,
      UNIQUE("user_id", "date")
    )
  `
  console.log("✓ nutrition_day_override table created/exists")

  await sql`ALTER TABLE "meal_item" ADD COLUMN IF NOT EXISTS "capture_id" text`
  console.log("✓ capture_id column added/exists")

  await sql`CREATE INDEX IF NOT EXISTS "meal_item_user_date_idx" ON "meal_item"("user_id", "date")`
  console.log("✓ meal_item_user_date_idx created/exists")

  await sql`CREATE INDEX IF NOT EXISTS "nutrition_day_override_user_date_idx" ON "nutrition_day_override"("user_id", "date")`
  console.log("✓ nutrition_day_override_user_date_idx created/exists")

  console.log("Migration complete!")
} catch (err) {
  console.error("Migration failed:", err)
  process.exit(1)
} finally {
  await sql.end()
}
