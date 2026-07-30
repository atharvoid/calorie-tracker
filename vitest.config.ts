import { defineConfig } from "vitest/config"
import { resolve } from "path"

export default defineConfig({
	resolve: {
		alias: { "@": resolve(__dirname, ".") },
	},
	test: {
		globals: true,
		environment: "node",
		include: ["tests/**/*.test.{ts,tsx}"],
		// Performance assertions are timing-sensitive and flake on shared CI
		// runners. The pattern is intentionally `*perf.test.ts` rather than
		// `*.perf.test.ts` so it matches the existing imprint-perf.test.ts
		// without a rename.
		//
		// Excluding these is the correct fix for a flaky timing assertion.
		// Raising the threshold until it stops failing just relocates the flake
		// and destroys the benchmark's value as a regression signal.
		// Run them deliberately with: pnpm test:perf
		exclude: ["tests/**/*perf.test.ts", "node_modules/**"],
		coverage: {
			provider: "v8",
			reporter: ["text", "lcov"],
			include: ["lib/**/*.ts"],
			exclude: ["lib/**/*.d.ts"],
			thresholds: {
				lines: 60,
				functions: 60,
				statements: 60,
				branches: 50,
			},
		},
	},
})
