import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"

declare global {
	// eslint-disable-next-line no-var
	var postgresClient: ReturnType<typeof postgres> | undefined
}

/**
 * Placeholder used only where no query will ever run. postgres.js parses the
 * connection string eagerly but connects lazily, so this never opens a socket.
 * If something did try to query through it, the failure is a loud ECONNREFUSED
 * rather than silent success against the wrong database.
 */
const NON_RUNTIME_PLACEHOLDER_URL = "postgres://placeholder:placeholder@127.0.0.1:5432/placeholder"

/**
 * `next build` imports every route module to collect page data, and Vitest
 * imports modules that transitively reach this file. Neither has DATABASE_URL
 * and neither issues a query, so throwing at import time breaks the build and
 * the test run for no safety benefit.
 *
 * Note this is deliberately narrower than a blanket fallback. Falling back
 * unconditionally is what the original code did, and it turned a missing
 * production env var into a confusing ECONNREFUSED at request time instead of
 * an obvious boot failure. That fail-fast behaviour is preserved for `next dev`
 * and for the production server, which are the cases that actually matter.
 */
function isNonRuntimeContext(): boolean {
	return (
		process.env.NEXT_PHASE === "phase-production-build" ||
		process.env.NODE_ENV === "test" ||
		Boolean(process.env.VITEST)
	)
}

function resolveConnectionString(): string {
	const url = process.env.DATABASE_URL
	if (url) return url
	if (isNonRuntimeContext()) return NON_RUNTIME_PLACEHOLDER_URL
	throw new Error(
		"DATABASE_URL is not set. Copy .env.example to .env.local and provide a Postgres connection string."
	)
}

/**
 * Serverless functions get a single connection because each invocation is its
 * own isolate; a pool would leak connections. Local dev uses the driver default
 * so hot reloads stay responsive.
 */
const MAX_CONNECTIONS_SERVERLESS = 1

/**
 * The connection string is handed to postgres.js as-is rather than being taken
 * apart into { host, port, username, password, ssl } first.
 *
 * Decomposing it looks harmless and is not:
 *
 *   - Query parameters are lost. `sslmode`, `pgbouncer=true`, `connect_timeout`
 *     and `options=--search_path=...` all live after the `?`, and Supabase's
 *     pooler string carries some of them.
 *   - SSL ends up being inferred from the hostname. Matching on "supabase.com"
 *     silently downgrades every other managed Postgres, and every Supabase
 *     custom domain, to an unencrypted connection.
 *   - Any catch-and-default around the parse converts a malformed URL into a
 *     connection to some other database instead of an error, which is the
 *     failure mode this file exists to avoid.
 *
 * postgres.js already handles percent-decoded credentials, multi-host strings
 * and sslmode. If a connection problem appears, fix the URL rather than the
 * parser.
 */
function createClient() {
	return postgres(resolveConnectionString(), {
		prepare: false,
		max: process.env.NODE_ENV === "production" ? MAX_CONNECTIONS_SERVERLESS : undefined,
	})
}

// Reuse the client across hot reloads in development to avoid exhausting
// connections. In production each isolate creates exactly one client.
//
// This stays eagerly constructed rather than lazy behind a Proxy, because
// DrizzleAdapter in auth.ts detects the dialect with an `instanceof` check that
// a Proxy would fail. Eager construction is safe here precisely because
// resolveConnectionString no longer throws during build or test.
const client =
	process.env.NODE_ENV === "production"
		? createClient()
		: (globalThis.postgresClient ??= createClient())

export const db = drizzle(client, { schema })
