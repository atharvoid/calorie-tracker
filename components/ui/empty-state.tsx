"use client"

import type { ReactNode } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Mascot } from "@/components/mascot"

type MascotPose = "idle" | "wave" | "celebrate"

export function EmptyState({
	icon,
	mascotPose = "idle",
	title,
	hint,
	action,
	className,
}: {
	icon?: ReactNode
	/** Pose for the default mascot illustration shown when no `icon` is passed. */
	mascotPose?: MascotPose
	title: string
	hint?: string
	action?: ReactNode
	className?: string
}) {
	const shouldReduceMotion = useReducedMotion()

	return (
		<div
			className={cn(
				"rounded-card border-subtle text-muted bg-surface/50 flex h-[280px] flex-col items-center justify-center gap-2 border border-dashed p-6 text-center text-sm",
				className
			)}
		>
			<motion.div
				initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.35, ease: "easeOut" }}
				className="flex flex-col items-center gap-2"
			>
				{icon ? (
					<div className="text-muted mb-1">{icon}</div>
				) : (
					<Mascot pose={mascotPose} className="mb-1 h-14 w-14" />
				)}
				<p className="text-primary font-medium">{title}</p>
				{hint ? <p className="text-muted text-xs">{hint}</p> : null}
				{action ? <div className="mt-2">{action}</div> : null}
			</motion.div>
		</div>
	)
}
