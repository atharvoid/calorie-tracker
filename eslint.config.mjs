import { dirname } from "path"
import { fileURLToPath } from "url"
import { FlatCompat } from "@eslint/eslintrc"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({ baseDirectory: __dirname })

const eslintConfig = [
	...compat.extends("next/core-web-vitals", "next/typescript"),
	{
		ignores: [".next/**", "coverage/**", "drizzle/**", "node_modules/**"],
	},
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
]

export default eslintConfig
