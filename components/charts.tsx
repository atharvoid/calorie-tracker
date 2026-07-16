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
	AreaChart,
	Area,
} from "recharts"
import type { CustomerTotal, TrendPoint } from "@/lib/analytics"

// recharts 3 passes readonly payloads to the content callback
interface ChartTooltipProps {
	active?: boolean
	payload?: ReadonlyArray<{ value?: number | string }>
	label?: string | number
}

const ACCENT = "#10B981"
const GRID = "rgba(255,255,255,0.06)"
const AXIS_TICK = { fill: "#6B6C72", fontSize: 12 }
const CHART_MARGIN = { top: 8, right: 8, bottom: 0, left: 0 }
const BAR_RADIUS: [number, number, number, number] = [6, 6, 0, 0]

const TOOLTIP_BOX: CSSProperties = {
	background: "#1B1C20",
	border: "1px solid rgba(255,255,255,0.10)",
	borderRadius: 12,
	padding: "8px 12px",
	color: "#F4F5F6",
	fontSize: 12,
}
const TOOLTIP_LABEL: CSSProperties = { color: "#A1A1AA", marginBottom: 2 }
const TOOLTIP_VALUE: CSSProperties = { fontWeight: 600 }

function shortInr(n: number): string {
	if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
	if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k`
	return `₹${Math.round(n)}`
}

function shortDate(iso: string): string {
	const d = new Date(iso)
	if (Number.isNaN(d.getTime())) return iso
	return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
}

function ChartTooltip({ active, payload, label }: ChartTooltipProps): React.ReactElement | null {
	if (!active || !payload || payload.length === 0) return null
	const value = Number(payload[0]?.value ?? 0)
	return (
		<div style={TOOLTIP_BOX}>
			{label != null && <div style={TOOLTIP_LABEL}>{String(label)}</div>}
			<div style={TOOLTIP_VALUE}>{shortInr(value)}</div>
		</div>
	)
}

// Cast to React.FC to satisfy recharts 3 ContentType — avoids `any`
const TooltipContent = ChartTooltip as React.FC

export function TopCustomersChart({ data }: { data: CustomerTotal[] }) {
	return (
		<ResponsiveContainer width="100%" height={220}>
			<BarChart data={data} margin={CHART_MARGIN}>
				<CartesianGrid stroke={GRID} vertical={false} />
				<XAxis
					dataKey="customer"
					tick={AXIS_TICK}
					tickLine={false}
					axisLine={false}
					interval={0}
				/>
				<YAxis
					tick={AXIS_TICK}
					tickLine={false}
					axisLine={false}
					tickFormatter={shortInr}
					width={48}
				/>
				<Tooltip cursor={false} content={<TooltipContent />} />
				<Bar dataKey="amount" fill={ACCENT} radius={BAR_RADIUS} />
			</BarChart>
		</ResponsiveContainer>
	)
}

export function SalesTrendChart({ data }: { data: TrendPoint[] }) {
	return (
		<ResponsiveContainer width="100%" height={220}>
			<AreaChart data={data} margin={CHART_MARGIN}>
				<defs>
					<linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stopColor={ACCENT} stopOpacity={0.4} />
						<stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
					</linearGradient>
				</defs>
				<CartesianGrid stroke={GRID} vertical={false} />
				<XAxis
					dataKey="date"
					tick={AXIS_TICK}
					tickLine={false}
					axisLine={false}
					tickFormatter={shortDate}
				/>
				<YAxis
					tick={AXIS_TICK}
					tickLine={false}
					axisLine={false}
					tickFormatter={shortInr}
					width={48}
				/>
				<Tooltip cursor={false} content={<TooltipContent />} />
				<Area
					type="monotone"
					dataKey="amount"
					stroke={ACCENT}
					strokeWidth={2}
					fill="url(#salesFill)"
				/>
			</AreaChart>
		</ResponsiveContainer>
	)
}
