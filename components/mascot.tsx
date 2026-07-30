type MascotPose = "idle" | "wave" | "celebrate"

type MascotProps = {
	pose?: MascotPose
	className?: string
}

/**
 * A small, reusable illustrated character used only in high-visibility
 * "character" moments (hero, onboarding, empty states) — intentionally kept
 * out of everyday UI chrome. Pure inline SVG, no image assets or extra
 * dependencies; it themes automatically via the existing accent tokens so it
 * matches both the dark and warm-paper light themes without extra work.
 */
export function Mascot({ pose = "idle", className }: MascotProps) {
	return (
		<svg
			viewBox="0 0 120 120"
			className={className}
			role="img"
			aria-label={
				pose === "celebrate" ? "Mascot celebrating" : pose === "wave" ? "Mascot waving" : "Mascot"
			}
		>
			{/* Soft halo */}
			<path
				d="M60 14c24 0 42 18 42 44s-18 46-42 46-42-20-42-46S36 14 60 14Z"
				fill="var(--accent)"
				opacity="0.16"
			/>
			{/* Body */}
			<path
				d="M60 22c20 0 35 15.5 35 37s-15 39-35 39-35-17-35-39 15-37 35-37Z"
				fill="var(--accent)"
			/>

			{/* Eyes */}
			<circle cx="47" cy="56" r="5" fill="var(--accent-contrast)" />
			<circle cx="73" cy="56" r="5" fill="var(--accent-contrast)" />

			{/* Mouth */}
			{pose === "celebrate" ? (
				<path
					d="M46 70c4 8 24 8 28 0"
					stroke="var(--accent-contrast)"
					strokeWidth="3.5"
					strokeLinecap="round"
					fill="none"
				/>
			) : (
				<path
					d="M49 70c4 5 18 5 22 0"
					stroke="var(--accent-contrast)"
					strokeWidth="3.5"
					strokeLinecap="round"
					fill="none"
				/>
			)}

			{/* Arm — only for wave/celebrate poses */}
			{pose !== "idle" && (
				<path
					d={pose === "wave" ? "M92 62c8-4 14-14 12-24" : "M92 60c10 2 18-6 20-18"}
					stroke="var(--accent)"
					strokeWidth="7"
					strokeLinecap="round"
					fill="none"
				/>
			)}

			{/* Celebrate sparkles */}
			{pose === "celebrate" && (
				<>
					<path d="M18 30l3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z" fill="var(--character-amber)" />
					<path d="M100 90l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Z" fill="var(--character-sky)" />
				</>
			)}
		</svg>
	)
}
