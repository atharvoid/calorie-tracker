## Summary

This PR implements **The Daily Imprint** visual food system for Logcals as an opt-in preview experience (`experience=imprint`).

The identity system converts daily nutrition data into deterministic, topographic SVG visual imprints without decorative particles or mascot assets.

### Baseline & Implementation Commits
- **Baseline SHA**: `574117433ae65cc21d5c25de847929d2d7313853` (master)
- **Implementation SHA**: `320efcd55fc65ccda5c7401d663e1bdb0acf16b0`

---

## Scope Summary & Key Corrections

1. **Truthful Aggregate Shape & Timing Removal**:
   - Production History rows use exact text and status indicators only. The renderer supports a non-interactive aggregate shape for totals-only prototype and future adequately sized archive surfaces, without fabricated timing or meal identity.
   - Mini imprint SVGs below 640px removed from mobile history cards.

2. **Persistent Estimated Disclosure**:
   - The notice ("Nutrition values are estimates and can be edited.") is permanently rendered in the DOM outside the collapsible legend body, ensuring continuous accessibility reading order.

3. **Excess Meal Consolidation**:
   - Days with >8 meals consolidate excess items into a single `Additional` aggregate shape, preserving exact meal records outside the scene. Tested with a 10-meal fixture (`manyMeals`).

4. **Range-Aware Patterns Copy**:
   - Extracted pure observation generator (`lib/nutrition-pattern-observation.ts`) to produce neutral language using exact user calorie target and tolerance ranges with 30 dedicated unit tests.

5. **Semantic Token Separation**:
   - `Dinner` color token separated from error/danger token (`--meal-dinner: #9B6252`, distinct from `--danger: #A23E36`).

6. **Production Layout Guard**:
   - `/imprint-prototype` layout returns 404 in production unless `IMPRINT_PROTOTYPE_PREVIEW=true` is set.

---

## Feature Flag & Guard Behavior

- `NEXT_PUBLIC_DAILY_IMPRINT_UI=preview` — Imprint experience enabled through `?experience=imprint` in Preview mode and through prototype controls on the guarded prototype route.
- `IMPRINT_PROTOTYPE_PREVIEW=true` — Prototype route `/imprint-prototype` enabled for preview testing.
- **Production Defaults**: Production remains classic (`experience=classic`) by default. Production build prerenders `/imprint-prototype` as a 404 static page when `IMPRINT_PROTOTYPE_PREVIEW` is unset.

---

## Quality Gate Results

- **TypeScript (`tsc --noEmit`)**: 0 errors
- **ESLint (`eslint`)**: 0 errors, 5 pre-existing warnings in untouched legacy files (`app/api/billing/checkout/route.ts`, `components/analytics-report.tsx`, `components/nutrition/meal-composer.tsx`). 0 warnings in any file modified or created by this branch (fixed 8 warnings in `app/page.tsx` and `lib/imprint/geometry.ts` compared to baseline SHA `5741174`).
- **Vitest (`vitest run`)**: **134 / 134 tests passed** across 11 test files.
- **Production Build (`next build`)**: Succeeded cleanly (prerendered static 404 guard).

---

## Performance Benchmarks

Measured across 1,000 warm iterations per fixture on Node v24.13.1 / Windows 11 x64:

| Fixture | Iterations | Median | p95 | Current-Run Max | Highest Previously Observed Outlier | Shapes | Paths | Estimated SVG Nodes |
|---|---|---|---|---|---|---|---|---|
| `fourBalanced` | 1,000 | 0.47 ms | 0.85 ms | 1.71 ms | 18.41 ms | 4 | 18 | 54 |
| `manyMeals` (10 meals) | 1,000 | 0.81 ms | 1.21 ms | 3.64 ms | 6.48 ms | 8 | 35 | 87 |
| `defensiveEdgeCase` | 1,000 | 0.24 ms | 0.33 ms | 1.77 ms | 3.24 ms | 2 | 8 | 36 |
| `aggregate-only` | 1,000 | 0.17 ms | 0.24 ms | 2.53 ms | 8.35 ms | 1 | 5 | 29 |
| `empty` | 1,000 | 0.00 ms | 0.00 ms | 0.001 ms | 0.015 ms | 0 | 0 | 20 |

*(Node counts are calculated estimates based on `shapes × contours + base elements`)*

---

## Preview URLs

- **Imprint Prototype Page**: https://logcals-42icoomin-atharvapatilconnect-8250s-projects.vercel.app/imprint-prototype
- **Imprint Product Shell**: https://logcals-42icoomin-atharvapatilconnect-8250s-projects.vercel.app/?experience=imprint

---

## Visual Review Evidence & Screenshot Matrix

![Daily Imprint at 320px](docs/daily-imprint-evidence/prototype_320px_fourBalanced.png)
*Min Mobile Viewport (320px) — fourBalanced*

![Daily Imprint at 1440px](docs/daily-imprint-evidence/prototype_1440px_fourBalanced.png)
*Wide Desktop Viewport (1440px) — fourBalanced*

![Ten-meal consolidation](docs/daily-imprint-evidence/prototype_375px_manyMeals.png)
*Ten-Meal Excess Consolidation Test — manyMeals (375px)*

![Empty day state](docs/daily-imprint-evidence/prototype_320px_empty.png)
*Empty Day State (320px)*

![Reduced motion state](docs/daily-imprint-evidence/prototype_375px_fourBalanced_static.png)
*Static / Reduced Motion State (375px)*

![200% Emulated text zoom](docs/daily-imprint-evidence/prototype_375px_fourBalanced_zoom200.png)
*200% Emulated Text Zoom State (375px)*

![Defensive high-calorie state](docs/daily-imprint-evidence/prototype_375px_defensiveEdgeCase.png)
*Defensive High-Calorie Boundary Scaling — defensiveEdgeCase (375px)*

---

## Rollback Instructions

### Before merge
1. Close PR #1 without merging.
2. Remove Preview-scoped environment variables (`NEXT_PUBLIC_DAILY_IMPRINT_UI`, `IMPRINT_PROTOTYPE_PREVIEW`) from Vercel settings if no longer needed.

### After merge but before production activation
1. Revert PR #1 on GitHub (`git revert`).
2. Keep Production experience mode set to classic (`NEXT_PUBLIC_DAILY_IMPRINT_UI=off` or default).

### After production activation
1. Immediately set `NEXT_PUBLIC_DAILY_IMPRINT_UI=off` in Vercel Production environment variables and redeploy.
2. Revert PR #1 via GitHub if code-level remediation is required.
