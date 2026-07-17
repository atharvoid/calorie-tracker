import { DodoPayments } from "dodopayments"

const rawEnv = process.env.DODO_ENVIRONMENT || process.env.DODO_PAYMENTS_ENVIRONMENT || "test"

let dodoEnv: "test_mode" | "live_mode" = "test_mode"
if (rawEnv === "live" || rawEnv === "live_mode") {
  dodoEnv = "live_mode"
} else if (rawEnv === "test" || rawEnv === "test_mode") {
  dodoEnv = "test_mode"
} else {
  throw new Error(`Invalid Dodo Payments environment: ${rawEnv}. Expected 'test_mode' or 'live_mode'.`)
}

export const dodo = new DodoPayments({
  bearerToken: process.env.DODO_PAYMENTS_API_KEY || "dodo_test_placeholder",
  environment: dodoEnv,
})
