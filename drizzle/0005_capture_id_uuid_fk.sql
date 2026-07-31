-- ============================================================
-- Migration: 0005_capture_id_uuid_fk
--
-- db/schema.ts already declares meal_item.capture_id as:
--   uuid("capture_id").references(() => pendingCaptures.id, { onDelete: "set null" })
-- but migration 0002 created the column as plain `text` with no constraint,
-- so the declared type and the live column have been out of sync.
--
-- capture_id is the deduplication key that stops a retried Telegram update
-- from logging the same meal twice, so its integrity affects data correctness
-- rather than just tidiness.
--
-- This migration is DESTRUCTIVE IF DIRTY DATA EXISTS. It deliberately aborts
-- rather than silently discarding rows. Run the two audit queries at the
-- bottom of this file first; both must return zero rows.
-- ============================================================

BEGIN;

-- 1. Abort loudly if any value cannot cast to uuid.
--    A single malformed row must fail the whole migration rather than be
--    quietly dropped, because each one is a real meal a user confirmed.
DO $$
DECLARE
  bad_count integer;
BEGIN
  SELECT count(*) INTO bad_count
  FROM meal_item
  WHERE capture_id IS NOT NULL
    AND capture_id !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';

  IF bad_count > 0 THEN
    RAISE EXCEPTION
      'Aborting: % meal_item row(s) have a capture_id that is not a valid uuid. Resolve them before migrating.',
      bad_count;
  END IF;
END$$;

-- 2. Null out orphans so the new foreign key can be created.
--    An orphan means the pending_capture expired and was cleaned up while the
--    confirmed meal legitimately remained. Detaching the pointer is correct;
--    deleting the meal would destroy user data.
UPDATE meal_item m
SET capture_id = NULL
WHERE m.capture_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM pending_capture p WHERE p.id::text = m.capture_id
  );

-- 3. Convert the column type.
ALTER TABLE meal_item
  ALTER COLUMN capture_id TYPE uuid USING capture_id::uuid;

-- 4. Add the foreign key.
--    ON DELETE SET NULL, never CASCADE: expiring a pending capture must not
--    delete a meal the user already confirmed.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'meal_item_capture_id_fk'
      AND conrelid = 'public.meal_item'::regclass
  ) THEN
    ALTER TABLE meal_item
      ADD CONSTRAINT meal_item_capture_id_fk
      FOREIGN KEY (capture_id) REFERENCES pending_capture(id) ON DELETE SET NULL;
  END IF;
END$$;

-- 5. Keep the deduplication lookup index declared in db/schema.ts.
CREATE INDEX IF NOT EXISTS "meal_item_capture_idx"
  ON meal_item (capture_id, item_index);

COMMIT;

-- ============================================================
-- Pre-flight audit — run BOTH before applying. Both must return zero rows.
-- ============================================================
-- -- (a) values that will not cast to uuid
-- SELECT id, capture_id FROM meal_item
-- WHERE capture_id IS NOT NULL
--   AND capture_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
--
-- -- (b) orphans that step 2 will detach
-- SELECT m.id, m.capture_id FROM meal_item m
-- LEFT JOIN pending_capture p ON p.id::text = m.capture_id
-- WHERE m.capture_id IS NOT NULL AND p.id IS NULL;
--
-- Post-migration verification:
-- SELECT data_type FROM information_schema.columns
--   WHERE table_name = 'meal_item' AND column_name = 'capture_id';  -- expect: uuid
-- SELECT conname FROM pg_constraint WHERE conname = 'meal_item_capture_id_fk';
