import { AuthButton } from "@/components/auth-button"
import { auth, signIn } from "@/auth"
import Link from "next/link"
import { DemoApp } from "@/components/demo-app"
import { PRIMARY_BTN, SECONDARY_BTN } from "@/lib/ui"
import { cn } from "@/lib/utils"
import { BarChart3, Bot, Calendar, Database, ShieldAlert } from "lucide-react"

async function handleSignIn() {
  "use server"
  await signIn("google", { redirectTo: "/?tab=today" })
}

export default async function Home() {
  const session = await auth()
  const signedIn = !!session?.user

  if (signedIn) {
    return (
      <main className="app-backdrop">
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
    <main className="app-backdrop min-h-screen bg-canvas text-primary">
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
        <section className="mb-20 text-center">
          <div className="mb-4 inline-flex items-center rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
            Simple meal tracking
          </div>
          <h1 className="mb-6 text-4xl font-semibold tracking-tight text-primary sm:text-6xl max-w-3xl mx-auto leading-tight">
            Track what you eat without searching a food database.
          </h1>
          <p className="mb-8 text-base text-secondary sm:text-lg max-w-2xl mx-auto">
            Describe your meal in your own words. Review the estimated calories and macros, then save it to your daily log.
          </p>

          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <form action={handleSignIn}>
              <button
                type="submit"
                className={cn("rounded-btn px-6 py-3 text-base font-medium shadow-sm transition-all cursor-pointer", PRIMARY_BTN)}
              >
                Start free for 7 days
              </button>
            </form>
            <a
              href="#features"
              className={cn("rounded-btn px-6 py-3 text-base font-medium transition-all text-center", SECONDARY_BTN)}
            >
              See how it works
            </a>
          </div>

          <p className="mt-4 text-xs text-muted">
            No card required. Cancel anytime after upgrading.
          </p>
        </section>

        {/* Features Grid */}
        <section id="features" className="mb-24 scroll-mt-20">
          <div className="grid gap-6 sm:grid-cols-2">
            {/* Telegram feature */}
            <div className="rounded-card border border-subtle bg-surface p-6 flex flex-col gap-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <Bot className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-primary">Log meals from Telegram</h3>
              <p className="text-sm text-secondary leading-relaxed">
                Send a message with what you ate. The bot returns an estimate for you to review before anything is saved.
              </p>
              <p className="text-xs text-muted italic mt-auto">
                Write naturally in English or Hinglish. Food names from different cuisines can stay in their original form.
              </p>
            </div>

            {/* Dashboard feature */}
            <div className="rounded-card border border-subtle bg-surface p-6 flex flex-col gap-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <BarChart3 className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-primary">See the whole day clearly</h3>
              <p className="text-sm text-secondary leading-relaxed">
                Follow calories, protein, carbs, and fat across meals. Compare your intake with your daily target and maintenance estimate.
              </p>
            </div>

            {/* History feature */}
            <div className="rounded-card border border-subtle bg-surface p-6 flex flex-col gap-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <Calendar className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-primary">Understand your routine over time</h3>
              <p className="text-sm text-secondary leading-relaxed">
                Review any day, browse complete weeks, and see trends without turning missing days into fake zero-calorie entries.
              </p>
            </div>

            {/* Google Sheets feature */}
            <div className="rounded-card border border-subtle bg-surface p-6 flex flex-col gap-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <Database className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-primary">Keep a copy in Google Sheets</h3>
              <p className="text-sm text-secondary leading-relaxed">
                Your meal history can be mirrored to a spreadsheet you control. The dashboard continues to use the faster, structured product database.
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
