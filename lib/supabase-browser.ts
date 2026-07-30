"use client"

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let cached: SupabaseClient | undefined

/**
 * The previous version called createClient at module scope with
 * `process.env.NEXT_PUBLIC_SUPABASE_URL as string`. The cast silenced the
 * compiler but changed nothing at runtime: when the variable is absent the SDK
 * receives undefined and throws while parsing it as a URL. During `next build`
 * that surfaced as a page data collection failure with no useful attribution.
 *
 * Realtime is an enhancement, not a requirement, so this is also the one place
 * where a missing variable should not be fatal — see supabaseBrowserOrNull.
 */
export function getSupabaseBrowserClient(): SupabaseClient {
	if (cached) return cached

	const url = process.env.NEXT_PUBLIC_SUPABASE_URL
	const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
	if (!url || !anonKey) {
		throw new Error(
			"NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must both be set for " +
				"realtime updates. See .env.example."
		)
	}

	cached = createClient(url, anonKey)
	return cached
}

/**
 * Non-throwing variant for optional realtime features. Prefer this in
 * components that should degrade to polling or to a static view rather than
 * crashing the tree when Supabase is not configured.
 */
export function supabaseBrowserOrNull(): SupabaseClient | null {
	try {
		return getSupabaseBrowserClient()
	} catch {
		return null
	}
}

export const supabaseBrowser = new Proxy({} as SupabaseClient, {
	get(_target, property) {
		const client = getSupabaseBrowserClient()
		const value = Reflect.get(client, property, client)
		return typeof value === "function" ? value.bind(client) : value
	},
	has(_target, property) {
		return property in getSupabaseBrowserClient()
	},
})
