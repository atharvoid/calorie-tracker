"use client"

import { useState } from "react"
import { ShieldAlert, Loader2, KeyRound } from "lucide-react"
import { PRIMARY_BTN } from "@/lib/ui"
import { cn } from "@/lib/utils"

type Props = {
	trialUsed: number
	trialLimit: number
	isLimitReached: boolean
	onAddKey?: () => void
}

export function PaywallAlert({ trialUsed, trialLimit, isLimitReached, onAddKey }: Props) {
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	async function handleUpgrade() {
		setLoading(true)
		setError(null)
		try {
			const res = await fetch("/api/billing/checkout", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ plan: "monthly" }),
			})
			const data = await res.json()
			if (!res.ok) {
				throw new Error(data.error || "Failed to start checkout")
			}
			if (data.url) {
				window.location.href = data.url
			}
		} catch (err) {
			setError((err as Error | null)?.message || String(err))
		} finally {
			setLoading(false)
		}
	}

	const title = isLimitReached ? "Trial Limit Reached" : "Trial Completed"
	const bodyText = isLimitReached
		? `You have logged ${trialUsed} of ${trialLimit} trial meals. Your history is still available. Add your own free API key or upgrade to keep adding meals.`
		: "Your free trial has ended. Your meal history is still available. Add your own free API key or upgrade to continue logging new meals."

	return (
		<div className="border-danger/20 bg-surface mx-auto my-8 max-w-lg rounded-xl border p-6 text-left">
			<div className="flex items-start gap-3">
				<div className="bg-danger/10 text-danger inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
					<ShieldAlert className="h-5 w-5" />
				</div>
				<div className="w-full space-y-4">
					<div>
						<h3 className="text-primary text-lg font-semibold">{title}</h3>
						<p className="text-secondary mt-1 text-sm leading-relaxed">{bodyText}</p>
					</div>

					{error && <p className="text-danger text-xs">{error}</p>}

					<div className="flex flex-col gap-2 sm:flex-row">
						<button
							onClick={onAddKey}
							className="border-subtle bg-elevated text-primary hover:bg-surface rounded-btn flex w-full cursor-pointer items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-all sm:w-auto"
						>
							<KeyRound className="h-4 w-4" />
							Use my own key — free
						</button>
						<button
							onClick={handleUpgrade}
							disabled={loading}
							className={cn(
								"rounded-btn flex w-full cursor-pointer items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-all sm:w-auto",
								PRIMARY_BTN
							)}
						>
							{loading && <Loader2 className="h-4 w-4 animate-spin" />}
							Continue with Personal ($2.99/mo)
						</button>
					</div>
				</div>
			</div>
		</div>
	)
}
