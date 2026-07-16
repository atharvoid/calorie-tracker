import { NextRequest, NextResponse } from "next/server"
import { generateObject } from "ai"
import { extractionSchema, EXTRACTION_SYSTEM_PROMPT } from "@/lib/extraction"
import { normalizeRows } from "@/lib/normalize"
import { VISION_MODEL } from "@/lib/ai"
import type { ExtractError, ExtractResponse } from "@/lib/types"

export const runtime = "nodejs"
export const maxDuration = 45

export async function POST(
	req: NextRequest
): Promise<NextResponse<ExtractResponse | ExtractError>> {
	let image: unknown
	try {
		image = (await req.json())?.image
	} catch {
		return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
	}

	if (typeof image !== "string" || image.length === 0) {
		return NextResponse.json({ error: "No image provided" }, { status: 400 })
	}

	try {
		const { object } = await generateObject({
			model: VISION_MODEL,
			schema: extractionSchema,
			system: EXTRACTION_SYSTEM_PROMPT,
			temperature: 0,
			messages: [
				{
					role: "user",
					content: [
						{
							type: "text",
							text: "Read this image of order / sales notes (it may be handwritten or a printed bill). Extract EVERY order line into the schema.",
						},
						{ type: "image", image },
					],
				},
			],
		})
		return NextResponse.json(normalizeRows(object.rows))
	} catch (err) {
		console.error("[extract-image] failed:", err)
		return NextResponse.json({ error: "Extraction failed" }, { status: 500 })
	}
}
