"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { PRIMARY_BTN } from "@/lib/ui"
import { Mascot } from "@/components/mascot"

const STORAGE_KEY = "ct_onboarding_tour_dismissed_v1"

type Step = {
	title: string
	body: string
	pose: "idle" | "wave" | "celebrate"
}

const STEPS: Step[] = [
	{
		title: "Welcome to Calorie Tracker",
		body: "Describe what you ate in plain language on the Today tab, and we'll estimate calories and macros for you.",
		pose: "wave",
	},
	{
		title: "Review your day",
		body: "History and Analytics show your past logs and long-term nutrition patterns.",
		pose: "idle",
	},
	{
		title: "Go further, for free",
		body: "In Settings, connect Telegram to log on the go, or add your own free API key for unlimited logging with no subscription.",
		pose: "celebrate",
	},
]

const BURST_COLORS = [
	"var(--accent)",
	"var(--character-sky)",
	"var(--character-amber)",
	"var(--character-rose)",
]

/**
 * Minimal, dismissible first-run tour. Shown once per browser via localStorage;
 * intentionally lightweight (no page overlay blocking). Presented as a small
 * card-stack with a mascot pose per step, and a brief success burst on the
 * final "Got it" — the tour's one moment of character, gated behind
 * prefers-reduced-motion like every other animation in the app.
 */
export function OnboardingTour() {
	const [visible, setVisible] = useState(false)
	const [step, setStep] = useState(0)
	const [celebrating, setCelebrating] = useState(false)
	const shouldReduceMotion = useReducedMotion()

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
		setCelebrating(false)
		try {
			window.localStorage.setItem(STORAGE_KEY, "1")
		} catch {
			// ignore
		}
	}

	function next() {
		if (step >= STEPS.length - 1) {
			if (shouldReduceMotion) {
				dismiss()
				return
			}
			setCelebrating(true)
			window.setTimeout(dismiss, 650)
			return
		}
		setStep((s) => s + 1)
	}

	if (!visible) return null

	const current = STEPS[step]
	const isLast = step === STEPS.length - 1

	return (
		<div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 sm:bottom-8">
			<div className="relative w-full max-w-sm">
				{/* Card-stack peek: hints more steps remain behind the active card */}
				{!isLast && !celebrating && (
					<div
						aria-hidden
						className="border-subtle bg-elevated absolute inset-x-3 -top-2 h-full rounded-2xl border opacity-60"
					/>
				)}

				<AnimatePresence mode="wait">
					{!celebrating ? (
						<motion.div
							key={step}
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -10 }}
							transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
							className="border-subtle bg-elevated relative w-full rounded-2xl border p-5 shadow-xl"
						>
							<button
								onClick={dismiss}
								aria-label="Dismiss tour"
								className="text-muted hover:text-primary absolute top-3 right-3 cursor-pointer focus:outline-none"
							>
								<X className="h-4 w-4" />
							</button>

							<div className="mb-3 flex items-center gap-3">
								<Mascot pose={current.pose} className="h-10 w-10 shrink-0" />
								<div className="flex items-center gap-1.5">
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
						</motion.div>
					) : (
						<motion.div
							key="celebrate"
							initial={{ opacity: 0, scale: 0.96 }}
							animate={{ opacity: 1, scale: 1 }}
							className="border-subtle bg-elevated relative flex w-full flex-col items-center gap-2 overflow-visible rounded-2xl border p-6 text-center shadow-xl"
						>
							<Mascot pose="celebrate" className="h-14 w-14" />
							<p className="text-primary text-sm font-bold">You're all set!</p>
							{BURST_COLORS.map((color, i) => (
								<motion.span
									key={color}
									aria-hidden
									className="absolute top-1/2 left-1/2 h-1.5 w-1.5 rounded-full"
									style={{ background: color }}
									initial={{ x: 0, y: 0, opacity: 1 }}
									animate={{
										x: Math.cos((i / BURST_COLORS.length) * 2 * Math.PI) * 60,
										y: Math.sin((i / BURST_COLORS.length) * 2 * Math.PI) * 60,
										opacity: 0,
									}}
									transition={{ duration: 0.6, ease: "easeOut" }}
								/>
							))}
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</div>
	)
}
