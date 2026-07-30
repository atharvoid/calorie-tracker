# Implementation Plan — Audit Remediation

Status: **in progress.** Baseline commit `c881d48`. Audit score at baseline:
**4.5/10**.

This plan turns every audit finding into a discrete, verifiable task. Tasks are
grouped by theme and lettered; each has an acceptance check you can run. Nothing
here adds product surface except task group **B (BYOK)**, which was explicitly
requested.

## How to read this

- **Status** — `done` (landed on `chore/audit-remediation`), `todo`, or
  `blocked`.
- **Risk** — likelihood of breaking production if done carelessly.
- **Check** — the command or observation that proves it is finished.

Do the groups in order. A→B→C are safe to ship together; D changes runtime
surface and needs a grep pass first; E→F are mechanical.

---

## Group A — Correctness and security (ship first)

| ID   | Task                                                                                                                                                                                                                                                                                                                                                                              | Status | Risk     |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------- |
| A-1  | Fix Gemini pricing constants. Rates were `$0.075/$0.30` (Gemini 1.5 Flash) while the code calls 2.5 Flash at `$0.30/$2.50`. Every `estimated_cost_micros` row under-reported by 4–8x. Constants now live in `lib/ai.ts` next to the model ID.                                                                                                                                     | done   | low      |
| A-2  | Make AI usage counters atomic. `trialAiLogsUsed: ent.value + 1` was read-modify-write; concurrent logs lost increments and users exceeded their allowance. Now `sql\`col + 1\``. The paid daily counter uses a single `CASE WHEN` statement so a midnight rollover cannot race.                                                                                                   | done   | low      |
| A-3  | Split `expired` into `trial_ended` and `quota_exhausted`. Users who burned their log allowance were told "your free trial has ended", which was false, and the dedicated trial-limit branch in `assertCanUseAiLog` was unreachable dead code.                                                                                                                                     | done   | low      |
| A-4  | Add `EntitlementError` with stable codes (`trial_ended`, `trial_quota_exhausted`, `daily_limit_reached`, `account_blocked`, `byok_key_invalid`). Callers can now branch on the reason and copy can be localised.                                                                                                                                                                  | done   | low      |
| A-5  | Use the per-user timezone for daily windows. `localDate("Asia/Kolkata")` was hardcoded in two places despite `nutrition_settings.timezone` existing, so every non-IST user's quota reset at the wrong hour.                                                                                                                                                                       | done   | low      |
| A-6  | Fix `resolveAccessState` fall-through. `canceled`/`unpaid` with a null `currentPeriodEnd` dropped into the trial branch; `unpaid` with a future period end returned `active`. Subscription resolution is now an exhaustive `switch` in a separate function.                                                                                                                       | done   | low      |
| A-7  | Anchor the `past_due` grace window to `currentPeriodEnd`, never `updatedAt`. `updatedAt` mutates on every webhook, so the window slid forward indefinitely.                                                                                                                                                                                                                       | done   | low      |
| A-8  | Validate env integers. `Number(process.env.X \|\| "7")` turned a typo into `NaN`, which made every limit comparison false and removed the limit entirely. `envInt` now throws at boot.                                                                                                                                                                                            | done   | low      |
| A-9  | Fail fast on missing `DATABASE_URL`. The hardcoded `postgres://postgres:postgres@127.0.0.1:5432/postgres` fallback turned a missing production variable into a confusing runtime `ECONNREFUSED`. Also removed the dead `try/catch` that returned the same localhost string again and swallowed the error.                                                                         | done   | low      |
| A-10 | Real calendar validation in `parseLocalDate`. `day > 31` was the only check, so `2026-02-31` and `2026-04-31` were accepted and silently rolled into the next month.                                                                                                                                                                                                              | done   | low      |
| A-11 | `dateRange` throws instead of silently truncating at 366 entries, so callers cannot render an incomplete series and believe it is complete.                                                                                                                                                                                                                                       | done   | low      |
| A-12 | **Guard or delete `/api/extract`.** It currently has no `auth()` check, no entitlement check, no rate limit, and no input length cap — anyone on the internet can POST unlimited text and bill the operator's Gemini account. This is the single most serious finding. Preferred fix: delete (see D-1). If it must stay, add `auth()`, `assertCanUseAiLog`, and a 10 KB body cap. | todo   | **high** |
| A-13 | Same treatment for `/api/extract-image` and `/api/insights`.                                                                                                                                                                                                                                                                                                                      | todo   | high     |
| A-14 | Telegram webhook: return `200` on internal handler failure. Non-2xx makes Telegram retry the same update, and with `await bot.handleUpdate()` under `maxDuration = 60` a slow Gemini call causes a timeout, a retry, and **duplicate meal entries**. Return `401` only for a bad secret; log and return `200` for everything else.                                                | todo   | high     |
| A-15 | Constant-time webhook secret comparison, and fail closed if `TELEGRAM_WEBHOOK_SECRET` is unset. Use `secretsMatch()` from `lib/byok.ts`.                                                                                                                                                                                                                                          | todo   | medium   |
| A-16 | Move `bot.init()` out of the request path. It runs on every cold start inside the handler, adding latency, and two simultaneous updates on one cold isolate can race.                                                                                                                                                                                                             | todo   | medium   |
| A-17 | Remove the hardcoded `https://logcals.vercel.app` fallback from `auth.ts`. Require `NEXT_PUBLIC_APP_URL` in production.                                                                                                                                                                                                                                                           | todo   | medium   |
| A-18 | Document or remove `allowDangerousEmailAccountLinking: true`. With Google as the only provider the risk is low, but it must be a deliberate, commented decision.                                                                                                                                                                                                                  | todo   | medium   |
| A-19 | Audit `/api/admin/*` for an operator-only guard. Verify it is not reachable by an ordinary signed-in user.                                                                                                                                                                                                                                                                        | todo   | **high** |
| A-20 | Add `zod` input validation and explicit body size caps to every remaining route handler.                                                                                                                                                                                                                                                                                          | todo   | medium   |

