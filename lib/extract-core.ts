import { generateObject } from "ai"
import { TEXT_MODEL } from "@/lib/ai"
import { extractionSchema, EXTRACTION_SYSTEM_PROMPT } from "@/lib/extraction"
import { normalizeRows } from "@/lib/normalize"
import type { NormalizedRow } from "@/lib/types"

export async function extractRowsFromText(text: string): Promise<NormalizedRow[]> {
	const { object } = await generateObject({
		model: TEXT_MODEL,
		schema: extractionSchema,
		system: EXTRACTION_SYSTEM_PROMPT,
		prompt: text,
		temperature: 0,
	})
	return normalizeRows(object.rows).rows
}

// Voice notes: Gemini reads the audio directly and extracts in one call.
export async function extractRowsFromAudio(
	bytes: Uint8Array,
	mediaType = "audio/ogg"
): Promise<NormalizedRow[]> {
	const { object } = await generateObject({
		model: TEXT_MODEL,
		schema: extractionSchema,
		system: EXTRACTION_SYSTEM_PROMPT,
		temperature: 0,
		messages: [
			{
				role: "user",
				content: [
					{
						type: "text",
						text: "This is a spoken order note (likely Hindi/English mix). Transcribe it and extract EVERY order line into the schema.",
					},
					{ type: "file", data: bytes, mediaType },
				],
			},
		],
	})
	return normalizeRows(object.rows).rows
}

export async function extractRowsFromImage(
	image: Uint8Array
): Promise<NormalizedRow[]> {
	const { object } = await generateObject({
		model: TEXT_MODEL,
		schema: extractionSchema,
		system: EXTRACTION_SYSTEM_PROMPT,
		temperature: 0,
		messages: [
			{
				role: "user",
				content: [
					{
						type: "text",
						text: "Read this image of order / sales notes (may be handwritten or a printed bill). Extract EVERY order line into the schema.",
					},
					{ type: "image", image },
				],
			},
		],
	})
	return normalizeRows(object.rows).rows
}

