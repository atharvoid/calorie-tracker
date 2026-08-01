import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
	// Generate a dynamic nonce
	const nonce = Buffer.from(crypto.randomUUID()).toString("base64")

	// Construct Content Security Policy
	const cspHeader = `
		default-src 'self';
		script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${
			process.env.NODE_ENV === "development" ? "'unsafe-eval'" : ""
		};
		style-src 'self' 'unsafe-inline';
		img-src 'self' blob: data: https://lh3.googleusercontent.com;
		font-src 'self';
		object-src 'none';
		base-uri 'self';
		form-action 'self';
		frame-ancestors 'none';
		report-uri /api/csp-report;
	`
		.replace(/\s{2,}/g, " ")
		.trim()

	const requestHeaders = new Headers(request.headers)
	requestHeaders.set("x-nonce", nonce)

	const response = NextResponse.next({
		request: {
			headers: requestHeaders,
		},
	})

	// Set report-only mode first to test and audit before enforcement
	response.headers.set("Content-Security-Policy-Report-Only", cspHeader)

	return response
}

export const config = {
	matcher: [
		/*
		 * Match all request paths except for the ones starting with:
		 * - api (API routes)
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico (favicon file)
		 */
		{
			source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
			missing: [
				{ type: "header", key: "next-router-prefetch" },
				{ type: "header", key: "purpose", value: "prefetch" },
			],
		},
	],
}
