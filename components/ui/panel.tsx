import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function Panel({
	className,
	children,
}: {
	className?: string
	children: ReactNode
}) {
	return (
		<div className={cn("rounded-card border border-subtle bg-surface p-5", className)}>
			{children}
		</div>
	)
}
