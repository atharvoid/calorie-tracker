import { AuthButton } from "@/components/auth-button"
import { ThemeToggle } from "@/components/theme-toggle"
import { auth } from "@/auth"
import Link from "next/link"
import { Suspense } from "react"
import { NutritionShell } from "@/components/nutrition/nutrition-shell"
import { EmptyState } from "@/components/ui/empty-state"
import { cn } from "@/lib/utils"
import { getActiveExperience } from "@/lib/experience-mode"
import { getPublicPlan } from "@/lib/pricing"
import {
	HeroSection,
	FeaturesSection,
	PricingSection,
	LandingFooter,
} from "@/components/landing/landing-sections"

function BrandWordmark() {
	return (
		<span className="text-primary text-lg font-semibold tracking-tight">
			Calorie <span className="text-accent">Tracker</span>
		</span>
	)
}

export default async function Home(props: {
	searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
	const resolvedParams = props.searchParams ? await props.searchParams : undefined
	const searchUrlParams = new URLSearchParams()
	if (resolvedParams) {
		for (const [key, value] of Object.entries(resolvedParams)) {
			// Repeated query parameters arrive as an array. The previous
			// `typeof value === "string"` check silently discarded all of them.
			if (typeof value === "string") {
				searchUrlParams.append(key, value)
			} else if (Array.isArray(value)) {
				for (const entry of value) searchUrlParams.append(key, entry)
			}
		}
	}

	const session = await auth()
	const signedIn = !!session?.user
	const experience = getActiveExperience(searchUrlParams)
	const isImprint = experience === "imprint"

	// Signed-in and signed-out branches previously disagreed on the root
	// classes for no reason; both now use the same base.
	const rootClassName = cn(
		"app-backdrop bg-canvas text-primary min-h-screen",
		isImprint && "theme-imprint"
	)

	if (signedIn) {
		return (
			<main className={rootClassName}>
				<div className="mx-auto max-w-5xl px-4 pt-6 pb-20 sm:px-6 sm:pt-14 md:pt-10">
					{/* Desktop nav. The mobile equivalent lives in the nutrition shell. */}
					<div className="mb-6 hidden items-center justify-between md:mb-10 md:flex">
						<Link
							href="/?tab=today"
							className="focus-visible:ring-accent rounded-btn flex items-center gap-2 hover:opacity-90 focus-visible:ring-2 focus-visible:outline-none"
						>
							<BrandWordmark />
						</Link>
						<div className="flex items-center gap-3">
							<ThemeToggle />
							<AuthButton />
						</div>
					</div>

					<div className="w-full">
						{session?.user?.id ? (
							<Suspense fallback={null}>
								<NutritionShell userId={session.user.id} user={session.user} />
							</Suspense>
						) : (
							<EmptyState
								mascotPose="wave"
								title="Sign in to see your Calorie Tracker"
								hint="Your logged meals from Telegram will appear here live."
							/>
						)}
					</div>
				</div>
			</main>
		)
	}

	const personal = getPublicPlan("personal")
	const byok = getPublicPlan("byok")

	return (
		<main className={rootClassName}>
			<div className="mx-auto max-w-5xl px-4 pt-10 pb-20 sm:px-6 sm:pt-14">
				{/* Top nav bar */}
				<div className="mb-16 flex items-center justify-between">
					<div className="flex items-center gap-2">
						<BrandWordmark />
					</div>
					<div className="flex items-center gap-3">
						<ThemeToggle />
						<AuthButton />
					</div>
				</div>

				<HeroSection personal={personal} />
				<FeaturesSection />
				<PricingSection personal={personal} byok={byok} />
				<LandingFooter />
			</div>
		</main>
	)
}
