import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { db } from "@/db"
import { accounts, sessions, users, verificationTokens } from "@/db/schema"

export const { handlers, auth, signIn, signOut } = NextAuth({
	basePath: "/api/auth",
	trustHost: true,
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
