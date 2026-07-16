"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { formatINR } from "@/lib/normalize"
import { Panel } from "./ui/panel"

type KpiCardProps = {
	label: string
	value: number
	format?: "inr" | "int"
	accent?: "default" | "pending"
}

export function KpiCard({
	label,
	value,
	format = "int",
	accent = "default",
}: KpiCardProps) {
	const display = useCountUp(value)
	const text =
		format === "inr"
			? formatINR(display)
			: Math.round(display).toLocaleString("en-IN")

	return (
		<Panel>
			<p className="text-xs font-medium uppercase tracking-wide text-muted font-sans">
				{label}
			</p>
			<p
				className={cn(
					"mt-2 font-mono text-3xl font-semibold tabular",
					accent === "pending" ? "text-pending" : "text-primary"
				)}
			>
				{text}
			</p>
		</Panel>
	)
}

function useCountUp(target: number, duration = 600): number {
	const [value, setValue] = useState(0)
	const startRef = useRef<number | null>(null)

	useEffect(() => {
		startRef.current = null
		let raf = 0
		function tick(ts: number) {
			if (startRef.current == null) startRef.current = ts
			const elapsed = ts - startRef.current
			const t = Math.min(1, elapsed / duration)
			const eased = 1 - Math.pow(1 - t, 3)
			setValue(target * eased)
			if (t < 1) raf = requestAnimationFrame(tick)
		}
		raf = requestAnimationFrame(tick)
		return () => cancelAnimationFrame(raf)
	}, [target, duration])

	return value
}
