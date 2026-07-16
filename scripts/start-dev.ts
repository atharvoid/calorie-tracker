import { spawn, ChildProcess } from "child_process"
import { config } from "dotenv"

// Load env vars FIRST before importing any modules that depend on process.env
config({ path: ".env.local" })

async function run() {
	let devProcess: ChildProcess | null = null

	// Dynamically import the bot so it initializes AFTER env vars are loaded
	const { bot } = await import("../lib/telegram")

	console.log("🤖 Stopping any active Telegram webhook...")
	try {
		// Telegram only allows one at a time: either Webhook or Long Polling.
		// We delete the webhook (and drop any old retried messages) to enable polling.
		await bot.api.deleteWebhook({ drop_pending_updates: true })
		console.log("✅ Webhook removed & pending updates dropped.")
	} catch (err) {
		console.warn("⚠️ Failed to delete webhook (ignoring):", err)
	}

	// 1. Start Next.js dev server locally
	console.log("💻 Starting Next.js dev server on http://localhost:3000...")
	devProcess = spawn("pnpm", ["dev"], { shell: true, stdio: "inherit" })

	// 2. Start the bot in Long Polling mode
	console.log("⚡ Starting Telegram bot in Long Polling mode (no tunnel needed!)...")
	
	// We call bot.start() which runs the polling loop in the background of this process
	bot.start({
		allowed_updates: ["message", "callback_query"],
		onStart: (info) => {
			console.log(`🤖 Bot @${info.username} is online and polling for messages!`)
		}
	}).catch((err) => {
		console.error("❌ Telegram bot polling error:", err)
	})

	process.on("SIGINT", () => {
		console.log("\n👋 Stopping development servers...")
		if (devProcess) devProcess.kill()
		bot.stop()
		process.exit()
	})
}

run().catch((err) => {
	console.error("Failed to start dev pipeline:", err)
})
