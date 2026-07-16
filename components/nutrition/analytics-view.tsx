"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { Panel } from "@/components/ui/panel"
import { AnalyticsKpis } from "./analytics-kpis"
import { CalorieTrendChart } from "./calorie-trend-chart"
import { TopFoods } from "./top-foods"
import { MealContribution } from "./meal-contribution"
import { cn } from "@/lib/utils"

type RangeOption = "7d" | "4w" | "12w" | "3m"

type Kpi = {
  avgKcal: number | null
  avgTarget: number | null
  loggedDays: number
  rangeDays: number
  coverageLabel: string
  adherencePct: number | null
  adherentDays: number
  overDays: number
  underDays: number
  avgProteinG: number | null
}

type TrendPoint = {
  date: string
  kcal: number | null
  targetKcal: number | null
  maintenanceKcal: number | null
  status: string
}

type TopFood = {
  name: string
  totalKcal: number
  totalProteinG: number
  count: number
}

type MealContrib = { mealType: string; kcal: number; pct: number }

type ApiResponse = {
  kpi: Kpi
  trendPoints: TrendPoint[]
  topFoodsByKcal: TopFood[]
  topFoodsByProtein: TopFood[]
  mealContribution: MealContrib[]
}

const RANGE_OPTIONS: { value: RangeOption; label: string }[] = [
  { value: "7d", label: "7D" },
  { value: "4w", label: "4W" },
  { value: "12w", label: "12W" },
  { value: "3m", label: "3M" },
]

export function AnalyticsView() {
  const [range, setRange] = useState<RangeOption>("4w")
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (r: RangeOption) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/nutrition/analytics?range=${r}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: { message?: string } }
        throw new Error(body?.error?.message ?? "Failed to load analytics")
      }
      const json = await res.json() as ApiResponse
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(range)
  }, [range, load])

  return (
    <div className="space-y-6">
      {/* Range controls */}
      <div className="flex items-center justify-between">
        <div className="flex rounded-btn border border-subtle bg-surface p-0.5">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRange(opt.value)}
              className={cn(
                "rounded-[8px] px-3 py-1 text-sm",
                range === opt.value
                  ? "bg-elevated text-primary font-medium"
                  : "text-muted hover:text-primary"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {data && (
          <p className="text-xs text-muted">{data.kpi.coverageLabel}</p>
        )}
      </div>

      {/* Error state */}
      {error && !loading && (
        <Panel>
          <p className="text-sm text-danger">{error}</p>
        </Panel>
      )}

      {/* KPI summary */}
      <AnalyticsKpis
        kpi={data?.kpi ?? {
          avgKcal: null, avgTarget: null, loggedDays: 0, rangeDays: 0,
          coverageLabel: "", adherencePct: null, adherentDays: 0,
          overDays: 0, underDays: 0, avgProteinG: null,
        }}
        loading={loading}
      />

      {/* Calorie trend chart */}
      <Panel>
        <h3 className="mb-3 text-sm font-medium text-primary">Calorie Trend</h3>
        {loading ? (
          <div className="h-[220px] animate-pulse rounded-xl bg-elevated" />
        ) : (
          <CalorieTrendChart data={data?.trendPoints ?? []} />
        )}
      </Panel>

      {/* Top foods */}
      <Panel>
        <h3 className="mb-3 text-sm font-medium text-primary">Top Foods</h3>
        <TopFoods
          byKcal={data?.topFoodsByKcal ?? []}
          byProtein={data?.topFoodsByProtein ?? []}
          loading={loading}
        />
      </Panel>

      {/* Meal contribution */}
      <Panel>
        <h3 className="mb-3 text-sm font-medium text-primary">Meal Breakdown</h3>
        {loading ? (
          <div className="h-[180px] animate-pulse rounded-xl bg-elevated" />
        ) : (
          <MealContribution data={data?.mealContribution ?? []} />
        )}
      </Panel>
    </div>
  )
}
