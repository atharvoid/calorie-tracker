-- ============================================================
-- Migration: 0006_column_constraints
--
-- db/schema.ts narrows meal_type, source, status, plan_key, access_state,
-- key_owner and provider with $type<>() unions. Those are TypeScript only and
-- are erased at runtime, so anything writing outside the Drizzle layer — a
-- migration, a manual psql fix, a webhook handler with a typo — can still
-- insert 'Active' or 'expired' and nothing objects.
--
-- That matters most for access_state, which gates billing: an unlisted value
-- there matches no branch in resolveAccessState(), so the user falls through
-- every case.
--
-- This migration also pins numeric precision (task S-3) and adds the missing
-- uniqueness guarantee on sheet_connection.user_id (task S-4).
--
-- It ABORTS rather than coercing anything it does not recognise. Run the
-- audit queries at the bottom first; every one must return zero rows.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Repair known legacy values.
--    Before PR #2 the trial-over state was a single 'expired'. It was split
--    into trial_ended (window elapsed) and quota_exhausted (allowance spent).
--    Those cannot be told apart after the fact, so map to trial_ended and let
--    resolveAccessState() re-derive the correct state on the next read.
-- ------------------------------------------------------------
UPDATE product_entitlement
SET access_state = 'trial_ended'
WHERE access_state = 'expired';

-- ------------------------------------------------------------
-- 2. Abort on any remaining unlisted value.
--    Deliberately not a coercion: an unrecognised value is a bug somewhere
--    upstream, and silently rewriting it would hide the bug and possibly
--    change what a user is entitled to.
-- ------------------------------------------------------------
DO $$
DECLARE
  offending text;
  bad_count integer;
BEGIN
  SELECT count(*), string_agg(DISTINCT access_state, ', ')
    INTO bad_count, offending
  FROM product_entitlement
  WHERE access_state IS NOT NULL
    AND access_state NOT IN (
      'pre_trial','trial','byok','active','grace','trial_ended','quota_exhausted','blocked'
    );
  IF bad_count > 0 THEN
    RAISE EXCEPTION
      'Aborting: % product_entitlement row(s) have an unrecognised access_state (%). Resolve them before migrating.',
      bad_count, offending;
  END IF;

  SELECT count(*), string_agg(DISTINCT status, ', ') INTO bad_count, offending
  FROM subscription
  WHERE status IS NOT NULL
    AND status NOT IN ('trialing','active','past_due','canceled','unpaid','incomplete','paused');
  IF bad_count > 0 THEN
    RAISE EXCEPTION
      'Aborting: % subscription row(s) have an unrecognised status (%).', bad_count, offending;
  END IF;

  SELECT count(*), string_agg(DISTINCT plan_key, ', ') INTO bad_count, offending
  FROM subscription
  WHERE plan_key IS NOT NULL
    AND plan_key NOT IN ('personal_monthly','personal_annual');
  IF bad_count > 0 THEN
    RAISE EXCEPTION
      'Aborting: % subscription row(s) have an unrecognised plan_key (%).', bad_count, offending;
  END IF;

  SELECT count(*), string_agg(DISTINCT meal_type, ', ') INTO bad_count, offending
  FROM meal_item
  WHERE meal_type IS NOT NULL
    AND meal_type NOT IN ('Breakfast','Lunch','Dinner','Snack');
  IF bad_count > 0 THEN
    RAISE EXCEPTION
      'Aborting: % meal_item row(s) have an unrecognised meal_type (%).', bad_count, offending;
  END IF;

  SELECT count(*), string_agg(DISTINCT source, ', ') INTO bad_count, offending
  FROM meal_item
  WHERE source IS NOT NULL AND source NOT IN ('web','telegram');
  IF bad_count > 0 THEN
    RAISE EXCEPTION
      'Aborting: % meal_item row(s) have an unrecognised source (%).', bad_count, offending;
  END IF;
END$$;

