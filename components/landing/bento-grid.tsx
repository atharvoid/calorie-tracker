"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

export function BentoGrid({
	children,
	className,
}: {
	children: React.ReactNode
	className?: string
}) {
	return (
		<div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}>
			{children}
		</div>
	)
}

type BentoGridItemProps = {
	index: string
	title: string
	description: string
	className?: string
}

export function BentoGridItem({ index, title, description, className }: BentoGridItemProps) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 16 }}
			whileInView={{ opacity: 1, y: 0 }}
			viewport={{ once: true, margin: "-60px" }}
			transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
			className={cn(
				"rounded-card border-subtle bg-surface hover:border-accent/40 hover:bg-elevated group relative flex flex-col justify-between gap-4 border p-6 transition-colors duration-300",
				className
			)}
		>
			<span className="text-accent font-mono text-2xs font-bold tracking-wider uppercase">
				{index}
			</span>
			<div className="space-y-2">
				<h3 className="text-primary text-lg font-bold">{title}</h3>
				<p className="text-secondary text-sm leading-relaxed">{description}</p>
			</div>
			<div className="bg-accent/0 group-hover:bg-accent/60 absolute inset-x-6 bottom-0 h-px transition-colors duration-300" />
		</motion.div>
	)
}
