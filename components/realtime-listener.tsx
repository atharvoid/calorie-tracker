"use client"

import { useEffect } from "react"
import { toast } from "sonner"
import { supabaseBrowser } from "@/lib/supabase-browser"

type NutritionChangedPayload = {
  eventId: string
  occurredAt: string
  date: string
  mutation: "insert" | "update" | "delete"
  itemIds: string[]
}

type RealtimeListenerProps = {
  userId: string
  onNutritionChanged?: (date: string) => void
  /** @deprecated use onNutritionChanged */
  onEntries?: () => void
}

export function RealtimeListener({
  userId,
  onNutritionChanged,
  onEntries,
}: RealtimeListenerProps) {
  useEffect(() => {
    const channel = supabaseBrowser.channel(`user:${userId}`)

    channel
      .on("broadcast", { event: "nutrition_changed" }, (message) => {
        const payload = message.payload as NutritionChangedPayload
        if (!payload?.date) return
        onNutritionChanged?.(payload.date)
        toast.success("Meal log updated", {
          description: `${payload.itemIds.length} item${payload.itemIds.length !== 1 ? "s" : ""} saved`,
        })
      })
      .subscribe()

    return () => {
      void supabaseBrowser.removeChannel(channel)
    }
  }, [userId, onNutritionChanged, onEntries])

  return null
}
