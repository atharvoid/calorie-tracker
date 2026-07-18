export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server"
import { generateObject } from "ai"
import { extractionSchema, EXTRACTION_SYSTEM_PROMPT } from "@/lib/extraction"
import { normalizeRows } from "@/lib/normalize"
import { TEXT_MODEL } from "@/lib/ai"
import type { ExtractError, ExtractResponse } from "@/lib/types"

export const runtime = "nodejs"
export const maxDuration = 30

export async function POST(
	req: NextRequest
): Promise<NextResponse<ExtractResponse | ExtractError>> {
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
		const { object } = await generateObject({
			model: TEXT_MODEL,
			schema: extractionSchema,
			system: EXTRACTION_SYSTEM_PROMPT,
			prompt: text,
			temperature: 0,
		})
		return NextResponse.json(normalizeRows(object.rows))
	} catch (err) {
		console.error("[extract] failed:", err)
		return NextResponse.json({ error: "Extraction failed" }, { status: 500 })
	}
}
