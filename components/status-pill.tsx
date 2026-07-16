import { cn } from "@/lib/utils"
import type { OrderStatus } from "@/lib/types"

// Status backgrounds use Tailwind opacity modifiers so no raw rgba is needed
const STYLES: Record<OrderStatus, string> = {
	Paid:    "text-paid    bg-paid/10",
	Pending: "text-pending  bg-pending/10",
	Partial: "text-partial  bg-partial/10",
}

export function StatusPill({ status }: { status: OrderStatus }) {
	return (
		<span
			className={cn(
				"inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
				STYLES[status]
			)}
		>
			{status}
		</span>
	)
}
