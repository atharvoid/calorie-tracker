"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, Save } from "lucide-react"
import { toast } from "sonner"
import { Panel } from "@/components/ui/panel"
import { Button } from "@/components/ui/button"

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
    </div>
  )
}
