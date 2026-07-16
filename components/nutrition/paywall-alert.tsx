"use client"

import { useState } from "react"
import { ShieldAlert, Loader2 } from "lucide-react"
import { PRIMARY_BTN } from "@/lib/ui"
import { cn } from "@/lib/utils"

type Props = {
  trialUsed: number
  trialLimit: number
  isLimitReached: boolean
}

export function PaywallAlert({ trialUsed, trialLimit, isLimitReached }: Props) {
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
    } catch (err: any) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  const title = isLimitReached ? "Trial Limit Reached" : "Trial Completed"
  const bodyText = isLimitReached
    ? `You have logged ${trialUsed} of ${trialLimit} trial meals. Your history is still available. Upgrade to keep adding meals.`
    : "Your free trial has ended. Your meal history is still available. Upgrade to continue logging new meals."

  return (
    <div className="rounded-xl border border-danger/20 bg-surface p-6 text-left max-w-lg mx-auto my-8">
      <div className="flex items-start gap-3">
        <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-danger/10 text-danger">
          <ShieldAlert className="h-5 w-5" />
        </div>
        <div className="space-y-4 w-full">
          <div>
            <h3 className="text-lg font-semibold text-primary">{title}</h3>
            <p className="mt-1 text-sm text-secondary leading-relaxed">{bodyText}</p>
          </div>

          {error && <p className="text-xs text-danger">{error}</p>}

          <button
            onClick={handleUpgrade}
            disabled={loading}
            className={cn(
              "w-full rounded-btn py-2.5 text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-2",
              PRIMARY_BTN
            )}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Continue with Personal ($2.99/mo)
          </button>
        </div>
      </div>
    </div>
  )
}
