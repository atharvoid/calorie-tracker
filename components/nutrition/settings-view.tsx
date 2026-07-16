"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, Save, CreditCard } from "lucide-react"
import { toast } from "sonner"
import { Panel } from "@/components/ui/panel"
import { Button } from "@/components/ui/button"

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
    <div className="space-y-4">
      <Panel>
        <h2 className="mb-1 text-base font-semibold text-primary">Nutrition Goals</h2>
        <p className="mb-4 text-xs text-muted">
          Maintenance is your reference intake (energy balance). Target is your planned daily intake.
          <br />
          <span className="italic">This is not medical advice.</span>
        </p>

        <div className="space-y-4">
          {/* Maintenance kcal */}
          <div>
            <label className="mb-1 block text-xs font-medium text-secondary" htmlFor="maintenance">
              Maintenance calories (kcal / day)
            </label>
            <input
              id="maintenance"
              type="number"
              min={800}
              max={8000}
              placeholder="e.g. 2200"
              value={form.maintenanceKcal}
              onChange={(e) => setForm({ ...form, maintenanceKcal: e.target.value })}
              className="w-full rounded-lg border border-subtle bg-elevated px-3 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {/* Target kcal */}
          <div>
            <label className="mb-1 block text-xs font-medium text-secondary" htmlFor="target">
              Target calories (kcal / day)
            </label>
            <input
              id="target"
              type="number"
              min={800}
              max={8000}
              placeholder="e.g. 1900"
              value={form.targetKcal}
              onChange={(e) => setForm({ ...form, targetKcal: e.target.value })}
              className="w-full rounded-lg border border-subtle bg-elevated px-3 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {/* Live preview */}
          {diff !== null && (
            <p className="text-xs text-secondary">
              {diff < 0
                ? `Target is ${Math.abs(diff)} kcal below maintenance (deficit goal)`
                : diff > 0
                ? `Target is ${diff} kcal above maintenance (surplus goal)`
                : "Target equals maintenance (maintenance goal)"}
            </p>
          )}

          {/* Protein target (optional) */}
          <div>
            <label className="mb-1 block text-xs font-medium text-secondary" htmlFor="protein">
              Protein target (g / day) — optional
            </label>
            <input
              id="protein"
              type="number"
              min={0}
              max={500}
              placeholder="e.g. 140"
              value={form.proteinTargetG}
              onChange={(e) => setForm({ ...form, proteinTargetG: e.target.value })}
              className="w-full rounded-lg border border-subtle bg-elevated px-3 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {/* Timezone */}
          <div>
            <label className="mb-1 block text-xs font-medium text-secondary" htmlFor="timezone">
              Timezone
            </label>
            <select
              id="timezone"
              value={form.timezone}
              onChange={(e) => setForm({ ...form, timezone: e.target.value })}
              className="w-full rounded-lg border border-subtle bg-elevated px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving…" : "Save Settings"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => void load()}
              disabled={saving}
            >
              Reset
            </Button>
          </div>
        </div>
      </Panel>

      {/* Subscription & Billing Panel */}
      <Panel className="flex flex-col gap-4">
        <div>
          <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-accent" />
            Subscription & Billing
          </h3>
          <p className="text-xs text-secondary mt-1">Manage your trial and active subscription plans.</p>
        </div>

        {billingLoading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted" />
          </div>
        ) : billing ? (
          <div className="space-y-4 text-sm text-secondary">
            <div className="flex items-center justify-between border-b border-subtle pb-3">
              <span>Status</span>
              <span className="font-semibold text-primary capitalize">{billing.accessState.replace("_", " ")}</span>
            </div>

            {billing.accessState === "pre_trial" && (
              <p className="text-xs leading-relaxed">
                Your 7-day free trial has not started yet. It begins automatically when you log your first meal.
              </p>
            )}

            {billing.accessState === "trial" && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>Trial usage</span>
                  <span className="font-semibold text-primary">{billing.trialAiLogsUsed} of {billing.trialAiLogLimit} meal logs used</span>
                </div>
                {billing.trialEndsAt && (
                  <p className="text-xs text-muted">
                    Your trial ends on {new Date(billing.trialEndsAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}

            {billing.accessState === "expired" && (
              <p className="text-xs text-danger leading-relaxed">
                Your trial is complete. Your meal history is still available. Upgrade to keep adding meals from the web or Telegram.
              </p>
            )}

            {(billing.accessState === "expired" || billing.accessState === "pre_trial" || billing.accessState === "trial") && (
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    disabled={actionLoading}
                    onClick={() => handleUpgrade("monthly")}
                    className="rounded-btn border border-subtle bg-elevated px-4 py-2.5 text-center text-xs font-semibold text-primary hover:bg-surface focus:outline-none transition-colors cursor-pointer"
                  >
                    Monthly ($2.99)
                  </button>
                  <button
                    disabled={actionLoading}
                    onClick={() => handleUpgrade("annual")}
                    className="rounded-btn bg-accent text-[color:var(--accent-contrast)] px-4 py-2.5 text-center text-xs font-semibold hover:bg-accent-hover focus:outline-none transition-all cursor-pointer"
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
                <div className="flex items-center justify-between text-xs">
                  <span>Active subscription status:</span>
                  <span className="font-semibold text-accent uppercase">{billing.subscriptionStatus}</span>
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
                  className="w-full rounded-btn border border-subtle bg-elevated px-4 py-2.5 text-center text-xs font-semibold text-primary hover:bg-surface focus:outline-none transition-colors cursor-pointer"
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
    </div>
  )
}
