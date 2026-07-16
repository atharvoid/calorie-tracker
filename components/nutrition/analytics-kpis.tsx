"use client"

import { cn } from "@/lib/utils"
import { Panel } from "@/components/ui/panel"

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

type Props = { kpi: Kpi; loading?: boolean }

export function AnalyticsKpis({ kpi, loading = false }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 animate-pulse">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-elevated" />
        ))}
      </div>
    )
  }

  const cards = [
    {
      label: "Avg. daily calories",
      value: kpi.avgKcal !== null ? `${kpi.avgKcal.toLocaleString("en-IN")} kcal` : "Not enough data",
      sub: kpi.coverageLabel,
      accent: false,
    },
    {
      label: "Target",
      value: kpi.avgTarget !== null ? `${kpi.avgTarget.toLocaleString("en-IN")} kcal` : "Not set",
      sub: "Daily goal",
      accent: false,
    },
    {
      label: "Adherence",
      value:
        kpi.adherencePct !== null
          ? `${kpi.adherencePct}%`
          : "—",
      sub:
        kpi.loggedDays > 0
          ? `${kpi.adherentDays} on track, ${kpi.overDays} over, ${kpi.underDays} under`
          : "No logged days",
      accent: kpi.adherencePct !== null && kpi.adherencePct >= 70,
    },
    {
      label: "Avg. protein",
      value: kpi.avgProteinG !== null ? `${kpi.avgProteinG}g` : "—",
      sub: "Grams per logged day",
      accent: false,
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {cards.map((card) => (
        <Panel key={card.label}>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            {card.label}
          </p>
          <p
            className={cn(
              "mt-2 font-mono text-2xl font-bold tabular",
              card.accent ? "text-paid" : "text-primary"
            )}
          >
            {card.value}
          </p>
          <p className="mt-1 text-xs text-muted">{card.sub}</p>
        </Panel>
      ))}
    </div>
  )
}
