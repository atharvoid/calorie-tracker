import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"

declare global {
	// eslint-disable-next-line no-var
	var postgresClient: ReturnType<typeof postgres> | undefined
}

/**
 * Fail fast and loudly. Previously this fell back to a hardcoded localhost
 * connection string, which turned a missing production env var into a confusing
 * ECONNREFUSED at request time instead of an obvious boot failure.
 */
function requireConnectionString(): string {
	const url = process.env.DATABASE_URL
	if (!url) {
		throw new Error(
			"DATABASE_URL is not set. Copy .env.example to .env.local and provide a Postgres connection string."
		)
	}
	return url
}

/**
 * Serverless functions get a single connection because each invocation is its
 * own isolate; a pool would leak connections. Local dev uses the driver default
 * so hot reloads stay responsive.
 */
const MAX_CONNECTIONS_SERVERLESS = 1

function createClient() {
	return postgres(requireConnectionString(), {
		prepare: false,
		max: process.env.NODE_ENV === "production" ? MAX_CONNECTIONS_SERVERLESS : undefined,
	})
}

// Reuse the client across hot reloads in development to avoid exhausting
// connections. In production each isolate creates exactly one client.
const client =
	process.env.NODE_ENV === "production"
		? createClient()
		: (globalThis.postgresClient ??= createClient())

export const db = drizzle(client, { schema })
