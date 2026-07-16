import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function EmptyState({
	icon,
	title,
	hint,
	action,
	className,
}: {
	icon?: ReactNode
	title: string
	hint?: string
	action?: ReactNode
	className?: string
}) {
	return (
		<div
			className={cn(
				"flex h-[280px] flex-col items-center justify-center gap-2 rounded-card border border-dashed border-subtle p-6 text-center text-sm text-muted bg-surface/50",
				className
			)}
		>
			{icon ? <div className="mb-1 text-muted">{icon}</div> : null}
			<p className="text-primary font-medium">{title}</p>
			{hint ? <p className="text-muted text-xs">{hint}</p> : null}
			{action ? <div className="mt-2">{action}</div> : null}
		</div>
	)
}
