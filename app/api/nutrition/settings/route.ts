export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getSettings, upsertSettings, settingsInputSchema } from "@/lib/nutrition-queries"
import { parseAndValidateBody } from "@/lib/validation"

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

export async function GET(): Promise<NextResponse> {
	const session = await auth()
	if (!session?.user?.id) return errResponse("UNAUTHORIZED", "Not signed in", 401)

	const settings = await getSettings(session.user.id)
	return NextResponse.json({ settings })
}

export async function PUT(req: NextRequest): Promise<NextResponse> {
	const session = await auth()
	if (!session?.user?.id) return errResponse("UNAUTHORIZED", "Not signed in", 401)

	const bodyResult = await parseAndValidateBody(req, settingsInputSchema, 4096)
	if (!bodyResult.success) return bodyResult.response
	const parsedData = bodyResult.data

	const updated = await upsertSettings(session.user.id, parsedData)
	return NextResponse.json({ settings: updated })
}
