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

/**
 * Annual price in whole US cents.
 *
 * This number previously existed only as the string "$24.99/yr" hardcoded in
 * `components/nutrition/settings-view.tsx`, which meant the one module that is
 * supposed to own pricing did not know the annual plan existed at all.
 */
export const PERSONAL_ANNUAL_PRICE_CENTS = 2499

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

// ── Billing cadence options ────────────────────────────────────────────

/** The cadence values accepted by POST /api/billing/checkout. */
export type BillingPlan = "monthly" | "annual"

export type BillingPlanOption = {
	plan: BillingPlan
	label: string
	/** Price and cadence, already formatted for a button. */
	priceLabel: string
	/**
	 * Exactly one option should be `primary`. It is the one the UI steers people
	 * toward, so it must not be the cheapest-looking option by accident.
	 */
	emphasis: "primary" | "secondary"
	note?: string
}

/**
 * Whether the annual cadence is offered.
 *
 * Currently false, deliberately. The annual plan was half-built: the settings UI
 * shipped an "$24.99/yr" button as the *primary* action, `db/schema.ts` has a
 * `personal_annual` plan key, and the webhook maps a product id to it — but no
 * annual product exists in Dodo Payments, so `DODO_PRODUCT_ANNUAL_ID` is unset
 * and the checkout route falls back to the literal string
 * "p_annual_placeholder". Anyone clicking that button hit a provider error.
 *
 * Flip this to true only once a real annual product exists and
 * DODO_PRODUCT_ANNUAL_ID is set in every environment. Nothing else needs to
 * change: the option is rendered from getEnabledBillingPlans().
 */
export const ANNUAL_PLAN_ENABLED = false

/**
 * Discount the annual price represents against twelve months at the monthly
 * rate. Computed rather than asserted, so the badge cannot claim a saving the
 * prices do not actually deliver.
 */
export function annualSavingsPercent(): number {
	const twelveMonths = PERSONAL_MONTHLY_PRICE_CENTS * 12
	if (twelveMonths <= 0) return 0
	const saved = twelveMonths - PERSONAL_ANNUAL_PRICE_CENTS
	return Math.max(0, Math.round((saved / twelveMonths) * 100))
}

/**
 * The cadence buttons to render, in display order. Monthly leads: it is the
 * price quoted everywhere else on the site, so making annual the emphasised
 * button (as the settings panel previously did) meant the headline $2.99 figure
 * and the loudest button disagreed.
 */
export function getEnabledBillingPlans(): readonly BillingPlanOption[] {
	const monthly: BillingPlanOption = {
		plan: "monthly",
		label: "Personal Monthly",
		priceLabel: `${formatUsdCents(PERSONAL_MONTHLY_PRICE_CENTS)}/mo`,
		emphasis: "primary",
	}

	if (!ANNUAL_PLAN_ENABLED) return [monthly]

	return [
		monthly,
		{
			plan: "annual",
			label: "Personal Annual",
			priceLabel: `${formatUsdCents(PERSONAL_ANNUAL_PRICE_CENTS)}/yr`,
			emphasis: "secondary",
			note: `Save ${annualSavingsPercent()}%`,
		},
	]
}
