import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
	return (
		<div className={cn("rounded-card border-subtle bg-surface border p-5", className)}>
			{children}
		</div>
	)
}
