import React from "react"
import { cn } from "@/lib/utils"

interface MarginLabelProps extends React.HTMLAttributes<HTMLSpanElement> {
	children: React.ReactNode
}

export function MarginLabel({ children, className, ...props }: MarginLabelProps) {
	return (
		<span
			className={cn(
				"border-subtle bg-elevated text-muted inline-block rounded-sm border px-1.5 py-0.5 font-mono text-[9px] leading-none font-bold tracking-wider uppercase",
				className
			)}
			{...props}
		>
			{children}
		</span>
	)
}