---

## Group B — BYOK tier (the new middle tier)

The goal: a tier between free trial and paid where the user pays nothing to us
and we pay nothing to Google, because the user supplies their own API key.

### Design

**Tier precedence** (highest first), implemented in `resolveAccessState`:

1. `blocked` — admin suspension overrides everything.
2. `active` / `grace` — a paying subscriber uses the platform key even if they
   also have a personal key on file. They are paying for convenience.
3. `byok` — a verified personal key means unlimited logs at zero cost to either
   party, and it **survives trial expiry**. This is the key property: an expired
   trial plus a valid key equals full access.
4. `trial` / `pre_trial` — time-boxed and log-capped.
5. `trial_ended` / `quota_exhausted` — no access.

**Storage.** Five columns on `product_entitlement`: `byok_provider`,
`byok_key_envelope`, `byok_key_last4`, `byok_verified_at`, `byok_failure_count`,
`byok_last_failure_at`.

**Encryption.** AES-256-GCM in `lib/byok.ts`, keyed by `BYOK_ENCRYPTION_KEY`
(32 bytes, base64). Envelope format `v1.<iv>.<authTag>.<ciphertext>`, all
base64url, one TEXT column. The version prefix makes future key rotation a
migration rather than a rewrite. GCM gives authenticated encryption, so a
tampered envelope fails to decrypt rather than yielding garbage.

**Verification before storage.** `verifyGoogleApiKey` does a shape check, then a
live `GET /v1beta/models?pageSize=1` probe with a 10 second timeout. A typo
therefore fails while the user is looking at the settings screen, not silently
on their next meal log.

**Failure handling.** If Google rejects a stored key mid-flight,
`recordByokFailure` increments a counter and the user is asked to rotate it. We
deliberately **never** fall back to the platform key — that would quietly move
their bill onto us, which is exactly what this tier exists to prevent.

**Cost attribution.** `usage_event.key_owner` is `'platform'` or `'user'`, and
`estimated_cost_micros` is forced to `0` for `'user'`. Without this, BYOK traffic
would pollute unit-economics reporting with costs nobody paid.

**Secrecy invariants.** Plaintext is never logged, never persisted, never
returned by any endpoint, and is decrypted only inside the request that needs
it. Only `byok_key_last4` is displayable.

### Tasks

