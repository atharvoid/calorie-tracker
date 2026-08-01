import Link from "next/link"
import { FileText } from "lucide-react"

export default function TermsPage() {
	return (
		<main className="app-backdrop bg-canvas text-primary min-h-screen">
			<div className="mx-auto max-w-3xl px-6 pt-10 pb-20 sm:pt-14">
				{/* Header */}
				<div className="border-subtle mb-12 flex items-center justify-between border-b pb-6">
					<Link
						href="/"
						className="focus-visible:ring-accent rounded-btn flex items-center gap-2 hover:opacity-90 focus-visible:ring-2 focus-visible:outline-none"
					>
						<span className="text-primary text-lg font-semibold tracking-tight">
							Calorie <span className="text-accent">Tracker</span>
						</span>
					</Link>
					<span className="text-muted text-xs">Terms of Service</span>
				</div>

				{/* Content */}
				<article className="text-secondary space-y-8 text-sm leading-relaxed sm:text-base">
					<header className="space-y-3">
						<div className="text-accent flex items-center gap-2.5">
							<FileText className="h-6 w-6" />
							<h1 className="text-primary text-2xl font-extrabold tracking-tight sm:text-3xl">
								Terms of Service
							</h1>
						</div>
						<p className="text-muted text-xs">Last Updated: July 18, 2026</p>
					</header>

					<section className="space-y-3">
						<h2 className="text-primary font-mono text-lg font-bold">1. Acceptance of Terms</h2>
						<p>
							By accessing or using Calorie Tracker (the &ldquo;Service&rdquo;), you agree to be
							bound by these Terms of Service. If you do not agree to these terms, please do not use
							our Service.
						</p>
					</section>

					<section className="space-y-3">
						<h2 className="text-primary font-mono text-lg font-bold">2. Description of Service</h2>
						<p>
							Calorie Tracker provides users with tools to log food items, estimate calorie and
							macronutrient counts using AI models, build visual progress representation (imprints),
							and sync logs with Google Sheets.
						</p>
					</section>

					<section className="space-y-3">
						<h2 className="text-primary font-mono text-lg font-bold">
							3. User Responsibility & Disclosures
						</h2>
						<ul className="list-disc space-y-2 pl-5">
							<li>
								<strong className="text-primary">Accuracy of Estimates:</strong> All calorie and
								macro estimates provided by our AI are for informational purposes only. Portion
								sizes, preparation styles, and brand variations affect nutritional content. Review
								all estimates before logging.
							</li>
							<li>
								<strong className="text-primary">Not Medical Advice:</strong> Calorie Tracker does
								not provide medical, clinical, or formal dietetic advice. Always consult a
								healthcare professional before starting any weight loss, training, or dietary
								program.
							</li>
						</ul>
					</section>

					<section className="space-y-3">
						<h2 className="text-primary font-mono text-lg font-bold">
							4. Integration & Third-Party Services
						</h2>
						<p>
							The Service integrates with Google Sheets API to synchronize log entries. By
							authorizing this integration, you grant us permission to create and update a
							designated spreadsheet file in your Google Drive. We are not responsible for any
							issues, data loss, or service disruptions caused by Google Drive API or Telegram
							service operations.
						</p>
					</section>

					<section className="space-y-3">
						<h2 className="text-primary font-mono text-lg font-bold">
							5. Account Registration & Conduct
						</h2>
						<p>
							To use the Service, you must register using a Google Account. You agree to use the
							Service only for lawful purposes. We reserve the right to suspend or terminate
							accounts that engage in abuse, scraping, or malicious manipulation of our servers.
						</p>
					</section>

					<section className="space-y-3">
						<h2 className="text-primary font-mono text-lg font-bold">
							6. Disclaimer of Warranties
						</h2>
						<p>
							The Service is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo;
							basis. We make no representations or warranties of any kind, express or implied,
							regarding the accuracy, completeness, or reliability of any information, estimates, or
							data provided by the Service.
						</p>
					</section>

					<section className="space-y-3">
						<h2 className="text-primary font-mono text-lg font-bold">
							7. Contact Developer Support
						</h2>
						<p>
							For any questions regarding these Terms of Service or to submit general inquiries,
							please contact developer support at{" "}
							<span className="text-primary font-semibold">atharvapatil.connect@gmail.com</span>.
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
