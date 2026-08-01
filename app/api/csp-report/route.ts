import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { logger } from "@/lib/logger"
import { parseAndValidateBody } from "@/lib/validation"

const cspReportItemSchema = z.object({
	"document-uri": z.string().optional(),
	referrer: z.string().optional(),
	"blocked-uri": z.string().optional(),
	"violated-directive": z.string().optional(),
	"effective-directive": z.string().optional(),
	"original-policy": z.string().optional(),
	disposition: z.string().optional(),
	"status-code": z.number().optional(),
	"script-sample": z.string().optional(),
})

const cspReportSchema = z.union([
	z.object({ "csp-report": cspReportItemSchema.passthrough() }),
	z.array(
		z
			.object({ type: z.string().optional(), body: z.record(z.string(), z.unknown()).optional() })
			.passthrough()
	),
	z.object({ reports: z.array(z.unknown()) }),
])

const ALLOWED_CONTENT_TYPES = [
	"application/json",
	"application/csp-report",
	"application/reports+json",
]

const MAX_BYTES = 16384 // 16 KB cap

export async function POST(req: NextRequest) {
	const contentType = req.headers.get("content-type")?.toLowerCase() || ""
	const isAllowedType = ALLOWED_CONTENT_TYPES.some((type) => contentType.includes(type))

	if (!isAllowedType) {
		return NextResponse.json(
			{ error: { code: "UNSUPPORTED_MEDIA_TYPE", message: "Unsupported Content-Type." } },
			{ status: 415 }
		)
	}

	const validationResult = await parseAndValidateBody(req, cspReportSchema, MAX_BYTES)
	if (!validationResult.success) {
		return validationResult.response
	}

	logger.warn("[csp-report] Content Security Policy violation", {
		report: validationResult.data,
	})

	return new NextResponse(null, { status: 204 })
}
