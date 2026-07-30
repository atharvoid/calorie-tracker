# UI "character" redesign — plan

Trigger: "make it interactive, out-of-the-box, with character — blend of Apple-premium minimal and the bold illustrated poster look — using shadcn/ui, daisyUI, or Aceternity UI."

## Decision: shadcn/ui + Aceternity UI. Skip daisyUI.

| Library | What it actually is | Verdict |
| --- | --- | --- |
| **shadcn/ui** | Not an npm package — a CLI that copies Radix-based component source into your repo, styled with Tailwind + `class-variance-authority`. | **Use as base.** `components/ui/button.tsx` and `lib/ui.ts` (`PRIMARY_BTN`) already follow this exact cva pattern, so this extends the current architecture instead of replacing it. |
| **daisyUI** | A Tailwind *plugin* with its own class system (`btn btn-primary`, `card`) and its own theme tokens (`--p`, `--s`, ...). | **Skip.** Solves the same problem as shadcn in an incompatible way — running both means two competing styling systems fighting over the same elements. Would also collide with the app's existing custom CSS variables (`--accent`, `--radius-btn`, `--radius-card`, the `theme-imprint` override). |
| **Aceternity UI** | Not a base kit — ~200 animated "flair" components (spotlight backgrounds, bento grids, glare/hover cards, text reveals) built on Tailwind + Framer Motion, meant to layer on a base system. | **Use selectively**, only where personality should live (hero, onboarding), not project-wide. |

Note on "MCP": shadcn publishes an official MCP server, but it's a dev-tool for AI coding assistants inside an editor (Cursor, Windsurf) to fetch accurate component source instead of guessing — it isn't something installed into the shipped app, and isn't attachable to this chat session. It doesn't change this plan; the component source below is hand-written from the public docs already read.

## Design language: "Apple restraint + poster personality"

Rather than applying heavy illustration everywhere (which would fight the existing clean/minimal shell), personality is concentrated in a few high-visibility moments, and the rest of the app stays calm:

- **Typography**: keep the current sans body font everywhere for UI chrome (Apple restraint). Add one expressive display font (serif, e.g. Fraunces or Instrument Serif via `next/font/google`) used only for hero headlines, onboarding titles, and big numbers — this is what gives the poster screenshot its character, not color or clutter.
- **Color**: keep the existing neutral palette + single accent for 95% of the app. Introduce 2–3 additional "character" accent colors used only inside illustrated moments (hero background blobs, onboarding step accents, the BYOK "free forever" card) — mirroring how the poster uses a few saturated colors against a plain dark backdrop, not everywhere.
- **A small mascot**: a simple flat SVG blob/line character (2–3 poses: idle, celebrating, thinking) used in the onboarding tour and empty states. Cheap to build without a real illustrator, and reusable.
- **Motion**: Aceternity-sourced interactive components are reserved for the hero and onboarding only, per priority below. Everyday screens (Today, History, Settings) stay minimal and fast, not animated — avoids the "everything moves" trap that reads as noisy rather than premium.

## Phase 0 — Foundation (required before any visual phase)

- `package.json`: add `framer-motion` (Aceternity's animation dependency), confirm `class-variance-authority`, `clsx`, `tailwind-merge` are already present (they appear to be, based on existing `cn()`/`cva` usage) and only add what's missing.
- `components.json`: add shadcn's config file (aliases pointing at the existing `components/ui` and `lib/utils` paths) so the project is recognized as shadcn-compatible for any future component additions.
- `app/globals.css`: add the new character accent color tokens and the display-font CSS variable, without touching existing tokens other components rely on.
- Add the display font in the root layout via `next/font/google`, exposed as a CSS variable, so it can be opted into per-element instead of replacing the base font everywhere.
- **You will need to run `pnpm install` once** after these land, before the next build — this plan only edits repo files, it cannot run an install.

## Phase 1 — Landing page hero (priority 1)

- Replace the current static hero background with an Aceternity-style **Spotlight** (soft animated radial light following the cursor / drifting on load) behind the headline — subtle, not distracting.
- Headline gets the new display serif font treatment, large scale, echoing the poster's bold-serif-over-plain-background look.
- Replace the plain "07 sections" feature list with an Aceternity **Bento Grid** — a mosaic of unevenly sized cards that highlight on hover, replacing scroll-and-read with something to explore.
- The "Bring Your Own Key — Free forever" pricing card gets an Aceternity **Glare Card** hover treatment (subtle light sweep on hover/tilt) so the newest, most differentiated tier visually stands out.
- One small mascot illustration placed near the hero CTA.

Files touched: `app/page.tsx`, `components/landing/hero-demo.tsx`, new `components/landing/spotlight.tsx`, `components/landing/bento-grid.tsx`, `components/landing/glare-card.tsx`, new `components/mascot.tsx`.

## Phase 2 — Onboarding tour (priority 2)

- Replace the current flat bottom-sheet with a **card-stack** presentation (Aceternity's card-stack pattern): each step is its own card with a mascot pose, a short display-font micro-headline, and one line of body copy — keeping the "very minimal, easy" requirement from the original ask while adding personality per-step instead of walls of text.
- Add one small, tasteful success animation (a lightweight hand-rolled SVG/CSS burst, not a new heavy confetti dependency) on finishing the tour and on a user's first successful meal log — a single character payoff moment rather than constant motion.
- Keep existing behavior: dismissible any time, `localStorage`-gated so it never reprompts, Skip/Next unchanged.

Files touched: `components/onboarding-tour.tsx` (rewrite), reuses `components/mascot.tsx` from Phase 1.

## Phase 3 — Deferred (not started until 1 and 2 are reviewed live)

- Extend shadcn primitives (Dialog, Tooltip, Sheet) into Today/Settings to replace remaining ad hoc modals.
- Empty-state illustrations for History/Analytics using the same mascot.
- Skeleton/shimmer loading states.
- The broader type-scale/spacing-scale/motion-easing audit already scoped in `docs/BYOK_UI_REDESIGN_PLAN.md`'s Phase 3 section.

This stays deferred for the same reason noted in that earlier doc: this environment cannot render the app, so it is safer to ship two well-scoped, high-visibility phases, look at them live, and course-correct before touching the rest of the app.
