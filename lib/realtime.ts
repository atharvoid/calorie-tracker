import type { NormalizedRow } from "@/lib/types"

type NutritionChangedPayload = {
  eventId: string
  occurredAt: string
  date: string
  mutation: "insert" | "update" | "delete"
  itemIds: string[]
}

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
    console.error("[broadcast] nutrition_changed failed:", err)
  })
}

/**
 * @deprecated Use broadcastNutritionChanged instead.
 * Kept for backwards compatibility with legacy order tracking.
 */
export async function broadcastEntries(
  userId: string,
  rows: NormalizedRow[]
): Promise<void> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!base || !key || rows.length === 0) return

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
          event: "entries",
          payload: { rows },
        },
      ],
    }),
  }).catch((err: unknown) => {
    console.error("[broadcast] entries failed:", err)
  })
}
