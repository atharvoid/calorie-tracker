# Calorie Tracker

Log what you ate in plain language — by web or Telegram — and get calories and
macros back, tracked against your daily targets.

> **Note on history:** this repository previously hosted a different project (an
> invoice/order extraction tool called "Data Assistant"). Some of that code is
> still present and is being removed. Anything marked `@deprecated` in
> `db/schema.ts` or listed under "Legacy surface" below is not part of this
> product. See [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md).

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
| ---------------------- | ----------------------------------------------- | --------------------- | ------------------------------ |
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

Implementation: [`lib/byok.ts`](lib/byok.ts),
[`app/api/byok/route.ts`](app/api/byok/route.ts), and the `byok_*` columns on
`product_entitlement`.

## Stack

| Layer     | Choice                                                       |
| --------- | ------------------------------------------------------------ |
| Framework | Next.js (App Router) + React + TypeScript                    |
| Styling   | Tailwind CSS with semantic design tokens (`lib/ui.ts`)       |
| Database  | Postgres via Drizzle ORM                                     |
| Auth      | Auth.js (Google provider)                                    |
| AI        | Google Gemini 2.5 Flash via the Vercel AI SDK                |
| Messaging | Telegram bot (grammY)                                        |
| Billing   | Stripe (Dodo Payments code also present — see plan task D-4) |
| Tests     | Vitest                                                       |

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

### Telegram development

The webhook needs a public URL. `pnpm dev:tunnel` starts the dev server behind a
tunnel; point `setWebhook` at it and pass the same value as
`TELEGRAM_WEBHOOK_SECRET`.

## Scripts

| Command                             | Purpose                                 |
| ------------------------------------ | --------------------------------------- |
| `pnpm dev`                          | Dev server                              |
| `pnpm dev:tunnel`                   | Dev server + public tunnel for Telegram |
| `pnpm build` / `pnpm start`         | Production build / serve                |
| `pnpm typecheck`                    | `tsc --noEmit`                          |
| `pnpm lint`                         | ESLint                                  |
| `pnpm format` / `pnpm format:check` | Prettier                                |
| `pnpm test` / `pnpm test:run`       | Vitest watch / single run               |

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
tests/__tests__/    Vitest suites
docs/               Implementation plan and design notes
```

## Data and privacy

- Google sign-in requests only `openid`, `email`, and `profile` — no Drive
  access.
- Nutrition figures are AI estimates, not medical or dietary advice.
- Deleting your account cascades to all meal, settings, and entitlement rows.

## Legacy surface

Routes `/api/extract`, `/api/extract-image`, `/api/insights`, `/api/entries`,
and `/api/sheet` have been removed. Still present and scheduled for removal:
the `entry` and `sheet_connection` database tables, and the spreadsheet-era
components `editable-table`, `editable-cell`, `charts`, `kpi-card`,
`status-pill`, `input-toggle`, and `dropzone`. Tracked as task group D in the
implementation plan.

## License

MIT — see [LICENSE](LICENSE).
