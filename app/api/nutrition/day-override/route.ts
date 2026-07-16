import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import {
  getDayOverride,
  upsertDayOverride,
  deleteDayOverride,
  overrideInputSchema,
} from "@/lib/nutrition-queries"

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

  const date = req.nextUrl.searchParams.get("date")
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return errResponse("INVALID_DATE", "date param must be YYYY-MM-DD", 400)
  }

  const override = await getDayOverride(session.user.id, date)
  return NextResponse.json({ override })
}

export async function PUT(req: NextRequest): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user?.id) return errResponse("UNAUTHORIZED", "Not signed in", 401)

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return errResponse("INVALID_JSON", "Invalid JSON body", 400)
  }

  const parsed = overrideInputSchema.safeParse(body)
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "root"
      fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message]
    }
    return errResponse("VALIDATION_ERROR", "Invalid input", 422, fieldErrors)
  }

  const { date, ...data } = parsed.data
  const override = await upsertDayOverride(session.user.id, date, data)
  return NextResponse.json({ override })
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user?.id) return errResponse("UNAUTHORIZED", "Not signed in", 401)

  const date = req.nextUrl.searchParams.get("date")
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return errResponse("INVALID_DATE", "date param must be YYYY-MM-DD", 400)
  }

  await deleteDayOverride(session.user.id, date)
  return NextResponse.json({ success: true })
}
