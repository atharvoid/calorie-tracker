export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { extractNutrition } from "@/lib/nutrition"
import { getSettings } from "@/lib/nutrition-queries"
import { logger } from "@/lib/logger"
import { isFuture, addDays, localDate } from "@/lib/nutrition-date"
import { z } from "zod"
import { parseAndValidateBody } from "@/lib/validation"

export const runtime = "nodejs"

type ErrorBody = {
	error: { code: string; message: string }
}

function errResponse(code: string, message: string, status: number): NextResponse<ErrorBody> {
	return NextResponse.json({ error: { code, message } }, { status })
}

export async function POST(req: NextRequest): Promise<NextResponse> {
	const session = await auth()
	if (!session?.user?.id) return errResponse("UNAUTHORIZED", "Not signed in", 401)

	const bodyResult = await parseAndValidateBody(
		req,
		z.object({
			text: z.string().min(1).max(2000),
			logDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
		}),
		8192
	)
	if (!bodyResult.success) return bodyResult.response
	const { text, logDate } = bodyResult.data

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
	} catch (err) {
		const e = err as { code?: string; userMessage?: string; message?: string }
		const msg = e.message || String(err)
		logger.error("[extract] failed", { error: msg, userId })

		if (e.code === "byok_key_invalid") {
			return errResponse("BYOK_KEY_INVALID", e.userMessage || msg, 400)
		}

		// Fair-use throttle (task B-12). This is transient and self-resolving, so
		// it gets 429 + Retry-After rather than the 403 used for entitlement
		// problems: the client should back off and retry, not show an upgrade
		// prompt for a plan the user is already paying for themselves.
		if (e.code === "byok_rate_limited") {
			const retryAfter = String((e as { retryAfterSeconds?: number }).retryAfterSeconds ?? 60)
			return NextResponse.json(
				{ error: { code: "BYOK_RATE_LIMITED", message: e.userMessage || msg } },
				{ status: 429, headers: { "Retry-After": retryAfter } }
			)
		}

		const isEntitlementError =
			e.code === "trial_ended" ||
			e.code === "trial_quota_exhausted" ||
			e.code === "daily_limit_reached" ||
			e.code === "account_blocked" ||
			msg.includes("free trial") ||
			msg.includes("limit reached")
		if (isEntitlementError) {
			return errResponse("TRIAL_EXPIRED", e.userMessage || msg, 403)
		}
		return errResponse("EXTRACTION_FAILED", msg, 500)
	}
}
