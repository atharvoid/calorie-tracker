-- ============================================================
-- Migration: 0007_drop_legacy_tables
--
-- Renamed from 0005_opposite_blue_marvel.sql. The original filename collided
-- with 0005_capture_id_uuid_fk.sql: two migrations shared index 0005, and the
-- journal listed only one of them. See docs/MIGRATION_STATE_RECOVERY.md.
--
-- Drops the last two "Data Assistant" era tables. Their Drizzle schema exports
-- were already removed from db/schema.ts, so nothing in the application reads
-- or writes them.
--
-- Already applied against production on 2026-07-31 (commit e30e92c) by a
-- one-off script, because drizzle-kit migrate was unusable at the time. The
-- backfill in scripts/backfill-drizzle-migrations.ts records it as applied so
-- it is not replayed.
--
-- entry was empty. sheet_connection held 1 row, backed up before the drop.
-- ============================================================

ALTER TABLE "entry" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sheet_connection" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "entry" CASCADE;--> statement-breakpoint
DROP TABLE "sheet_connection" CASCADE;
