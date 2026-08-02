# Drizzle migration state recovery

Status: **partially complete.** The repository side is fixed by this document's
PR. Two steps still require a machine with `drizzle-kit` and a database, and are
listed under "Still outstanding" at the bottom.

## What was wrong

The migration state was corrupt in a way that was completely silent. Production
worked fine. The damage only showed up the moment anyone tried to create a fresh
database, which is exactly what `README.md` tells a new contributor to do.

### A-1 — the journal omitted two applied migrations

`drizzle/meta/_journal.json` listed `0000`-`0004` plus `0005_opposite_blue_marvel`.
It did **not** list `0005_capture_id_uuid_fk` or `0006_column_constraints`, both
of which exist as files and are both applied in production.

Consequence: a fresh environment running `pnpm drizzle-kit migrate` would never
apply the `capture_id` text-to-uuid conversion, its foreign key, or any of the
column CHECK constraints and numeric precision limits. Fresh databases got a
different schema than production, quietly.

### A-2 — filename collision on 0005

`0005_capture_id_uuid_fk.sql` and `0005_opposite_blue_marvel.sql` both existed.

### A-3 — the next generate would have collided again

The journal's highest index was 5, so the next `drizzle-kit generate` would have
emitted `0006_*`, colliding with the existing `0006_column_constraints.sql`.

### A-4 — the snapshot chain does not describe reality

`drizzle/meta/` contains only `0000`, `0001`, and `0005` snapshots. Worse,
`0005_snapshot.json` was diffed from the `0001` base and its generated SQL was
then hand-trimmed, so the snapshot describes a schema state its own migration
does not produce.

### A-5 — the tracking table is empty

`drizzle.__drizzle_migrations` has zero rows, so `drizzle-kit migrate` would try
to replay from `0000` and fail against the populated production database.
Migrations have been effectively manual ever since.

## What this PR fixes

1. **Rebuilt `_journal.json`** with all eight migrations, in true application
   order, with contiguous indices `0`-`7`.

   > Note: the handoff notes said "seven migrations". There are eight. The
   > miscount came from the colliding `0005` pair being read as one entry.

2. **Renamed** `0005_opposite_blue_marvel.sql` to `0007_drop_legacy_tables.sql`,
   clearing both the collision (A-2) and the next-generate collision (A-3). The
   SQL is byte-identical apart from an added header comment. This is safe
   because the migration was applied by hand and was never recorded under its
   old name in any tracking table -- there is nothing to un-match.

3. **Added `scripts/backfill-drizzle-migrations.ts`**, which records the
   already-applied migrations in `drizzle.__drizzle_migrations` without
   executing their SQL, resolving A-5. It defaults to a dry run.

## The order the migrations actually ran

| idx | tag                          | notes                                       |
| --- | ---------------------------- | ------------------------------------------- |
| 0   | `0000_wild_human_torch`      | initial schema                              |
| 1   | `0001_nutrition_settings`    |                                             |
| 2   | `0002_nutrition_idempotency` | created `capture_id` as plain `text`        |
| 3   | `0003_billing_entitlements`  |                                             |
| 4   | `0004_byok_tier`             |                                             |
| 5   | `0005_capture_id_uuid_fk`    | converts `capture_id` text -> uuid, adds FK |
| 6   | `0006_column_constraints`    | CHECK constraints, numeric precision        |
| 7   | `0007_drop_legacy_tables`    | drops `entry` and `sheet_connection`        |

Order matters here. `0006` touches `sheet_connection`, which `0007` drops, so
`0006` must be recorded before `0007` or a from-zero bootstrap will fail.

## How to finish the recovery

Do all of this against a **scratch database**, never production, until the final
step.

```bash
# 1. Point at a throwaway database
export DATABASE_URL="postgres://.../scratch"

# 2. Bootstrap from zero. This is the real test: it must apply all eight
#    migrations cleanly and in order.
pnpm drizzle-kit migrate

# 3. Diff the result against production's schema. They must match.
#    Any difference here means the journal order is still wrong.
pg_dump --schema-only "$SCRATCH_URL"    > /tmp/scratch.sql
pg_dump --schema-only "$PRODUCTION_URL" > /tmp/prod.sql
diff /tmp/scratch.sql /tmp/prod.sql

# 4. Only once that diff is clean, backfill production's tracking table.
export DATABASE_URL="$PRODUCTION_URL"
pnpm db:backfill-migrations              # dry run first, always
pnpm db:backfill-migrations -- --apply

# 5. Confirm drizzle-kit is healthy again. Should report nothing to apply.
pnpm drizzle-kit migrate
```

## Still outstanding

- **Snapshot regeneration (A-4).** The missing `0002`, `0003`, `0004`, `0006`,
  and `0007` snapshots cannot be written by hand -- they have to be produced by
  `drizzle-kit` itself while walking the migration chain. Until that is done,
  `drizzle-kit generate` will keep diffing against a snapshot that does not
  describe the live schema, so **every new migration must be reviewed by hand
  before it is applied.** Treat generated SQL as a draft, not as truth.
- **Step 3 above (the scratch-database schema diff)** has not been run. Until it
  passes, treat the rebuilt journal as "believed correct" rather than "proven
  correct".
- **Legacy spreadsheet backups secured.** The temporary backup file `scratch/backup_pre_migration_*.json` containing legacy table data (including live Google Spreadsheet IDs) has been deleted from disk to prevent exposure of sensitive IDs. All legacy data has already been successfully migrated and verified.

## Rules going forward

- Never edit a migration file that has already been applied. Its hash is how
  drizzle decides whether it ran; editing it makes drizzle try to run it again.
- Never push schema changes directly to `master`. Commit `e30e92c` bypassed CI
  entirely and that is how this state survived undetected.
- If a migration has to be applied by hand, record it in
  `drizzle.__drizzle_migrations` in the same session. The gap between "applied"
  and "recorded" is what created every problem on this page.
