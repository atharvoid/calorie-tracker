import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { db } from "@/db"
import { accounts, sessions, users, verificationTokens } from "@/db/schema"

// Force standard production URLs to prevent Vercel default domain overriding NextAuth redirect URIs
process.env.AUTH_URL = "https://logcals.vercel.app"
process.env.NEXTAUTH_URL = "https://logcals.vercel.app"

export const { handlers, auth, signIn, signOut } = NextAuth({
	basePath: "/api/auth",
	trustHost: true,
	redirectProxyUrl: "https://logcals.vercel.app/api/auth",
	adapter: DrizzleAdapter(db, {
		usersTable: users,
		accountsTable: accounts,
		sessionsTable: sessions,
		verificationTokensTable: verificationTokens,
	}),
	session: { strategy: "database" },
	providers: [
		Google({
			allowDangerousEmailAccountLinking: true,
			authorization: {
				params: {
					access_type: "offline",
					prompt: "consent",
					scope:
						"openid email profile https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file",
				},
			},
		}),
	],
})
