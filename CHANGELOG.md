# Changelog

All notable changes to this project will be documented in this file.

## [0.2.0] – 2026-08-01

### Summary

Multi-phase quality and production-readiness refactor across eight phases:
schema hygiene, security hardening, API protection, performance, billing,
testing/linting, group-F fixes, and closeout.

### Added

- **Structured logger** (`lib/logger.ts`) — JSON output with `timestamp`,
  `level`, `message`, and metadata (including `userId`, `requestId`, `error`).
  All server-side `console.error` calls migrated (13 files).
- **Nonce-based CSP** (`middleware.ts`) — generates a per-request nonce,
  injects `x-nonce` header, sets `Content-Security-Policy-Report-Only`. The
  `<script>` tag in `app/layout.tsx` now carries the nonce.
- **Mobile navigation** (`components/nutrition/mobile-user-sheet.tsx`) — side
  sheet with avatar trigger, user info, and Sign-out button, accessible from
  the sticky mobile header inside `NutritionShell`.
- **Bottom tab bar** — fixed mobile nav with Today / History / Analytics /
  Settings tabs.
- **Docs index** (`docs/README.md`) — table of active docs and archived docs.
- **Docs archive** (`docs/archive/`) — completed handoff notes, imprint
  verification screenshots, and migration recovery guide moved here.

### Changed

- **ESLint rules elevated** — `@typescript-eslint/no-explicit-any` and
  `no-console` (allow `warn`/`error`) set to `"error"`; zero errors across all
  source files.
- **`app/page.tsx`** — landing page refactored: `SignInForm` component
  deduplicates both sign-in CTAs; `signInAction` / `signOutAction` live in
  `components/auth-actions.ts`; search-param array values no longer silently
  dropped; both `<main>` class sets unified via `rootClassName`.
- **Billing integration** — Stripe removed; Dodo Payments fully integrated with
  checkout, webhook, portal, and entitlement resolution.
- **BYOK rate limiting** — per-user token-bucket enforced server-side.
- **Admin dashboard** — business-metrics endpoint secured behind `isAdminEmail`
  guard + Vitest integration test.
- **`next.config.ts`** — baseline security headers (`X-Frame-Options`, `HSTS`,
  `Referrer-Policy`, etc.) applied to all routes.
- **Imprint visual** — deterministic scene layout, animated entrance,
  `manyMeals` consolidation verified across 100 runs.

### Fixed

- `searchParams` array-valued query parameters were silently discarded —
  now properly appended.
- Theme flash on page load eliminated via inline `THEME_BOOTSTRAP` script.
- Dodo `BillingProvider` literal corrected from `"dodopayments"` to `"dodo"`.

### Tests

- **259 tests passing** across 21 test files (Vitest).
- Admin route guard, billing checkout, BYOK paths, entitlement precedence,
  imprint determinism, nutrition calculations, and input validation all covered.

---

## [0.1.0] – initial release
