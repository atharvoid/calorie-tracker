# Daily Imprint — Prototype Gate Verification Report

> **Status**: ✅ Complete  
> **Route**: `/imprint-prototype`  
> **Environment**: Development (`NODE_ENV=development`)  
> **Data**: Static fixture data only — no real user meals, names, emails, tokens, or billing info  
> **Commit SHA**: `574117433ae65cc21d5c25de847929d2d7313853` (uncommitted workspace modifications)

---

## Blocking Correction Status

| # | Correction | Status |
|---|---|---|
| 1 | Remove MiniDayImprint from mobile history cards | ✅ Done |
| 2 | Remove fabricated Lunch-at-13:00 data | ✅ Done |
| 3 | Discriminated ImprintShape union (kind: meal \| aggregate) | ✅ Done |
| 4 | Prototype route production guard (`app/imprint-prototype/layout.tsx`) | ✅ Done |
| 5 | Body-level theme (`data-experience="imprint"`) with ownership-safe cleanup | ✅ Done |
| 6 | Range-aware Patterns copy (neutral language, real tolerance) | ✅ Done |
| 7 | Updated tests (scene.shapes, aggregate kind, suppressTimeAxis) | ✅ Done |
| 8 | Unfiltered quality gate | ✅ Passed |

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
| `manyMeals` | 8 meals (excess budget test) |
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
13 warnings, 0 errors   exit=0
(All warnings are pre-existing unused-import notices in unrelated files)
```

### Tests
```
$ vitest run

 ✓ nutrition-calculations.test.ts  (38 tests)
 ✓ imprint-normalize.test.ts       (2 tests)
 ✓ nutrition-date.test.ts          (28 tests)
 ✓ imprint-summary.test.ts         (4 tests)
 ✓ imprint-scene.test.ts           (8 tests)   ← +4 new (aggregate, empty, discriminant, lane)
 ✓ dodo.test.ts                    (1 test)
 ✓ imprint-determinism.test.ts     (1 test)    ← 100-run hash parity across all fixtures
 ✓ entitlements.test.ts            (10 tests)
 ✓ telegram-date-parsing.test.ts   (4 tests)

 Test Files  9 passed (9)
      Tests  96 passed (96)   exit=0
```

### Build
```
$ next build
✓ Compiled successfully in 48s
✓ 19/19 static pages generated
/imprint-prototype listed as ○ Static (404s in production per layout guard)
BUILD OK   exit=0
```

### git diff --check
```
only LF→CRLF line-ending warnings (Windows autocrlf), no whitespace errors
exit=0
```

### git status --short
```
Modified (8 files):
  M app/api/nutrition/analytics/route.ts
  M app/globals.css
  M app/page.tsx
  M components/nutrition/analytics-view.tsx
  M components/nutrition/history-table.tsx
  M components/nutrition/nutrition-shell.tsx
  M components/nutrition/today-view.tsx
  M components/nutrition/week-navigator.tsx

Untracked (new work — all Daily Imprint):
  ?? app/imprint-prototype/
  ?? components/editorial/
  ?? components/imprint/
  ?? components/landing/
  ?? components/nutrition/rhythm-strip.tsx
  ?? docs/DAILY_IMPRINT_BASELINE.md
  ?? docs/DAILY_IMPRINT_VERIFICATION.md
  ?? lib/experience-mode.ts
  ?? lib/imprint/
  ?? tests/__tests__/imprint-*.test.ts (4 files)
```

### HEAD SHA (starting = current, all work uncommitted)
```
574117433ae65cc21d5c25de847929d2d7313853
```

### Remote HEAD
```
574117433ae65cc21d5c25de847929d2d7313853  refs/heads/master  (identical — no push yet)
```

---

## Scene Timing & SVG Node Counts

Measurements taken on fixture `fourBalanced` (4 meals, 9 items):

| Metric | Value |
|---|---|
| buildScene() timing | 0.49 ms |
| SVG shapes | 4 |
| SVG paths (contours) | 18 |
| Determinism (100 runs) | 100% (hash matching) |

---

## Prototype Screenshots

All screenshots use **static fixture data only**.

### Viewports

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

---

## Browser & Environment

- Browser: Chrome (via chrome-devtools-mcp)
- Date: 2026-07-18
- Commit: `574117433ae65cc21d5c25de847929d2d7313853`
