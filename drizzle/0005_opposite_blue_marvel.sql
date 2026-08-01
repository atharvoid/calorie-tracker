ALTER TABLE "entry" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sheet_connection" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "entry" CASCADE;--> statement-breakpoint
DROP TABLE "sheet_connection" CASCADE;