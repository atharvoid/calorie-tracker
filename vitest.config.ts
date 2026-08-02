import { defineConfig } from "vitest/config"
import { resolve } from "path"

const alias = { "@": resolve(__dirname, ".") }

export default defineConfig({
	resolve: { alias },
	test: {
		globals: true,
		exclude: ["tests/**/*perf.test.ts", "node_modules/**"],
		projects: [
			{
				resolve: { alias },
				test: {
					name: "unit",
					environment: "node",
					include: ["tests/**/*.test.ts"],
					exclude: ["tests/**/*.test.tsx", "tests/**/*perf.test.ts", "node_modules/**"],
				},
			},
			{
				resolve: { alias },
				test: {
					name: "components",
					environment: "jsdom",
					setupFiles: ["./tests/setup.ts"],
					include: ["tests/**/*.test.tsx"],
					exclude: ["tests/**/*perf.test.ts", "node_modules/**"],
				},
			},
		],
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