| ID   | Task                                                                                                                                                                                                                                                                                    | Status        | Risk   |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ------ |
| B-1  | `lib/byok.ts` — AES-256-GCM encrypt/decrypt, versioned envelope, shape check, live Google verification, constant-time `secretsMatch` helper.                                                                                                                                            | done          | low    |
| B-2  | Schema: six `byok_*` columns on `product_entitlement`; `key_owner` on `usage_event`; `byok` added to the `AccessState` union.                                                                                                                                                           | done          | low    |
| B-3  | `resolveAccessState` handles `byok` at the correct precedence, above trial expiry and below paid.                                                                                                                                                                                       | done          | low    |
| B-4  | `resolveApiKeyForUser(userId)` returns `{ apiKey, keyOwner }` for the request.                                                                                                                                                                                                          | done          | low    |
| B-5  | `assertCanUseAiLog` treats `byok` as unmetered. `recordAiUsage` skips counters and records zero cost for `keyOwner: "user"`.                                                                                                                                                            | done          | low    |
| B-6  | `getModel(apiKey?)` in `lib/ai.ts` builds a per-request provider from a user key, falling back to the platform key.                                                                                                                                                                     | done          | low    |
| B-7  | `app/api/byok/route.ts` — `GET` status, `PUT` verify-and-store, `DELETE` remove. Auth-guarded, `runtime = "nodejs"`, 512-char input cap, no plaintext in any response.                                                                                                                  | done          | low    |
| B-8  | Generate and apply the migration: `pnpm drizzle-kit generate && pnpm drizzle-kit migrate`. All new columns are nullable or defaulted, so this is additive and safe on live data.                                                                                                        | todo          | medium |
| B-9  | Wire extraction call sites to BYOK: in the nutrition extract path and `lib/telegram.ts`, call `resolveApiKeyForUser`, pass the key to `getModel`, and forward `keyOwner` into `recordAiUsage`. On a provider auth error call `recordByokFailure` and surface a rotate-your-key message. | todo          | medium |
| B-10 | Settings UI: paste field, verify-on-save, masked `•••• last4` display, remove button, and a link to Google AI Studio. Reuse `PRIMARY_BTN` / `<Panel>` from `lib/ui.ts`.                                                                                                                 | todo          | low    |
| B-11 | Landing page: add BYOK as the middle column of the pricing section, positioned as "free forever with your own key". Read the price and tier list from a constant, not inline JSX (see F-4).                                                                                             | todo          | low    |
| B-12 | Fair-use throttle for BYOK users — `BYOK_RATE_LIMIT_PER_MINUTE`, default 10. This protects our compute, not our AI spend, since the AI spend is theirs.                                                                                                                                 | todo          | low    |
| B-13 | Telegram `/setkey` and `/removekey` commands so BYOK works without visiting the web app. Delete the message containing the key immediately after processing.                                                                                                                            | todo          | medium |
| B-14 | Tests: envelope round-trip, tampered-envelope rejection, wrong-encryption-key rejection, precedence (expired trial + valid key = `byok`), paid-beats-byok, zero cost attribution, no-silent-fallback on rejection.                                                                      | todo          | low    |
| B-15 | Document the tier in `README.md` and the privacy page: whose key is billed, what we store, how to revoke.                                                                                                                                                                               | done (README) | low    |

---

## Group C — Schema and data integrity

| ID  | Task                                                                                                                                                                                                                                                                                                                                                                                                                       | Status | Risk     |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------- |
| C-1 | Drop redundant indexes. `product_entitlement_user_id_idx` duplicated the `UNIQUE(user_id)` index; `nutrition_day_override_user_date_idx` duplicated its unique constraint; `usage_event_user_id_idx` was a prefix of the composite index. Three indexes of pure write amplification.                                                                                                                                       | done   | low      |
| C-2 | Add `meal_item_capture_idx` on `(capture_id, item_index)` — the deduplication lookup key, previously unindexed.                                                                                                                                                                                                                                                                                                            | done   | low      |
| C-3 | Add `$onUpdate(() => new Date())` to every `updated_at`. They had `defaultNow()` but no update hook, so they only ever recorded insertion time.                                                                                                                                                                                                                                                                            | done   | low      |
| C-4 | Narrow stringly-typed columns with `$type<...>()` unions: `meal_type`, `source`, `status`, `plan_key`, `access_state`, `key_owner`, `provider`. Legal values were previously documented only in `//` comments.                                                                                                                                                                                                             | done   | low      |
| S-1 | `meal_item.capture_id` is `text` but references `pending_capture.id`, which is `uuid` — a type mismatch with no FK constraint at all. Migrate to `uuid` with a real FK: `ALTER TABLE meal_item ALTER COLUMN capture_id TYPE uuid USING capture_id::uuid;` then add `REFERENCES pending_capture(id) ON DELETE SET NULL`. **Verify every existing value casts cleanly first** — a single malformed row aborts the migration. | todo   | **high** |
| S-2 | Convert the `$type<>()` unions above into real Postgres enums or `CHECK` constraints so the database enforces them, not just TypeScript.                                                                                                                                                                                                                                                                                   | todo   | medium   |
| S-3 | Give `numeric` columns explicit precision and scale, e.g. `numeric(7,2)` for macros. Bare `numeric` is returned by Drizzle as a **string**, which is why `Number()` coercion is scattered across every consumer. Consider `integer` for `kcal` and `grams`.                                                                                                                                                                | todo   | medium   |
| S-4 | Add `UNIQUE(user_id)` to `sheet_connection` — duplicate connections can currently accumulate. Deduplicate existing rows first.                                                                                                                                                                                                                                                                                             | todo   | medium   |
| S-5 | Consider `date` instead of `text` for `meal_item.date` and friends, so the database validates the format. Weigh against the existing string-arithmetic date utilities, which are deliberately string-based and well tested.                                                                                                                                                                                                | todo   | medium   |
| S-6 | Move `NutritionResult` out of `lib/nutrition.ts` into `lib/nutrition-types.ts` so `db/schema.ts` does not import from the app layer.                                                                                                                                                                                                                                                                                       | todo   | low      |

