import { AuthButton } from "@/components/auth-button"
import { ThemeToggle } from "@/components/theme-toggle"
import { auth } from "@/auth"
import Link from "next/link"
import { DemoApp } from "@/components/demo-app"
import { PRIMARY_BTN } from "@/lib/ui"
import { cn } from "@/lib/utils"
import { Info, KeyRound } from "lucide-react"
import { HeroDemo } from "@/components/landing/hero-demo"
import { Spotlight } from "@/components/landing/spotlight"
import { BentoGrid, BentoGridItem } from "@/components/landing/bento-grid"
import { GlareCard } from "@/components/landing/glare-card"
import { Mascot } from "@/components/mascot"
import { getActiveExperience } from "@/lib/experience-mode"
import { signInAction } from "@/components/auth-actions"
import { getPublicPlan, TRIAL_DAYS } from "@/lib/pricing"

/** The spreadsheet the Drive scope is requested for. Must match lib/sheets-sync.ts. */
const SHEET_TITLE = "Calorie Tracker — Meal Log"

function BrandWordmark() {
	return (
		<span className="text-primary text-lg font-semibold tracking-tight">
			Calorie <span className="text-accent">Tracker</span>
		</span>
	)
}

/**
 * Both call-to-action forms were previously written out verbatim, so any change
 * to sign-in styling had to be made twice and the two copies would drift.
 */
function SignInForm({
	label,
	variant = "primary",
	className,
}: {
	label: string
	variant?: "primary" | "outline"
	className?: string
}) {
	return (
		<form action={signInAction} className={className}>
			<button
				type="submit"
				className={cn(
					"rounded-btn w-full cursor-pointer py-3 text-center font-semibold transition-all",
					"focus-visible:ring-accent focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
					variant === "primary"
						? PRIMARY_BTN
						: "border-subtle bg-elevated text-primary hover:bg-canvas border"
				)}
			>
				{label}
			</button>
		</form>
	)
}

