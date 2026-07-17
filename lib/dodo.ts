import { DodoPayments } from "dodopayments"

const dodoEnv = process.env.DODO_ENVIRONMENT || "test"

if (dodoEnv !== "test" && dodoEnv !== "live") {
  throw new Error(`Invalid DODO_ENVIRONMENT: ${dodoEnv}. Expected 'test' or 'live'.`)
}

export const dodo = new DodoPayments({
  bearerToken: process.env.DODO_PAYMENTS_API_KEY || "dodo_test_placeholder",
  environment: dodoEnv === "live" ? "live_mode" : "test_mode",
})
