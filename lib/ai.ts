import { createGoogleGenerativeAI } from "@ai-sdk/google"

/**
 * Model selection. Gemini 2.5 Flash is used for both text and vision — it is a
 * single multimodal model, so there is one model ID, not two.
 *
 * Override with GEMINI_MODEL_ID to roll forward without a code change.
 */
export const MODEL_ID = process.env.GEMINI_MODEL_ID || "gemini-2.5-flash"

/**
 * Published Gemini 2.5 Flash pricing, USD per 1M tokens.
 * Kept here (next to the model ID) so the two never drift apart.
 * Source of truth: https://ai.google.dev/gemini-api/docs/pricing
 */
export const MODEL_PRICING_USD_PER_MTOK = {
	input: 0.3,
	output: 2.5,
} as const

/** Provider bound to the platform's own API key (free trial + paid subscribers). */
const platformProvider = createGoogleGenerativeAI({
	apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
})

/**
 * Returns a language model for the current request.
 *
 * @param apiKey - A user-supplied (BYOK) API key. When present, the call is
 *   billed to the user's own Google account and costs the platform nothing.
 *   When absent, the platform key is used.
 */
export function getModel(apiKey?: string | null) {
	if (apiKey) {
		return createGoogleGenerativeAI({ apiKey })(MODEL_ID)
	}
	return platformProvider(MODEL_ID)
}

/**
 * Convenience export for call sites that always use the platform key.
 * Prefer `getModel(apiKey)` so BYOK keys are honoured.
 */
export const PLATFORM_MODEL = platformProvider(MODEL_ID)

/** @deprecated Use `getModel()` or `PLATFORM_MODEL`. Kept for compatibility. */
export const TEXT_MODEL = PLATFORM_MODEL
/** @deprecated Use `getModel()` or `PLATFORM_MODEL`. Kept for compatibility. */
export const VISION_MODEL = PLATFORM_MODEL
