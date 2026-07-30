export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { generateObject } from "ai"
import { extractionSchema, EXTRACTION_SYSTEM_PROMPT } from "@/lib/extraction"
import { normalizeRows } from "@/lib/normalize"
import { getModel, MODEL_ID } from "@/lib/ai"
import { auth } from "@/auth"
import { assertCanUseAiLog, recordAiUsage, resolveApiKeyForUser } from "@/lib/entitlements"
import type { ExtractError, ExtractResponse } from "@/lib/types"

export const runtime = "nodejs"
export const maxDuration = 30

export async function POST(
	req: NextRequest
): Promise<NextResponse<ExtractResponse | ExtractError>> {
	const session = await auth()
	if (!session?.user?.id) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	}
	const userId = session.user.id

	let text: unknown
	try {
		text = (await req.json())?.text
	} catch {
		return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
	}

	if (typeof text !== "string" || text.trim().length === 0) {
		return NextResponse.json({ error: "No text provided" }, { status: 400 })
	}

	try {
		await assertCanUseAiLog(userId)

		const { apiKey, keyOwner } = await resolveApiKeyForUser(userId)

		const { object, usage } = await generateObject({
			model: getModel(apiKey),
			schema: extractionSchema,
			system: EXTRACTION_SYSTEM_PROMPT,
			prompt: text,
			temperature: 0,
		})

		const inputTokens = usage?.inputTokens ?? 0
		const outputTokens = usage?.outputTokens ?? 0

		await recordAiUsage(userId, {
			requestId: `ext-${crypto.randomUUID()}`,
			source: "web",
			model: MODEL_ID,
			inputTokens,
			outputTokens,
			success: true,
			keyOwner,
		})

		return NextResponse.json(normalizeRows(object.rows))
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err)
		console.error("[extract] failed:", msg)
		if (
			msg.includes("Trial ended") ||
			msg.includes("Daily AI log limit reached") ||
			msg.includes("suspended")
		) {
			return NextResponse.json({ error: msg }, { status: 403 })
		}
		return NextResponse.json({ error: "Extraction failed" }, { status: 500 })
	}
}
