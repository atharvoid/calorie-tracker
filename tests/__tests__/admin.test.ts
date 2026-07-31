import { describe, expect, it } from "vitest"
import { isAdminEmail } from "@/lib/admin"

describe("isAdminEmail", () => {
	it("fails closed when the allowlist is missing or empty", () => {
		expect(isAdminEmail("admin@example.com", undefined)).toBe(false)
		expect(isAdminEmail("admin@example.com", "")).toBe(false)
		expect(isAdminEmail(null, "admin@example.com")).toBe(false)
	})

	it("matches an explicitly configured email case-insensitively", () => {
		expect(isAdminEmail(" Admin@Example.com ", "owner@example.com, admin@example.com ")).toBe(
			true
		)
	})

	it("rejects authenticated users outside the allowlist", () => {
		expect(isAdminEmail("member@example.com", "admin@example.com")).toBe(false)
	})
})
