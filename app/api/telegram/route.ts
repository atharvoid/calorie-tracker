import { NextRequest, NextResponse } from "next/server"
import { bot } from "@/lib/telegram"
import { secretsMatch } from "@/lib/byok"
import { z } from "zod"
import { parseAndValidateBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

let botInitPromise: Promise<unknown> | null = null

async function ensureBotReady(): Promise<void> {
	if (bot.isInited()) return

	botInitPromise ??= bot.init().catch((error) => {
		botInitPromise = null
		throw error
	})
	await botInitPromise
}

export async function POST(req: NextRequest) {
	const secretHeader = req.headers.get("X-Telegram-Bot-Api-Secret-Token")
	if (!secretsMatch(secretHeader, process.env.TELEGRAM_WEBHOOK_SECRET)) {
		return new Response("Unauthorized", { status: 401 })
	}

	try {
		const bodyResult = await parseAndValidateBody(
			req,
			z
				.object({
					update_id: z.number(),
				})
				.passthrough(),
			65536
		)
		if (!bodyResult.success) return bodyResult.response
		const update = bodyResult.data
		await ensureBotReady()

		// Await processing before the serverless runtime freezes this invocation.
		await bot.handleUpdate(update)
		return NextResponse.json({ ok: true })
	} catch (error) {
		// Telegram retries every non-2xx response. Acknowledge authenticated updates
		// even when processing fails so a slow or partial handler cannot duplicate a meal.
		console.error("[telegram] failed to process authenticated update:", error)
		return NextResponse.json({ ok: true, handled: false })
	}
}
