import { describe, it, expect } from "vitest"
import {
	PERSONAL_MONTHLY_PRICE_CENTS,
	PUBLIC_PLANS,
	formatUsdCents,
	getPublicPlan,
} from "@/lib/pricing"

describe("formatUsdCents", () => {
	it("always renders two decimal places", () => {
		expect(formatUsdCents(299)).toBe("$2.99")
		expect(formatUsdCents(500)).toBe("$5.00")
		expect(formatUsdCents(0)).toBe("$0.00")
	})

	it("does not accumulate floating point error", () => {
		// Storing whole cents is the reason this holds.
		expect(formatUsdCents(70)).toBe("$0.70")
		expect(formatUsdCents(1010)).toBe("$10.10")
	})
})

describe("public plans", () => {
	it("advertises the personal plan at $2.99 per month", () => {
		// A deliberate price change should require updating this line, so it
		// cannot happen by accident in a JSX edit.
		expect(PERSONAL_MONTHLY_PRICE_CENTS).toBe(299)
		expect(getPublicPlan("personal").priceLabel).toBe("$2.99")
	})

	it("advertises BYOK as free", () => {
		expect(getPublicPlan("byok").priceLabel).toBe("$0")
	})

	it("throws on an unknown plan key rather than rendering nothing", () => {
		// @ts-expect-error deliberately passing an invalid key
		expect(() => getPublicPlan("enterprise")).toThrow(/Unknown public plan/)
	})

	it("gives every plan non-empty copy and at least one feature", () => {
		for (const plan of PUBLIC_PLANS) {
			expect(plan.name.length).toBeGreaterThan(0)
			expect(plan.tagline.length).toBeGreaterThan(0)
			expect(plan.ctaLabel.length).toBeGreaterThan(0)
			expect(plan.features.length).toBeGreaterThan(0)
		}
	})

	it("has no duplicate feature lines within a plan", () => {
		for (const plan of PUBLIC_PLANS) {
			expect(new Set(plan.features).size).toBe(plan.features.length)
		}
	})

	it("never reuses a plan key", () => {
		const keys = PUBLIC_PLANS.map((p) => p.key)
		expect(new Set(keys).size).toBe(keys.length)
	})
})
