import { DodoPayments } from "dodopayments"

if (!process.env.DODO_PAYMENTS_API_KEY) {
  if (process.env.NODE_ENV === "production") {
    console.warn("WARNING: DODO_PAYMENTS_API_KEY is not defined in environment variables!")
  }
}

export const dodo = new DodoPayments({
  bearerToken: process.env.DODO_PAYMENTS_API_KEY || "dodo_test_placeholder",
})
