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

export const users = pgTable("user", {
	id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
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
	(account) => [
		primaryKey({ columns: [account.provider, account.providerAccountId] }),
	]
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

// ---- our tables ----
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

export const pendingCaptures = pgTable("pending_capture", {
	id: uuid("id").defaultRandom().primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	payload: jsonb("payload").notNull().$type<NutritionResult>(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const mealItems = pgTable(
	"meal_item",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		date: text("date").notNull(), // YYYY-MM-DD
		mealType: text("meal_type"), // Breakfast | Lunch | Dinner | Snack | null
		timeHint: text("time_hint"),
		name: text("name").notNull(),
		grams: numeric("grams"),
		kcal: numeric("kcal"),
		proteinG: numeric("protein_g"),
		carbsG: numeric("carbs_g"),
		fatG: numeric("fat_g"),
		notes: text("notes"),
		source: text("source").notNull().default("telegram"),
		captureId: text("capture_id"), // links to pending_capture.id for deduplication
		itemIndex: integer("item_index"), // position in capture payload for accurate idempotency
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(t) => [index("meal_item_user_date_idx").on(t.userId, t.date)]
)

// ── New nutrition settings tables ──────────────────────────────────────────────

export const nutritionSettings = pgTable("nutrition_settings", {
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
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(t) => [
		unique("nutrition_day_override_user_date_unique").on(t.userId, t.date),
		index("nutrition_day_override_user_date_idx").on(t.userId, t.date),
	]
)

// ── Billing and Entitlements tables ──────────────────────────────────────────

export const billingCustomers = pgTable("billing_customer", {
	userId: text("user_id")
		.primaryKey()
		.references(() => users.id, { onDelete: "cascade" }),
	provider: text("provider").notNull().default("stripe"),
	providerCustomerId: text("provider_customer_id").notNull().unique(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const subscriptions = pgTable("subscription", {
	id: uuid("id").defaultRandom().primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	providerSubscriptionId: text("provider_subscription_id").unique(),
	providerPriceId: text("provider_price_id"),
	status: text("status").notNull(), // trialing, active, past_due, canceled, unpaid, incomplete, paused
	planKey: text("plan_key").notNull(), // personal_monthly, personal_annual
	currency: text("currency"),
	currentPeriodStart: timestamp("current_period_start"),
	currentPeriodEnd: timestamp("current_period_end"),
	cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false).notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
},
	(t) => [
		index("subscription_user_id_idx").on(t.userId),
	]
)

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
	accessState: text("access_state").notNull().default("pre_trial"), // pre_trial, trial, active, grace, expired, blocked
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
},
	(t) => [
		index("product_entitlement_user_id_idx").on(t.userId),
	]
)

export const usageEvents = pgTable("usage_event", {
	id: uuid("id").defaultRandom().primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	eventType: text("event_type").notNull(), // e.g. 'ai_extraction'
	requestId: text("request_id").notNull().unique(), // Telegram update ID or web request ID
	source: text("source").notNull(), // web or telegram
	model: text("model").notNull(),
	inputTokens: integer("input_tokens"),
	outputTokens: integer("output_tokens"),
	estimatedCostMicros: integer("estimated_cost_micros"),
	success: boolean("success").notNull(),
	failureCategory: text("failure_category"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
},
	(t) => [
		index("usage_event_user_id_idx").on(t.userId),
		index("usage_event_user_created_idx").on(t.userId, t.createdAt),
	]
)
