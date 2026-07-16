import { config } from "dotenv"
config({ path: ".env.local" })

async function main() {
	const token = process.env.TELEGRAM_BOT_TOKEN
	const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/telegram`

	console.log(`🔌 Attempting to register webhook to: ${url}`)

	for (let i = 1; i <= 20; i++) {
		try {
			const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					url,
					secret_token: process.env.TELEGRAM_WEBHOOK_SECRET,
					allowed_updates: ["message", "callback_query"],
					drop_pending_updates: true,
				}),
			})
			const body = await res.json()
			if (body.ok) {
				console.log(`✅ Webhook registered successfully! (attempt ${i})`)
				console.log(body)
				return
			} else {
				console.warn(`[telegram-webhook] Attempt ${i} failed: ${body.description}. Retrying in 5s...`)
			}
		} catch (err) {
			console.error(`[telegram-webhook] Error on attempt ${i}:`, err)
		}
		await new Promise((resolve) => setTimeout(resolve, 5000))
	}
	console.error("❌ Failed to register webhook after 20 attempts.")
	process.exit(1)
}
main()
