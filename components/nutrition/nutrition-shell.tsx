"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { BarChart2, Clock, Settings, Utensils } from "lucide-react"
import { cn } from "@/lib/utils"
import { RealtimeListener } from "@/components/realtime-listener"
import { TodayView } from "./today-view"
import { HistoryView } from "./history-view"
import { AnalyticsView } from "./analytics-view"
import { SettingsView } from "./settings-view"
import { ConnectTelegram } from "@/components/connect-telegram"

type Tab = "today" | "history" | "analytics" | "settings"

const TABS: { id: Tab; label: string; Icon: React.FC<{ className?: string }> }[] = [
  { id: "today", label: "Today", Icon: Utensils },
  { id: "history", label: "History", Icon: Clock },
  { id: "analytics", label: "Analytics", Icon: BarChart2 },
  { id: "settings", label: "Settings", Icon: Settings },
]

type Props = {
  userId: string
}

export function NutritionShell({ userId }: Props) {
  const searchParams = useSearchParams()
  const router = useRouter()

  const tabParam = searchParams.get("tab") as Tab | null
  const [activeTab, setActiveTab] = useState<Tab>(
    TABS.some((t) => t.id === tabParam) ? (tabParam as Tab) : "today"
  )

  // Track which date needs refresh on realtime event
  const [refreshKey, setRefreshKey] = useState(0)

  const handleNutritionChanged = useCallback((_date: string) => {
    // Bump key to force re-mount of active tab
    setRefreshKey((k) => k + 1)
  }, [])

  // Sync tab to URL without full navigation
  useEffect(() => {
    const current = searchParams.get("tab")
    if (current !== activeTab) {
      const params = new URLSearchParams(searchParams.toString())
      params.set("tab", activeTab)
      router.replace(`?${params.toString()}`, { scroll: false })
    }
  }, [activeTab, router, searchParams])

  return (
    <div className="w-full">
      <RealtimeListener userId={userId} onNutritionChanged={handleNutritionChanged} />

      {/* Tab navigation */}
      <nav className="mb-6 flex overflow-x-auto rounded-xl border border-subtle bg-surface p-1">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap",
              activeTab === id
                ? "bg-elevated text-primary shadow-sm"
                : "text-muted hover:text-secondary"
            )}
            aria-selected={activeTab === id}
            role="tab"
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden text-xs">{label}</span>
          </button>
        ))}
      </nav>

      {/* Tab content */}
      <div role="tabpanel">
        {activeTab === "today" && <TodayView key={`today-${refreshKey}`} />}
        {activeTab === "history" && <HistoryView key={`history-${refreshKey}`} />}
        {activeTab === "analytics" && <AnalyticsView key={`analytics-${refreshKey}`} />}
        {activeTab === "settings" && (
          <div className="space-y-6">
            <SettingsView key={`settings-${refreshKey}`} />
            {/* Connections section */}
            <div className="rounded-xl border border-subtle bg-surface p-4">
              <h3 className="mb-1 text-sm font-semibold text-primary">Connections</h3>
              <p className="mb-3 text-xs text-muted">
                Connect Telegram to log meals by sending a message to the bot.
              </p>
              <ConnectTelegram />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
