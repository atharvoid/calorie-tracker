import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"

declare global {
	var postgresClient: ReturnType<typeof postgres> | undefined
}

const connectionString = process.env.DATABASE_URL as string
const client = globalThis.postgresClient ?? postgres(connectionString, {
	prepare: false,
	max: process.env.NODE_ENV === "production" ? 1 : undefined,
})

if (process.env.NODE_ENV !== "production") {
	globalThis.postgresClient = client
}

export const db = drizzle(client, { schema })
