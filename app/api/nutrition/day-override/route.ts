export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import {
	getDayOverride,
	upsertDayOverride,
	deleteDayOverride,
	overrideInputSchema,
} from "@/lib/nutrition-queries"
import { z } from "zod"
import { parseAndValidateQuery, parseAndValidateBody } from "@/lib/validation"
import { parseLocalDate } from "@/lib/nutrition-date"

export const runtime = "nodejs"

type ErrorBody = {
	error: { code: string; message: string; fieldErrors?: Record<string, string[]> }
}

function errResponse(
	code: string,
	message: string,
	status: number,
	fieldErrors?: Record<string, string[]>
): NextResponse<ErrorBody> {
	return NextResponse.json(
		{ error: { code, message, ...(fieldErrors ? { fieldErrors } : {}) } },
		{ status }
	)
}

export async function GET(req: NextRequest): Promise<NextResponse> {
	const session = await auth()
	if (!session?.user?.id) return errResponse("UNAUTHORIZED", "Not signed in", 401)

	const queryResult = parseAndValidateQuery(
		req.url,
		z.object({
			date: z
				.string()
				.regex(/^\d{4}-\d{2}-\d{2}$/)
				.refine(
					(dateStr) => {
						try {
							parseLocalDate(dateStr)
							return true
						} catch {
							return false
						}
					},
					{ message: "Invalid calendar date" }
				),
		})
	)
	if (!queryResult.success) return queryResult.response
	const { date } = queryResult.data

	const override = await getDayOverride(session.user.id, date)
	return NextResponse.json({ override })
}

export async function PUT(req: NextRequest): Promise<NextResponse> {
	const session = await auth()
	if (!session?.user?.id) return errResponse("UNAUTHORIZED", "Not signed in", 401)

	const bodyResult = await parseAndValidateBody(req, overrideInputSchema, 4096)
	if (!bodyResult.success) return bodyResult.response
	const parsedData = bodyResult.data

	const { date, ...data } = parsedData
	const override = await upsertDayOverride(session.user.id, date, data)
	return NextResponse.json({ override })
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
	const session = await auth()
	if (!session?.user?.id) return errResponse("UNAUTHORIZED", "Not signed in", 401)

	const queryResult = parseAndValidateQuery(
		req.url,
		z.object({
			date: z
				.string()
				.regex(/^\d{4}-\d{2}-\d{2}$/)
				.refine(
					(dateStr) => {
						try {
							parseLocalDate(dateStr)
							return true
						} catch {
							return false
						}
					},
					{ message: "Invalid calendar date" }
				),
		})
	)
	if (!queryResult.success) return queryResult.response
	const { date } = queryResult.data

	await deleteDayOverride(session.user.id, date)
	return NextResponse.json({ success: true })
}
