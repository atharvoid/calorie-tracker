"use client"

type TopFood = {
  name: string
  totalKcal: number
  totalProteinG: number
  count: number
}

type Props = {
  byKcal: TopFood[]
  byProtein: TopFood[]
  loading?: boolean
}

import { cn } from "@/lib/utils"

function FoodTable({
  foods,
  valueKey,
}: {
  foods: TopFood[]
  valueKey: "totalKcal" | "totalProteinG"
}) {
  if (foods.length === 0) {
    return <p className="text-xs text-muted py-2">No data yet.</p>
  }

  // Find max value for relative bar length scaling
  const maxVal = foods.reduce((max, f) => {
    const v = valueKey === "totalKcal" ? f.totalKcal : f.totalProteinG
    return v > max ? v : max
  }, 1)

  return (
    <div className="space-y-3.5 py-1">
      {foods.map((f, idx) => {
        const val = valueKey === "totalKcal" ? f.totalKcal : f.totalProteinG
        const pct = Math.max(3, Math.min(100, Math.round((val / maxVal) * 100)))
        const displayVal = valueKey === "totalKcal"
          ? `${Math.round(f.totalKcal).toLocaleString("en-IN")} kcal`
          : `${f.totalProteinG.toFixed(1)}g`

        return (
          <div key={f.name} className="space-y-1">
            <div className="flex items-start justify-between text-xs sm:text-sm gap-2">
              <span className="break-words font-medium text-secondary min-w-0 flex-1 leading-snug">
                <span className="text-muted mr-1 font-mono text-[11px]">{idx + 1}.</span>
                {f.name}{" "}
                <span className="text-[10px] text-muted font-normal whitespace-nowrap">({f.count}×)</span>
              </span>
              <span className="font-mono tabular text-primary shrink-0 font-bold text-xs sm:text-sm">
                {displayVal}
              </span>
            </div>
            
            {/* Restrained progress indicator bar */}
            <div className="h-1.5 w-full bg-elevated/60 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500", 
                  valueKey === "totalKcal" ? "bg-accent" : "bg-partial"
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function TopFoods({ byKcal, byProtein, loading = false }: Props) {
  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 animate-pulse">
        <div className="h-40 rounded-xl bg-elevated" />
        <div className="h-40 rounded-xl bg-elevated" />
      </div>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted">
          Top foods by calories
        </p>
        <FoodTable foods={byKcal} valueKey="totalKcal" />
      </div>
      <div>
        <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted">
          Top foods by protein
        </p>
        <FoodTable foods={byProtein} valueKey="totalProteinG" />
      </div>
    </div>
  )
}
