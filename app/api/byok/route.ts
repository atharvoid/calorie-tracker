import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { isByokEnabled } from "@/lib/byok"
import { getUserEntitlement, setByokKey, clearByokKey } from "@/lib/entitlements"
import { ByokError } from "@/lib/byok"

// node:crypto is required for AES-GCM, so this route cannot run on the edge.
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * BYOK key management.
 *
 * Security properties:
 *   - Every method requires an authenticated session.
 *   - The plaintext key is never returned, logged, or echoed back.
 *   - Keys are verified against the provider before being stored, so a typo
 *     fails here rather than on the user's next meal log.
 *   - A rejected key is never silently replaced with the platform key.
 *
 * Storage and verification are shared with the Telegram /setkey command via
 * lib/entitlements.ts (setByokKey/clearByokKey), so the two paths cannot drift.
 */

function unauthorized() {
	return NextResponse.json({ error: "Not signed in." }, { status: 401 })
}

function byokDisabled() {
	return NextResponse.json(
		{ error: "Bring-your-own-key is not enabled on this deployment." },
		{ status: 503 }
	)
}

/** Returns whether a key is on file, and its last four characters. */
export async function GET() {
	const session = await auth()
	const userId = session?.user?.id
	if (!userId) return unauthorized()

	const entitlement = await getUserEntitlement(userId)

	return NextResponse.json({
		enabled: isByokEnabled(),
		hasKey: entitlement.hasByokKey,
		keyLast4: entitlement.byokKeyLast4,
		accessState: entitlement.accessState,
	})
}

/** Verifies and stores a user-supplied API key. */
export async function PUT(request: Request) {
	const session = await auth()
	const userId = session?.user?.id
	if (!userId) return unauthorized()
	if (!isByokEnabled()) return byokDisabled()

	let apiKey: unknown
	try {
		const body = await request.json()
		apiKey = body?.apiKey
	} catch {
		return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 })
	}

	if (typeof apiKey !== "string" || apiKey.trim().length === 0) {
		return NextResponse.json({ error: "apiKey is required." }, { status: 400 })
	}
	// Bound the input so an oversized payload cannot be used as a DoS vector.
	if (apiKey.length > 512) {
		return NextResponse.json({ error: "apiKey is too long." }, { status: 400 })
	}

	try {
		const entitlement = await setByokKey(userId, apiKey)
		return NextResponse.json({
			hasKey: true,
			keyLast4: entitlement.byokKeyLast4,
			accessState: entitlement.accessState,
		})
	} catch (error) {
		if (error instanceof ByokError) {
			const status = error.code === "byok_disabled" ? 503 : 400
			return NextResponse.json({ error: error.message, code: error.code }, { status })
		}
		// Never include the key or the raw error in the response.
		console.error("[byok] failed to store key", { userId })
		return NextResponse.json({ error: "Could not save that API key." }, { status: 500 })
	}
}

/** Removes the stored key. The user reverts to their trial or paid state. */
export async function DELETE() {
	const session = await auth()
	const userId = session?.user?.id
	if (!userId) return unauthorized()

	const entitlement = await clearByokKey(userId)
	return NextResponse.json({ hasKey: false, accessState: entitlement.accessState })
}
