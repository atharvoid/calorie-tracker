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
		// runners. Run them explicitly with: pnpm vitest run --mode perf
		exclude: ["tests/**/*.perf.test.ts", "node_modules/**"],
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
