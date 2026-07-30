import {
	pgTable,
	text,
	timestamp,
	integer,
	primaryKey,
	uuid,
	numeric,
	jsonb,
	index,
	unique,
	boolean,
} from "drizzle-orm/pg-core"
import type { AdapterAccountType } from "next-auth/adapters"
import type { NutritionResult } from "@/lib/nutrition"

/**
 * Column naming note: the Auth.js tables below use camelCase database column
 * names ("userId", "emailVerified") because the Drizzle adapter requires those
 * exact names. Application tables use snake_case. Do not "fix" the Auth.js
 * tables — renaming them breaks sign-in.
 */

export const users = pgTable("user", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	name: text("name"),
	email: text("email").unique(),
	emailVerified: timestamp("emailVerified", { mode: "date" }),
	image: text("image"),
})

export const accounts = pgTable(
	"account",
	{
		userId: text("userId")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		type: text("type").$type<AdapterAccountType>().notNull(),
		provider: text("provider").notNull(),
		providerAccountId: text("providerAccountId").notNull(),
		refresh_token: text("refresh_token"),
		access_token: text("access_token"),
		expires_at: integer("expires_at"),
		token_type: text("token_type"),
		scope: text("scope"),
		id_token: text("id_token"),
		session_state: text("session_state"),
	},
	(account) => [primaryKey({ columns: [account.provider, account.providerAccountId] })]
)

export const sessions = pgTable("session", {
	sessionToken: text("sessionToken").primaryKey(),
	userId: text("userId")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	expires: timestamp("expires", { mode: "date" }).notNull(),
})

export const verificationTokens = pgTable(
	"verificationToken",
	{
		identifier: text("identifier").notNull(),
		token: text("token").notNull(),
		expires: timestamp("expires", { mode: "date" }).notNull(),
	},
	(vt) => [primaryKey({ columns: [vt.identifier, vt.token] })]
)

// ── Integrations ──────────────────────────────────────────────────────────────

/**
 * @deprecated Carried over from the previous "Data Assistant" project. The
 * default sheet title "Orders" and the sheet sync path are not part of the
 * calorie tracker product. Scheduled for removal — see
 * docs/IMPLEMENTATION_PLAN.md, task D-2. Do not build on this table.
 */
