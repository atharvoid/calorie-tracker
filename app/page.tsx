import { DemoApp } from "@/components/demo-app"
import { AuthButton } from "@/components/auth-button"
import { auth } from "@/auth"

export default async function Home() {
	const session = await auth()

	return (
		<main className="app-backdrop">
			<div className="mx-auto max-w-5xl px-4 pb-20 pt-10 sm:px-6 sm:pt-14">
				{/* Top nav bar */}
				<div className="mb-10 flex items-center justify-between">
					<div className="flex items-center gap-2">
						<span className="text-lg font-semibold tracking-tight text-primary">
							Calorie<span className="text-accent">Tracker</span>
						</span>
					</div>
					<AuthButton />
				</div>

				{/* Hero */}
				<header className="mb-12 text-center">
					<h1 className="text-4xl font-semibold tracking-tight text-primary sm:text-5xl">
						Calorie tracker for{" "}
						<span className="text-accent">Indian home food</span>
					</h1>
					<p className="mt-4 text-base text-secondary sm:text-lg">
						Message the bot what you ate — get kcal, protein, carbs & fat in seconds.
					</p>
					<p className="mt-1 text-sm text-muted">
						Hindi, English, or mixed — roti, dal, chicken, sabzi, all understood.
					</p>
				</header>

				<DemoApp signedIn={!!session?.user} userId={session?.user?.id} />
			</div>
		</main>
	)
}
