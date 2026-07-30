import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

type Props = {
	icon: LucideIcon
	label: string
	className?: string
}

export function StampedState({ icon: Icon, label, className }: Props) {
	return (
		<div
			className={cn(
				"border-subtle text-muted inline-flex items-center gap-1.5 rounded-full border border-dashed px-3 py-1 font-mono text-2xs font-bold tracking-wider uppercase",
				className
			)}
		>
			<Icon className="h-3 w-3" />
			{label}
		</div>
	)
}
