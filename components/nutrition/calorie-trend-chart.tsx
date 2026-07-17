"use client"

import type { CSSProperties } from "react"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts"
import { formatMonthDay } from "@/lib/nutrition-date"

type TrendPoint = {
  date: string
  kcal: number | null
  targetKcal: number | null
  maintenanceKcal: number | null
  status: string
}

type Props = {
  data: TrendPoint[]
  loading?: boolean
}

const ACCENT = "#10B981"
const PENDING = "#F59E0B"
const MUTED_LINE = "rgba(255,255,255,0.2)"
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
const TOOLTIP_LABEL_STYLE: CSSProperties = { color: "#A1A1AA", marginBottom: 4 }

type TooltipPayloadItem = {
  name?: string
  value?: number | null
}

interface TooltipProps {
  active?: boolean
  payload?: ReadonlyArray<TooltipPayloadItem>
  label?: string
}

function CaloriesTooltip({ active, payload, label }: TooltipProps): React.ReactElement | null {
  if (!active || !payload || payload.length === 0 || !label) return null

  const kcal = payload.find((p) => p.name === "kcal")?.value ?? null
  const target = payload.find((p) => p.name === "targetKcal")?.value ?? null
  const maintenance = payload.find((p) => p.name === "maintenanceKcal")?.value ?? null

  return (
    <div style={TOOLTIP_BOX}>
      <div style={TOOLTIP_LABEL_STYLE}>{label}</div>
      {kcal !== null && (
        <div style={{ color: ACCENT }}>Intake: {Math.round(kcal).toLocaleString("en-IN")} kcal</div>
      )}
      {kcal === null && (
        <div style={{ color: "#6B6C72" }}>No data</div>
      )}
      {target !== null && (
        <div style={{ color: PENDING }}>Target: {target.toLocaleString("en-IN")} kcal</div>
      )}
      {maintenance !== null && (
        <div style={{ color: MUTED_LINE }}>Maintenance: {maintenance.toLocaleString("en-IN")} kcal</div>
      )}
    </div>
  )
}

const TooltipContent = CaloriesTooltip as React.FC

export function CalorieTrendChart({ data, loading = false }: Props) {
  if (loading) {
    return <div className="h-[220px] rounded-xl bg-elevated animate-pulse" />
  }

  const loggedCount = data.filter((d) => d.kcal !== null).length

  // Get first non-null target and maintenance for reference lines
  const targetKcal = data.find((d) => d.targetKcal !== null)?.targetKcal ?? null
  const maintenanceKcal = data.find((d) => d.maintenanceKcal !== null)?.maintenanceKcal ?? null

  // Format label for x-axis
  function formatDate(dateStr: string): string {
    try {
      return formatMonthDay(dateStr)
    } catch {
      return dateStr
    }
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="kcalFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ACCENT} stopOpacity={0.35} />
              <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis
            dataKey="date"
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatDate}
            interval="preserveStartEnd"
            minTickGap={25}
          />
          <YAxis
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={38}
            tickFormatter={(v: number) =>
              v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
            }
          />
          <Tooltip
            cursor={false}
            content={<TooltipContent />}
          />
          {targetKcal !== null && (
            <ReferenceLine
              y={targetKcal}
              stroke={PENDING}
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{ value: "Target", position: "right", fill: PENDING, fontSize: 10 }}
            />
          )}
          {maintenanceKcal !== null && (
            <ReferenceLine
              y={maintenanceKcal}
              stroke={MUTED_LINE}
              strokeDasharray="4 4"
              strokeWidth={1}
              label={{ value: "Maint.", position: "right", fill: "#6B6C72", fontSize: 10 }}
            />
          )}
          <Area
            type="monotone"
            dataKey="kcal"
            stroke={ACCENT}
            strokeWidth={2}
            fill="url(#kcalFill)"
            connectNulls={false}
            dot={false}
          />
          {/* Hidden series for tooltip data */}
          <Area
            type="monotone"
            dataKey="targetKcal"
            stroke="none"
            fill="none"
          />
          <Area
            type="monotone"
            dataKey="maintenanceKcal"
            stroke="none"
            fill="none"
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Accessible text summary */}
      <p className="mt-2 text-xs text-muted text-center">
        {loggedCount} of {data.length} days logged
        {targetKcal !== null && ` · target ${targetKcal.toLocaleString("en-IN")} kcal`}
      </p>
    </div>
  )
}
