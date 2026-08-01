# Recommendation Report: Schema Date Format (S-5)

**Context**: In the current schema, `meal_item.date`, `nutrition_day_override.date`, and related columns are stored as `text` type and represent dates in `YYYY-MM-DD` format.

---

## 1. Trade-offs

### A. Current Implementation: `text` (`YYYY-MM-DD`)

- **Pros**:
  - Extremely simple to query and sort alphabetically without database-side date formatting/parsing.
  - Matches the client-side representation perfectly.
  - Avoids timezone shifts: database storing raw text acts as a timezone-neutral anchor. Timezone adjustment is handled entirely in application space at query boundaries.
  - Date helper utilities (`lib/nutrition-date.ts`) are thoroughly tested and optimized for string manipulation.
- **Cons**:
  - The database does not enforce semantic validity. Any string matching `YYYY-MM-DD` (like `"2026-13-45"`) is accepted.
  - Relies on application-level validations (e.g. Zod `.refine()` or `parseLocalDate` checks) to catch invalid calendar dates.

### B. Proposed Implementation: Postgres `date` type

- **Pros**:
  - Semantic constraints: Postgres native `date` type validates date boundaries at the database level (e.g., rejects `2026-02-31`).
- **Cons**:
  - Query overhead: Drizzle/Postgres date formatting returns JavaScript `Date` objects which are subject to runtime timezone shifting (e.g. local vs UTC conversions in Node/browser).
  - Requires extensive refactoring of query helper parameters, calculation routines, and mock tests that expect plain strings.

---

## 2. Cost Estimate & Plan

To safely migrate `meal_item.date` and `nutrition_day_override.date` to Postgres `date`:

1. **Database Migration**: Rename current text column, add new date column, copy values by casting `date_col::date`, drop old column.
2. **Refactoring App Layer**: Convert all calls to `dateRange`, `computeDailySummary`, `localDate`, etc. to accept/format `Date` objects or serialize them securely.
3. **Refactoring Tests**: Over 100 tests rely on string date inputs; all would need updates to avoid timezone drift errors.

**Estimated Effort**: **~16 hours** of developer time, with a **medium-high risk** of introducing timezone drift regressions.

---

## 3. Recommendation

> [!TIP]
> **We recommend RETAINING the `text` (`YYYY-MM-DD`) representation.**
> Application-level Zod calendar validation (implemented under A-20 using `parseLocalDate` calendar validation) is sufficient to guarantee data hygiene. A migration to native `date` introduces substantial timezone drift risks for negligible gain.
