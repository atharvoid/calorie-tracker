import nextVitals from "eslint-config-next/core-web-vitals"

const nextConfig = nextVitals.find((config) => config.name === "next")
const nextTypescriptConfig = nextVitals.find((config) => config.name === "next/typescript")

const eslintConfig = [
	...nextVitals,
	{
		ignores: [".next/**", "coverage/**", "drizzle/**", "node_modules/**"],
	},
	{
		plugins: {
			"@typescript-eslint": nextTypescriptConfig.plugins["@typescript-eslint"],
			react: nextConfig.plugins.react,
			"react-hooks": nextConfig.plugins["react-hooks"],
		},
		rules: {
			// Previously "off", which hid real typing gaps project-wide.
			// Staged as "warn" so CI stays green while the remaining sites are
			// typed; flip to "error" once the count reaches zero.
			"@typescript-eslint/no-explicit-any": "warn",
			"react-hooks/set-state-in-effect": "warn",
			"@typescript-eslint/no-unused-vars": [
				"warn",
				{ argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "all" },
			],
			"react/no-unescaped-entities": "warn",
			eqeqeq: ["error", "smart"],
			"no-console": ["warn", { allow: ["warn", "error"] }],
		},
	},
]

export default eslintConfig
