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
	check,
} from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import type { AdapterAccountType } from "next-auth/adapters"
// Imported from lib/nutrition-types (pure zod shapes) rather than lib/nutrition,
// so the database layer does not pull in the AI SDK. See task S-6.
import type { NutritionResult } from "@/lib/nutrition-types"

/**
 * Column naming note: the Auth.js tables below use camelCase database column
 * names ("userId", "emailVerified") because the Drizzle adapter requires those
 * exact names. Application tables use snake_case. Do not "fix" the Auth.js
 * tables — renaming them breaks sign-in.
 *
 * Numeric precision note: nutrition `numeric` columns are declared with an
 * explicit precision and scale. Bare `numeric` accepts unbounded input, and
 * Drizzle returns every numeric as a JavaScript **string** regardless — which
 * is why `Number()` coercion appears at each consumer, and why a missed
 * coercion silently produces string concatenation instead of addition. The
 * precision does not remove the coercion requirement, but it does stop the
 * database accepting values the UI cannot render. See task S-3.
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

// ── Integrations ────────────────────────────────────────────────
//
// The `sheet_connection` and `entry` tables that used to live here (Google
// Sheets sync and invoice line items, both carried over from the previous
// "Data Assistant" project) have been removed from the schema (task D-2).
// Neither had any remaining code reference: the Sheets feature and its
// settings UI were deleted in PR #35, and `entry` was always unused by this
// product. This removes them from Drizzle's tracked schema; the tables
// themselves still exist in the live database. To finish the cleanup, run
// `pnpm drizzle-kit generate` to produce the DROP migration (back up both
// tables first), then `pnpm drizzle-kit migrate`.

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

// ── Nutrition ───────────────────────────────────────────────────

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

/**
 * Runtime-enforced value lists. The `$type<>()` unions below are erased at
 * compile time, so anything writing outside the Drizzle layer — a migration, a
 * manual psql fix, a webhook handler with a typo — could previously insert an
 * unlisted value unchallenged. These arrays are the single source the CHECK
 * constraints in drizzle/0006_column_constraints.sql were generated from; keep
 * them in step with that migration. See task S-2.
 */
export const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snack"] as const
export const LOG_SOURCES = ["web", "telegram"] as const

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
		grams: numeric("grams", { precision: 9, scale: 2 }),
		kcal: numeric("kcal", { precision: 9, scale: 2 }),
		proteinG: numeric("protein_g", { precision: 7, scale: 2 }),
		carbsG: numeric("carbs_g", { precision: 7, scale: 2 }),
		fatG: numeric("fat_g", { precision: 7, scale: 2 }),
		notes: text("notes"),
		source: text("source").$type<LogSource>().notNull().default("telegram"),
		// References pending_capture.id (UUID with set-null on delete)
		captureId: uuid("capture_id").references(() => pendingCaptures.id, { onDelete: "set null" }),
		itemIndex: integer("item_index"), // position in capture payload, for idempotency
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(t) => [
		index("meal_item_user_date_idx").on(t.userId, t.date),
		// captureId + itemIndex is the deduplication lookup key and was unindexed.
		index("meal_item_capture_idx").on(t.captureId, t.itemIndex),
		check(
			"meal_item_meal_type_valid",
			sql`meal_type IS NULL OR meal_type IN ('Breakfast','Lunch','Dinner','Snack')`
		),
		check("meal_item_source_valid", sql`source IN ('web','telegram')`),
		check(
			"meal_item_non_negative",
			sql`COALESCE(grams, 0) >= 0 AND COALESCE(kcal, 0) >= 0 AND COALESCE(protein_g, 0) >= 0 AND COALESCE(carbs_g, 0) >= 0 AND COALESCE(fat_g, 0) >= 0`
		),
		check("meal_item_grams_upper_bound", sql`grams IS NULL OR grams <= 5000`),
		check("meal_item_kcal_upper_bound", sql`kcal IS NULL OR kcal <= 10000`),
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
		proteinTargetG: numeric("protein_target_g", { precision: 7, scale: 2 }),
		carbsTargetG: numeric("carbs_target_g", { precision: 7, scale: 2 }),
		fatTargetG: numeric("fat_target_g", { precision: 7, scale: 2 }),
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
		proteinTargetG: numeric("protein_target_g", { precision: 7, scale: 2 }),
		carbsTargetG: numeric("carbs_target_g", { precision: 7, scale: 2 }),
		fatTargetG: numeric("fat_target_g", { precision: 7, scale: 2 }),
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

// ── Billing and entitlements ────────────────────────────────────────

export type BillingProvider = "stripe" | "dodo"

export const BILLING_PROVIDERS = ["stripe", "dodo"] as const

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
	"trialing" | "active" | "past_due" | "canceled" | "unpaid" | "incomplete" | "paused"

export type PlanKey = "personal_monthly" | "personal_annual"

export const SUBSCRIPTION_STATUSES = [
	"trialing",
	"active",
	"past_due",
	"canceled",
	"unpaid",
	"incomplete",
	"paused",
] as const

export const PLAN_KEYS = ["personal_monthly", "personal_annual"] as const

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

export const ACCESS_STATES = [
	"pre_trial",
	"trial",
	"byok",
	"active",
	"grace",
	"trial_ended",
	"quota_exhausted",
	"blocked",
] as const

/** AI provider a user can supply their own key for. */
export type ByokProvider = "google"

export const BYOK_PROVIDERS = ["google"] as const

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

	// ── BYOK (bring your own key) ───────────────────────────────────
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

export const KEY_OWNERS = ["platform", "user"] as const

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
