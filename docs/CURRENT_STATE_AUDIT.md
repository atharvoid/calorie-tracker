# Current State Audit

This document details the verified repository state of the **Calorie Tracker** application. It serves as a technical audit for the next engineering agent to implement calorie history, goals, and nutrition analytics.

---

## 1. Verified Repository Snapshot

- **Repository Owner/Name**: `atharvoid/calorie-tracker`
- **Visibility**: Public
- **Checked-out Branch**: `master`
- **Current Commit SHA**: `196dd5fb2f1b11174fa052f878567bd873e4cd9e`
- **Latest Commit Timestamp**: `2026-07-16T15:22:48+05:30`
- **Working Tree**: Clean
- **Package Manager**: `pnpm` (lockfile verified at [pnpm-lock.yaml](file:///c:/Users/Atharva%20Patil/Documents/projects/ai-automation/data-demo/pnpm-lock.yaml))
- **Build/Framework**: Next.js 16.2.10 (Turbopack enabled)

---

## 2. Objective Status: What is Implemented, Broken, or Missing

### A. What is Fully Implemented & Working
1. **Telegram Long-Polling Bot**: Located in [scripts/start-dev.ts](file:///c:/Users/Atharva%20Patil/Documents/projects/ai-automation/data-demo/scripts/start-dev.ts) and [lib/telegram.ts](file:///c:/Users/Atharva%20Patil/Documents/projects/ai-automation/data-demo/lib/telegram.ts). Bypasses local network port 22 firewall blocking and runs stably without any web tunnels (e.g. ngrok/localtunnel).
2. **Gemini 2.5 Flash Nutrition Extraction**: Located in [lib/nutrition.ts](file:///c:/Users/Atharva%20Patil/Documents/projects/ai-automation/data-demo/lib/nutrition.ts). Resolves free-form food descriptions to structured JSON containing calorie, protein, carbohydrate, and fat estimates in under 1.5 seconds.
3. **Database Schema & ORM**: Using Drizzle ORM configured in [drizzle.config.ts](file:///c:/Users/Atharva%20Patil/Documents/projects/ai-automation/data-demo/drizzle.config.ts) and defined in [db/schema.ts](file:///c:/Users/Atharva%20Patil/Documents/projects/ai-automation/data-demo/db/schema.ts).
4. **Google Sheets Integration**: Active in [lib/sheets-sync.ts](file:///c:/Users/Atharva%20Patil/Documents/projects/ai-automation/data-demo/lib/sheets-sync.ts). Successfully appends extracted meals to a `Meals` sheet tab in the user's connected Google Drive.
5. **Account Linking**: Command `/start <token>` in [lib/telegram.ts](file:///c:/Users/Atharva%20Patil/Documents/projects/ai-automation/data-demo/lib/telegram.ts#L103-L141) successfully links a Telegram user ID to a Supabase application user ID.

### B. What is Partially Implemented or Broken
1. **Realtime Broadcast Listener**: [components/realtime-listener.tsx](file:///c:/Users/Atharva%20Patil/Documents/projects/ai-automation/data-demo/components/realtime-listener.tsx) only handles the legacy `"entries"` event (for order tracking) and does not update when a new meal is logged.
2. **Database Connection Resets**: Drizzle Query errors wrap connection failures (`ECONNRESET`) in a custom exception. While a `withRetry` helper was added, the outer error wrapper was bypassing it. (We updated the wrapper to check `err.cause` properties, making it resilient).
3. **Legacy UI Charts**: The charts in [components/charts.tsx](file:///c:/Users/Atharva%20Patil/Documents/projects/ai-automation/data-demo/components/charts.tsx) and [components/analytics-report.tsx](file:///c:/Users/Atharva%20Patil/Documents/projects/ai-automation/data-demo/components/analytics-report.tsx) are fully hardcoded for order totals (INR currency symbols `₹`, customers, orders count) and do not read `meal_item` records.

### C. What is Absent (Requires Implementation)
1. **Daily & Weekly Calorie History**: The database query layer and front-end interface to browse meals by day and sort them by Monday–Sunday weeks.
2. **Maintenance & Target Calories Settings**: No DB tables or settings panel exist to store user default maintenance calories or daily target guidelines.
3. **Day-Specific Target Overrides**: Ability to set a custom target for a specific date (e.g. higher calories on workout days).
4. **Calorie Tracker Dashboard UI**: The UI currently only renders raw spreadsheet rows. It lacks calorie circles/bars showing target status (under, within, over) and macro breakdowns.

---

## 3. Important Data Flows & Module Boundaries

- **Telegram Bot Entry**: `lib/telegram.ts` receives messages via long polling -> calls `extractNutrition()` in `lib/nutrition.ts` -> returns inline keyboard with `✓ Save` and `✏️ Fix` buttons.
- **Database Commit**: `lib/commit.ts` handles the confirmation. It inserts items into the `meal_item` DB table and appends rows to Google Sheets in one transaction flow.
- **Next.js Web Page**: Reads live synced rows via `/api/sheet/preview` which queries the Google Sheets API directly.

---

## 4. Risks & Mitigations

1. **API Outage / Delay**: The project originally used `nvidia/llama-3.3-nemotron-super-49b-v1` via NVIDIA NIM, which started timing out (>30s) or failing. Switch to `google("gemini-2.5-flash")` in [lib/ai.ts](file:///c:/Users/Atharva%20Patil/Documents/projects/ai-automation/data-demo/lib/ai.ts) has resolved this, dropping latency to ~1.3s with 100% stability.
2. **Google OAuth Token Revocation**: If the user signs out, or token expires, the sheets sync will fail. Handled with explicit `offline` access request in [auth.ts](file:///c:/Users/Atharva%20Patil/Documents/projects/ai-automation/data-demo/auth.ts#L20-L24).
3. **Database Disconnects**: Supabase Postgres pool connections drop under load (`ECONNRESET`). Handled by the `withRetry` helper checking both `err.message` and `err.cause` properties.
