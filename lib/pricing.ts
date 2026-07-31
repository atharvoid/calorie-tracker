/**
 * Single source of truth for user-facing pricing copy.
 *
 * The price and the feature lists were previously written inline in
 * `app/page.tsx`, which meant a price change had to be made in the billing
 * configuration and in JSX independently — and would silently disagree the
 * first time someone forgot one of them.
 *
 * This module is deliberately dependency-free. It must stay importable from
 * client components, so it must not reach `lib/entitlements` (which pulls in
 * the database client transitively).
 */

/**
 * Kept in step with FREE_TRIAL_DAYS in lib/entitlements.ts. Both read the same
 * environment variable; this copy exists only so marketing copy does not drag
 * the database layer into the client bundle.
 */
export const TRIAL_DAYS = readPositiveInt(process.env.FREE_TRIAL_DAYS, 7)

function readPositiveInt(raw: string | undefined, fallback: number): number {
	if (raw === undefined || raw === "") return fallback
	const parsed = Number(raw)
	return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

export type PlanKeyPublic = "personal" | "byok"

export type PublicPlan = {
	key: PlanKeyPublic
	name: string
	tagline: string
	/** Formatted for display, including currency symbol. */
	priceLabel: string
	periodLabel: string
	features: readonly string[]
	ctaLabel: string
	/**
	 * Small print rendered under the call to action. The trial now requires card
	 * details up front, and hiding that until the checkout page would be a
	 * surprise the user is entitled to see before they sign up.
	 */
	footnote?: string
}

/** Personal plan price in whole US cents, so no floating point rounding. */
export const PERSONAL_MONTHLY_PRICE_CENTS = 299

export function formatUsdCents(cents: number): string {
	return `$${(cents / 100).toFixed(2)}`
}

/**
 * Order is meaningful: the first entry is the plan the product leads with.
 * Personal is the business; Bring Your Own Key is a deliberate escape hatch for
 * the small slice of users who would rather run on their own provider quota, and
 * it is presented that way rather than as a co-equal headline offer.
 */
export const PUBLIC_PLANS: readonly PublicPlan[] = [
	{
		key: "personal",
		name: "Personal",
		tagline: "For people who want fast meal logging and a clear daily record.",
		priceLabel: formatUsdCents(PERSONAL_MONTHLY_PRICE_CENTS),
		periodLabel: "/ month",
		features: [
			"Meal logging from web and Telegram",
			"Estimated calories and macros",
			"Daily and weekly history",
			"Nutrition analytics",
			"Targets and day-specific adjustments",
			"Data export",
		],
		ctaLabel: `Start my ${TRIAL_DAYS}-day trial`,
		footnote: `Card details are saved when the trial starts. Nothing is charged for ${TRIAL_DAYS} days, and you can cancel any time before then.`,
	},
	{
		key: "byok",
		name: "Bring your own API key",
		tagline:
			"Already have a Google AI Studio key? Use it instead of a subscription and pay Google directly.",
		priceLabel: "$0",
		periodLabel: "/ month",
		features: [
			"No trial limit, no daily cap",
			"Everything in Personal",
			"Your key, your Google billing",
			"Remove your key anytime",
		],
		ctaLabel: "Use my own key instead",
		footnote: "Takes a few minutes of setup. Add the key from Settings once you are signed in.",
	},
]

export function getPublicPlan(key: PlanKeyPublic): PublicPlan {
	const plan = PUBLIC_PLANS.find((p) => p.key === key)
	if (!plan) throw new Error(`Unknown public plan: ${key}`)
	return plan
}
