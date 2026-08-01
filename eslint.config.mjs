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
			// Previously "off", which hid real typing gaps project-wide.
			// Staged as "warn" so CI stays green while the remaining sites are
			// typed; flip to "error" once the count reaches zero.
			"@typescript-eslint/no-explicit-any": "error",
			"react-hooks/set-state-in-effect": "warn",
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
