-- Migration: 0001_nutrition_settings
-- Adds nutrition_settings and nutrition_day_override tables
-- Also adds performance indexes for meal_item queries

-- 1. Nutrition Settings Table
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
);

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
    "updated_at" timestamp DEFAULT now() NOT NULL,
    UNIQUE("user_id", "date")
);

-- 3. Add capture_id column to meal_item if not exists (for deduplication)
ALTER TABLE "meal_item" ADD COLUMN IF NOT EXISTS "capture_id" text;

-- 4. Optimization Indexes for History Queries
CREATE INDEX IF NOT EXISTS "meal_item_user_date_idx" ON "meal_item"("user_id", "date");
CREATE INDEX IF NOT EXISTS "nutrition_day_override_user_date_idx" ON "nutrition_day_override"("user_id", "date");
