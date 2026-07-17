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

		// Await the update processing to ensure it completes before Vercel freezes the execution context
		await bot.handleUpdate(update)
		
		// Return 200 OK immediately
		return NextResponse.json({ ok: true })
	} catch (err) {
		console.error("[telegram] failed to parse update:", err)
		return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
	}
}
