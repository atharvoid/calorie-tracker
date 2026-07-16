import { Bot, InlineKeyboard, type Context } from "grammy"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import {
	telegramLinks,
	linkTokens,
	pendingCaptures,
} from "@/db/schema"
import { extractNutrition, type NutritionResult } from "@/lib/nutrition"
import { commitNutrition } from "@/lib/commit"

export const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN || "123456:dummy-token")

/** Helper to retry any database operations once if they encounter a connection reset */
async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
	for (let i = 0; i <= retries; i++) {
		try {
			return await fn()
		} catch (err: any) {
			const isConnectionError =
				err.message?.includes("ECONNRESET") ||
				err.code === "ECONNRESET" ||
				err.message?.includes("terminated") ||
				err.cause?.message?.includes("ECONNRESET") ||
				err.cause?.code === "ECONNRESET" ||
				err.cause?.message?.includes("terminated");
			if (isConnectionError && i < retries) {
				console.warn(`[telegram] DB connection error, retrying in 500ms (attempt ${i + 1}/${retries})...`)
				await new Promise((resolve) => setTimeout(resolve, 500))
				continue
			}
			throw err
		}
	}
	throw new Error("DB operation failed after retries")
}

async function userIdForTelegram(tgId: string): Promise<string | null> {
	return withRetry(async () => {
		const [link] = await db
			.select()
			.from(telegramLinks)
			.where(eq(telegramLinks.telegramUserId, tgId))
			.limit(1)
		return link?.userId ?? null
	})
}

/** Pretty Markdown summary for one NutritionResult */
function summarizeMeals(nutrition: NutritionResult): string {
	const lines: string[] = []
	let grandKcal = 0
	let grandProtein = 0
	let grandCarbs = 0
	let grandFat = 0

	for (const meal of nutrition.meals) {
		const label = [meal.meal_type, meal.time_hint].filter(Boolean).join(" · ")
		if (label) lines.push(`*${label}*`)

		for (const item of meal.items) {
			const grams = item.grams != null ? ` (${item.grams}g)` : ""
			lines.push(
				`• ${item.name}${grams} — ${item.kcal} kcal | P ${item.protein_g}g C ${item.carbs_g}g F ${item.fat_g}g`
			)
			if (item.notes) lines.push(`  _${item.notes}_`)
			grandKcal += item.kcal
			grandProtein += item.protein_g
			grandCarbs += item.carbs_g
			grandFat += item.fat_g
		}
		lines.push("")
	}

	lines.push(
		`*Total: ${grandKcal} kcal | P ${Math.round(grandProtein)}g C ${Math.round(grandCarbs)}g F ${Math.round(grandFat)}g*`
	)
	return lines.join("\n").trim()
}

async function presentNutritionConfirm(
	ctx: Context,
	userId: string,
	nutrition: NutritionResult
): Promise<void> {
	const pending = await withRetry(async () => {
		const [row] = await db
			.insert(pendingCaptures)
			.values({ userId, payload: nutrition as unknown as Record<string, unknown> })
			.returning({ id: pendingCaptures.id })
		return row
	})
	const kb = new InlineKeyboard()
		.text("✓ Save", `confirm:${pending.id}`)
		.text("✏️ Fix", `edit:${pending.id}`)
	await ctx.reply(summarizeMeals(nutrition), {
		parse_mode: "Markdown",
		reply_markup: kb,
	})
}

// /start [token] — links the Telegram user to the app account
bot.command("start", async (ctx) => {
	const tgId = String(ctx.from?.id)
	const token = ctx.match?.trim()
	if (!token) {
		const existing = await userIdForTelegram(tgId)
		await ctx.reply(
			existing
				? "You're connected 🥗 Send me what you ate and I'll estimate calories & macros!"
				: "Open the app, click Connect Telegram, and tap the link to connect your account."
		)
		return
	}
	const row = await withRetry(async () => {
		const [res] = await db
			.select()
			.from(linkTokens)
			.where(eq(linkTokens.token, token))
			.limit(1)
		return res
	})
	if (!row || row.expiresAt < new Date()) {
		await ctx.reply("That link expired — generate a new one in the app.")
		return
	}
	await withRetry(async () => {
		await db
			.insert(telegramLinks)
			.values({ telegramUserId: tgId, userId: row.userId })
			.onConflictDoUpdate({
				target: telegramLinks.telegramUserId,
				set: { userId: row.userId },
			})
		await db.delete(linkTokens).where(eq(linkTokens.token, token))
	})
	await ctx.reply(
		"✅ Connected! Now send me what you ate — e.g.:\n_morning 2 roti with sabzi, dahi 80g. lunch 200g raw chicken, 1 cup rice_",
		{ parse_mode: "Markdown" }
	)
})

