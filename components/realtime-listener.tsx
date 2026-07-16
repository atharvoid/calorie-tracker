"use client"

import { useEffect } from "react"
import { toast } from "sonner"
import { supabaseBrowser } from "@/lib/supabase-browser"
import type { NormalizedRow } from "@/lib/types"

type RealtimeListenerProps = {
	userId: string
	onEntries: (rows: NormalizedRow[]) => void
}

export function RealtimeListener({ userId, onEntries }: RealtimeListenerProps) {
	useEffect(() => {
		const channel = supabaseBrowser.channel(`user:${userId}`)
		channel
			.on("broadcast", { event: "entries" }, (message) => {
				const payload = message.payload as { rows?: NormalizedRow[] }
				const rows = payload?.rows ?? []
				if (rows.length === 0) return
				onEntries(rows)
				const plural = rows.length > 1 ? "s" : ""
				toast.success(`${rows.length} new order${plural} from your phone`)
			})
			.subscribe()

		return () => {
			supabaseBrowser.removeChannel(channel)
		}
	}, [userId, onEntries])

	return null
}