export const sheetConnections = pgTable("sheet_connection", {
	id: uuid("id").defaultRandom().primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	spreadsheetId: text("spreadsheet_id").notNull(),
	sheetTitle: text("sheet_title").notNull().default("Orders"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const telegramLinks = pgTable("telegram_link", {
	telegramUserId: text("telegram_user_id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	linkedAt: timestamp("linked_at").defaultNow().notNull(),
})

export const linkTokens = pgTable("link_token", {
	token: text("token").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	expiresAt: timestamp("expires_at").notNull(),
})

/**
 * @deprecated Carried over from the previous "Data Assistant" project. These are
 * trade/invoice line items (customer, quantity, rate, amount) and have nothing
 * to do with nutrition. Scheduled for removal — see
 * docs/IMPLEMENTATION_PLAN.md, task D-2. Use `mealItems` instead.
 */
export const entries = pgTable("entry", {
	id: uuid("id").defaultRandom().primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	customer: text("customer").notNull(),
	quantity: numeric("quantity"),
	unit: text("unit"),
	rate: numeric("rate"),
	amount: numeric("amount"),
	date: text("date"),
	status: text("status").notNull().default("Pending"),
	confidence: numeric("confidence"),
	flags: jsonb("flags").$type<string[]>().default([]),
	source: text("source").notNull().default("site"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
})

// ── Nutrition ────────────────────────────────────────────────────────────────

export const pendingCaptures = pgTable("pending_capture", {
	id: uuid("id").defaultRandom().primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	payload: jsonb("payload").notNull().$type<NutritionResult>(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
})

/** Allowed values for `mealItems.mealType`. */
export type MealType = "Breakfast" | "Lunch" | "Dinner" | "Snack"
/** Allowed values for `mealItems.source` and `usageEvents.source`. */
export type LogSource = "web" | "telegram"

export const mealItems = pgTable(
	"meal_item",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		date: text("date").notNull(), // YYYY-MM-DD, in the user's timezone
		mealType: text("meal_type").$type<MealType>(),
		timeHint: text("time_hint"),
		name: text("name").notNull(),
		grams: numeric("grams"),
		kcal: numeric("kcal"),
		proteinG: numeric("protein_g"),
		carbsG: numeric("carbs_g"),
		fatG: numeric("fat_g"),
		notes: text("notes"),
		source: text("source").$type<LogSource>().notNull().default("telegram"),
		// References pending_capture.id. Stored as text for historical reasons; the
		// type migration to uuid + a real FK is task S-1 in the implementation plan.
		captureId: text("capture_id"),
		itemIndex: integer("item_index"), // position in capture payload, for idempotency
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(t) => [
		index("meal_item_user_date_idx").on(t.userId, t.date),
		// captureId + itemIndex is the deduplication lookup key and was unindexed.
		index("meal_item_capture_idx").on(t.captureId, t.itemIndex),
	]
)

export const nutritionSettings = pgTable(
	"nutrition_settings",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		maintenanceKcal: integer("maintenance_kcal"),
		targetKcal: integer("target_kcal"),
		proteinTargetG: numeric("protein_target_g"),
		carbsTargetG: numeric("carbs_target_g"),
		fatTargetG: numeric("fat_target_g"),
		targetToleranceKcal: integer("target_tolerance_kcal"),
		timezone: text("timezone").notNull().default("Asia/Kolkata"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.notNull()
			.$onUpdate(() => new Date()),
	},
	(t) => [unique("nutrition_settings_user_id_unique").on(t.userId)]
)

export const nutritionDayOverrides = pgTable(
	"nutrition_day_override",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		date: text("date").notNull(), // YYYY-MM-DD
		maintenanceKcal: integer("maintenance_kcal"),
		targetKcal: integer("target_kcal"),
		proteinTargetG: numeric("protein_target_g"),
		carbsTargetG: numeric("carbs_target_g"),
		fatTargetG: numeric("fat_target_g"),
		reason: text("reason"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.notNull()
			.$onUpdate(() => new Date()),
	},
	// The unique constraint already provides the (user_id, date) index; the
	// separate index that used to live here was redundant write amplification.
	(t) => [unique("nutrition_day_override_user_date_unique").on(t.userId, t.date)]
)

// ── Billing and entitlements ─────────────────────────────────────────────────

export type BillingProvider = "stripe" | "dodo"

export const billingCustomers = pgTable("billing_customer", {
	userId: text("user_id")
		.primaryKey()
		.references(() => users.id, { onDelete: "cascade" }),
	provider: text("provider").$type<BillingProvider>().notNull().default("stripe"),
	providerCustomerId: text("provider_customer_id").notNull().unique(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.notNull()
		.$onUpdate(() => new Date()),
})

export type SubscriptionStatus =
	| "trialing"
	| "active"
	| "past_due"
	| "canceled"
	| "unpaid"
	| "incomplete"
	| "paused"

export type PlanKey = "personal_monthly" | "personal_annual"

export const subscriptions = pgTable(
	"subscription",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		providerSubscriptionId: text("provider_subscription_id").unique(),
		providerPriceId: text("provider_price_id"),
		status: text("status").$type<SubscriptionStatus>().notNull(),
		planKey: text("plan_key").$type<PlanKey>().notNull(),
		currency: text("currency"),
		currentPeriodStart: timestamp("current_period_start"),
		currentPeriodEnd: timestamp("current_period_end"),
		cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false).notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.notNull()
			.$onUpdate(() => new Date()),
	},
	(t) => [index("subscription_user_id_idx").on(t.userId)]
)

/**
 * Tiers, cheapest-to-us first:
 *   pre_trial  — signed up, has not logged a meal yet
 *   trial      — time-boxed and log-capped, billed to the platform key
 *   byok       — unlimited, billed to the user's own AI provider key
 *   active     — paid subscriber, billed to the platform key, daily fair-use cap
 *   grace      — payment failed, still allowed for a short window
 *   trial_ended        — trial window elapsed
 *   quota_exhausted    — trial log allowance consumed
 *   blocked    — suspended by an admin
 */
export type AccessState =
	| "pre_trial"
	| "trial"
	| "byok"
	| "active"
	| "grace"
	| "trial_ended"
	| "quota_exhausted"
	| "blocked"

/** AI provider a user can supply their own key for. */
export type ByokProvider = "google"

export const productEntitlements = pgTable("product_entitlement", {
	id: uuid("id").defaultRandom().primaryKey(),
	userId: text("user_id")
		.notNull()
		.unique()
		.references(() => users.id, { onDelete: "cascade" }),
	trialStartedAt: timestamp("trial_started_at"),
	trialEndsAt: timestamp("trial_ends_at"),
	trialAiLogsUsed: integer("trial_ai_logs_used").notNull().default(0),
	trialAiLogLimit: integer("trial_ai_log_limit").notNull().default(50),
	paidAiLogsToday: integer("paid_ai_logs_today").notNull().default(0),
	paidAiLogDate: text("paid_ai_log_date"), // YYYY-MM-DD
	accessState: text("access_state").$type<AccessState>().notNull().default("pre_trial"),

	// ── BYOK (bring your own key) ────────────────────────────────────────────
	// The key is AES-256-GCM encrypted by lib/byok.ts. Plaintext is never
	// stored and never logged. Only the last four characters are displayable.
	byokProvider: text("byok_provider").$type<ByokProvider>(),
	byokKeyEnvelope: text("byok_key_envelope"),
	byokKeyLast4: text("byok_key_last4"),
	byokVerifiedAt: timestamp("byok_verified_at"),
	// Consecutive provider auth failures. Used to nudge the user to rotate a key
	// that has been revoked, without silently falling back to the platform key.
	byokFailureCount: integer("byok_failure_count").notNull().default(0),
	byokLastFailureAt: timestamp("byok_last_failure_at"),

	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.notNull()
		.$onUpdate(() => new Date()),
})
// No secondary index on user_id: the .unique() above already creates one.

/** Who paid the provider for a given AI call. */
export type KeyOwner = "platform" | "user"

export const usageEvents = pgTable(
	"usage_event",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		eventType: text("event_type").notNull(), // e.g. 'ai_extraction'
		requestId: text("request_id").notNull().unique(), // Telegram update ID or web request ID
		source: text("source").$type<LogSource>().notNull(),
		model: text("model").notNull(),
		inputTokens: integer("input_tokens"),
		outputTokens: integer("output_tokens"),
		// Micro-USD (millionths of a dollar). Always 0 when keyOwner is 'user',
		// because BYOK calls cost the platform nothing.
		estimatedCostMicros: integer("estimated_cost_micros"),
		keyOwner: text("key_owner").$type<KeyOwner>().notNull().default("platform"),
		success: boolean("success").notNull(),
		failureCategory: text("failure_category"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(t) => [
		index("usage_event_user_created_idx").on(t.userId, t.createdAt),
		// A separate user_id-only index used to exist here; the composite index
		// above already serves user_id-prefixed lookups.
	]
)