---

## Group D — Delete the previous project

Roughly 40% of the shipped tree belongs to "Data Assistant", an invoice
extraction tool. It is dead weight, it confuses every reader, and one of its
endpoints is an unauthenticated billing hole (A-12).

**Method:** for each item, `grep -rn "<symbol>" app components lib tests` first.
Delete only when the import count is zero. Work bottom-up: routes, then
components, then lib, then tables.

| ID   | Task                                                                                                                                                                                                                                                                        | Status | Risk   |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------ |
| D-1  | Delete routes `/api/extract`, `/api/extract-image`, `/api/insights`, `/api/entries`, `/api/sheet`.                                                                                                                                                                          | todo   | high   |
| D-2  | Drop the `entry` and `sheet_connection` tables. `entry` holds `customer / quantity / rate / amount / status='Pending'` — invoice line items in a calorie app. Marked `@deprecated` in the schema as a first step. Export a backup before dropping.                          | todo   | high   |
| D-3  | Delete the spreadsheet-era components: `editable-table`, `editable-cell`, `transform-panel`, `charts`, `kpi-card`, `analytics-report`, `report-pdf`, `status-pill`, `input-toggle`, `sheet-panel`, `demo-app`, and one of the near-duplicate `dropzone` / `file-drop` pair. | todo   | medium |
| D-4  | Delete the matching lib modules: `normalize`, `analytics`, `parse-file`, `export-xlsx`, `extraction`, `extract-core`, `types`, `sheets-sync`, `google` (if Drive is unused after D-1).                                                                                      | todo   | medium |
| D-5  | Remove the dependencies this frees: `xlsx`, `@react-pdf/renderer`, `recharts`, `@ai-sdk/openai-compatible`, `googleapis`. Verify with `pnpm why <pkg>` before each removal.                                                                                                 | todo   | medium |
| D-6  | Pick one payment provider. Both `stripe` and `dodopayments` are installed with both `lib/stripe.ts` and `lib/dodo.ts` present. Delete the loser and its env vars.                                                                                                           | todo   | medium |
| D-7  | Move `shadcn` from `dependencies` to `devDependencies` — it is a CLI.                                                                                                                                                                                                       | todo   | low    |
| D-8  | Delete the duplicate `components/auth-actions.tsx`. It is byte-identical to `auth-actions.ts` (same blob SHA `382e868`), which makes `@/components/auth-actions` ambiguous to a human reader.                                                                               | done   | low    |
| D-9  | Delete `scratch/` (`pr-body.md`, `test-idempotency.ts`) and add it to `.gitignore`. If `test-idempotency.ts` still has value, promote it to a real Vitest suite.                                                                                                            | done   | low    |
| D-10 | Delete the root `AUDIT.md`. Every row is `[x] Fixed`, its line references are stale, and it competes with `docs/CURRENT_STATE_AUDIT.md` and this file.                                                                                                                      | done   | low    |
| D-11 | Remove `app/imprint-prototype/` from the production build, or gate it behind a dev-only check. A prototype route is currently publicly reachable.                                                                                                                           | todo   | medium |
| D-12 | Consolidate `docs/`. Move the completed handoff and verification documents into `docs/archive/` and add a `docs/README.md` index.                                                                                                                                           | todo   | low    |

