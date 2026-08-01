import React from "react"
import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { BentoGridItem } from "@/components/landing/bento-grid"

describe("Component Layout Tests", () => {
	it("renders BentoGridItem component layout correctly", () => {
		const html = renderToStaticMarkup(
			<BentoGridItem
				index="01"
				title="Log Meals"
				description="Log your daily food intake instantly."
			/>
		)
		expect(html).toContain("01")
		expect(html).toContain("Log Meals")
		expect(html).toContain("Log your daily food intake instantly.")
	})

	it("verifies timezone options are valid IANA names", () => {
		const TIMEZONES = [
			"Asia/Kolkata",
			"UTC",
			"America/New_York",
			"America/Los_Angeles",
			"Europe/London",
		]
		for (const tz of TIMEZONES) {
			expect(() => Intl.DateTimeFormat(undefined, { timeZone: tz })).not.toThrow()
		}
	})
})
