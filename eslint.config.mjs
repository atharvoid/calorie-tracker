import { defineConfig, globalIgnores } from "eslint/config"
import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"

const reactHooksPlugin = nextVitals.find((config) => config.plugins?.["react-hooks"])?.plugins?.[
	"react-hooks"
]

if (!reactHooksPlugin) {
	throw new Error("Next.js ESLint config did not expose the React Hooks plugin")
}

const eslintConfig = defineConfig([
	...nextVitals,
	...nextTs,
	globalIgnores([".next/**", "coverage/**", "drizzle/**", "node_modules/**"]),
	{
		plugins: {
			"react-hooks": reactHooksPlugin,
		},
		rules: {
			// Both of these were globally "off" before task E-4, which hid real
			// typing and effect bugs project-wide. They were staged as "warn" so
			// CI could stay green while the existing sites were cleaned up, and
			// E-8 is the promotion to "error" once that count reaches zero.
			//
			// A staged "warn" only works if someone eventually promotes it. A
			// warning nothing enforces is indistinguishable from "off" after the
			// first week, because nobody reads a clean-exit log.
			"@typescript-eslint/no-explicit-any": "error",
			"react-hooks/set-state-in-effect": "error",
			"@typescript-eslint/no-unused-vars": [
				"error",
				{ argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "all" },
			],
			eqeqeq: ["error", "smart"],
			"no-console": ["error", { allow: ["warn", "error"] }],
		},
	},
])

export default eslintConfig
