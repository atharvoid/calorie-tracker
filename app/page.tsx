import { AuthButton } from "@/components/auth-button"
import { ThemeToggle } from "@/components/theme-toggle"
import { auth, signIn } from "@/auth"
import Link from "next/link"
import { DemoApp } from "@/components/demo-app"
import { PRIMARY_BTN } from "@/lib/ui"
import { cn } from "@/lib/utils"
import { ShieldAlert } from "lucide-react"
import { HeroDemo } from "@/components/landing/hero-demo"
import { getActiveExperience } from "@/lib/experience-mode"

async function handleSignIn() {
	"use server"
	await signIn("google", { redirectTo: "/?tab=today" })
}

export default async function Home(props: {
	searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
	const resolvedParams = props.searchParams ? await props.searchParams : undefined
	const searchUrlParams = new URLSearchParams()
	if (resolvedParams) {
		for (const [key, value] of Object.entries(resolvedParams)) {
			if (typeof value === "string") searchUrlParams.set(key, value)
		}
	}

	const session = await auth()
	const signedIn = !!session?.user
	const experience = getActiveExperience(searchUrlParams)
	const isImprint = experience === "imprint"

	if (signedIn) {
		return (
			<main className={cn("app-backdrop", isImprint && "theme-imprint")}>
				<div className="mx-auto max-w-5xl px-4 pt-6 pb-20 sm:px-6 sm:pt-14 md:pt-10">
					{/* Top nav bar - hidden on mobile, shown on desktop/tablet */}
					<div className="mb-6 hidden items-center justify-between md:mb-10 md:flex">
						<Link
							href="/?tab=today"
							className="flex items-center gap-2 hover:opacity-90 focus:outline-none"
						>
							<span className="text-primary text-lg font-semibold tracking-tight">
								Calorie <span className="text-accent">Tracker</span>
							</span>
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

	return (
		<main
			className={cn(
				"app-backdrop bg-canvas text-primary min-h-screen",
				isImprint && "theme-imprint"
			)}
		>
			<div className="mx-auto max-w-5xl px-4 pt-10 pb-20 sm:px-6 sm:pt-14">
				{/* Top nav bar */}
				<div className="mb-16 flex items-center justify-between">
					<div className="flex items-center gap-2">
						<span className="text-primary text-lg font-semibold tracking-tight">
							Calorie <span className="text-accent">Tracker</span>
						</span>
					</div>
					<div className="flex items-center gap-3">
						<ThemeToggle />
						<AuthButton />
					</div>
				</div>

				{/* Hero Section */}
				<section className="mb-20 flex flex-col items-center justify-between gap-12 md:flex-row">
					<div className="flex-1 space-y-6 text-left">
						<div className="bg-accent/10 text-accent inline-flex items-center rounded-full px-3 py-1 text-xs font-medium">
							Your food, rendered as a day.
						</div>
						<h1 className="text-primary text-4xl leading-tight font-semibold tracking-tight sm:text-6xl">
							Track naturally. Visualise daily.
						</h1>
						<p className="text-secondary text-base leading-relaxed sm:text-lg">
							Describe what you ate in your own words. Confirm the estimation, and build a
							beautiful, personal archive of your daily eating patterns.
						</p>

						<div className="flex flex-col gap-3 pt-2 sm:flex-row">
							<form action={handleSignIn}>
								<button
									type="submit"
									className={cn(
										"rounded-btn w-full cursor-pointer px-6 py-3 text-center text-sm font-bold shadow-sm transition-all sm:w-auto",
										PRIMARY_BTN
									)}
								>
									Start free for 7 days
								</button>
							</form>
						</div>
					</div>

					<div className="w-full max-w-md flex-1">
						<HeroDemo />
					</div>
				</section>

				{/* Narrative Sections */}
				<section
					id="features"
					className="border-subtle/40 mb-24 scroll-mt-20 space-y-20 border-t pt-16"
				>
					<div className="mx-auto max-w-2xl space-y-16">
						<div className="space-y-3">
							<span className="text-accent font-mono text-[10px] font-bold tracking-wider uppercase">
								01 · Input
							</span>
							<h2 className="text-primary text-xl font-bold">Say it naturally.</h2>
							<p className="text-secondary text-sm leading-relaxed">
								No complex database searches or rigid food lookups. Describe mixed meals, home
								cooking, or restaurant dishes in plain English or Hinglish.
							</p>
						</div>

						<div className="space-y-3">
							<span className="text-accent font-mono text-[10px] font-bold tracking-wider uppercase">
								02 · Resolution
							</span>
							<h2 className="text-primary text-xl font-bold">See what was understood.</h2>
							<p className="text-secondary text-sm leading-relaxed">
								Your descriptions resolve instantly into clean, structured food items with estimated
								calories and macros. Edit and customize quantities or notes at any time.
							</p>
						</div>

						<div className="space-y-3">
							<span className="text-accent font-mono text-[10px] font-bold tracking-wider uppercase">
								03 · Representation
							</span>
							<h2 className="text-primary text-xl font-bold">Watch the day take shape.</h2>
							<p className="text-secondary text-sm leading-relaxed">
								Every confirmed day creates a unique visual imprint. Calorie counts scale the
								shapes, protein levels nested contours, and fat share the color opacity.
							</p>
						</div>

						<div className="space-y-3">
							<span className="text-accent font-mono text-[10px] font-bold tracking-wider uppercase">
								04 · Archive
							</span>
							<h2 className="text-primary text-xl font-bold">Return to an archive of days.</h2>
							<p className="text-secondary text-sm leading-relaxed">
								Navigate back in time to review past imprints, add entries, or edit historical logs.
								Missing days remain unlogged, preventing false zero statistics.
							</p>
						</div>

						<div className="space-y-3">
							<span className="text-accent font-mono text-[10px] font-bold tracking-wider uppercase">
								05 · Observations
							</span>
							<h2 className="text-primary text-xl font-bold">Notice patterns.</h2>
							<p className="text-secondary text-sm leading-relaxed">
								See macro balances, rhythmic logging trends, and recurring items over weeks or
								months, structured into clean, deterministic summaries.
							</p>
						</div>

						<div className="space-y-3">
							<span className="text-accent font-mono text-[10px] font-bold tracking-wider uppercase">
								06 · Mobile Companion
							</span>
							<h2 className="text-primary text-xl font-bold">Log on the go with Telegram.</h2>
							<p className="text-secondary text-sm leading-relaxed">
								Connect your account to the companion bot. Log your meals by sending a quick message
								on the run, and watch it sync to your dashboard instantly.
							</p>
						</div>
					</div>
				</section>

				{/* Google Sheets Integration & Purpose Disclosure */}
				<section className="rounded-card border-subtle bg-surface mx-auto mb-24 max-w-2xl space-y-4 border p-8">
					<h2 className="text-primary flex items-center gap-2 text-lg font-bold">
						<span className="text-accent">●</span> Google Sheets Integration & Purpose
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
								allows the app to create a dedicated spreadsheet named{" "}
								<strong>"Calorie Tracker — Data Assistant"</strong> in your Google Drive.
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
				<section className="mx-auto mb-24 max-w-md text-center">
					<h2 className="mb-2 text-2xl font-semibold">Simple, transparent pricing</h2>
					<p className="text-secondary mb-8 text-sm">
						Choose the subscription plan that works for you.
					</p>

					<div className="rounded-card border-subtle bg-surface flex flex-col gap-6 border p-8 text-left">
						<div>
							<h3 className="text-primary text-xl font-semibold">Personal</h3>
							<p className="text-secondary mt-1 text-sm">
								For people who want fast meal logging and a clear daily record.
							</p>
						</div>

						<div className="flex items-baseline gap-1">
							<span className="text-primary text-3xl font-bold tracking-tight">$2.99</span>
							<span className="text-muted text-sm">/ month</span>
						</div>

						<ul className="text-secondary border-subtle space-y-3 border-t pt-6 text-sm">
							<li className="flex items-center gap-2">
								<span className="text-accent">✓</span> Meal logging from web and Telegram
							</li>
							<li className="flex items-center gap-2">
								<span className="text-accent">✓</span> Estimated calories and macros
							</li>
							<li className="flex items-center gap-2">
								<span className="text-accent">✓</span> Daily and weekly history
							</li>
							<li className="flex items-center gap-2">
								<span className="text-accent">✓</span> Nutrition analytics
							</li>
							<li className="flex items-center gap-2">
								<span className="text-accent">✓</span> Targets and day-specific adjustments
							</li>
							<li className="flex items-center gap-2">
								<span className="text-accent">✓</span> Google Sheets copy
							</li>
							<li className="flex items-center gap-2">
								<span className="text-accent">✓</span> Data export
							</li>
						</ul>

						<form action={handleSignIn} className="mt-4 w-full">
							<button
								type="submit"
								className={cn(
									"rounded-btn w-full cursor-pointer py-3 text-center text-base font-semibold transition-all",
									PRIMARY_BTN
								)}
							>
								Start free for 7 days
							</button>
						</form>
					</div>
				</section>

				{/* Footer & Disclosure */}
				<footer className="border-subtle text-muted flex flex-col gap-4 border-t pt-10 text-center text-xs">
					<div className="text-danger/80 mx-auto flex max-w-xl items-center justify-center gap-2 leading-relaxed">
						<ShieldAlert className="h-4 w-4 shrink-0" />
						<span>
							Nutrition values are estimates. Portions, recipes, brands, and cooking methods can
							change the result. Review each meal before saving.
						</span>
					</div>
					<div>&copy; {new Date().getFullYear()} Calorie Tracker. All rights reserved.</div>
					<div className="text-muted flex justify-center gap-4 text-[11px]">
						<Link
							href="/privacy"
							className="hover:text-secondary transition-colors hover:underline"
						>
							Privacy Policy
						</Link>
						<span>·</span>
						<Link href="/terms" className="hover:text-secondary transition-colors hover:underline">
							Terms of Service
						</Link>
					</div>
				</footer>
			</div>
		</main>
	)
}
