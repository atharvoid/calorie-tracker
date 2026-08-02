# Verified status — 2 August 2026

**Baseline:** `master` @ `976f7b6` — CI green.

This file exists because [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md) can no longer be read as a status source. It has drifted in **both** directions: rows marked `todo` whose work shipped weeks ago, and a header citing a baseline commit many merges behind. Its `done` rows are broadly trustworthy; its `todo` rows are not.

Treat the plan as the historical record of _what was decided and why_. Treat this file as the record of _what is true_.

## How to read this

Every entry below was established by reading the file at the stated commit, or by a CI result. Nothing here is carried over from a summary or a report. Where a claim could not be verified, it says so rather than rounding up to "done".

This distinction is not pedantry. Most of the drift recorded below was caused by status being copied from one document to another without anyone re-reading the code.

## Marked `todo` in the plan, but actually shipped

Verified by reading the source on `master`:

- **B-8** — BYOK migration. `0004_byok_tier` is in `drizzle/` and journalled through `0007`.
- **S-1** — `capture_id` → `uuid` with FK. `0005_capture_id_uuid_fk.sql` is applied. _Caveat below._
- **S-2** — CHECK constraints. `0006_column_constraints.sql` is applied. _Caveat below._
- **D-12** — docs consolidation. `docs/README.md` is a full index and `docs/archive/` holds all six completed documents.
- **E-10** — component tests. `vitest.config.ts` defines `unit` (node) and `components` (jsdom) projects.
- **E-14** — structured logger. `lib/logger.ts` exists with error serialisation.
- **F-2** — theme flash. `<html>` carries no hardcoded theme class; the bootstrap script is the single source of truth.
- **F-3** — toast theming. `components/app-toaster.tsx` reads the resolved theme; `themeColor` is media-scoped in `app/layout.tsx`.
- **F-6** — mobile header, shipped in #51.
- **F-8, F-9, F-10** — landing extraction, de-duplication, and `handleSignIn` moved to `components/auth-actions.ts`, shipped in #52.
- **F-15** — unified `rootClassName` across both `<main>` branches.
- **F-16** — `searchParams` array handling via `Array.isArray`.

**E-8 is half done.** `@typescript-eslint/no-explicit-any` is already `"error"`, while the comment above it still described it as staged at `"warn"`. `react-hooks/set-state-in-effect` is still `"warn"`; promoting it was attempted in PR #59 and **CI rejected it**, so live violations remain. Run `pnpm lint` to enumerate them before trying again.

## Genuinely still open

- **E-13** — tests for the money and route-guard paths: `recordAiUsage`, `resolveAccessState` edge cases, `lib/commit.ts`, `lib/nutrition-queries.ts`, and the admin guard behind A-19. This is the largest real gap. A-19 is marked `done` on the strength of a code reading, with no regression test holding it there.
- **E-15** — release tag. `package.json` reads `0.2.0` but the `v0.2.0` tag was deleted after a defect was found in the logger it shipped. The repository currently has **no tags at all**.
- **F-18** — sweep `app/globals.css` for tokens orphaned by the group D deletions.
- **F-19** — the nonce plumbing landed, but `middleware.ts` sets **`Content-Security-Policy-Report-Only`**, not `Content-Security-Policy`. A report-only policy blocks nothing. This is a deliberate audit phase, not a finished control, and it should not be recorded as done until the header is switched to enforcing.
- **A-21** — hardcoded origin fallbacks. Fixed for `app/layout.tsx` in #57 via `lib/app-url.ts`. Still present in `lib/telegram.ts` (falls back to a **hardcoded `trycloudflare.com` tunnel URL**), `app/api/billing/checkout/route.ts`, and `app/api/billing/portal/route.ts`.
- **Issue #10** — BYOK group B follow-ups.
- **Issue #46** — Stripe removal is in the tree but was never reviewed, and the annual-subscriber entitlement test does not exist.

## Caveats on the schema rows

S-1 and S-2 are recorded as shipped because the migrations are applied and journalled, but the verification behind them was weaker than the plan text asks for:

- The scratch-database schema diff was run through `information_schema.columns`, which covers **types, precision, scale and nullability only**. It does not cover CHECK constraints, foreign keys, indexes, defaults or enums. An empty diff from that query is therefore not evidence that S-1's **foreign key** or S-2's **constraints** exist in production.
- The constraints that _were_ directly confirmed came from a `pg_constraint` query against `meal_item` alone. S-2 also covers `access_state`, `plan_key`, `provider`, `key_owner` and `status` on other tables, none of which were queried.
- Use `pg_dump --schema-only` for the next comparison. It captures everything `information_schema.columns` misses, and it is the only cheap way to make this claim honestly.

## Rule established this session

A migration file is **immutable once it is on `master`**. If it needs to change, that change is a new numbered migration. Do not amend an applied migration and then reconcile `drizzle.__drizzle_migrations` to match the new hash — that makes every environment's history silently disagree, and the disagreement only surfaces when a fresh bootstrap produces a different schema than production.
