"use client"

import { useCallback, useEffect, useState, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { BarChart2, Clock, Settings, Utensils, Plus, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { RealtimeListener } from "@/components/realtime-listener"
import { TodayView } from "./today-view"
import { HistoryView } from "./history-view"
import { AnalyticsView } from "./analytics-view"
import { SettingsView } from "./settings-view"
import { PaywallAlert } from "./paywall-alert"
import Link from "next/link"
import { signOutAction } from "@/components/auth-actions"
import { getActiveExperience } from "@/lib/experience-mode"
import { ThemeToggle } from "@/components/theme-toggle"

type Tab = "today" | "history" | "analytics" | "settings"

const TABS: { id: Tab; label: string; Icon: React.FC<{ className?: string }> }[] = [
  { id: "today", label: "Today", Icon: Utensils },
  { id: "history", label: "History", Icon: Clock },
  { id: "analytics", label: "Analytics", Icon: BarChart2 },
  { id: "settings", label: "Settings", Icon: Settings },
]

type EntitlementStatus = {
  accessState: "pre_trial" | "trial" | "active" | "grace" | "expired" | "blocked"
  trialStartedAt: string | null
  trialEndsAt: string | null
  trialAiLogsUsed: number
  trialAiLogLimit: number
  paidAiLogsToday: number
  paidAiLogDate: string | null
  subscriptionStatus: string | null
  subscriptionEnd: string | null
}

type Props = {
  userId: string
  user?: {
    name?: string | null
    email?: string | null
    image?: string | null
  }
}

export function NutritionShell({ userId, user }: Props) {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<Tab>(() => {
    if (typeof window !== "undefined") {
      const tab = new URLSearchParams(window.location.search).get("tab") as Tab | null
      if (tab && TABS.some((t) => t.id === tab)) return tab
    }
    const tabParam = searchParams.get("tab") as Tab | null
    return TABS.some((t) => t.id === tabParam) ? (tabParam as Tab) : "today"
  })

  // Sync back/forward button clicks
  useEffect(() => {
    const handlePopState = () => {
      const tab = new URLSearchParams(window.location.search).get("tab") as Tab | null
      if (tab && TABS.some((t) => t.id === tab)) {
        setActiveTab(tab)
      } else {
        setActiveTab("today")
      }
    }
    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  const handleTabChange = useCallback((id: Tab) => {
    setActiveTab(id)
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      params.set("tab", id)
      window.history.replaceState(null, "", `?${params.toString()}`)
    }
  }, [])

  const [refreshKey, setRefreshKey] = useState(0)
  const [billing, setBilling] = useState<EntitlementStatus | null>(null)
  const [billingLoading, setBillingLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const loadBilling = useCallback(async () => {
    try {
      const res = await fetch("/api/billing/status")
      if (res.ok) {
        const data = await res.json()
        setBilling(data)
      }
    } catch (e) {
      console.error("Failed to load billing status", e)
    } finally {
      setBillingLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadBilling()
  }, [loadBilling, searchParams])

  const handleNutritionChanged = useCallback(() => {
    setRefreshKey((k) => k + 1)
    void loadBilling()
  }, [loadBilling])

  // Listen for local browser events to trigger instant updates across components
  useEffect(() => {
    const handler = () => {
      handleNutritionChanged()
    }
    window.addEventListener("local_nutrition_changed", handler)
    return () => {
      window.removeEventListener("local_nutrition_changed", handler)
    }
  }, [handleNutritionChanged])

  // Close avatar menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const experience = getActiveExperience(searchParams)
  const isImprint = experience === "imprint"

  // Apply warm-paper theme to document.documentElement so Radix portals, toasts,
  // date pickers and billing modals inherit the correct tokens.
  // Ownership-safe: saves and restores the previous attribute value on cleanup.
  useEffect(() => {
    const previous = document.documentElement.dataset.experience

    if (isImprint) {
      document.documentElement.dataset.experience = "imprint"
    } else {
      delete document.documentElement.dataset.experience
    }

    return () => {
      if (previous !== undefined) {
        document.documentElement.dataset.experience = previous
      } else {
        delete document.documentElement.dataset.experience
      }
    }
  }, [isImprint])


  const rawTabTitle = TABS.find((t) => t.id === activeTab)?.label ?? "Calorie Tracker"
  const tabTitle = isImprint && activeTab === "analytics" ? "Patterns" : rawTabTitle

  return (
    <div className={cn("w-full pb-mobile-nav md:pb-0", isImprint && "theme-imprint")}>
      <RealtimeListener userId={userId} onNutritionChanged={handleNutritionChanged} />

      {/* Mobile-only Header */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between border-b border-subtle bg-surface/90 backdrop-blur-md px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <Link href="/?tab=today" className="flex items-center gap-1.5 focus:outline-none hover:opacity-90">
            <span className="text-sm font-semibold tracking-tight text-primary">
              Calorie <span className="text-accent">Tracker</span>
            </span>
            <span className="text-muted-foreground text-xs font-medium px-1.5 py-0.5 rounded bg-elevated">
              {tabTitle}
            </span>
          </Link>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {activeTab === "today" && (
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("open_meal_composer"))}
              className="rounded-full bg-accent/15 p-1.5 text-accent hover:bg-accent/25 focus:outline-none"
              aria-label="Add meal"
            >
              <Plus className="h-4 w-4" />
            </button>
          )}

          {/* User profile dropdown */}
          {user && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center rounded-full focus:outline-none"
                aria-label="Open user menu"
                aria-expanded={menuOpen}
              >
                {user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.image}
                    alt={user.name ?? ""}
                    className="h-7 w-7 rounded-full border border-subtle ring-1 ring-accent/20"
                  />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full border border-subtle bg-elevated text-xs font-semibold text-primary">
                    {(user.name ?? user.email ?? "?")[0].toUpperCase()}
                  </div>
                )}
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 z-50 w-56 rounded-xl border border-subtle bg-elevated p-2 shadow-xl animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-2 border-b border-subtle/50 mb-1">
                    <p className="text-xs font-semibold text-primary truncate">{user.name}</p>
                    <p className="text-[10px] text-muted truncate">{user.email}</p>
                  </div>
                  <form action={signOutAction} className="w-full">
                    <button
                      type="submit"
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-secondary hover:text-danger hover:bg-surface transition-colors text-left"
                    >
                      <LogOut className="h-3.5 w-3.5" /> Sign out
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Trial / Expiry Banner */}
      {!billingLoading && billing && (
        <div className="mt-4 px-2 md:px-0">
          {billing.accessState === "trial" && (
            <div className="mb-4 flex items-center justify-between rounded-lg border border-accent/25 bg-accent/5 px-4 py-2 text-xs text-secondary">
              <span>
                <strong>Free Trial:</strong> {billing.trialAiLogsUsed} of {billing.trialAiLogLimit} meal logs used.
              </span>
              <button
                onClick={() => handleTabChange("settings")}
                className="font-semibold text-accent hover:underline focus:outline-none cursor-pointer bg-transparent border-0"
              >
                Upgrade plan
              </button>
            </div>
          )}
          {billing.accessState === "expired" && (
            <div className="mb-4 flex items-center justify-between rounded-lg border border-danger/25 bg-danger/5 px-4 py-2 text-xs text-secondary">
              <span>
                <strong>Trial Completed:</strong> Your free trial has ended. Upgrade to continue adding meals.
              </span>
              <button
                onClick={() => handleTabChange("settings")}
                className="font-semibold text-danger hover:underline focus:outline-none cursor-pointer bg-transparent border-0"
              >
                Upgrade now
              </button>
            </div>
          )}
        </div>
      )}

      {/* Desktop navigation only */}
      <nav className="mb-6 hidden md:flex overflow-x-auto rounded-xl border border-subtle bg-surface p-1">
        {TABS.map(({ id, label, Icon }) => {
          const displayLabel = isImprint && id === "analytics" ? "Patterns" : label
          return (
            <button
              key={id}
              onClick={() => handleTabChange(id)}
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
              <span className="hidden sm:inline">{displayLabel}</span>
              <span className="sm:hidden text-xs">{displayLabel}</span>
            </button>
          )
        })}
      </nav>

      {/* Tab content */}
      <div role="tabpanel" className="px-2 md:px-0 mt-4 md:mt-0">
        <div className={cn(activeTab === "today" ? "animate-tab-enter space-y-4" : "hidden")}>
          {billing && (billing.accessState === "expired" || billing.accessState === "blocked") && (
            <PaywallAlert
              trialUsed={billing.trialAiLogsUsed}
              trialLimit={billing.trialAiLogLimit}
              isLimitReached={billing.trialAiLogsUsed >= billing.trialAiLogLimit}
            />
          )}
          <TodayView refreshKey={refreshKey} />
        </div>

        <div className={cn(activeTab === "history" ? "animate-tab-enter" : "hidden")}>
          <HistoryView refreshKey={refreshKey} />
        </div>

        <div className={cn(activeTab === "analytics" ? "animate-tab-enter" : "hidden")}>
          <AnalyticsView refreshKey={refreshKey} />
        </div>

        <div className={cn(activeTab === "settings" ? "animate-tab-enter space-y-6" : "hidden")}>
          <SettingsView refreshKey={refreshKey} />
        </div>
      </div>

      {/* Mobile-only Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-subtle bg-surface/90 backdrop-blur-md pb-safe-bottom">
        <div className="flex h-14 items-center justify-around">
          {TABS.map(({ id, label, Icon }) => {
            const active = activeTab === id
            const displayLabel = isImprint && id === "analytics" ? "Patterns" : label
            return (
              <button
                key={id}
                onClick={() => handleTabChange(id)}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-colors focus:outline-none",
                  active ? "text-accent font-semibold" : "text-muted hover:text-secondary"
                )}
                aria-selected={active}
                role="tab"
              >
                <div className={cn(
                  "flex items-center justify-center px-4 py-1.5 rounded-full transition-all duration-200",
                  active ? "bg-accent/15 text-accent" : "text-muted"
                )}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-[10px] tracking-wide mt-0.5">{displayLabel}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
