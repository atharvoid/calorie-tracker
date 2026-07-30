import React from "react"
import { cn } from "@/lib/utils"

interface StampedStateProps extends React.HTMLAttributes<HTMLDivElement> {
	label: string
}

export function StampedState({ label, className, ...props }: StampedStateProps) {
	return (
		<div
			className={cn(
				"border-accent/40 text-accent/80 inline-flex rotate-[-2deg] items-center justify-center rounded border-2 border-dashed px-2.5 py-1 font-mono text-[11px] font-black tracking-widest uppercase select-none",
				className
			)}
			{...props}
		>
			{label}
		</div>
	)
}
