import { notFound } from "next/navigation"

/**
 * Production guard for the Daily Imprint prototype acceptance gate.
 *
 * Accessible in:
 *   - Local development (NODE_ENV !== "production")
 *   - Vercel Preview deployments with IMPRINT_PROTOTYPE_PREVIEW=true set in Preview scope
 *
 * Returns 404 in:
 *   - Vercel Production (NODE_ENV=production, flag unset or false)
 *
 * Do NOT expose IMPRINT_PROTOTYPE_PREVIEW via NEXT_PUBLIC_* — this is server-only.
 */
export default function ImprintPrototypeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const allowed =
    process.env.NODE_ENV !== "production" ||
    process.env.IMPRINT_PROTOTYPE_PREVIEW === "true"

  if (!allowed) {
    notFound()
  }

  return <>{children}</>
}
