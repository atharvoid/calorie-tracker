import { defineConfig, globalIgnores } from "eslint/config"
import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"

const eslintConfig = defineConfig([
	...nextVitals,
	...nextTs,
	globalIgnores([".next/**", "coverage/**", "drizzle/**", "node_modules/**"]),
	{
		rules: {
			// Previously "off", which hid real typing gaps project-wide.
			// Staged as "warn" so CI stays green while the remaining sites are
			// typed; flip to "error" once the count reaches zero.
			"@typescript-eslint/no-explicit-any": "warn",
			"react-hooks/set-state-in-effect": "warn",
			"@typescript-eslint/no-unused-vars": [
				"error",
				{ argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "all" },
			],
			eqeqeq: ["error", "smart"],
			"no-console": ["warn", { allow: ["warn", "error"] }],
		},
	},
])

export default eslintConfig
