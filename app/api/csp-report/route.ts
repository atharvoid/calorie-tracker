import { NextRequest, NextResponse } from "next/server"
import { logger } from "@/lib/logger"

export async function POST(req: NextRequest) {
	try {
		const report = await req.json()
		logger.warn("[csp-report] Content Security Policy violation", { report })
	} catch {
		// Ignore malformed reports
	}
	return NextResponse.json({ ok: true })
}
