export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { extractNutrition } from "@/lib/nutrition"
import { getSettings } from "@/lib/nutrition-queries"
import { isFuture, addDays, localDate } from "@/lib/nutrition-date"

export const runtime = "nodejs"

type ErrorBody = {
  error: { code: string; message: string }
}

function errResponse(
  code: string,
  message: string,
  status: number
): NextResponse<ErrorBody> {
  return NextResponse.json({ error: { code, message } }, { status })
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user?.id) return errResponse("UNAUTHORIZED", "Not signed in", 401)

  let body: any
  try {
    body = await req.json()
  } catch {
    return errResponse("INVALID_JSON", "Invalid JSON body", 400)
  }

  const { text, logDate } = body

  if (typeof text !== "string" || text.trim().length === 0) {
    return errResponse("INVALID_INPUT", "No text provided", 400)
  }

  if (text.length > 2000) {
    return errResponse("INVALID_INPUT", "Text exceeds maximum length of 2000 characters", 400)
  }

  if (!logDate || !/^\d{4}-\d{2}-\d{2}$/.test(logDate)) {
    return errResponse("INVALID_DATE", "logDate must be YYYY-MM-DD", 400)
  }

  const userId = session.user.id
  const settings = await getSettings(userId)
  const timezone = settings?.timezone || "Asia/Kolkata"

  if (isFuture(logDate, timezone)) {
    return errResponse("INVALID_DATE", "Date cannot be in the future", 400)
  }

  const oldestAllowed = addDays(localDate(timezone), -366)
  if (logDate < oldestAllowed) {
    return errResponse("INVALID_DATE", "Date is too far in the past", 400)
  }

  try {
    const requestId = `web-${globalThis.crypto.randomUUID()}`
    const result = await extractNutrition(text, userId, requestId, "web")
    return NextResponse.json(result)
  } catch (err: any) {
    const msg = err.message || String(err)
    console.error("[extract] failed:", err)
    
    const isEntitlementError = msg.includes("free trial") || msg.includes("limit reached")
    if (isEntitlementError) {
      return errResponse("TRIAL_EXPIRED", msg, 403)
    }
    return errResponse("EXTRACTION_FAILED", msg, 500)
  }
}
