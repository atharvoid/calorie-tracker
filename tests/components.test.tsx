import React from "react"
import { describe, expect, it, vi } from "vitest"

// Mock auth actions to prevent next-auth/next/server from being imported in jsdom environment
vi.mock("@/components/auth-actions", () => ({
	signOutAction: () => {},
	signInAction: () => {},
}))

import { render, screen } from "@testing-library/react"
import { BentoGridItem } from "@/components/landing/bento-grid"
import { MobileUserSheet } from "@/components/nutrition/mobile-user-sheet"
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

	it("renders MobileUserSheet trigger button in jsdom environment", () => {
		render(<MobileUserSheet user={{ name: "Test User", email: "test@example.com" }} />)
		const avatarButton = screen.getByRole("button", { name: /open account menu/i })
		expect(avatarButton).toBeInTheDocument()
	})

	it("verifies imported app TIMEZONES are valid IANA names", () => {
		expect(TIMEZONES.length).toBeGreaterThan(0)
		for (const tz of TIMEZONES) {
			expect(() => Intl.DateTimeFormat(undefined, { timeZone: tz })).not.toThrow()
		}
	})
})
