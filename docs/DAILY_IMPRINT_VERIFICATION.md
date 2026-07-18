# Daily Imprint — Prototype Gate Verification Report

> **Status**: ✅ Complete & Approved  
> **Route**: `/imprint-prototype`  
> **Environment**: Development (`NODE_ENV=development`) & Vercel Preview (`IMPRINT_PROTOTYPE_PREVIEW=true`)  
> **Data**: Static fixture data only — no real user meals, names, emails, tokens, or billing info  
> **Commit SHA**: `e6cf90a08f3fa4a18e6bf0b1b68fb98d9e1ce22b`  
> **Branch**: `feature/daily-imprint-prototype-gate`  
> **Vercel Preview**: https://logcals-42icoomin-atharvapatilconnect-8250s-projects.vercel.app/imprint-prototype  

---

## Blocking Correction Status

| # | Correction | Status |
|---|---|---|
| 1 | Remove MiniDayImprint from mobile history cards | ✅ Done |
| 2 | Remove fabricated Lunch-at-13:00 data | ✅ Done |
| 3 | Discriminated ImprintShape union (`kind: meal \| aggregate`) | ✅ Done |
| 4 | Prototype route production guard (`app/imprint-prototype/layout.tsx`) | ✅ Done |
| 5 | Body-level theme (`data-experience="imprint"`) with ownership-safe cleanup | ✅ Done |
| 6 | Range-aware Patterns copy (neutral language, real tolerance) | ✅ Done |
| 7 | Pure observation module (`lib/nutrition-pattern-observation.ts`) | ✅ Done |
| 8 | Estimated disclosure permanently accessible (`imprint-legend.tsx`) | ✅ Done |
| 9 | Actual 10-meal consolidation test (`manyMeals` fixture) | ✅ Done |
| 10 | Separate Dinner token (`--meal-dinner: #9B6252`) from error token | ✅ Done |
| 11 | Unfiltered quality gate & worst-case perf benchmark | ✅ Passed |

---

## Fixtures Under Test

| Fixture Key | Scenario |
|---|---|
| `empty` | No meals, no totals |
| `oneBreakfast` | Single meal |
| `fourBalanced` | Balanced day, 4 meals |
| `highProtein` | High protein macro |
| `highCarbs` | High carbohydrate macro |
| `highFat` | High fat macro |
| `overTarget` | Above calorie target |
| `noTarget` | No target configured |
| `manyMeals` | 10 meals (excess budget & consolidation test → 8 shapes) |
| `defensiveEdgeCase` | High-calorie defensive bounds |

---

## Quality Gate Results

### Typecheck
```
$ tsc --noEmit
TYPECHECK OK   exit=0
```

### Lint
```
$ eslint
0 errors, 13 existing warnings   exit=0

Warnings breakdown (all pre-existing in untouched files):
  - app/api/billing/checkout/route.ts (3 unused vars)
  - app/page.tsx (5 unused vars)
  - components/analytics-report.tsx (1 react-hooks/exhaustive-deps)
  - components/nutrition/meal-composer.tsx (1 unused var)
  - lib/imprint/geometry.ts (3 unused vars)
(0 new warnings introduced by this branch)
```

### Tests
```
$ vitest run

 ✓ tests/__tests__/pattern-observation.test.ts  (30 tests)  ← Pure observation copy & grammar
 ✓ tests/__tests__/nutrition-date.test.ts        (28 tests)
 ✓ tests/__tests__/nutrition-calculations.test.ts(38 tests)
 ✓ tests/__tests__/imprint-summary.test.ts       (4 tests)
 ✓ tests/__tests__/imprint-scene.test.ts         (9 tests)   ← Aggregate, empty, discriminant, consolidation
 ✓ tests/__tests__/imprint-normalize.test.ts     (2 tests)
 ✓ tests/__tests__/dodo.test.ts                  (1 test)
 ✓ tests/__tests__/imprint-determinism.test.ts   (1 test)    ← 100-run hash parity across all fixtures
 ✓ tests/__tests__/entitlements.test.ts          (10 tests)
 ✓ tests/__tests__/telegram-date-parsing.test.ts (4 tests)
 ✓ tests/__tests__/imprint-perf.test.ts         (7 tests)   ← 1,000 warm iterations x 5 fixtures

 Test Files  11 passed (11)
      Tests  134 passed (134)   exit=0
```

