"use client"

import * as React from "react"
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip"

import { cn } from "@/lib/utils"

function TooltipProvider({ delay = 300, ...props }: TooltipPrimitive.Provider.Props) {
	return <TooltipPrimitive.Provider delay={delay} {...props} />
}

const Tooltip = TooltipPrimitive.Root

const TooltipTrigger = TooltipPrimitive.Trigger

function TooltipContent({
	className,
	sideOffset = 8,
	children,
	...props
}: TooltipPrimitive.Popup.Props & {
	sideOffset?: number
}) {
	return (
		<TooltipPrimitive.Portal>
			<TooltipPrimitive.Positioner sideOffset={sideOffset}>
				<TooltipPrimitive.Popup
					data-slot="tooltip-content"
					className={cn(
						"bg-elevated text-primary border-subtle data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 z-50 rounded-md border px-2 py-1 text-2xs font-medium shadow-md duration-100",
						className
					)}
					{...props}
				>
					{children}
				</TooltipPrimitive.Popup>
			</TooltipPrimitive.Positioner>
		</TooltipPrimitive.Portal>
	)
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger }
