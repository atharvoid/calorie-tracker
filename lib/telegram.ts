import { Bot, InlineKeyboard, type Context } from "grammy"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import {
	telegramLinks,
	linkTokens,
	pendingCaptures,
} from "@/db/schema"
import { extractNutrition, nutritionSchema, type NutritionResult } from "@/lib/nutrition"
import { commitNutrition } from "@/lib/commit"
import { getSettings } from "@/lib/nutrition-queries"
import { localDate, addDays, parseLocalDate, formatShortDate, isFuture } from "@/lib/nutrition-date"

export function parseTelegramDate(text: string, timezone: string): { date: string; cleanText: string; label: string } | null {
  const today = localDate(timezone)
  const textLower = text.toLowerCase().trim()

  // 1. "yesterday"
  if (/\byesterday\b/.test(textLower)) {
    const targetDate = addDays(today, -1)
    const cleanText = text.replace(/\byesterday\b/gi, "").replace(/\s+/g, " ").trim()
    return { date: targetDate, cleanText, label: "Yesterday" }
  }

  // 2. "on YYYY-MM-DD" or just "YYYY-MM-DD" at the beginning/end
  const ymdMatch = text.match(/\b(?:on\s+)?(\d{4})-(\d{2})-(\d{2})\b/)
  if (ymdMatch) {
    const dateStr = ymdMatch[1] + "-" + ymdMatch[2] + "-" + ymdMatch[3]
    const cleanText = text.replace(ymdMatch[0], "").replace(/\s+/g, " ").trim()
    try {
      parseLocalDate(dateStr)
      return { date: dateStr, cleanText, label: formatShortDate(dateStr) }
    } catch {
      return null
    }
  }

  // 3. "on DD Month" or "on Month DD"
  const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]
  const fullMonths = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"]
  
  const dmMatch = text.match(/\b(?:on\s+)?(\d{1,2})(?:st|nd|rd|th)?\s+([a-zA-Z]{3,9})\b/i)
  if (dmMatch) {
    const day = parseInt(dmMatch[1], 10)
    const monthStr = dmMatch[2].toLowerCase()
    let mIdx = months.indexOf(monthStr.substring(0, 3))
    if (mIdx === -1) mIdx = fullMonths.indexOf(monthStr)
    
    if (mIdx !== -1 && day >= 1 && day <= 31) {
      const currentYear = parseInt(today.split("-")[0], 10)
      const dateStr = `${currentYear}-${String(mIdx + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
      const cleanText = text.replace(dmMatch[0], "").replace(/\s+/g, " ").trim()
      try {
        parseLocalDate(dateStr)
        return { date: dateStr, cleanText, label: formatShortDate(dateStr) }
      } catch {
        return null
      }
    }
  }

  return null
}

export const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN || "123456:dummy-token")

/** Helper to retry any database operations once if they encounter a connection reset */
async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
	for (let i = 0; i <= retries; i++) {
		try {
			return await fn()
		} catch (err: unknown) {
			const e = err as { message?: string; code?: string; cause?: { message?: string; code?: string } }
			const isConnectionError =
				e.message?.includes("ECONNRESET") ||
				e.code === "ECONNRESET" ||
				e.message?.includes("terminated") ||
				e.cause?.message?.includes("ECONNRESET") ||
				e.cause?.code === "ECONNRESET" ||
				e.cause?.message?.includes("terminated")
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
	nutrition: NutritionResult,
	logDate?: string
): Promise<void> {
	const pending = await withRetry(async () => {
		const [row] = await db
			.insert(pendingCaptures)
			.values({ userId, payload: { ...nutrition, logDate } as any })
			.returning({ id: pendingCaptures.id })
		return row
	})
	const kb = new InlineKeyboard()
		.text("✓ Save", `confirm:${pending.id}`)
		.text("✏️ Fix", `edit:${pending.id}`)
	
	const dateLabel = logDate ? `\n\n📅 *Target Date: ${formatShortDate(logDate)}*` : ""
	await ctx.reply(summarizeMeals(nutrition) + dateLabel, {
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
		"✅ Connected! Now send me what you ate — e.g.:\n_morning 2 eggs with toast, Greek yogurt. lunch chicken salad, 1 cup rice_",
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
	const requestId = `tg-${ctx.update.update_id}`
	const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://willing-exhibition-inherited-subaru.trycloudflare.com"

	// Pre-extract entitlement check to avoid sending thinking message if already blocked
	try {
		const { assertCanUseAiLog } = await import("@/lib/entitlements")
		await assertCanUseAiLog(userId)
	} catch {
		const kb = new InlineKeyboard().url("View plans", `${appUrl}/?tab=settings`)
		await ctx.reply(
			"Your free trial has ended. Your meal history is still available. Upgrade to continue logging new meals.",
			{ reply_markup: kb }
		)
		return
	}

	const settings = await getSettings(userId).catch(() => null)
	const timezone = settings?.timezone || "Asia/Kolkata"

	const parsed = parseTelegramDate(ctx.message.text, timezone)
	const targetDate = parsed ? parsed.date : localDate(timezone)
	const cleanText = parsed ? parsed.cleanText : ctx.message.text

	if (isFuture(targetDate, timezone)) {
		await ctx.reply("❌ Date cannot be in the future.")
		return
	}
	const oldestAllowed = addDays(localDate(timezone), -366)
	if (targetDate < oldestAllowed) {
		await ctx.reply("❌ Date is too far in the past (max 366 days).")
		return
	}

	const thinking = await ctx.reply("🧮 Estimating macros…")
	try {
		const nutrition = await extractNutrition(cleanText, userId, requestId, "telegram")
		// Delete the "thinking" message before showing results
		await ctx.api.deleteMessage(ctx.chat.id, thinking.message_id).catch(() => null)
		await presentNutritionConfirm(ctx, userId, nutrition, targetDate)
	} catch (err: any) {
		await ctx.api.deleteMessage(ctx.chat.id, thinking.message_id).catch(() => null)
		console.error("[telegram] extractNutrition failed:", err)

		const isEntitlementError = err.message?.includes("free trial") || err.message?.includes("limit reached")
		if (isEntitlementError) {
			const kb = new InlineKeyboard().url("View plans", `${appUrl}/?tab=settings`)
			await ctx.reply(
				"Your free trial has ended. Your meal history is still available. Upgrade to continue logging new meals.",
				{ reply_markup: kb }
			)
		} else {
			await ctx.reply("❌ Couldn't estimate. Try describing your meal again — e.g. '2 eggs with toast, 1 glass milk'")
		}
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
		await ctx.answerCallbackQuery("Already saved or expired — check your meal log.")
		return
	}

	// Validate the stored payload before committing
	const validationResult = nutritionSchema.safeParse(pending.payload)
	if (!validationResult.success) {
		console.error("[telegram] Invalid stored payload:", validationResult.error.message)
		await ctx.answerCallbackQuery("Invalid data — please send your meal again.")
		// Clean up invalid pending capture
		await withRetry(async () => {
			await db.delete(pendingCaptures).where(eq(pendingCaptures.id, id))
		})
		return
	}

	const rawPayload = pending.payload as any
	const logDate = rawPayload.logDate as string | undefined

	const nutrition = validationResult.data
	try {
		const { rowCount, syncWarning } = await commitNutrition({
			userId: pending.userId,
			nutrition,
			source: "telegram",
			captureId: id,
			timezone: "Asia/Kolkata",
			logDate,
		})

		// Delete pending capture AFTER confirmed DB insert
		await withRetry(async () => {
			await db.delete(pendingCaptures).where(eq(pendingCaptures.id, id))
		})

		// rowCount === 0 means the DB idempotency index absorbed a duplicate (double-tap)
		if (rowCount === 0) {
			await ctx.answerCallbackQuery("Already saved — check your meal log.")
			return
		}

		const warningText = syncWarning ? "\n⚠️ _Sheet sync failed but meals are saved._" : ""
		await ctx.editMessageText(
			summarizeMeals(nutrition) +
				`\n\n✅ *Saved ${rowCount} meal${rowCount !== 1 ? "s" : ""} to your log!*` +
				warningText,
			{ parse_mode: "Markdown" }
		)
		await ctx.answerCallbackQuery("Meals saved!")
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
