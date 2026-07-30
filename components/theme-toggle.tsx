"use client"

import React, { useState } from "react"
import { Sun, Moon } from "lucide-react"
import { useTheme } from "@/components/theme-provider"
import { cn } from "@/lib/utils"

type Props = {
	className?: string
}

export function ThemeToggle({ className }: Props) {
	const { theme, toggleTheme } = useTheme()
	const [announcement, setAnnouncement] = useState<string>("")

	const isDark = theme === "dark"
	const label = isDark ? "Switch to light theme" : "Switch to dark theme"

	const handleClick = () => {
		toggleTheme()
		setAnnouncement(isDark ? "Light theme enabled" : "Dark theme enabled")
	}

	return (
		<>
			<button
				type="button"
				onClick={handleClick}
				aria-label={label}
				title={label}
				className={cn(
					"border-subtle bg-surface hover:bg-elevated text-primary focus-visible:ring-accent flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border shadow-sm transition-colors focus-visible:ring-2 focus-visible:outline-none",
					className
				)}
			>
				{isDark ? (
					<Sun className="text-accent h-5 w-5 transition-transform duration-200 hover:rotate-45" />
				) : (
					<Moon className="text-accent h-5 w-5 transition-transform duration-200 hover:-rotate-12" />
				)}
			</button>

			{/* Screen-reader live region announcement */}
			<span className="sr-only" aria-live="polite">
				{announcement}
			</span>
		</>
	)
}
