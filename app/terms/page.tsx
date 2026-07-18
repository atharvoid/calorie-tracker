import Link from "next/link"
import { FileText } from "lucide-react"

export default function TermsPage() {
  return (
    <main className="app-backdrop min-h-screen bg-canvas text-primary">
      <div className="mx-auto max-w-3xl px-6 pb-20 pt-10 sm:pt-14">
        {/* Header */}
        <div className="mb-12 flex items-center justify-between border-b border-subtle pb-6">
          <Link href="/" className="flex items-center gap-2 focus:outline-none hover:opacity-90">
            <span className="text-lg font-semibold tracking-tight text-primary">
              Calorie <span className="text-accent">Tracker</span>
            </span>
          </Link>
          <span className="text-xs text-muted">Terms of Service</span>
        </div>

        {/* Content */}
        <article className="space-y-8 text-sm sm:text-base leading-relaxed text-secondary">
          <header className="space-y-3">
            <div className="flex items-center gap-2.5 text-accent">
              <FileText className="h-6 w-6" />
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-primary">Terms of Service</h1>
            </div>
            <p className="text-xs text-muted">Last Updated: July 18, 2026</p>
          </header>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-primary font-mono">1. Acceptance of Terms</h2>
            <p>
              By accessing or using Calorie Tracker (the "Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our Service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-primary font-mono">2. Description of Service</h2>
            <p>
              Calorie Tracker provides users with tools to log food items, estimate calorie and macronutrient counts using AI models, build visual progress representation (imprints), and sync logs with Google Sheets.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-primary font-mono">3. User Responsibility & Disclosures</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong className="text-primary">Accuracy of Estimates:</strong> All calorie and macro estimates provided by our AI are for informational purposes only. Portion sizes, preparation styles, and brand variations affect nutritional content. Review all estimates before logging.
              </li>
              <li>
                <strong className="text-primary">Not Medical Advice:</strong> Calorie Tracker does not provide medical, clinical, or formal dietetic advice. Always consult a healthcare professional before starting any weight loss, training, or dietary program.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-primary font-mono">4. Integration & Third-Party Services</h2>
            <p>
              The Service integrates with Google Sheets API to synchronize log entries. By authorizing this integration, you grant us permission to create and update a designated spreadsheet file in your Google Drive. 
              We are not responsible for any issues, data loss, or service disruptions caused by Google Drive API or Telegram service operations.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-primary font-mono">5. Account Registration & Conduct</h2>
            <p>
              To use the Service, you must register using a Google Account. You agree to use the Service only for lawful purposes. We reserve the right to suspend or terminate accounts that engage in abuse, scraping, or malicious manipulation of our servers.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-primary font-mono">6. Disclaimer of Warranties</h2>
            <p>
              The Service is provided on an "as is" and "as available" basis. We make no representations or warranties of any kind, express or implied, regarding the accuracy, completeness, or reliability of any information, estimates, or data provided by the Service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-primary font-mono">7. Contact Developer Support</h2>
            <p>
              For any questions regarding these Terms of Service or to submit general inquiries, please contact developer support at <span className="text-primary font-semibold">atharvapatil.connect@gmail.com</span>.
            </p>
          </section>

          <footer className="border-t border-subtle pt-6 text-center text-xs text-muted">
            &copy; {new Date().getFullYear()} Calorie Tracker. All rights reserved.
          </footer>
        </article>
      </div>
    </main>
  )
}
