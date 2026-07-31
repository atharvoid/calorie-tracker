"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"

const Sheet = DialogPrimitive.Root
const SheetTrigger = DialogPrimitive.Trigger
const SheetPortal = DialogPrimitive.Portal
const SheetClose = DialogPrimitive.Close

function SheetOverlay({ className, ...props }: DialogPrimitive.Backdrop.Props) {
	return (
		<DialogPrimitive.Backdrop
			data-slot="sheet-overlay"
			className={cn(
				"data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 fixed inset-0 z-50 bg-black/55 backdrop-blur-[2px] duration-200",
				className
			)}
			{...props}
		/>
	)
}

type SheetSide = "bottom" | "right"

const SIDE_CLASSES: Record<SheetSide, string> = {
	bottom:
		"data-open:slide-in-from-bottom-full data-closed:slide-out-to-bottom-full inset-x-0 bottom-0 max-h-[min(90dvh,48rem)] rounded-t-2xl border-t",
	right:
		"data-open:slide-in-from-right-full data-closed:slide-out-to-right-full inset-y-0 right-0 h-dvh w-[min(90vw,24rem)] border-l",
}

function SheetContent({
	className,
	children,
	side = "bottom",
	showCloseButton = true,
	...props
}: DialogPrimitive.Popup.Props & {
	side?: SheetSide
	showCloseButton?: boolean
}) {
	return (
		<SheetPortal>
			<SheetOverlay />
			<DialogPrimitive.Popup
				data-slot="sheet-content"
				className={cn(
					"bg-surface border-subtle data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 fixed z-50 flex flex-col gap-4 p-5 shadow-2xl duration-200 ease-premium focus:outline-none",
					SIDE_CLASSES[side],
					className
				)}
				{...props}
			>
				{side === "bottom" && (
					<div className="bg-subtle mx-auto -mt-1 h-1 w-10 shrink-0 rounded-full" aria-hidden />
				)}
				{children}
				{showCloseButton && (
					<DialogPrimitive.Close className="text-muted hover:text-primary hover:bg-elevated focus-visible:ring-accent absolute top-4 right-4 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full transition-colors ease-premium focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none">
						<XIcon className="h-4 w-4" />
						<span className="sr-only">Close</span>
					</DialogPrimitive.Close>
				)}
			</DialogPrimitive.Popup>
		</SheetPortal>
	)
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
	return <div data-slot="sheet-header" className={cn("flex flex-col gap-1.5 pr-10", className)} {...props} />
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="sheet-footer"
			className={cn("mt-auto flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end", className)}
			{...props}
		/>
	)
}

function SheetTitle({ className, ...props }: DialogPrimitive.Title.Props) {
	return (
		<DialogPrimitive.Title
			data-slot="sheet-title"
			className={cn("text-primary text-base leading-tight font-bold", className)}
			{...props}
		/>
	)
}

function SheetDescription({ className, ...props }: DialogPrimitive.Description.Props) {
	return (
		<DialogPrimitive.Description
			data-slot="sheet-description"
			className={cn("text-muted text-xs leading-relaxed", className)}
			{...props}
		/>
	)
}

export {
	Sheet,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetOverlay,
	SheetPortal,
	SheetTitle,
	SheetTrigger,
}