-- ------------------------------------------------------------
-- 3. CHECK constraints.
--    CHECK rather than a Postgres enum type: adding a value to an enum is a
--    DDL change that cannot run inside a transaction alongside its own use,
--    whereas a CHECK is dropped and recreated in one migration. The value
--    lists mirror the `as const` arrays exported from db/schema.ts — keep the
--    two in step.
--
--    Each is NULL-tolerant, because the columns that allow NULL still must.
-- ------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_entitlement_access_state_valid') THEN
    ALTER TABLE product_entitlement
      ADD CONSTRAINT product_entitlement_access_state_valid
      CHECK (access_state IN (
        'pre_trial','trial','byok','active','grace','trial_ended','quota_exhausted','blocked'
      ));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_entitlement_byok_provider_valid') THEN
    ALTER TABLE product_entitlement
      ADD CONSTRAINT product_entitlement_byok_provider_valid
      CHECK (byok_provider IS NULL OR byok_provider IN ('google'));
  END IF;

  -- A stored envelope without a verification timestamp would be treated as
  -- "no key" by resolveApiKeyForUser() while still occupying the column, so
  -- the two must move together.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_entitlement_byok_envelope_verified') THEN
    ALTER TABLE product_entitlement
      ADD CONSTRAINT product_entitlement_byok_envelope_verified
      CHECK (
        (byok_key_envelope IS NULL AND byok_verified_at IS NULL)
        OR (byok_key_envelope IS NOT NULL AND byok_verified_at IS NOT NULL)
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscription_status_valid') THEN
    ALTER TABLE subscription
      ADD CONSTRAINT subscription_status_valid
      CHECK (status IN ('trialing','active','past_due','canceled','unpaid','incomplete','paused'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscription_plan_key_valid') THEN
    ALTER TABLE subscription
      ADD CONSTRAINT subscription_plan_key_valid
      CHECK (plan_key IN ('personal_monthly','personal_annual'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'billing_customer_provider_valid') THEN
    ALTER TABLE billing_customer
      ADD CONSTRAINT billing_customer_provider_valid
      CHECK (provider IN ('stripe','dodo'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'meal_item_meal_type_valid') THEN
    ALTER TABLE meal_item
      ADD CONSTRAINT meal_item_meal_type_valid
      CHECK (meal_type IS NULL OR meal_type IN ('Breakfast','Lunch','Dinner','Snack'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'meal_item_source_valid') THEN
    ALTER TABLE meal_item
      ADD CONSTRAINT meal_item_source_valid
      CHECK (source IN ('web','telegram'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'usage_event_source_valid') THEN
    ALTER TABLE usage_event
      ADD CONSTRAINT usage_event_source_valid
      CHECK (source IN ('web','telegram'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'usage_event_key_owner_valid') THEN
    ALTER TABLE usage_event
      ADD CONSTRAINT usage_event_key_owner_valid
      CHECK (key_owner IN ('platform','user'));
  END IF;

  -- BYOK calls cost the platform nothing, so a non-zero cost attributed to a
  -- user-owned key would corrupt unit-economics reporting at the source.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'usage_event_byok_is_free') THEN
    ALTER TABLE usage_event
      ADD CONSTRAINT usage_event_byok_is_free
      CHECK (key_owner <> 'user' OR coalesce(estimated_cost_micros, 0) = 0);
  END IF;
END$$;

-- ------------------------------------------------------------
-- 4. Numeric precision (task S-3).
--    Bare `numeric` is unbounded. Drizzle returns numerics as JavaScript
--    strings either way, so this does not remove the Number() coercion at
--    call sites — it stops the database accepting a 40-digit calorie count
--    that no consumer can render. The ALTERs fail if any existing value does
--    not fit, which aborts the whole transaction; that is intended.
-- ------------------------------------------------------------
ALTER TABLE meal_item
  ALTER COLUMN grams TYPE numeric(9,2),
  ALTER COLUMN kcal TYPE numeric(9,2),
  ALTER COLUMN protein_g TYPE numeric(7,2),
  ALTER COLUMN carbs_g TYPE numeric(7,2),
  ALTER COLUMN fat_g TYPE numeric(7,2);

ALTER TABLE nutrition_settings
  ALTER COLUMN protein_target_g TYPE numeric(7,2),
  ALTER COLUMN carbs_target_g TYPE numeric(7,2),
  ALTER COLUMN fat_target_g TYPE numeric(7,2);

ALTER TABLE nutrition_day_override
  ALTER COLUMN protein_target_g TYPE numeric(7,2),
  ALTER COLUMN carbs_target_g TYPE numeric(7,2),
  ALTER COLUMN fat_target_g TYPE numeric(7,2);

-- Nutrition values are never negative.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'meal_item_non_negative') THEN
    ALTER TABLE meal_item
      ADD CONSTRAINT meal_item_non_negative
      CHECK (
        coalesce(grams, 0) >= 0
        AND coalesce(kcal, 0) >= 0
        AND coalesce(protein_g, 0) >= 0
        AND coalesce(carbs_g, 0) >= 0
        AND coalesce(fat_g, 0) >= 0
      );
  END IF;
END$$;

-- ------------------------------------------------------------
-- 5. sheet_connection.user_id uniqueness (task S-4).
--    The table is deprecated and slated for removal in task D-2, so this is a
--    stopgap rather than an investment. Duplicate rows are deduplicated
--    newest-first before the constraint is added, because the most recently
--    created connection is the one the user last authorised.
-- ------------------------------------------------------------
DELETE FROM sheet_connection s
WHERE EXISTS (
  SELECT 1 FROM sheet_connection newer
  WHERE newer.user_id = s.user_id
    AND (newer.created_at, newer.id) > (s.created_at, s.id)
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sheet_connection_user_id_unique') THEN
    ALTER TABLE sheet_connection
      ADD CONSTRAINT sheet_connection_user_id_unique UNIQUE (user_id);
  END IF;
END$$;

COMMIT;

-- ============================================================
-- Pre-flight audit — run ALL before applying. Every one must return zero rows.
-- ============================================================
-- SELECT access_state, count(*) FROM product_entitlement
--  WHERE access_state NOT IN ('pre_trial','trial','byok','active','grace','trial_ended','quota_exhausted','blocked')
--  GROUP BY 1;
--
-- SELECT status, count(*) FROM subscription
--  WHERE status NOT IN ('trialing','active','past_due','canceled','unpaid','incomplete','paused') GROUP BY 1;
--
-- SELECT plan_key, count(*) FROM subscription
--  WHERE plan_key NOT IN ('personal_monthly','personal_annual') GROUP BY 1;
--
-- SELECT meal_type, count(*) FROM meal_item
--  WHERE meal_type IS NOT NULL AND meal_type NOT IN ('Breakfast','Lunch','Dinner','Snack') GROUP BY 1;
--
-- -- values that will not fit the new precision
-- SELECT id, kcal, grams FROM meal_item
--  WHERE abs(coalesce(kcal,0)) >= 10000000 OR abs(coalesce(grams,0)) >= 10000000;
-- SELECT id, protein_g, carbs_g, fat_g FROM meal_item
--  WHERE abs(coalesce(protein_g,0)) >= 100000
--     OR abs(coalesce(carbs_g,0)) >= 100000
--     OR abs(coalesce(fat_g,0)) >= 100000;
--
-- -- negative values that the new CHECK will reject
-- SELECT id FROM meal_item
--  WHERE kcal < 0 OR grams < 0 OR protein_g < 0 OR carbs_g < 0 OR fat_g < 0;
--
-- -- rows step 5 will DELETE (keeps the newest per user)
-- SELECT user_id, count(*) FROM sheet_connection GROUP BY 1 HAVING count(*) > 1;
--
-- -- BYOK envelopes with no verification timestamp
-- SELECT user_id FROM product_entitlement
--  WHERE (byok_key_envelope IS NULL) <> (byok_verified_at IS NULL);
--
-- Post-migration verification:
-- SELECT conname FROM pg_constraint WHERE conname LIKE '%_valid' ORDER BY 1;
-- SELECT column_name, numeric_precision, numeric_scale FROM information_schema.columns
--   WHERE table_name = 'meal_item' AND data_type = 'numeric';
