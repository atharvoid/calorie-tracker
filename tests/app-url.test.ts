import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { getAppUrl } from "@/lib/app-url"

const DEV_FALLBACK = "http://localhost:3000"

/**
 * `getAppUrl` reads `process.env` on every call rather than at module scope, so
 * each case can set the environment it needs without resetting modules.
 *
 * `vi.stubEnv` is used rather than assigning `process.env` directly because
 * Next.js augments `NodeJS.ProcessEnv` with a readonly `NODE_ENV`, so a direct
 * assignment does not typecheck. Passing `undefined` removes the variable
 * outright, which is what "unset" has to mean here.
 *
 * The point of these tests is narrow but worth stating: this module's entire
 * job is to *refuse* to guess an origin in production. A guard is only useful
 * if someone has confirmed which way it points — an inverted condition here
 * would be invisible everywhere else in the suite, because every other test
 * runs with NODE_ENV set to "test" and would take the development branch.
 */
describe("getAppUrl", () => {
	beforeEach(() => {
		vi.stubEnv("NEXT_PUBLIC_APP_URL", undefined)
		vi.stubEnv("NODE_ENV", "development")
	})

	afterEach(() => {
		vi.unstubAllEnvs()
	})

	describe("when an origin is configured", () => {
		it("returns it unchanged", () => {
			vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://logcals.example")
			expect(getAppUrl()).toBe("https://logcals.example")
		})

		it("trims surrounding whitespace", () => {
			// A trailing newline is the usual shape of a value pasted into a
			// hosting provider's environment editor.
			vi.stubEnv("NEXT_PUBLIC_APP_URL", "  https://logcals.example\n")
			expect(getAppUrl()).toBe("https://logcals.example")
		})

		it("returns it in production without throwing", () => {
			vi.stubEnv("NODE_ENV", "production")
			vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://logcals.example")
			expect(getAppUrl()).toBe("https://logcals.example")
		})
	})

	describe("outside production", () => {
		it("falls back to localhost when unset", () => {
			expect(getAppUrl()).toBe(DEV_FALLBACK)
		})

		it("falls back to localhost when the value is only whitespace", () => {
			vi.stubEnv("NEXT_PUBLIC_APP_URL", "   ")
			expect(getAppUrl()).toBe(DEV_FALLBACK)
		})
	})

	describe("in production", () => {
		beforeEach(() => {
			vi.stubEnv("NODE_ENV", "production")
		})

		it("throws when unset", () => {
			expect(() => getAppUrl()).toThrow(/NEXT_PUBLIC_APP_URL is required in production/)
		})

		it("throws when the value is only whitespace", () => {
			// Paired deliberately with the development case above: an empty string
			// must mean "unset" in both branches, or the trim and the guard drift
			// apart and a blank variable silently becomes a localhost origin.
			vi.stubEnv("NEXT_PUBLIC_APP_URL", "   ")
			expect(() => getAppUrl()).toThrow(/NEXT_PUBLIC_APP_URL is required in production/)
		})

		it("never returns the localhost fallback", () => {
			// The failure this module was written to prevent is not an exception,
			// it is a plausible-looking wrong answer.
			let returned: string | undefined
			try {
				returned = getAppUrl()
			} catch {
				returned = undefined
			}
			expect(returned).not.toBe(DEV_FALLBACK)
		})

		it("names the consequences in the error, not just the variable", () => {
			// The message is read by whoever is mid-deploy at the time, so it has
			// to say what breaks rather than only what is missing.
			expect(() => getAppUrl()).toThrow(/billing return URLs/)
		})
	})
})
