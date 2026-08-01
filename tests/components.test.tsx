import React from "react"
import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { BentoGridItem } from "@/components/landing/bento-grid"
import { TIMEZONES } from "@/components/nutrition/settings-view"

describe("Component Layout Tests", () => {
	it("renders BentoGridItem in jsdom environment", () => {
		render(
			<BentoGridItem
				index="01"
				title="Log Meals"
				description="Log your daily food intake instantly."
			/>
		)
		expect(screen.getByText("01")).toBeInTheDocument()
		expect(screen.getByText("Log Meals")).toBeInTheDocument()
		expect(screen.getByText("Log your daily food intake instantly.")).toBeInTheDocument()
	})

	it("verifies imported app TIMEZONES are valid IANA names", () => {
		expect(TIMEZONES.length).toBeGreaterThan(0)
		for (const tz of TIMEZONES) {
			expect(() => Intl.DateTimeFormat(undefined, { timeZone: tz })).not.toThrow()
		}
	})
})
