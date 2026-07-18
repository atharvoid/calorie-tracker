import { DodoPayments } from "dodopayments"

const rawEnv = process.env.DODO_ENVIRONMENT || process.env.DODO_PAYMENTS_ENVIRONMENT || "test_mode"

let dodoEnv: "test_mode" | "live_mode" = "test_mode"
if (rawEnv === "live" || rawEnv === "live_mode") {
  dodoEnv = "live_mode"
} else {
  dodoEnv = "test_mode"
}

let instance: DodoPayments
try {
  instance = new DodoPayments({
    bearerToken: process.env.DODO_PAYMENTS_API_KEY || "dodo_test_placeholder_key",
    environment: dodoEnv,
  })
} catch {
  instance = new DodoPayments({
    bearerToken: "dodo_test_placeholder_key",
    environment: "test_mode",
  })
}

export const dodo = instance
