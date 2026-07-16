import {
	pgTable,
	text,
	timestamp,
	integer,
	primaryKey,
	uuid,
	numeric,
	jsonb,
} from "drizzle-orm/pg-core"
import type { AdapterAccountType } from "next-auth/adapters"

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
	payload: jsonb("payload").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const mealItems = pgTable("meal_item", {
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
	createdAt: timestamp("created_at").defaultNow().notNull(),
})

