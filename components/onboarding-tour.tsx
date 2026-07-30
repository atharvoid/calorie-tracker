"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { PRIMARY_BTN } from "@/lib/ui"

const STORAGE_KEY = "ct_onboarding_tour_dismissed_v1"

type Step = {
	title: string
	body: string
}

const STEPS: Step[] = [
	{
		title: "Welcome to Calorie Tracker",
		body: "Describe what you ate in plain language on the Today tab, and we'll estimate calories and macros for you.",
	},
	{
		title: "Review your day",
		body: "History and Analytics show your past logs and long-term nutrition patterns.",
	},
	{
		title: "Go further, for free",
		body: "In Settings, connect Telegram to log on the go, or add your own free API key for unlimited logging with no subscription.",
	},
]

/**
 * Minimal, dismissible first-run tour. Shown once per browser via localStorage;
 * intentionally lightweight (no external deps, no page overlay blocking).
 */
export function OnboardingTour() {
	const [visible, setVisible] = useState(false)
	const [step, setStep] = useState(0)

	useEffect(() => {
		try {
			const dismissed = window.localStorage.getItem(STORAGE_KEY)
			if (!dismissed) setVisible(true)
		} catch {
			// localStorage unavailable (e.g. privacy mode) — skip tour rather than throw
		}
	}, [])

	function dismiss() {
		setVisible(false)
		try {
			window.localStorage.setItem(STORAGE_KEY, "1")
		} catch {
			// ignore
		}
	}

	function next() {
		if (step >= STEPS.length - 1) {
			dismiss()
			return
		}
		setStep((s) => s + 1)
	}

	if (!visible) return null

	const current = STEPS[step]
	const isLast = step === STEPS.length - 1

	return (
		<div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 sm:bottom-8">
			<div className="border-subtle bg-elevated animate-in fade-in slide-in-from-bottom-4 relative w-full max-w-sm rounded-2xl border p-5 shadow-xl duration-200">
				<button
					onClick={dismiss}
					aria-label="Dismiss tour"
					className="text-muted hover:text-primary absolute top-3 right-3 cursor-pointer focus:outline-none"
				>
					<X className="h-4 w-4" />
				</button>

				<div className="mb-3 flex items-center gap-1.5">
					{STEPS.map((_, i) => (
						<span
							key={i}
							className={cn(
								"h-1.5 rounded-full transition-all",
								i === step ? "bg-accent w-5" : "bg-subtle w-1.5"
							)}
						/>
					))}
				</div>

				<h3 className="text-primary mb-1 text-sm font-bold">{current.title}</h3>
				<p className="text-secondary mb-4 text-xs leading-relaxed">{current.body}</p>

				<div className="flex items-center justify-between">
					<button
						onClick={dismiss}
						className="text-muted hover:text-secondary cursor-pointer text-xs font-semibold focus:outline-none"
					>
						Skip
					</button>
					<button
						onClick={next}
						className={cn(
							"rounded-btn cursor-pointer px-4 py-1.5 text-xs font-semibold transition-all",
							PRIMARY_BTN
						)}
					>
						{isLast ? "Got it" : "Next"}
					</button>
				</div>
			</div>
		</div>
	)
}
