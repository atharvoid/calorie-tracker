import React from "react"
import { cn } from "@/lib/utils"

interface MetricLineProps extends React.HTMLAttributes<HTMLDivElement> {
	label: string
	value: string | number
	unit?: string
}

export function MetricLine({ label, value, unit, className, ...props }: MetricLineProps) {
	return (
		<div
			className={cn("flex items-baseline justify-between py-1 font-mono text-xs", className)}
			{...props}
		>
			<span className="text-secondary tracking-tight">{label}</span>
			<div className="text-primary tabular flex items-baseline gap-0.5 font-bold">
				<span>{value}</span>
				{unit && <span className="text-muted text-2xs ml-0.5 font-normal normal-case">{unit}</span>}
			</div>
		</div>
	)
}
