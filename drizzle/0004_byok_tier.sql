-- Migration: 0004_byok_tier
-- Adds BYOK columns to product_entitlement, key_owner to usage_event, item_index & index to meal_item, and drops redundant indexes

-- 1. Add BYOK columns to product_entitlement
ALTER TABLE "product_entitlement" ADD COLUMN IF NOT EXISTS "byok_provider" text;
ALTER TABLE "product_entitlement" ADD COLUMN IF NOT EXISTS "byok_key_envelope" text;
ALTER TABLE "product_entitlement" ADD COLUMN IF NOT EXISTS "byok_key_last4" text;
ALTER TABLE "product_entitlement" ADD COLUMN IF NOT EXISTS "byok_verified_at" timestamp;
ALTER TABLE "product_entitlement" ADD COLUMN IF NOT EXISTS "byok_failure_count" integer DEFAULT 0 NOT NULL;
ALTER TABLE "product_entitlement" ADD COLUMN IF NOT EXISTS "byok_last_failure_at" timestamp;

-- 2. Add key_owner to usage_event
ALTER TABLE "usage_event" ADD COLUMN IF NOT EXISTS "key_owner" text DEFAULT 'platform' NOT NULL;

-- 3. Add item_index & capture index to meal_item
ALTER TABLE "meal_item" ADD COLUMN IF NOT EXISTS "item_index" integer;
CREATE INDEX IF NOT EXISTS "meal_item_capture_idx" ON "meal_item" ("capture_id", "item_index");

-- 4. Drop redundant indexes
DROP INDEX IF EXISTS "product_entitlement_user_id_idx";
DROP INDEX IF EXISTS "nutrition_day_override_user_date_idx";
DROP INDEX IF EXISTS "usage_event_user_id_idx";