// Text message → extract nutrition → confirm
bot.on("message:text", async (ctx) => {
	if (ctx.message.text.startsWith("/")) return
	const userId = await userIdForTelegram(String(ctx.from?.id))
	if (!userId) {
		await ctx.reply("Please connect your account first — open the app and click Connect Telegram.")
		return
	}
	const thinking = await ctx.reply("🧮 Estimating macros…")
	try {
		const nutrition = await extractNutrition(ctx.message.text)
		// Delete the "thinking" message before showing results
		await ctx.api.deleteMessage(ctx.chat.id, thinking.message_id).catch(() => null)
		await presentNutritionConfirm(ctx, userId, nutrition)
	} catch (err) {
		await ctx.api.deleteMessage(ctx.chat.id, thinking.message_id).catch(() => null)
		console.error("[telegram] extractNutrition failed:", err)
		await ctx.reply("❌ Couldn't estimate. Try describing your meal again — e.g. '2 roti with dal, 1 glass milk'")
	}
})

// Photos, voice, documents — not in MVP; friendly nudge
bot.on("message:photo", async (ctx) => {
	await ctx.reply("📸 Photo input isn't supported yet — please describe your meal in text!")
})
bot.on("message:voice", async (ctx) => {
	await ctx.reply("🎙️ Voice input isn't supported yet — please type out what you ate.")
})
bot.on("message:document", async (ctx) => {
	await ctx.reply("📄 File input isn't supported yet — please describe your meal in text!")
})

// ✓ Save → commit to DB + sheet
bot.callbackQuery(/^confirm:(.+)$/, async (ctx) => {
	const id = ctx.match[1]
	const pending = await withRetry(async () => {
		const [res] = await db
			.select()
			.from(pendingCaptures)
			.where(eq(pendingCaptures.id, id))
			.limit(1)
		return res ?? null
	})
	if (!pending) {
		await ctx.answerCallbackQuery("Expired — please send your meal again.")
		return
	}
	const nutrition = pending.payload as unknown as NutritionResult
	try {
		const { rowCount } = await commitNutrition(pending.userId, nutrition, "telegram")
		await withRetry(async () => {
			await db.delete(pendingCaptures).where(eq(pendingCaptures.id, id))
		})
		await ctx.editMessageText(
			summarizeMeals(nutrition) + `\n\n✅ *Saved ${rowCount} item${rowCount !== 1 ? "s" : ""} to your sheet!*`,
			{ parse_mode: "Markdown" }
		)
		await ctx.answerCallbackQuery("Saved!")
	} catch (err) {
		console.error("[telegram] commitNutrition failed:", err)
		await ctx.answerCallbackQuery("Save failed — try again.")
	}
})

// ✏️ Fix → drop pending; user re-sends
bot.callbackQuery(/^edit:(.+)$/, async (ctx) => {
	const id = ctx.match[1]
	await withRetry(async () => {
		await db.delete(pendingCaptures).where(eq(pendingCaptures.id, id))
	})
	await ctx.editMessageText("Okay — describe your meal again and I'll re-estimate.")
	await ctx.answerCallbackQuery()
})

// Prevent uncaught errors from crashing the bot's long polling loop
bot.catch((err) => {
	console.error("[telegram] Uncaught error in bot middleware:", err.error)
	// Try to reply to the user if we have context
	err.ctx.reply("❌ An unexpected error occurred. Please try again.").catch(() => null)
})
