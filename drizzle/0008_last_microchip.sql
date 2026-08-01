ALTER TABLE "meal_item" ALTER COLUMN "grams" SET DATA TYPE integer USING grams::integer;--> statement-breakpoint
ALTER TABLE "meal_item" ALTER COLUMN "kcal" SET DATA TYPE integer USING kcal::integer;