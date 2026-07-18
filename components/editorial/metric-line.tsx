import React from "react"
import { cn } from "@/lib/utils"

interface MetricLineProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string
  value: string | number
  unit?: string
}

export function MetricLine({ label, value, unit, className, ...props }: MetricLineProps) {
  return (
    <div className={cn("flex items-baseline justify-between py-1 text-xs font-mono", className)} {...props}>
      <span className="text-secondary tracking-tight">{label}</span>
      <div className="flex items-baseline gap-0.5 font-bold text-primary tabular">
        <span>{value}</span>
        {unit && <span className="text-[10px] text-muted font-normal normal-case ml-0.5">{unit}</span>}
      </div>
    </div>
  )
}
