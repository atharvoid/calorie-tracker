import { NextRequest, NextResponse } from "next/server"
import { bot } from "@/lib/telegram"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function POST(req: NextRequest) {
	const secretHeader = req.headers.get("X-Telegram-Bot-Api-Secret-Token")
	if (secretHeader !== process.env.TELEGRAM_WEBHOOK_SECRET) {
		return new Response("Unauthorized", { status: 401 })
	}

	try {
		const update = await req.json()
		
		// Ensure bot is initialized before manually handling updates
		if (!bot.isInited()) {
			await bot.init()
		}

		// Process the update in the background, DO NOT await to prevent Telegram/Next.js timeouts & duplicate retries
		void bot.handleUpdate(update).catch((err) => {
			console.error("[telegram] background update handler error:", err)
		})
		
		// Return 200 OK immediately
		return NextResponse.json({ ok: true })
	} catch (err) {
		console.error("[telegram] failed to parse update:", err)
		return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
	}
}
