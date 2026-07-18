import { AuthButton } from "@/components/auth-button"
import { auth, signIn } from "@/auth"
import Link from "next/link"
import { DemoApp } from "@/components/demo-app"
import { PRIMARY_BTN, SECONDARY_BTN } from "@/lib/ui"
import { cn } from "@/lib/utils"
import { BarChart3, Bot, Calendar, Database, ShieldAlert } from "lucide-react"
import { HeroDemo } from "@/components/landing/hero-demo"

async function handleSignIn() {
  "use server"
  await signIn("google", { redirectTo: "/?tab=today" })
}

export default async function Home() {
  const session = await auth()
  const signedIn = !!session?.user
  const showImprint = process.env.NEXT_PUBLIC_DAILY_IMPRINT_UI !== "off"

  if (signedIn) {
    return (
      <main className={cn("app-backdrop", showImprint && "theme-imprint")}>
        <div className="mx-auto max-w-5xl px-4 pb-20 pt-6 md:pt-10 sm:px-6 sm:pt-14">
          {/* Top nav bar - hidden on mobile, shown on desktop/tablet */}
          <div className="mb-6 md:mb-10 hidden md:flex items-center justify-between">
            <Link href="/?tab=today" className="flex items-center gap-2 focus:outline-none hover:opacity-90">
              <span className="text-lg font-semibold tracking-tight text-primary">
                Calorie<span className="text-accent">Tracker</span>
              </span>
            </Link>
            <AuthButton />
          </div>

          <DemoApp signedIn={true} userId={session?.user?.id} user={session?.user} />
        </div>
      </main>
    )
  }

  return (
    <main className={cn("app-backdrop min-h-screen bg-canvas text-primary", showImprint && "theme-imprint")}>
      <div className="mx-auto max-w-5xl px-4 pb-20 pt-10 sm:px-6 sm:pt-14">
        {/* Top nav bar */}
        <div className="mb-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold tracking-tight text-primary">
              Calorie<span className="text-accent">Tracker</span>
            </span>
          </div>
          <AuthButton />
        </div>

        {/* Hero Section */}
        <section className="mb-20 flex flex-col md:flex-row gap-12 items-center justify-between">
          <div className="flex-1 text-left space-y-6">
            <div className="inline-flex items-center rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
              Your food, rendered as a day.
            </div>
            <h1 className="text-4xl font-semibold tracking-tight text-primary sm:text-6xl leading-tight">
              Track naturally. Visualise daily.
            </h1>
            <p className="text-base text-secondary sm:text-lg leading-relaxed">
              Describe what you ate in your own words. Confirm the estimation, and build a beautiful, personal archive of your daily eating patterns.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <form action={handleSignIn}>
                <button
                  type="submit"
                  className={cn("w-full sm:w-auto rounded-btn px-6 py-3 text-sm font-bold shadow-sm transition-all cursor-pointer text-center", PRIMARY_BTN)}
                >
                  Start free for 7 days
                </button>
              </form>
            </div>
          </div>

          <div className="flex-1 w-full max-w-md">
            <HeroDemo />
          </div>
        </section>

        {/* Narrative Sections */}
        <section id="features" className="mb-24 scroll-mt-20 space-y-20 border-t border-subtle/40 pt-16">
          <div className="max-w-2xl mx-auto space-y-16">
            <div className="space-y-3">
              <span className="text-[10px] font-bold text-accent font-mono uppercase tracking-wider">01 · Input</span>
              <h2 className="text-xl font-bold text-primary">Say it naturally.</h2>
              <p className="text-sm text-secondary leading-relaxed">
                No complex database searches or rigid food lookups. Describe mixed meals, home cooking, or restaurant dishes in plain English or Hinglish.
              </p>
            </div>

            <div className="space-y-3">
              <span className="text-[10px] font-bold text-accent font-mono uppercase tracking-wider">02 · Resolution</span>
              <h2 className="text-xl font-bold text-primary">See what was understood.</h2>
              <p className="text-sm text-secondary leading-relaxed">
                Your descriptions resolve instantly into clean, structured food items with estimated calories and macros. Edit and customize quantities or notes at any time.
              </p>
            </div>

            <div className="space-y-3">
              <span className="text-[10px] font-bold text-accent font-mono uppercase tracking-wider">03 · Representation</span>
              <h2 className="text-xl font-bold text-primary">Watch the day take shape.</h2>
              <p className="text-sm text-secondary leading-relaxed">
                Every confirmed day creates a unique visual imprint. Calorie counts scale the shapes, protein levels nested contours, and fat share the color opacity.
              </p>
            </div>

            <div className="space-y-3">
              <span className="text-[10px] font-bold text-accent font-mono uppercase tracking-wider">04 · Archive</span>
              <h2 className="text-xl font-bold text-primary">Return to an archive of days.</h2>
              <p className="text-sm text-secondary leading-relaxed">
                Navigate back in time to review past imprints, add entries, or edit historical logs. Missing days remain unlogged, preventing false zero statistics.
              </p>
            </div>

            <div className="space-y-3">
              <span className="text-[10px] font-bold text-accent font-mono uppercase tracking-wider">05 · Observations</span>
              <h2 className="text-xl font-bold text-primary">Notice patterns.</h2>
              <p className="text-sm text-secondary leading-relaxed">
                See macro balances, rhythmic logging trends, and recurring items over weeks or months, structured into clean, deterministic summaries.
              </p>
            </div>

            <div className="space-y-3">
              <span className="text-[10px] font-bold text-accent font-mono uppercase tracking-wider">06 · Mobile Companion</span>
              <h2 className="text-xl font-bold text-primary">Log on the go with Telegram.</h2>
              <p className="text-sm text-secondary leading-relaxed">
                Connect your account to the companion bot. Log your meals by sending a quick message on the run, and watch it sync to your dashboard instantly.
              </p>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="mb-24 text-center max-w-md mx-auto">
          <h2 className="text-2xl font-semibold mb-2">Simple, transparent pricing</h2>
          <p className="text-sm text-secondary mb-8">Choose the subscription plan that works for you.</p>

          <div className="rounded-card border border-subtle bg-surface p-8 text-left flex flex-col gap-6">
            <div>
              <h3 className="text-xl font-semibold text-primary">Personal</h3>
              <p className="text-sm text-secondary mt-1">For people who want fast meal logging and a clear daily record.</p>
            </div>

            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold tracking-tight text-primary">$2.99</span>
              <span className="text-sm text-muted">/ month</span>
            </div>

            <ul className="space-y-3 text-sm text-secondary border-t border-subtle pt-6">
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

            <form action={handleSignIn} className="w-full mt-4">
              <button
                type="submit"
                className={cn("w-full rounded-btn py-3 text-base font-semibold transition-all cursor-pointer text-center", PRIMARY_BTN)}
              >
                Start free for 7 days
              </button>
            </form>
          </div>
        </section>

        {/* Footer & Disclosure */}
        <footer className="border-t border-subtle pt-10 text-center text-xs text-muted flex flex-col gap-4">
          <div className="flex items-center justify-center gap-2 text-danger/80 max-w-xl mx-auto leading-relaxed">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>
              Nutrition values are estimates. Portions, recipes, brands, and cooking methods can change the result. Review each meal before saving.
            </span>
          </div>
          <div>
            &copy; {new Date().getFullYear()} CalorieTracker. All rights reserved.
          </div>
        </footer>
      </div>
    </main>
  )
}
