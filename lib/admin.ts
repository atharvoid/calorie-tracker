function normalizeEmail(email: string): string {
	return email.trim().toLowerCase()
}

/**
 * Returns true only when the signed-in email appears in the explicitly
 * configured ADMIN_EMAILS allowlist. Missing or empty configuration fails
 * closed in every environment; there is no built-in account fallback.
 */
export function isAdminEmail(
	email: string | null | undefined,
	configuredEmails = process.env.ADMIN_EMAILS
): boolean {
	if (!email || !configuredEmails) return false

	const candidate = normalizeEmail(email)
	if (!candidate) return false

	return configuredEmails
		.split(",")
		.map(normalizeEmail)
		.filter(Boolean)
		.includes(candidate)
}
