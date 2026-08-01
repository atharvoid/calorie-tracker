import { NextResponse } from "next/server"
import { z } from "zod"

export async function parseAndValidateBody<T>(
	req: Request,
	schema: z.Schema<T>,
	maxBytes: number
): Promise<{ success: true; data: T } | { success: false; response: NextResponse }> {
	let bodyText = ""
	try {
		bodyText = await req.text()
	} catch {
		return {
			success: false,
			response: NextResponse.json(
				{ error: { code: "INVALID_BODY", message: "Failed to read request body." } },
				{ status: 400 }
			),
		}
	}

	// Calculate UTF-8 byte length
	const byteLength = new TextEncoder().encode(bodyText).length
	if (byteLength > maxBytes) {
		return {
			success: false,
			response: NextResponse.json(
				{ error: { code: "PAYLOAD_TOO_LARGE", message: "Payload too large." } },
				{ status: 400 }
			),
		}
	}

	let json: unknown
	try {
		json = JSON.parse(bodyText)
	} catch {
		return {
			success: false,
			response: NextResponse.json(
				{ error: { code: "INVALID_JSON", message: "Invalid JSON body." } },
				{ status: 400 }
			),
		}
	}

	const parsed = schema.safeParse(json)
	if (!parsed.success) {
		const fieldErrors: Record<string, string[]> = {}
		for (const issue of parsed.error.issues) {
			const key = issue.path.join(".") || "root"
			fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message]
		}
		return {
			success: false,
			response: NextResponse.json(
				{
					error: {
						code: "VALIDATION_ERROR",
						message: "Invalid input values.",
						fieldErrors,
					},
				},
				{ status: 422 }
			),
		}
	}

	return { success: true, data: parsed.data }
}

export function parseAndValidateQuery<T>(
	url: string,
	schema: z.Schema<T>
): { success: true; data: T } | { success: false; response: NextResponse } {
	const params = new URL(url).searchParams
	const obj: Record<string, string> = {}
	params.forEach((value, key) => {
		obj[key] = value
	})

	const parsed = schema.safeParse(obj)
	if (!parsed.success) {
		const fieldErrors: Record<string, string[]> = {}
		for (const issue of parsed.error.issues) {
			const key = issue.path.join(".") || "root"
			fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message]
		}
		return {
			success: false,
			response: NextResponse.json(
				{
					error: {
						code: "INVALID_QUERY",
						message: "Invalid query parameters.",
						fieldErrors,
					},
				},
				{ status: 400 }
			),
		}
	}

	return { success: true, data: parsed.data }
}

export function parseAndValidateParams<T>(
	paramsObj: unknown,
	schema: z.Schema<T>
): { success: true; data: T } | { success: false; response: NextResponse } {
	const parsed = schema.safeParse(paramsObj)
	if (!parsed.success) {
		const fieldErrors: Record<string, string[]> = {}
		for (const issue of parsed.error.issues) {
			const key = issue.path.join(".") || "root"
			fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message]
		}
		return {
			success: false,
			response: NextResponse.json(
				{
					error: {
						code: "INVALID_PARAMS",
						message: "Invalid path parameters.",
						fieldErrors,
					},
				},
				{ status: 400 }
			),
		}
	}
	return { success: true, data: parsed.data }
}