---

## Group E — Tooling, CI, consistency

| ID   | Task                                                                                                                                                                                                                                     | Status         | Risk   |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ------ |
| E-1  | Add CI (`.github/workflows/ci.yml`) running typecheck, lint, format check, tests, and build on every PR. Previously all four scripts existed and nothing enforced them.                                                                  | done           | low    |
| E-2  | Add `.env.example` documenting all ~20 variables. The README previously listed exactly one.                                                                                                                                              | done           | low    |
| E-3  | Add Prettier config, `.prettierignore`, `.editorconfig`, `.nvmrc`. The codebase mixes tabs and spaces **within single files** (`db/index.ts`, `db/schema.ts`) and `next.config.ts` used semicolons while nothing else did.               | done           | low    |
| E-4  | Re-enable the disabled ESLint rules. `@typescript-eslint/no-explicit-any` and `react-hooks/set-state-in-effect` were globally `off`, hiding real issues; both are now `warn`. Also added `eqeqeq`, `no-console`, and strict unused-vars. | done           | low    |
| E-5  | Add Vitest coverage config with thresholds, and include `.tsx`.                                                                                                                                                                          | done           | low    |
| E-6  | Add `LICENSE` (MIT) and a repository description and topics on GitHub.                                                                                                                                                                   | done (LICENSE) | low    |
| E-7  | Add `format` and `format:check` scripts to `package.json`, plus `prettier` and `prettier-plugin-tailwindcss` as dev dependencies. **Required for CI to pass** — do this before merging.                                                  | todo           | low    |
| E-8  | Flip the two staged ESLint rules from `warn` to `error` once the warning count reaches zero.                                                                                                                                             | todo           | low    |
| E-9  | Run `pnpm prettier --write .` once and commit the result as a single formatting-only commit, so it never pollutes a review diff again.                                                                                                   | todo           | low    |
| E-10 | Add `jsdom` and a `setupFiles` entry so component tests become possible. `environment: "node"` is why there are currently zero React tests.                                                                                              | todo           | low    |
| E-11 | Flatten `tests/__tests__/` to `tests/`. `__tests__` is a colocation convention and is meaningless nested inside a `tests/` directory. Rename `pattern-observation.test.ts` to match its source, `nutrition-pattern-observation.ts`.      | todo           | low    |
| E-12 | Rename `imprint-perf.test.ts` to `imprint-perf.perf.test.ts` so the default run excludes it. Timing assertions flake on shared CI runners.                                                                                               | todo           | low    |
| E-13 | Add tests for the untested money and data paths: `recordAiUsage`, `resolveAccessState` edge cases, `lib/commit.ts`, `lib/nutrition-queries.ts`, and the API route guards. Twelve suites exist and none touch billing or the database.    | todo           | medium |
| E-14 | Add a structured logger with request IDs, replacing bare `console.error`.                                                                                                                                                                | todo           | low    |
| E-15 | Bump `version` in `package.json` and tag a release.                                                                                                                                                                                      | todo           | low    |

---

## Group F — UI, accessibility, polish

