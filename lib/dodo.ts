import { DodoPayments } from "dodopayments"

type DodoEnvironment = "test_mode" | "live_mode"

function resolveEnvironment(): DodoEnvironment {
	const raw =
		process.env.DODO_ENVIRONMENT || process.env.DODO_PAYMENTS_ENVIRONMENT || "test_mode"
	return raw === "live" || raw === "live_mode" ? "live_mode" : "test_mode"
}

let cached: DodoPayments | undefined

/**
 * Builds the client on first use and memoises it.
 *
 * The previous version constructed a DodoPayments instance at module scope with
 * a placeholder bearer token when DODO_PAYMENTS_API_KEY was absent. `next build`
 * imports every route module to collect page data, with no env vars loaded, so
 * that constructor ran during the build and threw `TypeError: Invalid URL`.
 *
 * Worse, the catch block called `new DodoPayments` a second time with the same
 * placeholder token, so the recovery path threw the identical error uncaught.
 * The fallback could never succeed.
 *
 * Deferring construction means importing this module is free. Billing routes
 * still fail loudly, but at request time and with a name attached.
 */
export function getDodoClient(): DodoPayments {
	if (cached) return cached

	const bearerToken = process.env.DODO_PAYMENTS_API_KEY
	if (!bearerToken) {
		throw new Error(
			"DODO_PAYMENTS_API_KEY is not set. Billing routes cannot run without it. " +
				"See .env.example."
		)
	}

	cached = new DodoPayments({ bearerToken, environment: resolveEnvironment() })
	return cached
}

/** Test seam. */
export function resetDodoClient(): void {
	cached = undefined
}

/**
 * Preserves the existing `dodo.webhooks.unwrap(...)` call style while keeping
 * construction lazy, so no import site needs to change.
 */
export const dodo = new Proxy({} as DodoPayments, {
	get(_target, property) {
		const client = getDodoClient()
		const value = Reflect.get(client, property, client)
		return typeof value === "function" ? value.bind(client) : value
	},
	has(_target, property) {
		return property in getDodoClient()
	},
})
