/**
 * Canonical public origin for this deployment.
 *
 * Task A-17 removed the hardcoded `https://logcals.vercel.app` fallback from
 * `auth.ts` for a specific reason: an environment that forgets
 * `NEXT_PUBLIC_APP_URL` should fail loudly rather than quietly point at a
 * different deployment. That reasoning was correct, but it was only ever
 * applied to `auth.ts` — every other reader of this variable grew its own
 * fallback string independently.
 *
 * The rule this module encodes:
 *
 * - Outside production, a localhost default is a development convenience.
 * - Inside production, a missing origin is a configuration error and must
 *   throw at module scope, where it is loud, rather than producing plausible
 *   output that points somewhere unreachable.
 *
 * A silent fallback is worse than a crash here. A crash is noticed during
 * deploy; a canonical URL pointing at `localhost` is only noticed when someone
 * shares a link and sees an empty preview card.
 */

const DEV_FALLBACK = "http://localhost:3000"

export function getAppUrl(): string {
	const configured = process.env.NEXT_PUBLIC_APP_URL?.trim()
	if (configured) return configured

	if (process.env.NODE_ENV === "production") {
		throw new Error(
			"NEXT_PUBLIC_APP_URL is required in production. Without it the app falls back to " +
				`${DEV_FALLBACK}, which silently breaks Open Graph and canonical URLs, ` +
				"billing return URLs, and Telegram deep links."
		)
	}

	return DEV_FALLBACK
}
