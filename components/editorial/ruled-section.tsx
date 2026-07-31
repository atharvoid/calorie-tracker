import React from "react"
import { cn } from "@/lib/utils"

interface RuledSectionProps extends React.HTMLAttributes<HTMLDivElement> {
	label?: string
	children: React.ReactNode
}

export function RuledSection({ label, children, className, ...props }: RuledSectionProps) {
	return (
		<div
			className={cn("border-subtle relative border-t py-4 first:border-t-0", className)}
			{...props}
		>
			{label && (
				<span className="bg-surface text-muted text-2xs absolute -top-2.5 left-4 px-1.5 font-mono font-bold tracking-wider uppercase">
					{label}
				</span>
			)}
			{children}
		</div>
	)
}
