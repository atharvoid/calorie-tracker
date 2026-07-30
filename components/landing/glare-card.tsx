"use client"

import { useRef, type ReactNode, type MouseEvent } from "react"
import { cn } from "@/lib/utils"

/**
 * A hover-tracked light sweep + subtle tilt, reserved for the single most
 * differentiated pricing card (Bring Your Own Key). Pure CSS custom
 * properties driven by pointer position — no extra dependency, and
 * completely inert until the pointer actually enters the card.
 */
export function GlareCard({ children, className }: { children: ReactNode; className?: string }) {
	const ref = useRef<HTMLDivElement>(null)

	function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
		const el = ref.current
		if (!el) return
		const rect = el.getBoundingClientRect()
		const x = ((e.clientX - rect.left) / rect.width) * 100
		const y = ((e.clientY - rect.top) / rect.height) * 100
		el.style.setProperty("--glare-x", `${x}%`)
		el.style.setProperty("--glare-y", `${y}%`)
		el.style.setProperty("--tilt-x", `${(y - 50) / -18}deg`)
		el.style.setProperty("--tilt-y", `${(x - 50) / 18}deg`)
	}

	function handleMouseLeave() {
		const el = ref.current
		if (!el) return
		el.style.setProperty("--tilt-x", "0deg")
		el.style.setProperty("--tilt-y", "0deg")
	}

	return (
		<div
			ref={ref}
			onMouseMove={handleMouseMove}
			onMouseLeave={handleMouseLeave}
			className={cn("group relative [transform-style:preserve-3d]", className)}
			style={{
				transform: "rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg))",
				transition: "transform 300ms cubic-bezier(0.16, 1, 0.3, 1)",
			}}
		>
			<div
				aria-hidden
				className="rounded-card pointer-events-none absolute inset-0 z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
				style={{
					background:
						"radial-gradient(280px circle at var(--glare-x, 50%) var(--glare-y, 50%), rgba(255,255,255,0.14), transparent 60%)",
				}}
			/>
			{children}
		</div>
	)
}