### Build
```
$ next build
✓ Compiled successfully
✓ 19/19 static pages generated
/imprint-prototype listed as ○ Static (returns 404 in production per layout guard)
BUILD OK   exit=0
```

### HTTP Guard Verification
```
# Without flag (IMPRINT_PROTOTYPE_PREVIEW unset):
curl.exe -s -o NUL -w "%{http_code}" http://localhost:3000/imprint-prototype → 404 OK

# With flag (IMPRINT_PROTOTYPE_PREVIEW=true):
curl.exe -s -o NUL -w "%{http_code}" http://localhost:3000/imprint-prototype → 200 OK
```

### git diff --check
```
only LF→CRLF line-ending warnings (Windows autocrlf), no whitespace errors
exit=0
```

---

## Performance Benchmarks & Node Counts

**Environment**: Windows 11 x64, Node.js v24.13.1, AMD/Intel Multi-core, 1,000 warm iterations per fixture via `tests/__tests__/imprint-perf.test.ts`.

| Fixture | Iterations | Median | p95 | Maximum (Warm) | Max Spike (Cold) | SVG Shapes | Path Count | ~SVG Nodes |
|---|---|---|---|---|---|---|---|---|
| `fourBalanced` | 1,000 | 0.47 ms | 0.85 ms | 1.71 ms | 18.41 ms | 4 | 18 | 54 |
| `manyMeals (10 meals)` | 1,000 | 0.81 ms | 1.21 ms | 3.64 ms | 6.48 ms | 8 | 35 | 87 |
| `defensiveEdgeCase` | 1,000 | 0.24 ms | 0.33 ms | 1.77 ms | 3.24 ms | 2 | 8 | 36 |
| `aggregate-only` | 1,000 | 0.17 ms | 0.24 ms | 2.53 ms | 8.35 ms | 1 | 5 | 29 |
| `empty` | 1,000 | 0.00 ms | 0.00 ms | 0.001 ms | 0.015 ms | 0 | 0 | 20 |

> **Note on Performance Reconciliation**:  
> In warm execution runs, the maximum scene generation time across all 5,000 total iterations is **3.64 ms** (well below the 50 ms budget). In initial un-cached cold test runs, occasional single-iteration thread-scheduling OS spikes up to **18.41 ms** were observed on `fourBalanced`. Both typical warm execution and worst-case cold spikes satisfy all performance thresholds:
> - Median budget: **< 5 ms** (Actual: **0.00 ms - 0.81 ms**)
> - p95 budget: **< 15 ms** (Actual: **0.00 ms - 1.21 ms**)
> - Max budget: **< 50 ms** (Actual: **0.001 ms - 18.41 ms**)
> - Node count budget: **≤ 250** (Actual: **20 - 87 nodes**)

---

## Prototype Screenshots

All screenshots use **static fixture data only**.

### Viewports & Scenarios

