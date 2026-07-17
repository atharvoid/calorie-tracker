"use client"

import { useState } from "react"
import { Loader2, Sparkles, X, Check, AlertCircle } from "lucide-react"
import { Panel } from "@/components/ui/panel"
import { formatShortDate } from "@/lib/nutrition-date"
import type { NutritionResult } from "@/lib/nutrition"

type CommitNutritionResult = {
  rowCount: number
  date: string
  spreadsheetId: string
  syncWarning?: string
  insertedIds: string[]
}

type MealComposerProps = {
  logDate: string
  sourceContext: "today" | "history"
  onCommitted: (result: CommitNutritionResult) => void
  onCancel: () => void
}

export function MealComposer({
  logDate,
  sourceContext,
  onCommitted,
  onCancel,
}: MealComposerProps) {
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<NutritionResult | null>(null)
  const [committing, setCommitting] = useState(false)

  const formattedDate = formatShortDate(logDate)

  async function handleEstimate() {
    if (!text.trim()) return
    setLoading(true)
    setError(null)
    setPreview(null)
    try {
      const res = await fetch("/api/nutrition/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, logDate }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to extract nutrition estimate")
      }
      setPreview(data)
    } catch (err: any) {
      setError(err.message || "Failed to parse meal description")
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!preview) return
    setCommitting(true)
    setError(null)
    try {
      const res = await fetch("/api/nutrition/day", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nutrition: preview, logDate }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to save meals")
      }
      onCommitted(data)
    } catch (err: any) {
      setError(err.message || "Failed to save meals")
    } finally {
      setCommitting(false)
    }
  }

  return (
    <Panel className="relative border border-accent/20 shadow-md">
      <button
        onClick={onCancel}
        className="absolute right-4 top-4 rounded-lg p-1.5 text-muted hover:text-primary hover:bg-elevated"
        aria-label="Cancel"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="mb-4">
        <h3 className="text-base font-semibold text-primary">
          Log meal for {formattedDate}
        </h3>
        <p className="text-xs text-muted">
          Describe what you ate in natural language (English, Hinglish).
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={loading || committing}
            placeholder="e.g. 2 fried eggs with 2 slices of whole wheat toast and a cup of black coffee for breakfast"
            className="w-full min-h-[100px] rounded-lg border border-subtle bg-surface p-3 text-sm text-primary placeholder-muted focus:border-accent focus:outline-none disabled:opacity-50"
          />
        </div>

        {error && (
          <div className="flex gap-2 rounded-lg bg-danger/5 border border-danger/25 p-3 text-xs text-danger">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {preview && (
          <div className="rounded-lg border border-subtle bg-elevated/10 p-4 space-y-4">
            <div className="border-b border-subtle pb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                Nutrition Estimate Preview
              </span>
              <span className="text-xs text-accent">
                Target date: <span className="font-semibold">{logDate}</span>
              </span>
            </div>

            <div className="space-y-4">
              {preview.meals.map((meal, mIdx) => (
                <div key={mIdx} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-primary">
                      {meal.meal_type || "Other"}
                    </span>
                    {meal.time_hint && (
                      <span className="text-[10px] text-muted font-medium bg-elevated px-1.5 py-0.5 rounded">
                        {meal.time_hint}
                      </span>
                    )}
                  </div>

                  <ul className="space-y-1">
                    {meal.items.map((item, iIdx) => (
                      <li
                        key={iIdx}
                        className="text-xs text-secondary flex flex-col sm:flex-row sm:items-center justify-between border-b border-subtle/50 pb-1 last:border-0"
                      >
                        <div className="flex flex-col">
                          <span className="font-medium text-primary">
                            {item.name}
                            {item.grams != null && (
                              <span className="text-muted text-[10px] ml-1">
                                ({item.grams}g)
                              </span>
                            )}
                          </span>
                          {item.notes && (
                            <span className="text-[10px] text-muted italic">
                              {item.notes}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 font-mono text-[11px] mt-1 sm:mt-0">
                          <span className="text-primary font-semibold">
                            {item.kcal} kcal
                          </span>
                          <span className="text-muted">
                            P {item.protein_g}g | C {item.carbs_g}g | F {item.fat_g}g
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="border-t border-subtle pt-3 flex flex-wrap items-center justify-between text-xs font-semibold text-primary font-mono bg-elevated/20 p-2.5 rounded-lg">
              <span>Extracted Totals:</span>
              <div className="flex gap-3">
                <span className="text-primary">
                  {preview.meals.reduce(
                    (acc, m) => acc + m.items.reduce((s, it) => s + it.kcal, 0),
                    0
                  )}{" "}
                  kcal
                </span>
                <span className="text-muted">
                  P{" "}
                  {Math.round(
                    preview.meals.reduce(
                      (acc, m) =>
                        acc + m.items.reduce((s, it) => s + it.protein_g, 0),
                      0
                    )
                  )}
                  g | C{" "}
                  {Math.round(
                    preview.meals.reduce(
                      (acc, m) =>
                        acc + m.items.reduce((s, it) => s + it.carbs_g, 0),
                      0
                    )
                  )}
                  g | F{" "}
                  {Math.round(
                    preview.meals.reduce(
                      (acc, m) => acc + m.items.reduce((s, it) => s + it.fat_g, 0),
                      0
                    )
                  )}
                  g
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 justify-end pt-2 border-t border-subtle">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading || committing}
            className="rounded-lg border border-subtle bg-surface px-4 py-2 text-xs font-semibold text-secondary hover:text-primary hover:bg-elevated disabled:opacity-50"
          >
            Cancel
          </button>

          {!preview ? (
            <button
              type="button"
              onClick={handleEstimate}
              disabled={loading || !text.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white hover:bg-accent-hover disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              Estimate
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSave}
              disabled={committing}
              className="flex items-center gap-1.5 rounded-lg bg-paid px-4 py-2 text-xs font-semibold text-white hover:bg-paid-hover disabled:opacity-50 cursor-pointer"
            >
              {committing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              Confirm & Save to {logDate}
            </button>
          )}
        </div>
      </div>
    </Panel>
  )
}
