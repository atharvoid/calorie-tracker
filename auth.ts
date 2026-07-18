import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { db } from "@/db"
import { accounts, sessions, users, verificationTokens } from "@/db/schema"

if (!process.env.AUTH_URL && !process.env.NEXTAUTH_URL && !process.env.VERCEL_URL) {
  process.env.AUTH_URL = process.env.NEXT_PUBLIC_APP_URL || "https://logcals.vercel.app"
}

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
	callbacks: {
		session({ session, user }) {
			if (session.user && user) {
				session.user.id = user.id
			}
			return session
		},
	},
	providers: [
		Google({
			allowDangerousEmailAccountLinking: true,
			authorization: {
				params: {
					access_type: "offline",
					prompt: "consent",
					scope:
						"openid email profile https://www.googleapis.com/auth/drive.file",
				},
			},
		}),
	],
})
