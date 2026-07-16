"use client"

import { useState } from "react"
import { Sheet } from "lucide-react"
import { EmptyState } from "@/components/ui/empty-state"
import { SheetPanel } from "./sheet-panel"

type DemoAppProps = {
	signedIn?: boolean
	userId?: string
}

export function DemoApp({ signedIn = false }: DemoAppProps) {
	return (
		<div className="w-full">
			{signedIn ? (
				<SheetPanel />
			) : (
				<EmptyState
					icon={<Sheet className="h-8 w-8" />}
					title="Sign in to see your Calorie Tracker sheet"
					hint="Your logged meals from Telegram will appear here live."
				/>
			)}
		</div>
	)
}
