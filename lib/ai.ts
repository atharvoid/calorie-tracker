import { google } from "@ai-sdk/google"

// Use Gemini 2.5 Flash as the core model for speed, accuracy, and structured outputs support
export const TEXT_MODEL = google("gemini-2.5-flash")
export const VISION_MODEL = google("gemini-2.5-flash")
