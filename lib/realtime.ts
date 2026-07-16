import type { NormalizedRow } from "@/lib/types"

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
	}).catch((err) => {
		console.error("[broadcast] failed:", err)
	})
}
