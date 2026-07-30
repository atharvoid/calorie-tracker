# BYOK completion, onboarding, and design system — plan

This captures the plan behind this PR and scopes the work intentionally left
for follow-ups. Read alongside `docs/IMPLEMENTATION_PLAN.md`, which already
tracked BYOK as **group B**; this document is the detailed execution plan for
finishing that group plus the two new asks (onboarding, visual redesign).

## Why this PR exists

The question that triggered it: "there's no bring-your-own-key option on the
site, how do I do it." The answer was that BYOK was half-built — the backend
(`lib/byok.ts`, the schema columns, `app/api/byok/route.ts`) landed in an
earlier PR, but nothing called it. There was no settings UI, the extraction
call sites never fetched a stored key, and the migration that creates the
columns in the live database was never applied. An endpoint with no caller and
no UI is invisible, which is exactly what was reported.

## Phase 1 — BYOK completion (this PR)

| Task | What changed |
| --- | --- |
| Wire extraction | `lib/nutrition.ts` now resolves the user's key and passes it to `getModel()`. Previously the key was stored but never read back. |
| No silent fallback | A rejected BYOK key throws a distinct `byok_key_invalid` error rather than silently billing the platform key — this is the one invariant that makes the tier trustworthy, so it is enforced in one place (`extractNutrition`) rather than at each call site. |
| Settings UI | `components/nutrition/byok-panel.tsx` — paste field, live verification against Google before saving, masked `•••• last4`, remove button, link to Google AI Studio. |
| Pricing | `app/page.tsx` pricing section is now three tiers instead of one, with BYOK positioned as "free forever." |
| Telegram | `/setkey <key>` and `/removekey`. The message containing the key is deleted immediately after processing per the original task spec (B-13) — it must not sit in a chat history in plaintext. |
| Stale state bug | The frontend still matched on `accessState === "expired"`, a value that stopped existing when trial-ended and quota-exhausted were split apart. This meant the trial banner and paywall screen have not rendered since that change shipped. Fixed in `settings-view.tsx` and `nutrition-shell.tsx`. |
| OAuth copy | Removed the old "Calorie Tracker — Data Assistant" product name from the Google Drive scope justification on the landing page (previously flagged as high-risk for OAuth verification review; this was a one-line, low-risk fix picked up opportunistically). |

### Still blocking, cannot be done from here

1. **Apply the migration.** `drizzle/0004_byok_tier.sql` already exists in the
   repo (it was generated but never run). Until `pnpm drizzle-kit migrate` is
   run against the live database, the BYOK columns do not exist and
   `/api/byok` will fail. This requires a real database connection, which this
   environment does not have.
2. **Set `BYOK_ENCRYPTION_KEY`** in the production environment
   (`openssl rand -base64 32`). Without it, `isByokEnabled()` returns false and
   the settings panel shows "not enabled on this deployment."

### Not done in this pass (tracked, not forgotten)

- **B-12, fair-use throttle** (`BYOK_RATE_LIMIT_PER_MINUTE`) — protects compute,
  not AI spend, but was not implemented here. Low risk to add later.
- **B-14, dedicated BYOK test suite** — envelope round-trip, tampered envelope,
  wrong encryption key, precedence tests. The existing `entitlements.test.ts`
  covers precedence at the state-resolution level already; this would add
  coverage for the new `setByokKey`/`clearByokKey` and the failure-classification
  logic in `extractNutrition`.
- **A discrepancy found while reading `db/schema.ts`**: `docs/IMPLEMENTATION_PLAN.md`
  (task D-2) classifies `sheet_connection` as "Data Assistant"-era dead weight
  to delete. It is not dead — `components/nutrition/settings-view.tsx` actively
  uses it for the live Google Sheets sync feature. `entries` does look like
  genuine invoice-era leftover (customer/quantity/rate/amount/status fields),
  but `sheet_connection` does not belong in the same deletion task. Worth
  re-verifying before anyone acts on D-2 as written.

## Phase 2 — Onboarding tour (this PR)

`components/onboarding-tour.tsx`: a four-step centered modal (not anchored
tooltips) shown once, automatically, to accounts in the `pre_trial` state —
i.e. signed in, never logged a meal. Dismissible at any step, tracked in
`localStorage` so it never reprompts. Steps: welcome, how to log a meal, where
history lives, where analytics live, and where to add a BYOK key.

Anchored tooltips pointing at specific buttons were considered and rejected
for this pass: they require accurate DOM measurement against elements that
change position across the mobile bottom nav and the desktop top nav, and that
cannot be verified without rendering the page. A modal sequence is simpler,
works identically at every breakpoint, and still delivers the ask ("minimal,
easy"). Anchored coach-marks are a reasonable Phase 3 upgrade once someone can
look at the deployed result.

## Phase 3 — Visual design system (follow-up, not in this PR)

The ask was to make the app look like a premium, Apple Music-grade product.
That is a real, substantial design project, and it is being deliberately
sequenced after this PR rather than attempted blind, for one concrete reason:
**this environment cannot render the app.** There is no screenshot or preview
loop available here. Shipping a from-scratch visual pass across ~20 components
without ever seeing the result is how you get something that compiles but
looks wrong, and the fix for that is iteration against what is actually
rendered — which means the next step is to look at the deployed site and point
at specific screens, not for more blind edits.

What a strong Phase 3 pass would cover, so it can be scoped precisely once
there is a feedback loop:

- **Type scale.** A deliberate scale (e.g. 12/13/15/17/22/28/34) instead of the
  current ad hoc `text-xs`/`text-sm`/`text-lg` mix, matching Apple's approach of
  few, purposeful sizes rather than many similar ones.
- **Spacing scale.** Audit `p-4`/`p-5`/`p-6`/`p-8` usage for consistency; Apple
  Music leans on generous, consistent gutters (16/20/24/32) rather than varying
  by component.
- **Elevation.** Real soft shadows and backdrop blur for surfaces that float
  above content (the mobile header and bottom nav already use
  `backdrop-blur-md`; extend that language to modals and the meal composer
  consistently).
- **Motion.** One consistent easing curve (the codebase already has
  `cubic-bezier(0.16, 1, 0.3, 1)` in `tab-enter` — standardize on it everywhere
  instead of default `ease`/`ease-out`).
- **Corner radius rhythm.** Current tokens (`--radius-btn: 10px`,
  `--radius-card: 16px`) are reasonable; the imprint experience overrides them
  independently, so any global change must be checked against both themes.
- **Component-by-component pass**, roughly in order of how often a user sees
  them: `nutrition-shell.tsx` nav → `today-view.tsx` / `meal-composer.tsx` →
  `history-view.tsx` → `analytics-view.tsx` → `settings-view.tsx` → landing page.

This is intentionally not started blind in this PR. Once deployed, the next
step is to point at specific screens (or share screenshots) and iterate
against the real render — that is how this gets to "premium," not by guessing.
