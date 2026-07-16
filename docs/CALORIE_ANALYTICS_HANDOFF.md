# Calorie Analytics & History Handoff

This document details the implementation plan, schema modifications, gap analysis, and risk register for the next engineering agent to build calorie history, settings, overrides, and nutrition analytics.

---

## 1. Feature Gap Matrix

| Capability | Current Status | Evidence Paths | Required Change | Dependencies | Est. Size |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Daily Calories & Macros** | **Absent** | [app/page.tsx](file:///c:/Users/Atharva%20Patil/Documents/projects/ai-automation/data-demo/app/page.tsx) | Create query endpoint to return aggregated daily macros from `meal_item` table. | `meal_item` DB rows | **S** |
| **Inspect Food eaten on Selected Day** | **Absent** | [components/sheet-panel.tsx](file:///c:/Users/Atharva%20Patil/Documents/projects/ai-automation/data-demo/components/sheet-panel.tsx) | Add drill-down modal/panel displaying individual food items for the chosen date. | `meal_item` DB rows | **M** |
| **Sort Days & Monday-Sunday Weeks** | **Absent** | — | Add helper function to group daily intake into Mon-Sun calendar weeks. | Date grouping helper | **M** |
| **Default Maintenance Calories** | **Absent** | [db/schema.ts](file:///c:/Users/Atharva%20Patil/Documents/projects/ai-automation/data-demo/db/schema.ts) | Add a `user_settings` table to store default target and maintenance calories. | Schema update | **S** |
| **Default Daily Target** | **Absent** | [db/schema.ts](file:///c:/Users/Atharva%20Patil/Documents/projects/ai-automation/data-demo/db/schema.ts) | Add `target_kcal` column in the settings table. | Schema update | **S** |
| **Day-Specific Target Overrides** | **Absent** | — | Add a `target_override` table mapping `userId` + `date` to custom target calories. | Schema update | **M** |
| **Realtime Sync from Telegram** | **Broken** | [components/realtime-listener.tsx](file:///c:/Users/Atharva%20Patil/Documents/projects/ai-automation/data-demo/components/realtime-listener.tsx) | Update broadcast trigger in `lib/commit.ts` to emit `meals` event, and update listener. | Supabase Realtime | **S** |

---

## 2. Database Schema Audit & Additive Migrations

### Existing Schema State
1. **`meal_item`**:
   - `date`: text type representing `YYYY-MM-DD` (e.g. `2026-07-16`).
   - `kcal`, `proteinG`, `carbsG`, `fatG`: `numeric` type (not integer or floating point).
   - `mealType`: `text` representing `Breakfast`, `Lunch`, `Dinner`, `Snack`, or `null`.
2. **`pending_capture`**:
   - `payload`: `jsonb` type containing the raw model-extracted `NutritionResult`.

### Safest Additive Migration Plan
The next agent should apply the following schemas using Drizzle Kit / SQL without touching existing user records:

```sql
-- 1. User Settings Table
CREATE TABLE "user_settings" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" text NOT NULL UNIQUE REFERENCES "user"("id") ON DELETE CASCADE,
    "maintenance_kcal" integer NOT NULL DEFAULT 2000,
    "target_kcal" integer NOT NULL DEFAULT 1800,
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now()
);

-- 2. Day-Specific Target Overrides Table
CREATE TABLE "day_override" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "date" text NOT NULL, -- YYYY-MM-DD
    "target_kcal" integer NOT NULL,
    "created_at" timestamp NOT NULL DEFAULT now(),
    UNIQUE("user_id", "date")
);

-- 3. Optimization Indexes for History Queries
CREATE INDEX IF NOT EXISTS "meal_item_user_date_idx" ON "meal_item"("user_id", "date");
CREATE INDEX IF NOT EXISTS "day_override_user_date_idx" ON "day_override"("user_id", "date");
```

---

## 3. Proposed Implementation Map

### Domain Logic (New Files & Helpers)
1. **`lib/date-utils.ts`**: Pure utilities for converting timezone-aware dates, grouping items by Monday–Sunday weeks, and filling in missing days for target charts (without reporting zero-intake data corruptions).
2. **`lib/calculations.ts`**: Pure functions to calculate total calories, protein/carbs/fat ratios, and determine target status (`under`, `within`, `over`) based on default/override metrics.

### Server Layer
1. **`/api/settings/route.ts`**: POST/GET handler to read and write default maintenance & target metrics.
2. **`/api/overrides/route.ts`**: POST/GET handler to create day-specific custom calorie limits.
3. **`/api/history/route.ts`**: Aggregates history logs from `meal_item` table, resolves custom targets/overrides, and returns Mon-Sun structured data blocks.

### UI Modifications
1. **`components/sheet-panel.tsx`**: Update layout to incorporate tabs:
   - **`Dashboard`**: Weekly ring progress, daily tracking cards, macro progress bars.
   - **`History`**: Week-by-week calendar listing total intake vs target.
   - **`Settings`**: Inputs for default targets & overrides.
2. **`components/charts.tsx`**: Replace legacy business trend chart with a Calorie Trend Area Chart comparing actual intake vs target thresholds.

---

## 4. Risk Register

| Risk | Likelihood | Impact | Evidence Path | Mitigation |
| :--- | :--- | :--- | :--- | :--- |
| **Timezone Parsing Hazard** | High | Medium | `lib/commit.ts` | Force all client & server date displays to resolve under `Asia/Kolkata` using `toLocaleDateString` configs. |
| **Missing Days Treated as Zero** | Medium | Medium | — | Ensure chart logic skips null dates when calculating average weekly calorie coverage. |
| **Double Counting Legacy Entries** | High | High | `db/schema.ts` | Clean up / deprecate the legacy `entry` (orders) table and query views. Exclusively read from `meal_item`. |
| **Realtime Duplicate Events** | Low | Low | `lib/realtime.ts` | Ensure client listeners use the unique `id` field from `meal_item` to deduplicate local state updates. |
| **Cross-User Data Leakage** | Low | Critical | `app/api/...` | Enforce server-side user session verification in every DB query via `eq(table.userId, session.user.id)`. |
| **Sheet Append Disconnects** | Medium | Low | `lib/sheets-sync.ts` | Implement database retry wraps around sheet operations to handle OAuth token refreshes. |
