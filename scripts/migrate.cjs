/* eslint-disable @typescript-eslint/no-require-imports */
const dotenv = require('dotenv')
dotenv.config({ path: '.env.local' })

// Use transaction mode URL (port 6543) for migrations
const dbUrl = (process.env.DATABASE_URL || '').replace(':5432/', ':6543/')
const postgres = require('postgres')
const sql = postgres(dbUrl, { ssl: 'require', max: 1, idle_timeout: 20 })

async function run() {
  try {
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS nutrition_settings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id text NOT NULL UNIQUE REFERENCES "user"(id) ON DELETE CASCADE,
        maintenance_kcal integer,
        target_kcal integer,
        protein_target_g numeric,
        carbs_target_g numeric,
        fat_target_g numeric,
        target_tolerance_kcal integer,
        timezone text NOT NULL DEFAULT 'Asia/Kolkata',
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL
      )
    `)
    console.log('nutrition_settings OK')

    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS nutrition_day_override (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        date text NOT NULL,
        maintenance_kcal integer,
        target_kcal integer,
        protein_target_g numeric,
        carbs_target_g numeric,
        fat_target_g numeric,
        reason text,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL,
        UNIQUE(user_id, date)
      )
    `)
    console.log('nutrition_day_override OK')

    await sql.unsafe('ALTER TABLE meal_item ADD COLUMN IF NOT EXISTS capture_id text')
    console.log('capture_id column OK')

    await sql.unsafe('CREATE INDEX IF NOT EXISTS meal_item_user_date_idx ON meal_item(user_id, date)')
    console.log('meal_item index OK')

    await sql.unsafe('CREATE INDEX IF NOT EXISTS nutrition_day_override_user_date_idx ON nutrition_day_override(user_id, date)')
    console.log('nutrition_day_override index OK')

    console.log('Migration complete!')
  } catch(e) {
    console.error('Migration error:', e.message)
    process.exit(1)
  } finally {
    await sql.end()
  }
}

run()
