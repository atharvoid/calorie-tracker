"use client"

import { useState } from "react"
import { Send } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { SECONDARY_BTN } from "@/lib/ui"

export function ConnectTelegram() {
	const [loading, setLoading] = useState(false)
	async function connect() {
		setLoading(true)
		try {
			const res = await fetch("/api/telegram/link", { method: "POST" })
			const data = await res.json()
			if (data.url) window.open(data.url, "_blank")
			else toast.error("Couldn't create a link")
		} finally {
			setLoading(false)
		}
	}
	return (
		<Button
			onClick={connect}
			disabled={loading}
			className={SECONDARY_BTN}
		>
			<Send className="mr-2 h-4 w-4" /> Connect Telegram
		</Button>
	)
}
