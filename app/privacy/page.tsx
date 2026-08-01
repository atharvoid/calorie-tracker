import Link from "next/link"
import { Shield } from "lucide-react"

export default function PrivacyPage() {
	return (
		<main className="app-backdrop bg-canvas text-primary min-h-screen">
			<div className="mx-auto max-w-3xl px-6 pt-10 pb-20 sm:pt-14">
				{/* Header */}
				<div className="border-subtle mb-12 flex items-center justify-between border-b pb-6">
					<Link href="/" className="flex items-center gap-2 hover:opacity-90 focus:outline-none">
						<span className="text-primary text-lg font-semibold tracking-tight">
							Calorie <span className="text-accent">Tracker</span>
						</span>
					</Link>
					<span className="text-muted text-xs">Privacy Policy</span>
				</div>

				{/* Content */}
				<article className="text-secondary space-y-8 text-sm leading-relaxed sm:text-base">
					<header className="space-y-3">
						<div className="text-accent flex items-center gap-2.5">
							<Shield className="h-6 w-6" />
							<h1 className="text-primary text-2xl font-extrabold tracking-tight sm:text-3xl">
								Privacy Policy
							</h1>
						</div>
						<p className="text-muted text-xs">Last Updated: July 31, 2026</p>
					</header>

					<section className="space-y-3">
						<h2 className="text-primary font-mono text-lg font-bold">1. Information We Collect</h2>
						<p>
							We collect the minimum amount of user information necessary to provide the Calorie
							Tracker service:
						</p>
						<ul className="list-disc space-y-2 pl-5">
							<li>
								<strong className="text-primary">Google Account Information:</strong> When you
								register or sign in via Google OAuth, we receive your email address, name, and
								profile picture.
							</li>
							<li>
								<strong className="text-primary">Meal Logs:</strong> We store the food items,
								portions, and meal descriptions you submit via our web interface or companion
								Telegram bot.
							</li>
						</ul>
					</section>

					<section className="space-y-3">
						<h2 className="text-primary font-mono text-lg font-bold">
							2. How We Use Your Information
						</h2>
						<p>Your data is strictly used to deliver core nutrition tracking features:</p>
						<ul className="list-disc space-y-2 pl-5">
							<li>
								To estimate calorie and macronutrient values for logged meals using AI models.
							</li>
							<li>
								To build your personalized dashboard, daily visual imprints, and historical archive.
							</li>
						</ul>
						<p>
							We do not sell, trade, or share your personal data with third parties for marketing or
							advertising purposes.
						</p>
					</section>

					<section className="space-y-3">
						<h2 className="text-primary font-mono text-lg font-bold">
							3. Google API Scopes & User Data Permissions
						</h2>
						<p>
							Our application uses Google API scopes only for secure sign-in. We request only the
							minimum required access permissions:
						</p>
						<ul className="list-disc space-y-2 pl-5">
							<li>
								<code className="text-accent">openid</code> /{" "}
								<code className="text-accent">userinfo.email</code>: To authenticate your account
								securely.
							</li>
						</ul>
					</section>

					<section className="space-y-3">
						<h2 className="text-primary font-mono text-lg font-bold">4. Data Security</h2>
						<p>
							We take the security of your account and data very seriously. All communication
							between your browser and our servers is encrypted using HTTPS. Your authorization
							credentials and tokens are securely stored and encrypted in our database.
						</p>
					</section>

					<section className="space-y-3">
						<h2 className="text-primary font-mono text-lg font-bold">
							5. Data Retention & Deletion
						</h2>
						<p>
							We retain your meal logs and settings for as long as your account is active. You can
							request the deletion of your account and all associated meal logs at any time by
							contacting developer support at{" "}
							<span className="text-primary font-semibold">atharvapatil.connect@gmail.com</span>.
						</p>
					</section>

					<section className="space-y-3">
						<h2 className="text-primary font-mono text-lg font-bold">6. Changes to This Policy</h2>
						<p>
							We may update this Privacy Policy from time to time. Any changes will be reflected on
							this page with an updated revision date.
						</p>
					</section>

					<footer className="border-subtle text-muted border-t pt-6 text-center text-xs">
						&copy; {new Date().getFullYear()} Calorie Tracker. All rights reserved.
					</footer>
				</article>
			</div>
		</main>
	)
}
