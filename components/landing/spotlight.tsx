"use client"

import { motion, useReducedMotion } from "framer-motion"

/**
 * Ambient, slowly drifting light blobs behind the hero. Purely decorative —
 * absolutely positioned, pointer-events disabled, and rendered as a single
 * static glow (no animation loop) under prefers-reduced-motion so it never
 * fights a user's accessibility settings.
 */
export function Spotlight() {
	const shouldReduceMotion = useReducedMotion()

	if (shouldReduceMotion) {
		return (
			<div
				aria-hidden
				className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] opacity-40"
				style={{
					background: "radial-gradient(45% 45% at 30% 20%, var(--accent) 0%, transparent 70%)",
				}}
			/>
		)
	}

	return (
		<div
			aria-hidden
			className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[560px] overflow-hidden"
		>
			<motion.div
				className="absolute h-[380px] w-[380px] rounded-full blur-3xl"
				style={{ background: "var(--accent)", opacity: 0.16 }}
				animate={{ x: [-40, 30, -40], y: [-20, 30, -20] }}
				transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
			/>
			<motion.div
				className="absolute right-0 h-[320px] w-[320px] rounded-full blur-3xl"
				style={{ background: "var(--character-sky)", opacity: 0.12 }}
				animate={{ x: [20, -30, 20], y: [10, -20, 10] }}
				transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
			/>
			<motion.div
				className="absolute left-1/3 h-[260px] w-[260px] rounded-full blur-3xl"
				style={{ background: "var(--character-rose)", opacity: 0.1 }}
				animate={{ x: [-10, 25, -10], y: [20, -10, 20] }}
				transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
			/>
		</div>
	)
}
