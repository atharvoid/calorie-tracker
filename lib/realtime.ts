type NutritionChangedPayload = {
	eventId: string
	occurredAt: string
	date: string
	mutation: "insert" | "update" | "delete"
	itemIds: string[]
}

import { logger } from "@/lib/logger"

/** Broadcast a nutrition_changed event to the user's realtime channel */
export async function broadcastNutritionChanged(
	userId: string,
	payload: NutritionChangedPayload
): Promise<void> {
	const base = process.env.NEXT_PUBLIC_SUPABASE_URL
	const key = process.env.SUPABASE_SERVICE_ROLE_KEY
	if (!base || !key) return

	await fetch(`${base}/realtime/v1/api/broadcast`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			apikey: key,
			Authorization: `Bearer ${key}`,
		},
		body: JSON.stringify({
			messages: [
				{
					topic: `user:${userId}`,
					event: "nutrition_changed",
					// Payload must NOT contain food names, grams, or calories
					payload: {
						eventId: payload.eventId,
						occurredAt: payload.occurredAt,
						date: payload.date,
						mutation: payload.mutation,
						itemIds: payload.itemIds,
					},
				},
			],
		}),
	}).catch((err: unknown) => {
		logger.error("[broadcast] nutrition_changed failed", { error: err, userId })
	})
}
