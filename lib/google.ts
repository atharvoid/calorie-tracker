import { google } from "googleapis"
import { and, eq } from "drizzle-orm"
import { db } from "@/db"
import { accounts } from "@/db/schema"

export async function getGoogleAuth(userId: string) {
	const [acct] = await db
		.select()
		.from(accounts)
		.where(and(eq(accounts.userId, userId), eq(accounts.provider, "google")))
		.limit(1)

	if (!acct?.refresh_token) {
		throw new Error(
			"No Google refresh token — please sign out and sign in again to re-grant Sheets access."
		)
	}

	const oauth2 = new google.auth.OAuth2(
		process.env.AUTH_GOOGLE_ID,
		process.env.AUTH_GOOGLE_SECRET
	)
	oauth2.setCredentials({
		refresh_token: acct.refresh_token,
		access_token: acct.access_token ?? undefined,
		expiry_date: acct.expires_at ? acct.expires_at * 1000 : undefined,
	})

	// Force a token refresh if the access token is expired or missing
	try {
		const now = Date.now()
		const expiry = acct.expires_at ? acct.expires_at * 1000 : 0
		if (!acct.access_token || expiry < now + 60_000) {
			await oauth2.refreshAccessToken()
		}
	} catch (err) {
		throw new Error(
			`Google token refresh failed (token may be revoked — sign out and sign in again): ${(err as Error).message}`
		)
	}

	return oauth2
}

type OAuth2 = InstanceType<typeof google.auth.OAuth2>
export const sheetsClient = (auth: OAuth2) => google.sheets({ version: "v4", auth })
export const driveClient = (auth: OAuth2) => google.drive({ version: "v3", auth })
