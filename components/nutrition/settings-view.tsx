"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, Save, CreditCard, Send, FileSpreadsheet, Download, LogOut } from "lucide-react"
import { toast } from "sonner"
import { Panel } from "@/components/ui/panel"
import { Button } from "@/components/ui/button"
import { SheetPanel } from "../sheet-panel"
import { ConnectTelegram } from "../connect-telegram"
import { signOutAction } from "../auth-actions"

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

type Settings = {
  maintenanceKcal: number | null
  targetKcal: number | null
  proteinTargetG: string | number | null
  carbsTargetG: string | number | null
  fatTargetG: string | number | null
  targetToleranceKcal: number | null
  timezone: string
}

type ApiResponse = { settings: Settings | null }

const TIMEZONES = [
  "Asia/Kolkata",
  "Asia/Mumbai",
  "UTC",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/London",
]

function parseNum(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export function SettingsView() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [form, setForm] = useState<{
    maintenanceKcal: string
    targetKcal: string
    proteinTargetG: string
    timezone: string
  }>({
    maintenanceKcal: "",
    targetKcal: "",
    proteinTargetG: "",
    timezone: "Asia/Kolkata",
  })

  const [billing, setBilling] = useState<EntitlementStatus | null>(null)
  const [billingLoading, setBillingLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

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
  }, [loadBilling])

  async function handleUpgrade(plan: "monthly" | "annual") {
    setActionLoading(true)
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        toast.error(data.error || "Failed to trigger checkout")
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to upgrade")
    } finally {
      setActionLoading(false)
    }
  }

  async function handleManage() {
    setActionLoading(true)
    try {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        toast.error(data.error || "Failed to trigger portal")
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to load portal")
    } finally {
      setActionLoading(false)
    }
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/nutrition/settings")
      if (!res.ok) return
      const json = await res.json() as ApiResponse
      const s = json.settings
      if (s) {
        setForm({
          maintenanceKcal: s.maintenanceKcal !== null ? String(s.maintenanceKcal) : "",
          targetKcal: s.targetKcal !== null ? String(s.targetKcal) : "",
          proteinTargetG: s.proteinTargetG !== null ? String(parseNum(s.proteinTargetG) ?? "") : "",
          timezone: s.timezone ?? "Asia/Kolkata",
        })
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function handleSave() {
    const maintenance = parseNum(form.maintenanceKcal)
    const target = parseNum(form.targetKcal)
    const protein = parseNum(form.proteinTargetG)

    if (maintenance !== null && (maintenance < 800 || maintenance > 8000)) {
      toast.error("Maintenance calories must be between 800 and 8000")
      return
    }
    if (target !== null && (target < 800 || target > 8000)) {
      toast.error("Target calories must be between 800 and 8000")
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/api/nutrition/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maintenanceKcal: maintenance,
          targetKcal: target,
          proteinTargetG: protein,
          timezone: form.timezone,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: { message?: string } }
        throw new Error(body?.error?.message ?? "Save failed")
      }
      toast.success("Settings saved")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  const handleExportData = async () => {
    setExporting(true)
    try {
      const todayStr = new Date().toISOString().split("T")[0]
      const start = new Date()
      start.setDate(start.getDate() - 365)
      const startStr = start.toISOString().split("T")[0]

      const res = await fetch(`/api/nutrition/history?start=${startStr}&end=${todayStr}&sort=oldest&status=logged`)
      if (!res.ok) throw new Error("Export failed")
      const json = await res.json()
      
      const blob = new Blob([JSON.stringify(json.summaries, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `calorie_tracker_export_${todayStr}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success("Meal history exported successfully")
    } catch (err: any) {
      toast.error(err.message || "Failed to export data")
    } finally {
      setExporting(false)
    }
  }

  const maintenance = parseNum(form.maintenanceKcal)
  const target = parseNum(form.targetKcal)
  const diff = maintenance !== null && target !== null ? target - maintenance : null

  if (loading) {
    return (
      <Panel className="flex h-48 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-accent" />
      </Panel>
    )
  }

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      {/* Nutrition Goals Section */}
      <Panel>
        <h2 className="mb-1 text-base font-bold text-primary">Nutrition Goals</h2>
        <p className="mb-4 text-xs text-muted leading-relaxed">
          Maintenance is your reference intake (energy balance). Target is your planned daily intake.
          <br />
          <span className="italic">This is not medical advice.</span>
        </p>

        <div className="space-y-4">
          {/* Maintenance kcal */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-secondary" htmlFor="maintenance">
              Maintenance calories
            </label>
            <div className="relative flex items-center">
              <input
                id="maintenance"
                type="number"
                inputMode="numeric"
                min={800}
                max={8000}
                placeholder="e.g. 2200"
                value={form.maintenanceKcal}
                onChange={(e) => setForm({ ...form, maintenanceKcal: e.target.value })}
                className="w-full rounded-lg border border-subtle bg-elevated pl-3 pr-20 py-2 text-base text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <span className="absolute right-3 text-xs text-muted font-medium pointer-events-none">
                kcal / day
              </span>
            </div>
          </div>

          {/* Target kcal */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-secondary" htmlFor="target">
              Target calories
            </label>
            <div className="relative flex items-center">
              <input
                id="target"
                type="number"
                inputMode="numeric"
                min={800}
                max={8000}
                placeholder="e.g. 1900"
                value={form.targetKcal}
                onChange={(e) => setForm({ ...form, targetKcal: e.target.value })}
                className="w-full rounded-lg border border-subtle bg-elevated pl-3 pr-20 py-2 text-base text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <span className="absolute right-3 text-xs text-muted font-medium pointer-events-none">
                kcal / day
              </span>
            </div>
          </div>

          {/* Live preview */}
          {diff !== null && (
            <p className="text-xs text-secondary font-medium px-1">
              {diff < 0
                ? `Target is ${Math.abs(diff)} kcal below maintenance (deficit goal)`
                : diff > 0
                ? `Target is ${diff} kcal above maintenance (surplus goal)`
                : "Target equals maintenance (maintenance goal)"}
            </p>
          )}

          {/* Protein target (optional) */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-secondary" htmlFor="protein">
              Protein target (optional)
            </label>
            <div className="relative flex items-center">
              <input
                id="protein"
                type="number"
                inputMode="numeric"
                min={0}
                max={500}
                placeholder="e.g. 140"
                value={form.proteinTargetG}
                onChange={(e) => setForm({ ...form, proteinTargetG: e.target.value })}
                className="w-full rounded-lg border border-subtle bg-elevated pl-3 pr-20 py-2 text-base text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <span className="absolute right-3 text-xs text-muted font-medium pointer-events-none">
                g / day
              </span>
            </div>
          </div>

          <div className="pt-2">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full md:w-auto flex items-center justify-center gap-2 cursor-pointer"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? "Saving…" : "Save Goals"}
            </Button>
          </div>
        </div>
      </Panel>

      {/* Daily Preferences Section */}
      <Panel>
        <h2 className="mb-1 text-base font-bold text-primary">Daily Preferences</h2>
        <p className="mb-4 text-xs text-muted">Configure default timezone settings for meal log timestamp alignment.</p>
        
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-secondary" htmlFor="timezone">
              Timezone
            </label>
            <select
              id="timezone"
              value={form.timezone}
              onChange={(e) => setForm({ ...form, timezone: e.target.value })}
              className="w-full rounded-lg border border-subtle bg-elevated px-3 py-2 text-base text-primary focus:outline-none focus:ring-2 focus:ring-accent animate-none"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>

          <div className="pt-2">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full md:w-auto flex items-center justify-center gap-2 cursor-pointer"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? "Saving…" : "Save Preferences"}
            </Button>
          </div>
        </div>
      </Panel>

      {/* Telegram Connection Section */}
      <Panel>
        <h2 className="mb-1 text-base font-bold text-primary flex items-center gap-2">
          <Send className="h-4.5 w-4.5 text-accent" />
          Telegram Bot Log
        </h2>
        <p className="mb-4 text-xs text-muted leading-relaxed">
          Connect your Telegram account to instantly log meals using natural language descriptions directly with the bot.
        </p>
        <div className="border border-subtle/30 bg-elevated/20 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-secondary">
            <span className="font-semibold text-primary block">Integration Status</span>
            Syncs logged messages to your database live.
          </div>
          <ConnectTelegram />
        </div>
      </Panel>

      {/* Google Sheets Sync Section */}
      <Panel>
        <h2 className="mb-1 text-base font-bold text-primary flex items-center gap-2">
          <FileSpreadsheet className="h-4.5 w-4.5 text-accent" />
          Google Sheets Sync
        </h2>
        <p className="mb-4 text-xs text-muted leading-relaxed">
          Enable Google Sheets integration to mirror your meal details into a spreadsheet in your personal Google Drive account.
        </p>
        <SheetPanel />
      </Panel>

      {/* Subscription & Billing Section */}
      <Panel className="flex flex-col gap-4">
        <div>
          <h2 className="text-base font-bold text-primary flex items-center gap-2">
            <CreditCard className="h-4.5 w-4.5 text-accent" />
            Subscription & Billing
          </h2>
          <p className="text-xs text-secondary mt-1">Manage your active plans, usage counts, and upgrades.</p>
        </div>

        {billingLoading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted" />
          </div>
        ) : billing ? (
          <div className="space-y-4 text-sm text-secondary">
            <div className="flex items-center justify-between border-b border-subtle pb-3">
              <span>Status</span>
              <span className="font-bold text-primary capitalize">{billing.accessState.replace("_", " ")}</span>
            </div>

            {billing.accessState === "pre_trial" && (
              <p className="text-xs leading-relaxed text-muted">
                Your 7-day free trial has not started yet. It begins automatically when you log your first meal.
              </p>
            )}

            {billing.accessState === "trial" && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span>Trial usage</span>
                  <span className="text-primary">{billing.trialAiLogsUsed} of {billing.trialAiLogLimit} meal logs used</span>
                </div>
                {billing.trialEndsAt && (
                  <p className="text-xs text-muted">
                    Your trial ends on {new Date(billing.trialEndsAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}

            {billing.accessState === "expired" && (
              <p className="text-xs text-danger leading-relaxed font-semibold">
                Your trial is complete. Your meal history is still available. Upgrade to keep adding meals from the web or Telegram.
              </p>
            )}

            {(billing.accessState === "expired" || billing.accessState === "pre_trial" || billing.accessState === "trial") && (
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    disabled={actionLoading}
                    onClick={() => handleUpgrade("monthly")}
                    className="rounded-btn border border-subtle bg-elevated px-4 py-2.5 text-center text-xs font-bold text-primary hover:bg-surface focus:outline-none transition-colors cursor-pointer"
                  >
                    Monthly ($2.99)
                  </button>
                  <button
                    disabled={actionLoading}
                    onClick={() => handleUpgrade("annual")}
                    className="rounded-btn bg-accent text-[color:var(--accent-contrast)] px-4 py-2.5 text-center text-xs font-bold hover:bg-accent-hover focus:outline-none transition-all cursor-pointer"
                  >
                    Annual ($24.00)
                  </button>
                </div>
                <p className="text-[10px] text-muted text-center leading-relaxed">
                  Both plans include unlimited meals on the web, 25 daily AI Telegram logs, custom targets, Google Sheets sync, and full data export.
                </p>
              </div>
            )}

            {(billing.accessState === "active" || billing.accessState === "grace") && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span>Active subscription status:</span>
                  <span className="text-accent uppercase font-bold">{billing.subscriptionStatus}</span>
                </div>
                {billing.subscriptionEnd && (
                  <div className="flex items-center justify-between text-xs">
                    <span>Renewal date:</span>
                    <span>{new Date(billing.subscriptionEnd).toLocaleDateString()}</span>
                  </div>
                )}
                <button
                  disabled={actionLoading}
                  onClick={handleManage}
                  className="w-full rounded-btn border border-subtle bg-elevated px-4 py-2.5 text-center text-xs font-bold text-primary hover:bg-surface focus:outline-none transition-colors cursor-pointer"
                >
                  Manage Subscription
                </button>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-danger">Failed to load billing status.</p>
        )}
      </Panel>

      {/* Account and Data Section (Separate Destructive Action Section) */}
      <Panel className="flex flex-col gap-4">
        <div>
          <h2 className="text-base font-bold text-primary">Account & Data</h2>
          <p className="text-xs text-secondary mt-1">Export your meal records or sign out of your tracker account.</p>
        </div>
        <div className="flex flex-col gap-3 pt-2">
          <button
            onClick={handleExportData}
            disabled={exporting}
            className="w-full rounded-btn border border-subtle bg-elevated px-4 py-2.5 text-center text-xs font-bold text-primary hover:bg-surface focus:outline-none transition-colors cursor-pointer flex items-center justify-center gap-1.5 h-10"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {exporting ? "Exporting…" : "Export Logged Meals (JSON)"}
          </button>
          
          <form action={signOutAction} className="w-full">
            <button
              type="submit"
              className="w-full rounded-btn border border-danger/25 bg-danger/5 px-4 py-2.5 text-center text-xs font-bold text-danger hover:bg-danger/10 focus:outline-none transition-colors cursor-pointer flex items-center justify-center gap-1.5 h-10"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </form>
        </div>
      </Panel>
    </div>
  )
}
