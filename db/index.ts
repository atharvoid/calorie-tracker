import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"

declare global {
	var postgresClient: ReturnType<typeof postgres> | undefined
}

const connectionString = process.env.DATABASE_URL || "postgres://postgres:postgres@127.0.0.1:5432/postgres"

function createClient() {
  try {
    return postgres(connectionString, {
      prepare: false,
      max: process.env.NODE_ENV === "production" ? 1 : undefined,
    })
  } catch (e) {
    return postgres("postgres://postgres:postgres@127.0.0.1:5432/postgres", { prepare: false })
  }
}

const client = globalThis.postgresClient ?? createClient()

if (process.env.NODE_ENV !== "production") {
	globalThis.postgresClient = client
}

export const db = drizzle(client, { schema })
