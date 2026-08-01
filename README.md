# Calorie Tracker

Log what you ate in plain language — by web or Telegram — and get calories and
macros back, tracked against your daily targets.

> **Note on history:** this repository previously hosted a different project (an
> invoice/order extraction tool called "Data Assistant"). That code has now been
> removed in full — see "Legacy surface" below for what went, and
> [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md) for the record.

## How it works

1. You describe a meal ("two rotis, dal, half a cup of rice") or send a photo.
2. Gemini extracts structured items with per-item calories and macros.
3. You confirm the extraction — nothing is saved until you do.
4. Confirmed items land in `meal_item` and roll up into daily and weekly views
   against your targets.

## Access tiers

There are three ways to use the app. The middle tier is the point: if you bring
your own AI key, the app is free for you and costs the operator nothing.

| Tier                   | Cost to you                                     | Cost to operator     | Limits                         |
| ---------------------- | ----------------------------------------------- | -------------------- | ------------------------------ |
| **Free trial**         | Free                                            | Operator pays for AI | 7 days, 50 AI logs             |
| **Bring your own key** | Free (you pay Google directly, usually pennies) | Nothing              | Unlimited AI logs              |
| **Subscription**       | $2.99/month                                     | Operator pays for AI | Fair-use cap of 25 AI logs/day |

### Bring your own key (BYOK)

1. Create a free API key at [Google AI Studio](https://aistudio.google.com/apikey).
2. Paste it into Settings → AI key.
3. The key is verified against Google immediately, then encrypted with
   AES-256-GCM before it touches the database.

What this means in practice:

- Your extractions are billed to your own Google account. Google's free tier
  covers typical personal use, so most people pay nothing.
- Only the last four characters of your key are ever displayed. The plaintext is
  never logged, never returned by the API, and only decrypted inside the request
  that needs it.
- If Google rejects your key, the app tells you to rotate it. It does **not**
  silently fall back to the operator's key.
- Removing your key returns you to whatever tier you were on before.

The same rules apply on Telegram: `/setkey <key>` stores a key (the message
containing it is deleted immediately, so it does not sit in your chat history in
plaintext) and `/removekey` clears it. Meals logged through the bot are billed
to the same key as meals logged on the web — both paths share one extraction
function.

Implementation: [`lib/byok.ts`](lib/byok.ts),
[`app/api/byok/route.ts`](app/api/byok/route.ts), and the `byok_*` columns on
`product_entitlement`.

## Stack

| Layer     | Choice                                                 |
| --------- | ------------------------------------------------------ |
| Framework | Next.js (App Router) + React + TypeScript              |
| Styling   | Tailwind CSS with semantic design tokens (`lib/ui.ts`) |
| Database  | Postgres via Drizzle ORM                               |
| Auth      | Auth.js (Google provider)                              |
| AI        | Google Gemini 2.5 Flash via the Vercel AI SDK          |
| Messaging | Telegram bot (grammY)                                  |
| Billing   | Dodo Payments                                          |
| Tests     | Vitest                                                 |

The model ID lives in one place, [`lib/ai.ts`](lib/ai.ts), alongside its pricing
constants so cost reporting cannot drift from the model actually in use.

## Getting started

```bash
pnpm install
cp .env.example .env.local   # then fill it in
pnpm drizzle-kit migrate     # apply schema migrations
pnpm dev
```

`.env.example` documents every variable and marks which are required. The app
fails fast at boot if `DATABASE_URL` is missing rather than falling back to a
localhost database.

If `pnpm drizzle-kit migrate` reports migrations that are already applied, read
[`docs/MIGRATION_STATE_RECOVERY.md`](docs/MIGRATION_STATE_RECOVERY.md) before
forcing anything — the migration journal was repaired by hand and there is a
backfill script for bringing a database's bookkeeping table back in line.

### Telegram development

The webhook needs a public URL. `pnpm dev:tunnel` starts the dev server behind a
tunnel; point `setWebhook` at it and pass the same value as
`TELEGRAM_WEBHOOK_SECRET`.

## Scripts

| Command                             | Purpose                                 |
| ----------------------------------- | --------------------------------------- |
| `pnpm dev`                          | Dev server                              |
| `pnpm dev:tunnel`                   | Dev server + public tunnel for Telegram |
| `pnpm build` / `pnpm start`         | Production build / serve                |
| `pnpm typecheck`                    | `tsc --noEmit`                          |
| `pnpm lint`                         | ESLint                                  |
| `pnpm format` / `pnpm format:check` | Prettier                                |
| `pnpm test` / `pnpm test:run`       | Vitest watch / single run               |
| `pnpm db:backfill-migrations`       | Reconcile the Drizzle bookkeeping table |

CI runs typecheck, lint, format check, tests, and build on every pull request.

## Project layout

```
app/
  api/
    auth/        Auth.js handlers
    byok/        User API key management
    nutrition/   Meal extraction and commit
    telegram/    Bot webhook
    billing/     Checkout and provider webhooks
    admin/       Operator-only endpoints
  privacy/  terms/
components/
  nutrition/  landing/  ui/  editorial/  imprint/
db/
  schema.ts    Drizzle schema (source of truth)
  index.ts     Client + connection handling
lib/
  ai.ts             Model + pricing constants
  byok.ts           Key encryption and verification
  entitlements.ts   Access states, quotas, usage accounting
  nutrition-*.ts    Extraction, queries, calculations, date maths
  telegram.ts       Bot command handling
tests/              Vitest suites
docs/               Implementation plan and design notes
```

## Data and privacy

- Google sign-in requests only `openid`, `email`, and `profile` — no Drive
  access.
- Nutrition figures are AI estimates, not medical or dietary advice.
- Deleting your account cascades to all meal, settings, and entitlement rows.

## Legacy surface

The "Data Assistant" leftovers are gone. The unauthenticated `/api/extract`,
`/api/extract-image`, `/api/insights`, `/api/entries`, and `/api/sheet` routes
have been deleted, and so have the spreadsheet-era components
(`editable-table`, `editable-cell`, `charts`, `kpi-card`, `status-pill`,
`input-toggle`, `dropzone`, and neighbours).

The `entry` and `sheet_connection` tables have now been dropped as well. Their
Drizzle schema exports were removed first, then the tables themselves were
dropped by the `0007_drop_legacy_tables` migration. Task D-2 is complete.

The `lib/` modules tracked as D-4 have since been deleted too: `normalize`,
`analytics`, `extract-core`, `extraction`, `types`, and `data/demo-rows`, along
with the `broadcastEntries` helper and the `NormalizedRow` import that kept
`lib/realtime.ts` tied to the old data model. The dependencies they pinned —
`xlsx`, `@react-pdf/renderer`, `@ai-sdk/openai-compatible`, and `googleapis` —
are gone with them, as is the publicly reachable `app/imprint-prototype/` route
(D-11).

One deliberate exception: **`recharts` was kept.** It appeared on the D-5
removal list, but it is not spreadsheet-era code — the calorie trend and meal
contribution charts both import it, and removing it would break them.

Nothing from the previous project remains in the application code. The mentions
of "Data Assistant" still present in this repository are intentional history,
not leftovers: this note, the comment in `db/schema.ts` recording why two tables
were dropped, the header of `0007_drop_legacy_tables.sql`, and the planning
documents under `docs/`. They are worth keeping — a migration that drops two
tables should say why.

## License

MIT — see [LICENSE](LICENSE).
