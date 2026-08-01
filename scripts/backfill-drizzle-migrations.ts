/* eslint-disable no-console */
/**
 * Backfill drizzle.__drizzle_migrations from drizzle/meta/_journal.json.
 *
 * Why this exists
 * ---------------
 * Several migrations were applied to production by hand, so the tracking table
 * drizzle-kit reads was never written to. It is empty. That means
 * `drizzle-kit migrate` believes nothing has ever run and tries to replay from
 * 0000, which fails immediately against a populated database.
 *
 * This script records the already-applied migrations as applied, without
 * executing any of their SQL, so `drizzle-kit migrate` becomes usable again.
 *
 * The hash is sha256 of the full migration file text, which is exactly what
 * drizzle-orm's migrator computes when it decides whether a migration has run.
 * If a recorded file is edited later, its hash stops matching and drizzle will
 * try to apply it again -- so do not edit applied migrations.
 *
 * Usage
 * -----
 *   pnpm db:backfill-migrations            # dry run, prints what it would do
 *   pnpm db:backfill-migrations -- --apply # actually write the rows
 *
 * Dry run is the default deliberately. Point DATABASE_URL at a scratch
 * database and bootstrap it from zero before you ever run this against
 * production.
 */

import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import postgres from "postgres"

type JournalEntry = {
	idx: number
	version: string
	when: number
	tag: string
	breakpoints: boolean
}

type Journal = {
	version: string
	dialect: string
	entries: JournalEntry[]
}

const DRIZZLE_DIR = join(process.cwd(), "drizzle")
const APPLY = process.argv.includes("--apply")

function loadJournal(): Journal {
	const raw = readFileSync(join(DRIZZLE_DIR, "meta", "_journal.json"), "utf8")
	const journal = JSON.parse(raw) as Journal

	// A journal that is out of order is the exact failure this whole script is
	// cleaning up after, so refuse to propagate it.
	const sorted = [...journal.entries].sort((a, b) => a.idx - b.idx)
	for (let i = 0; i < sorted.length; i++) {
		if (sorted[i].idx !== i) {
			throw new Error(
				`Journal indices are not contiguous from 0: expected ${i}, found ${sorted[i].idx} (${sorted[i].tag}).`
			)
		}
	}
	journal.entries = sorted
	return journal
}

async function main() {
	const databaseUrl = process.env.DATABASE_URL
	if (!databaseUrl) {
		throw new Error("DATABASE_URL is not set. Refusing to guess a connection.")
	}

	const journal = loadJournal()

	const planned = journal.entries.map((entry) => {
		const path = join(DRIZZLE_DIR, `${entry.tag}.sql`)
		let text: string
		try {
			text = readFileSync(path, "utf8")
		} catch {
			throw new Error(
				`Journal lists "${entry.tag}" but ${path} does not exist. Fix the journal before backfilling.`
			)
		}
		return {
			tag: entry.tag,
			hash: createHash("sha256").update(text).digest("hex"),
			createdAt: entry.when,
		}
	})

	const sql = postgres(databaseUrl, { max: 1 })

	try {
		await sql`CREATE SCHEMA IF NOT EXISTS drizzle`
		await sql`
			CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
				id SERIAL PRIMARY KEY,
				hash text NOT NULL,
				created_at bigint
			)
		`

		const existing = await sql<{ hash: string }[]>`
			SELECT hash FROM drizzle.__drizzle_migrations
		`
		const alreadyRecorded = new Set(existing.map((row) => row.hash))
		const missing = planned.filter((row) => !alreadyRecorded.has(row.hash))

		console.log(`Journal entries:   ${planned.length}`)
		console.log(`Already recorded:  ${alreadyRecorded.size}`)
		console.log(`To be recorded:    ${missing.length}`)
		console.log("")

		for (const row of planned) {
			const mark = alreadyRecorded.has(row.hash) ? "skip" : "record"
			console.log(`  ${mark.padEnd(7)} ${row.tag}  ${row.hash.slice(0, 12)}`)
		}

		if (!APPLY) {
			console.log("\nDry run. Nothing was written. Re-run with --apply to commit.")
			return
		}

		if (missing.length === 0) {
			console.log("\nNothing to do.")
			return
		}

		// Single transaction: a partial backfill would leave drizzle-kit with a
		// different, equally wrong view of history.
		await sql.begin(async (tx) => {
			for (const row of missing) {
				await tx`
					INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
					VALUES (${row.hash}, ${row.createdAt})
				`
			}
		})

		console.log(`\nRecorded ${missing.length} migration(s).`)
		console.log("Verify with: pnpm drizzle-kit migrate  (should report nothing to apply)")
	} finally {
		await sql.end()
	}
}

main().catch((err) => {
	console.error(err instanceof Error ? err.message : err)
	process.exitCode = 1
})
