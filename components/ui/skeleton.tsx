"use client"

import { motion, useReducedMotion } from "framer-motion"
import { cn } from "@/lib/utils"

/**
 * Shared loading placeholder. Renders a muted block with a subtle shimmer
 * sweep; falls back to a static block (no animation) under
 * `prefers-reduced-motion`.
 */
export function Skeleton({ className }: { className?: string }) {
	const shouldReduceMotion = useReducedMotion()

	return (
		<div className={cn("bg-elevated/40 relative overflow-hidden rounded-lg", className)}>
			{!shouldReduceMotion && (
				<motion.div
					className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
					initial={{ x: "-100%" }}
					animate={{ x: "100%" }}
					transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
				/>
			)}
		</div>
	)
}