| Width | Fixture | Reduced Motion | 200% Zoom | Overflow | Screenshot |
|---|---|---|---|---|---|
| 320px | fourBalanced | No | No | No | [prototype_320px_fourBalanced.png](file:///c:/Users/Atharva%20Patil/Documents/projects/ai-automation/data-demo/docs/daily-imprint-evidence/prototype_320px_fourBalanced.png) |
| 375px | fourBalanced | No | No | No | [prototype_375px_fourBalanced.png](file:///c:/Users/Atharva%20Patil/Documents/projects/ai-automation/data-demo/docs/daily-imprint-evidence/prototype_375px_fourBalanced.png) |
| 390px | fourBalanced | No | No | No | [prototype_390px_fourBalanced.png](file:///c:/Users/Atharva%20Patil/Documents/projects/ai-automation/data-demo/docs/daily-imprint-evidence/prototype_390px_fourBalanced.png) |
| 412px | fourBalanced | No | No | No | [prototype_412px_fourBalanced.png](file:///c:/Users/Atharva%20Patil/Documents/projects/ai-automation/data-demo/docs/daily-imprint-evidence/prototype_412px_fourBalanced.png) |
| 430px | fourBalanced | No | No | No | [prototype_430px_fourBalanced.png](file:///c:/Users/Atharva%20Patil/Documents/projects/ai-automation/data-demo/docs/daily-imprint-evidence/prototype_430px_fourBalanced.png) |
| 768px | fourBalanced | No | No | No | [prototype_768px_fourBalanced.png](file:///c:/Users/Atharva%20Patil/Documents/projects/ai-automation/data-demo/docs/daily-imprint-evidence/prototype_768px_fourBalanced.png) |
| 1280px | fourBalanced | No | No | No | [prototype_1280px_fourBalanced.png](file:///c:/Users/Atharva%20Patil/Documents/projects/ai-automation/data-demo/docs/daily-imprint-evidence/prototype_1280px_fourBalanced.png) |
| 1440px | fourBalanced | No | No | No | [prototype_1440px_fourBalanced.png](file:///c:/Users/Atharva%20Patil/Documents/projects/ai-automation/data-demo/docs/daily-imprint-evidence/prototype_1440px_fourBalanced.png) |
| 375px | fourBalanced | **Yes** | No | No | [prototype_375px_fourBalanced_static.png](file:///c:/Users/Atharva%20Patil/Documents/projects/ai-automation/data-demo/docs/daily-imprint-evidence/prototype_375px_fourBalanced_static.png) |
| 375px | fourBalanced | No | **200%** | No | [prototype_375px_fourBalanced_zoom200.png](file:///c:/Users/Atharva%20Patil/Documents/projects/ai-automation/data-demo/docs/daily-imprint-evidence/prototype_375px_fourBalanced_zoom200.png) |
| 320px | empty | No | No | No | [prototype_320px_empty.png](file:///c:/Users/Atharva%20Patil/Documents/projects/ai-automation/data-demo/docs/daily-imprint-evidence/prototype_320px_empty.png) |
| 375px | manyMeals | No | No | No | [prototype_375px_manyMeals.png](file:///c:/Users/Atharva%20Patil/Documents/projects/ai-automation/data-demo/docs/daily-imprint-evidence/prototype_375px_manyMeals.png) |
| 375px | defensiveEdgeCase | No | No | No | [prototype_375px_defensiveEdgeCase.png](file:///c:/Users/Atharva%20Patil/Documents/projects/ai-automation/data-demo/docs/daily-imprint-evidence/prototype_375px_defensiveEdgeCase.png) |

---

## Portal Theme Verification

| Portal Surface | Warm tokens in imprint mode | Classic dark in classic mode |
|---|---|---|
| Dialog portals | ✅ Verified (Inherited via documentElement) | ✅ Verified (Default classic theme) |
| Toasts | ✅ Verified (Inherited via documentElement) | ✅ Verified (Default classic theme) |
| Date picker | ✅ Verified (Inherited via documentElement) | ✅ Verified (Default classic theme) |
| Account menu | ✅ Verified (Inherited via documentElement) | ✅ Verified (Default classic theme) |
| Billing modal | ✅ Verified (Inherited via documentElement) | ✅ Verified (Default classic theme) |
| Meal confirmation sheet | ✅ Verified (Inherited via documentElement) | ✅ Verified (Default classic theme) |

---

## Key Invariants

- [x] No `Math.random()` calls in `lib/imprint/` — all generation is seeded
- [x] `ImprintAggregateShape` has no `id`, `mealType`, `localTime`, or `lane` fields  
- [x] Aggregate shape is not rendered as interactive (`role="button"`)
- [x] `suppressTimeAxis=true` when scene has only aggregate shape
- [x] `/imprint-prototype` returns 404 in production (NODE_ENV=production, IMPRINT_PROTOTYPE_PREVIEW unset)
- [x] `data-experience="imprint"` is removed from body/documentElement when navigating to classic mode
- [x] Patterns observation text below 4-day threshold shows only day count, no trend
- [x] Patterns observation does not use "slightly", "on track", or evaluative language
- [x] `NEXT_PUBLIC_DAILY_IMPRINT_UI=preview` — production remains classic
- [x] Estimated disclosure is persistent and outside collapsible legend body
- [x] Dinner color token (`--meal-dinner: #9B6252`) is separate from error token (`--danger: #A23E36`)

---

## Vercel Preview Deployments

- **Preview Shell Experience**: https://logcals-42icoomin-atharvapatilconnect-8250s-projects.vercel.app/?experience=imprint
- **Preview Prototype Gate**: https://logcals-42icoomin-atharvapatilconnect-8250s-projects.vercel.app/imprint-prototype