| ID   | Task                                                                                                                                                                                                                                                                                                 | Status     | Risk     |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------- |
| F-1  | Add security headers and `poweredByHeader: false` in `next.config.ts`.                                                                                                                                                                                                                               | done       | low      |
| F-2  | Fix the theme flash. `<html data-theme="dark" className="dark">` is hardcoded and then an inline script may flip it to light, so light-mode users see a dark flash on every first paint — and `suppressHydrationWarning` hides the evidence. Compute the initial class in the bootstrap script only. | todo       | medium   |
| F-3  | `<Toaster theme="dark">` is hardcoded, so toasts stay dark in light mode. Drive it from the resolved theme. Likewise `themeColor: "#0A0A0B"` needs `media`-scoped light and dark variants.                                                                                                           | todo       | low      |
| F-4  | Extract the hardcoded `$2.99` price and feature list into a constants module shared by the landing page and the billing config, so they cannot drift.                                                                                                                                                | todo       | low      |
| F-5  | Remove the user-facing string `"Calorie Tracker — Data Assistant"` from the Google OAuth disclosure copy on the landing page. The old project name currently appears in the justification for a Drive scope, which is a real risk during OAuth verification review.                                  | todo       | **high** |
| F-6  | Add a mobile header for the signed-in state. The nav is `hidden md:flex` with no fallback, so on mobile there is no logo, no theme toggle, and **no way to sign out**.                                                                                                                               | todo       | medium   |
| F-7  | Replace `focus:outline-none` on the brand link with a `focus-visible:ring` treatment. Keyboard focus currently disappears — and `lib/ui.ts` already gets this right everywhere else.                                                                                                                 | todo       | low      |
| F-8  | De-duplicate `app/page.tsx`: the `handleSignIn` form and button appear verbatim twice, and the nav header is written twice across the signed-in and signed-out branches.                                                                                                                             | todo       | low      |
| F-9  | Extract the ~200-line landing page into `components/landing/*` sections. The file is 12.7 KB and mixes marketing markup with auth routing.                                                                                                                                                           | todo       | low      |
| F-10 | Move the inline `"use server"` `handleSignIn` out of the page file into `components/auth-actions.ts`, which already exists.                                                                                                                                                                          | todo       | low      |
| F-11 | Add `metadataBase`, `openGraph`, `twitter`, and `robots` to the root metadata. Every social share currently renders a blank card.                                                                                                                                                                    | todo       | low      |
| F-12 | Fix the shipped grammar bug: "Calorie counts scale the shapes, protein levels nested contours, and fat share the color opacity" — the last two clauses have no verb.                                                                                                                                 | todo       | low      |
| F-13 | Stop using `ShieldAlert` and `text-danger/80` for a routine estimates disclaimer. It is an informational note, not a danger state, and 80% opacity hurts contrast.                                                                                                                                   | todo       | low      |
| F-14 | Add `aria-hidden` to decorative `●`, `✓`, and `·` glyphs.                                                                                                                                                                                                                                            | todo       | low      |
| F-15 | Make the two `<main>` elements consistent — signed-out gets `app-backdrop min-h-screen bg-canvas text-primary`, signed-in gets only `app-backdrop`.                                                                                                                                                  | todo       | low      |
| F-16 | Fix `searchParams` handling: the `URLSearchParams` loop drops array values via `if (typeof value === "string")`.                                                                                                                                                                                     | todo       | low      |
| F-17 | Centralise the India defaults. `"Asia/Kolkata"` appears in the schema default and (previously) twice in entitlements; `"en-IN"` appeared in three formatters. Now `DEFAULT_TIMEZONE` and `DISPLAY_LOCALE`; finish the sweep.                                                                         | done (lib) | low      |
| F-18 | Sweep `app/globals.css` (9.8 KB) for design tokens orphaned by group D.                                                                                                                                                                                                                              | todo       | low      |
| F-19 | Add a nonce-based CSP once the inline theme script is resolved in F-2.                                                                                                                                                                                                                               | todo       | medium   |

---

## Merge checklist for this branch

1. `pnpm add -D prettier prettier-plugin-tailwindcss` and add the `format`
   scripts (**E-7 — CI fails without this**).
2. `pnpm drizzle-kit generate && pnpm drizzle-kit migrate` (**B-8**).
3. `pnpm typecheck` — expect errors at any call site still passing the old
   `"expired"` access state or importing `TEXT_MODEL`; update to the new states
   and `getModel()`.
4. `pnpm test:run`, then update `tests/__tests__/entitlements.test.ts` for the
   split access states.
5. `pnpm build`.
6. Then take group A-12 through A-19 as the immediate follow-up — those are the
   remaining security items.

## Scoring

| Area                       | Baseline | This branch | At 10/10         |
| -------------------------- | -------- | ----------- | ---------------- |
| Documentation              | 1        | 8           | +Group D-12      |
| Naming / brand consistency | 4        | 6           | +F-5, D-11       |
| Dead code / hygiene        | 3        | 5           | +Group D         |
| Schema                     | 5        | 7           | +S-1…S-6         |
| Security                   | 3        | 5           | +A-12…A-20, F-19 |
| Billing correctness        | 4        | 9           | +B-14, E-13      |
| Testing                    | 5        | 5           | +E-10…E-13       |
| Tooling / CI               | 2        | 9           | +E-7…E-9         |
| Code consistency           | 4        | 7           | +E-9             |
| UI / accessibility         | 5        | 6           | +Group F         |
| **Overall**                | **4.5**  | **~7**      | **10**           |