function PlanFeatures({ features }: { features: readonly string[] }) {
	return (
		<ul className="text-secondary border-subtle space-y-3 border-t pt-6 text-sm">
			{features.map((feature) => (
				<li key={feature} className="flex items-center gap-2">
					<span className="text-accent" aria-hidden="true">
						✓
					</span>{" "}
					{feature}
				</li>
			))}
		</ul>
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

					<DemoApp signedIn={true} userId={session?.user?.id} user={session?.user} />
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

				{/* Hero Section */}
				<section className="relative mb-20 flex flex-col items-center justify-between gap-12 md:flex-row">
					<Spotlight />
					<div className="flex-1 space-y-6 text-left">
						<div className="flex items-center gap-3">
							<Mascot pose="wave" className="h-12 w-12 shrink-0 sm:h-14 sm:w-14" />
							<div className="bg-accent/10 text-accent inline-flex items-center rounded-full px-3 py-1 text-xs font-medium">
								Your food, rendered as a day.
							</div>
						</div>
						<h1 className="text-primary font-display text-4xl leading-[1.05] font-semibold tracking-tight sm:text-6xl">
							Track naturally. <br className="hidden sm:block" />
							Visualise daily.
						</h1>
						<p className="text-secondary text-base leading-relaxed sm:text-lg">
							Describe what you ate in your own words. Confirm the estimation, and build a
							beautiful, personal archive of your daily eating patterns.
						</p>

						<div className="flex flex-col gap-3 pt-2 sm:flex-row">
							<SignInForm label={`Start free for ${TRIAL_DAYS} days`} className="w-full sm:w-auto" />
						</div>
						<p className="text-muted text-xs">
							Or bring your own free API key later — no card required, ever.
						</p>
					</div>

					<div className="w-full max-w-md flex-1">
						<HeroDemo />
					</div>
				</section>

				{/* Narrative Sections */}
				<section id="features" className="border-subtle/40 mb-24 scroll-mt-20 border-t pt-16">
					<div className="mx-auto max-w-5xl">
						<BentoGrid>
							<BentoGridItem
								index="01 · Input"
								title="Say it naturally."
								description="No complex database searches or rigid food lookups. Describe mixed meals, home cooking, or restaurant dishes in plain English or Hinglish."
							/>
							<BentoGridItem
								index="02 · Resolution"
								title="See what was understood."
								description="Your descriptions resolve instantly into clean, structured food items with estimated calories and macros. Edit and customize quantities or notes at any time."
							/>
							<BentoGridItem
								index="03 · Representation"
								title="Watch the day take shape."
								description="Every confirmed day creates a unique visual imprint. Calorie counts scale the shapes, protein levels add nested contours, and fat shifts the colour opacity."
								className="sm:col-span-2 lg:col-span-1"
							/>
							<BentoGridItem
								index="04 · Archive"
								title="Return to an archive of days."
								description="Navigate back in time to review past imprints, add entries, or edit historical logs. Missing days remain unlogged, preventing false zero statistics."
							/>
							<BentoGridItem
								index="05 · Observations"
								title="Notice patterns."
								description="See macro balances, rhythmic logging trends, and recurring items over weeks or months, structured into clean, deterministic summaries."
							/>
							<BentoGridItem
								index="06 · Mobile Companion"
								title="Log on the go with Telegram."
								description="Connect your account to the companion bot. Log your meals by sending a quick message on the run, and watch it sync to your dashboard instantly."
							/>
							<BentoGridItem
								index="07 · Bring Your Own Key"
								title="Or don't pay us at all."
								description="Add your own free Google AI Studio API key in Settings, and log meals with no trial limit, no daily cap, and no subscription — forever."
								className="sm:col-span-2 lg:col-span-1"
							/>
						</BentoGrid>
					</div>
				</section>

				{/* Google Sheets Integration & Purpose Disclosure */}
				<section className="rounded-card border-subtle bg-surface mx-auto mb-24 max-w-2xl space-y-4 border p-8">
					<h2 className="text-primary flex items-center gap-2 text-lg font-bold">
						<span className="text-accent" aria-hidden="true">
							●
						</span>{" "}
						Google Sheets Integration & Purpose
					</h2>
					<p className="text-secondary text-sm leading-relaxed">
						Calorie Tracker is a personal nutrition logging application designed to help you build a
						clear visual archive of your daily eating patterns. To provide a persistent backup and
						personal copy of your data, the app offers a Google Sheets synchronization feature.
					</p>
					<div className="bg-elevated/40 border-subtle/30 space-y-2 rounded-xl border p-4 text-xs">
						<p className="text-primary font-semibold">How we use your Google permissions:</p>
						<ul className="text-secondary list-disc space-y-1 pl-5">
							<li>
								We request the <code className="text-accent">/auth/drive.file</code> scope, which
								allows the app to create a single dedicated spreadsheet named{" "}
								<strong>&ldquo;{SHEET_TITLE}&rdquo;</strong> in your Google Drive.
							</li>
							<li>
								We write and append your daily meal logs, calorie counts, and macronutrient
								calculations solely to this specific spreadsheet.
							</li>
							<li>
								We do not access, view, or modify any other files or folders in your Google Drive.
								Your data remains fully under your own control.
							</li>
						</ul>
					</div>
				</section>

				{/* Pricing Section */}
				<section className="mx-auto mb-24 max-w-3xl text-center">
					<h2 className="mb-2 text-2xl font-semibold">Simple, transparent pricing</h2>
					<p className="text-secondary mb-8 text-sm">
						Pay us, or bring your own key and pay nothing. Your choice.
					</p>

					<div className="grid gap-6 sm:grid-cols-2">
						<div className="rounded-card border-subtle bg-surface flex flex-col gap-6 border p-8 text-left">
							<div>
								<h3 className="text-primary text-xl font-semibold">{personal.name}</h3>
								<p className="text-secondary mt-1 text-sm">{personal.tagline}</p>
							</div>

							<div className="flex items-baseline gap-1">
								<span className="text-primary text-3xl font-bold tracking-tight">
									{personal.priceLabel}
								</span>
								<span className="text-muted text-sm">{personal.periodLabel}</span>
							</div>

							<PlanFeatures features={personal.features} />

							<SignInForm label={personal.ctaLabel} className="mt-4 w-full" />
						</div>

						<GlareCard className="rounded-card">
							<div className="rounded-card border-accent/40 bg-surface relative flex flex-col gap-6 border-2 p-8 text-left">
								<span className="bg-accent text-2xs absolute -top-3 left-6 rounded-full px-3 py-1 font-bold tracking-wide text-[color:var(--accent-contrast)] uppercase">
									Free forever
								</span>
								<div>
									<h3 className="text-primary flex items-center gap-2 text-xl font-semibold">
										<KeyRound className="text-accent h-5 w-5" aria-hidden="true" /> {byok.name}
									</h3>
									<p className="text-secondary mt-1 text-sm">{byok.tagline}</p>
								</div>

								<div className="flex items-baseline gap-1">
									<span className="text-primary text-3xl font-bold tracking-tight">
										{byok.priceLabel}
									</span>
									<span className="text-muted text-sm">{byok.periodLabel}</span>
								</div>

								<PlanFeatures features={byok.features} />

								<SignInForm label={byok.ctaLabel} variant="outline" className="mt-4 w-full" />
							</div>
						</GlareCard>
					</div>
				</section>

				{/* Footer & Disclosure */}
				<footer className="border-subtle text-muted flex flex-col gap-4 border-t pt-10 text-center text-xs">
					{/* Informational, not a danger state — it renders on every visit. */}
					<div className="text-secondary mx-auto flex max-w-xl items-center justify-center gap-2 leading-relaxed">
						<Info className="h-4 w-4 shrink-0" aria-hidden="true" />
						<span>
							Nutrition values are estimates. Portions, recipes, brands, and cooking methods can
							change the result. Review each meal before saving.
						</span>
					</div>
					<div>&copy; {new Date().getFullYear()} Calorie Tracker. All rights reserved.</div>
					<div className="text-muted text-2xs flex justify-center gap-4">
						<Link
							href="/privacy"
							className="hover:text-secondary transition-colors hover:underline"
						>
							Privacy Policy
						</Link>
						<span aria-hidden="true">·</span>
						<Link href="/terms" className="hover:text-secondary transition-colors hover:underline">
							Terms of Service
						</Link>
					</div>
				</footer>
			</div>
		</main>
	)
}
