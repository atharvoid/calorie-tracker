import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import {
  getSettings,
  upsertSettings,
  settingsInputSchema,
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

export async function GET(): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user?.id) return errResponse("UNAUTHORIZED", "Not signed in", 401)

  const settings = await getSettings(session.user.id)
  return NextResponse.json({ settings })
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

  const parsed = settingsInputSchema.safeParse(body)
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "root"
      fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message]
    }
    return errResponse("VALIDATION_ERROR", "Invalid input", 422, fieldErrors)
  }

  const updated = await upsertSettings(session.user.id, parsed.data)
  return NextResponse.json({ settings: updated })
}
