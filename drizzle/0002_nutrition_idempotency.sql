-- ============================================================
-- Migration: 0002_nutrition_idempotency
-- Adds DB-level idempotency for Telegram double-tap protection,
-- history query performance index, and meal_item.capture_id
-- idempotency unique constraint.
-- All statements are idempotent (IF NOT EXISTS / DO NOTHING).
-- ============================================================

-- 1. Nutrition Settings Table
CREATE TABLE IF NOT EXISTS "nutrition_settings" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "maintenance_kcal" integer,
    "target_kcal" integer,
    "protein_target_g" numeric,
    "carbs_target_g" numeric,
    "fat_target_g" numeric,
    "target_tolerance_kcal" integer,
    "timezone" text NOT NULL DEFAULT 'Asia/Kolkata',
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Unique user constraint (one settings row per user)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'nutrition_settings_user_id_unique'
      AND conrelid = 'public.nutrition_settings'::regclass
  ) THEN
    ALTER TABLE "nutrition_settings" ADD CONSTRAINT "nutrition_settings_user_id_unique" UNIQUE ("user_id");
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END$$;

-- 2. Day-Specific Target Overrides Table
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
    "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Override uniqueness on (user_id, date)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'nutrition_day_override_user_date_unique'
      AND conrelid = 'public.nutrition_day_override'::regclass
  ) THEN
    ALTER TABLE "nutrition_day_override"
      ADD CONSTRAINT "nutrition_day_override_user_date_unique" UNIQUE ("user_id", "date");
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END$$;

-- 3. Add capture_id column to meal_item if not exists (for deduplication)
ALTER TABLE "meal_item" ADD COLUMN IF NOT EXISTS "capture_id" text;

-- 4. DB-level Telegram idempotency constraint
--    When a capture_id is present, (user_id, capture_id, name) must be unique.
--    This prevents concurrent double-tap callbacks from inserting duplicate rows.
--    Uses a partial unique index so NULL capture_id rows (web-submitted) are excluded.
CREATE UNIQUE INDEX IF NOT EXISTS "meal_item_capture_id_name_unique_idx"
    ON "meal_item" ("user_id", "capture_id", "name")
    WHERE "capture_id" IS NOT NULL;

-- 5. Performance index for history queries: (user_id, date, created_at)
CREATE INDEX IF NOT EXISTS "meal_item_user_date_idx"
    ON "meal_item" ("user_id", "date");

CREATE INDEX IF NOT EXISTS "meal_item_user_date_created_idx"
    ON "meal_item" ("user_id", "date", "created_at");

-- 6. Index for override range queries
CREATE INDEX IF NOT EXISTS "nutrition_day_override_user_date_idx"
    ON "nutrition_day_override" ("user_id", "date");

-- ============================================================
-- Verification queries — run these after executing above:
-- ============================================================
-- select to_regclass('public.nutrition_settings');
-- select to_regclass('public.nutrition_day_override');
-- select indexname, indexdef from pg_indexes
--   where schemaname = 'public'
--     and tablename in ('meal_item','nutrition_settings','nutrition_day_override')
--   order by tablename, indexname;
