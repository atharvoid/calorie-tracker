import { defineConfig } from "vitest/config"
import { resolve } from "path"

/**
 * Performance suites, run deliberately: `pnpm test:perf`
 *
 * The default config (`vitest.config.ts`) excludes `tests/**\/*perf.test.ts`
 * because wall-clock assertions flake on shared CI runners. Excluding them is
 * the right call for the default run — raising the threshold until a timing
 * assertion stops failing just relocates the flake and destroys the
 * benchmark's value as a regression signal.
 *
 * But excluded is not the same as deleted. This config is the documented way
 * back in, and it inverts the default's `include`/`exclude` rather than
 * overriding them from the command line, so the perf run cannot drift from
 * the alias resolution the suites actually need.
 */
export default defineConfig({
	resolve: {
		alias: { "@": resolve(__dirname, ".") },
	},
	test: {
		globals: true,
		environment: "node",
		include: ["tests/**/*perf.test.ts"],
		exclude: ["node_modules/**"],
	},
})
