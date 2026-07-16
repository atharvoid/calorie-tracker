"use client"

import type { CSSProperties } from "react"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts"

type MealContrib = {
  mealType: string
  kcal: number
  pct: number
}

type Props = {
  data: MealContrib[]
  loading?: boolean
}

const MEAL_COLORS: Record<string, string> = {
  Breakfast: "#38BDF8",
  Lunch: "#10B981",
  Dinner: "#F59E0B",
  Snack: "#A78BFA",
  Other: "#6B6C72",
}

const GRID = "rgba(255,255,255,0.06)"
const AXIS_TICK = { fill: "#6B6C72", fontSize: 11 }

const TOOLTIP_BOX: CSSProperties = {
  background: "#1B1C20",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 12,
  padding: "8px 12px",
  color: "#F4F5F6",
  fontSize: 12,
}
const LABEL_STYLE: CSSProperties = { color: "#A1A1AA", marginBottom: 2 }

interface TooltipProps {
  active?: boolean
  payload?: ReadonlyArray<{ value?: number; payload?: MealContrib }>
  label?: string
}

function MealTooltip({ active, payload, label }: TooltipProps): React.ReactElement | null {
  if (!active || !payload || !payload[0]?.payload) return null
  const item = payload[0].payload
  return (
    <div style={TOOLTIP_BOX}>
      <div style={LABEL_STYLE}>{label}</div>
      <div>{item.kcal.toLocaleString("en-IN")} kcal · {item.pct}%</div>
    </div>
  )
}

const TooltipContent = MealTooltip as React.FC

export function MealContribution({ data, loading = false }: Props) {
  if (loading) {
    return <div className="h-[180px] rounded-xl bg-elevated animate-pulse" />
  }
  if (data.length === 0) {
    return <p className="text-sm text-muted py-4 text-center">No data yet.</p>
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis
            dataKey="mealType"
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={44}
            tickFormatter={(v: number) =>
              v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)
            }
          />
          <Tooltip cursor={false} content={<TooltipContent />} />
          <Bar dataKey="kcal" radius={[6, 6, 0, 0]}>
            {data.map((entry) => (
              <Cell
                key={entry.mealType}
                fill={MEAL_COLORS[entry.mealType] ?? "#6B6C72"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="mt-2 flex flex-wrap gap-3 justify-center">
        {data.map((item) => (
          <div key={item.mealType} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: MEAL_COLORS[item.mealType] ?? "#6B6C72" }}
            />
            <span className="text-xs text-muted">{item.mealType} {item.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
