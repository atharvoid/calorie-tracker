-- Migration: 0003_billing_entitlements
-- Adds billing_customer, subscription, product_entitlement, and usage_event tables with indexes

-- 1. Billing Customer Table
CREATE TABLE IF NOT EXISTS "billing_customer" (
    "user_id" text PRIMARY KEY REFERENCES "user"("id") ON DELETE CASCADE,
    "provider" text NOT NULL DEFAULT 'stripe',
    "provider_customer_id" text NOT NULL UNIQUE,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

-- 2. Subscription Table
CREATE TABLE IF NOT EXISTS "subscription" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "provider_subscription_id" text UNIQUE,
    "provider_price_id" text,
    "status" text NOT NULL,
    "plan_key" text NOT NULL,
    "currency" text,
    "current_period_start" timestamp,
    "current_period_end" timestamp,
    "cancel_at_period_end" boolean DEFAULT false NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

-- 3. Product Entitlement Table
CREATE TABLE IF NOT EXISTS "product_entitlement" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" text NOT NULL UNIQUE REFERENCES "user"("id") ON DELETE CASCADE,
    "trial_started_at" timestamp,
    "trial_ends_at" timestamp,
    "trial_ai_logs_used" integer DEFAULT 0 NOT NULL,
    "trial_ai_log_limit" integer DEFAULT 50 NOT NULL,
    "paid_ai_logs_today" integer DEFAULT 0 NOT NULL,
    "paid_ai_log_date" text,
    "access_state" text DEFAULT 'pre_trial' NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

-- 4. Usage Event Table
CREATE TABLE IF NOT EXISTS "usage_event" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "event_type" text NOT NULL,
    "request_id" text NOT NULL UNIQUE,
    "source" text NOT NULL,
    "model" text NOT NULL,
    "input_tokens" integer,
    "output_tokens" integer,
    "estimated_cost_micros" integer,
    "success" boolean NOT NULL,
    "failure_category" text,
    "created_at" timestamp DEFAULT now() NOT NULL
);

-- 5. Optimization Indexes
CREATE INDEX IF NOT EXISTS "subscription_user_id_idx" ON "subscription"("user_id");
CREATE INDEX IF NOT EXISTS "product_entitlement_user_id_idx" ON "product_entitlement"("user_id");
CREATE INDEX IF NOT EXISTS "usage_event_user_id_idx" ON "usage_event"("user_id");
CREATE INDEX IF NOT EXISTS "usage_event_user_created_idx" ON "usage_event"("user_id", "created_at");
