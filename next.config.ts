import type { NextConfig } from "next"

/**
 * Baseline security headers. Applied to every route.
 * CSP is intentionally omitted here: the app uses an inline theme bootstrap
 * script, so a correct CSP needs a nonce. Tracked in the implementation plan.
 */
const securityHeaders = [
	{ key: "X-Content-Type-Options", value: "nosniff" },
	{ key: "X-Frame-Options", value: "DENY" },
	{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
	{ key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
	{
		key: "Strict-Transport-Security",
		value: "max-age=63072000; includeSubDomains; preload",
	},
]

const nextConfig: NextConfig = {
	// Do not advertise the framework version.
	poweredByHeader: false,
	reactStrictMode: true,
	// Local tunnels used for Telegram webhook development.
	allowedDevOrigins: ["localhost", "*.loca.lt", "*.trycloudflare.com"],
	async headers() {
		return [{ source: "/:path*", headers: securityHeaders }]
	},
}

export default nextConfig
