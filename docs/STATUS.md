# Verified status — 2 August 2026

**Baseline:** `master` @ `bda2300` — CI green.

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

## Closed since this file was written

- **A-21 — hardcoded origin fallbacks. Done.** `lib/app-url.ts` exports `getAppUrl()`, which returns `http://localhost:3000` in development and **throws in production** when `NEXT_PUBLIC_APP_URL` is unset. All four readers now go through it: `app/layout.tsx` (#57), `app/api/billing/checkout/route.ts` and `app/api/billing/portal/route.ts` (#61), and `lib/telegram.ts` (#63).

  The billing pair was the one that mattered. With the old `|| "http://localhost:3000"` fallback, a production misconfiguration did not fail — the customer paid, Dodo redirected them to their own machine, and our side recorded a clean success. There was no failure signal anywhere in the system. The guard now throws _before_ the Dodo session is created, so the worst case is a checkout that never starts rather than one that takes the money and strands the customer.

  `lib/telegram.ts` was the strangest of the four: it fell back to a hardcoded ephemeral `trycloudflare.com` tunnel hostname from someone's development session, embedded in user-facing deep links, pointing at a domain this project does not control.

- **Dodo webhook coverage — added in #62.** `app/api/billing/webhook/route.ts` previously had none. It now covers both signature-rejection paths and the `product_id` → `planKey` mapping for annual and monthly.

  Note the limit of that suite: `@/db` is fully mocked and every `then()` stub resolves `[]`, so it verifies the **mapping**, not the entitlement outcome. Its PR description claimed otherwise. Read the assertions, not the description.

## Genuinely still open

- **E-13** — see the re-scoping below. Much smaller than previously recorded here.
- **E-15** — release tag. `package.json` reads `0.2.0` but the `v0.2.0` tag was deleted after a defect was found in the logger it shipped. The repository currently has **no tags at all**.
- **F-18** — sweep `app/globals.css` for tokens orphaned by the group D deletions.
- **F-19** — the nonce plumbing landed, but `middleware.ts` sets **`Content-Security-Policy-Report-Only`**, not `Content-Security-Policy`. A report-only policy blocks nothing. This is a deliberate audit phase, not a finished control, and it should not be recorded as done until the header is switched to enforcing.
- **Issue #10** — BYOK group B follow-ups.
- **Issue #46** — two items only, both narrower than previously recorded here. See the corrections below.

## Corrections to this file

This section is kept rather than edited away. A ledger that silently revises its own history is worth no more than the plan it replaced, and the entire argument for this document is that its claims can be checked.

### 1. The annual-subscriber entitlement test was never missing

The first version said it does not exist. `tests/entitlements.test.ts` has contained `it("returns active for an active annual subscription")`, asserting on `planKey: "personal_annual"`, the whole time. A gap was recorded without opening the file that would have closed it.

What remains on issue #46 is narrower: the Stripe removal in `47c3eca` was pushed directly to `master` and has never been reviewed, and the `feat/card-gated-trial` branch referenced in the issue body does not exist in this repository. The user-facing half of the card-gated trial did ship — see the `footnote` on the personal plan in `lib/pricing.ts`.

### 2. E-13 was overstated, and A-19 does have a regression test

This file described E-13 as "the largest real gap", listing `recordAiUsage`, `resolveAccessState` edge cases and the admin guard as untested, and stated that A-19 is held in place by nothing but a code reading. Checked against `tests/`, which holds 25 files:

- **`resolveAccessState` is covered thoroughly.** `tests/entitlements-precedence.test.ts` runs BYOK precedence, every subscription status that must not grant access, and the `past_due` grace window — including the boundary and one millisecond past it, and the rule that the window anchors to `currentPeriodEnd` rather than `updatedAt` so a chatty provider cannot extend free access indefinitely.
- **`recordAiUsage`'s call contract is asserted** in `tests/nutrition-byok-billing.test.ts` across five paths, including the two that must _not_ write a usage row: a rate-limited BYOK user, and a provider 401 on a user key that must never silently retry on the platform key.
- **A-19 has a regression test.** `tests/admin-routes.test.ts` walks every `route.ts` under `app/api/admin/`, imports each handler, and asserts 403 for a signed-in non-admin across all five HTTP methods. It is generated by directory walk, so a newly added admin route is covered the moment it lands.

The genuine remaining gaps are narrower and worth stating precisely:

- **`lib/commit.ts`** — no test file. This is on the write path for logged meals.
- **`lib/nutrition-queries.ts`** — no test file, and the largest untested module at roughly 10 KB.
- **`lib/app-url.ts`** — no test, which is the worst of the three because it was added _this session_ and its entire purpose is to **throw in production**. Nothing currently asserts that it throws when `NEXT_PUBLIC_APP_URL` is unset and `NODE_ENV` is `production`, that it does _not_ throw in development, or that a whitespace-only value is treated as unset. A guard with no test is a guard nobody has checked the direction of.
- **The admin regression test only proves the negative.** It asserts non-admins get 403, but never that an admin gets through. A guard that rejects _everyone_ — or a route broken in a way that returns 403 for unrelated reasons — passes it unchanged. Worth adding the positive case, without which the test cannot distinguish a working guard from a broken route.

## Why `personal_annual` still exists

Annual was dropped from the storefront, so it is reasonable to read every surviving `personal_annual` reference as dead code. It is not.

`db/schema.ts` keeps `personal_annual` in `PLAN_KEYS` because real subscriber rows carry that value, and `drizzle/0006_column_constraints.sql` migrated legacy `'annual'` rows onto it. Removing a plan from the storefront is not the same as rewriting the history of people who already bought it. The webhook must keep mapping it, and entitlements must keep honouring it.

The branch that genuinely was dead lived in the **checkout** path, and that route now rejects any cadence other than `"monthly"`. That is the correct shape: closed to new sales, still honouring existing ones.

## Caveats on the schema rows

S-1 and S-2 are recorded as shipped because the migrations are applied and journalled, but the verification behind them was weaker than the plan text asks for:

- The scratch-database schema diff was run through `information_schema.columns`, which covers **types, precision, scale and nullability only**. It does not cover CHECK constraints, foreign keys, indexes, defaults or enums. An empty diff from that query is therefore not evidence that S-1's **foreign key** or S-2's **constraints** exist in production.
- The constraints that _were_ directly confirmed came from a `pg_constraint` query against `meal_item` alone. S-2 also covers `access_state`, `plan_key`, `provider`, `key_owner` and `status` on other tables, none of which were queried.
- Use `pg_dump --schema-only` for the next comparison. It captures everything `information_schema.columns` misses, and it is the only cheap way to make this claim honestly.

## Rule established this session

A migration file is **immutable once it is on `master`**. If it needs to change, that change is a new numbered migration. Do not amend an applied migration and then reconcile `drizzle.__drizzle_migrations` to match the new hash — that makes every environment's history silently disagree, and the disagreement only surfaces when a fresh bootstrap produces a different schema than production.
