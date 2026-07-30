import Stripe from "stripe"

const STRIPE_API_VERSION = "2026-06-24.dahlia"

let cached: Stripe | undefined

/**
 * Lazy for the same reason as lib/dodo.ts: `next build` imports every route
 * module to collect page data with no env vars present, so anything built at
 * module scope runs during the build.
 *
 * The previous version passed a literal "sk_test_placeholder" key when
 * STRIPE_SECRET_KEY was missing. That does not throw at construction, which is
 * arguably worse than the Dodo failure — it produced a client that looked valid
 * and only failed on the first live API call, in production, mid-checkout.
 */
export function getStripeClient(): Stripe {
	if (cached) return cached

	const secretKey = process.env.STRIPE_SECRET_KEY
	if (!secretKey) {
		throw new Error(
			"STRIPE_SECRET_KEY is not set. Billing routes cannot run without it. See .env.example."
		)
	}

	cached = new Stripe(secretKey, { apiVersion: STRIPE_API_VERSION, typescript: true })
	return cached
}

/** Test seam. */
export function resetStripeClient(): void {
	cached = undefined
}

export const stripe = new Proxy({} as Stripe, {
	get(_target, property) {
		const client = getStripeClient()
		const value = Reflect.get(client, property, client)
		return typeof value === "function" ? value.bind(client) : value
	},
	has(_target, property) {
		return property in getStripeClient()
	},
})
