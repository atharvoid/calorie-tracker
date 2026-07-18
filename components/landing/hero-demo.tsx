"use client"

import { useState } from "react"
import { Sparkles, Check, ChevronRight } from "lucide-react"
import { DayImprint } from "../imprint/day-imprint"
import type { DailyNutritionSummary, MealGroupDTO } from "@/lib/nutrition-types"

const SAMPLE_LOG = "2 boiled eggs, a slice of whole wheat toast, and 100g greek yogurt"

export function HeroDemo() {
  const [step, setStep] = useState<"input" | "extracted" | "saved">("input")
  const [inputText, setInputText] = useState("")

  const handleEstimate = () => {
    setInputText(SAMPLE_LOG)
    setStep("extracted")
  }

  // Pre-configured draft mock data
  const summary: DailyNutritionSummary = {
    date: "2026-07-18",
    totals: { kcal: 260, proteinG: 22, carbsG: 19, fatG: 10, itemCount: 3 },
    goal: {
      date: "2026-07-18",
      targetKcal: 2000,
      maintenanceKcal: 2500,
      proteinTargetG: 140,
      carbsTargetG: 220,
      fatTargetG: 65,
      toleranceKcal: null,
      source: "default",
    },
    remainingToTarget: 1740,
    targetDelta: -1740,
    maintenanceBalance: -2240,
    status: "under",
    mealCount: 1,
    assumptionCount: 0,
  }

  const mealGroups: MealGroupDTO[] = [
    {
      mealType: "Breakfast",
      timeHint: "08:30",
      items: [
        {
          id: "egg",
          name: "Boiled Eggs",
          grams: 100,
          kcal: 140,
          proteinG: 12,
          carbsG: 0,
          fatG: 10,
          notes: "Assumed 2 eggs",
          source: "web",
          createdAt: "2026-07-18T08:30:00Z",
        },
        {
          id: "toast",
          name: "Whole Wheat Toast",
          grams: 30,
          kcal: 60,
          proteinG: 2,
          carbsG: 15,
          fatG: 0,
          notes: "Assumed 1 slice",
          source: "web",
          createdAt: "2026-07-18T08:30:00Z",
        },
        {
          id: "yogurt",
          name: "Greek Yogurt",
          grams: 100,
          kcal: 60,
          proteinG: 8,
          carbsG: 4,
          fatG: 0,
          notes: "Assumed plain low fat",
          source: "web",
          createdAt: "2026-07-18T08:30:00Z",
        },
      ],
      subtotal: { kcal: 260, proteinG: 22, carbsG: 19, fatG: 10, itemCount: 3 },
    },
  ]

  return (
    <div className="mx-auto max-w-xl border border-subtle bg-surface rounded-xl overflow-hidden shadow-2xl transition-all duration-300">
      <div className="p-4 border-b border-subtle bg-surface/40 flex items-center justify-between text-xs font-mono">
        <span className="text-secondary">Interactive Demo</span>
        <span className="text-accent font-bold">Step {step === "input" ? "1" : step === "extracted" ? "2" : "3"} of 3</span>
      </div>

      <div className="p-5 space-y-4">
        {step === "input" && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-secondary mb-1.5 font-mono">What did you eat today?</label>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type here or click the sample below…"
                className="w-full h-20 rounded-lg border border-subtle bg-elevated px-3 py-2 text-sm text-primary focus:outline-none focus:ring-1 focus:ring-accent resize-none placeholder-muted/60"
                disabled
              />
            </div>

            <button
              onClick={handleEstimate}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-accent text-[color:var(--accent-contrast)] px-4 py-2.5 text-sm font-bold hover:bg-accent-hover transition-colors cursor-pointer"
            >
              <Sparkles className="h-4 w-4" /> Try Sample Log
            </button>
            <p className="text-[10px] text-muted text-center font-mono italic">
              Sample: &ldquo;{SAMPLE_LOG}&rdquo;
            </p>
          </div>
        )}

        {step === "extracted" && (
          <div className="space-y-4">
            <div className="border border-dashed border-accent/40 rounded-lg p-3.5 bg-surface text-primary shadow-sm">
              <span className="inline-block border border-accent/30 bg-accent/10 px-2 py-0.5 text-[9px] font-bold text-accent font-mono uppercase tracking-wider rounded-md mb-2">
                Draft Imprint forming
              </span>
              <p className="text-xs font-sans font-semibold text-primary leading-relaxed mb-3">&ldquo;{SAMPLE_LOG}&rdquo;</p>
              
              {/* Draft Foods List */}
              <div className="space-y-2 border-t border-subtle/40 pt-2 text-xs">
                {mealGroups[0].items.map((item) => (
                  <div key={item.id} className="flex justify-between items-baseline font-mono text-[11px] text-secondary">
                    <span>{item.name} <span className="text-muted">({item.grams}g)</span></span>
                    <span className="font-bold text-primary">{item.kcal} kcal</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setStep("input")}
                className="flex-1 rounded-lg border border-subtle px-3 py-2.5 text-xs font-bold text-secondary hover:text-primary hover:bg-elevated transition-colors cursor-pointer"
              >
                Reset
              </button>
              <button
                onClick={() => setStep("saved")}
                className="flex-[2] flex items-center justify-center gap-1.5 rounded-lg bg-accent text-[color:var(--accent-contrast)] px-3 py-2.5 text-xs font-bold hover:bg-accent-hover transition-colors cursor-pointer"
              >
                <Check className="h-4 w-4" /> Confirm & Save to Diary
              </button>
            </div>
          </div>
        )}

        {step === "saved" && (
          <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center space-y-1">
              <p className="text-xs font-bold text-accent font-mono uppercase tracking-wider">Saved to your Daily Imprint</p>
              <p className="text-[11px] text-muted font-mono">{summary.date}</p>
            </div>

            {/* Imprint Renderer */}
            <DayImprint summary={summary} mealGroups={mealGroups} />

            <button
              onClick={() => setStep("input")}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-subtle px-3 py-2.5 text-xs font-bold text-secondary hover:text-primary hover:bg-elevated transition-colors cursor-pointer"
            >
              Start over <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
