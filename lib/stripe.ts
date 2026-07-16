import Stripe from "stripe"

if (!process.env.STRIPE_SECRET_KEY) {
  // During build time or when not configured, fall back to a placeholder
  // but warn in production
  if (process.env.NODE_ENV === "production") {
    console.warn("WARNING: STRIPE_SECRET_KEY is not defined in environment variables!")
  }
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder", {
  apiVersion: "2026-06-24.dahlia",
  typescript: true,
})
