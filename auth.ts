import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { db } from "@/db"
import { accounts, sessions, users, verificationTokens } from "@/db/schema"

// Task A-17: never hardcode a deployment URL here. Previously this fell back to
// a specific Vercel host, so any environment that forgot NEXT_PUBLIC_APP_URL
// would silently point its OAuth callbacks at that deployment instead of
// failing loudly. If NEXT_PUBLIC_APP_URL is absent we now leave AUTH_URL unset
// and let Auth.js infer the origin from the incoming request, which is exactly
// what `trustHost: true` below enables.
if (!process.env.AUTH_URL && !process.env.NEXTAUTH_URL && process.env.NEXT_PUBLIC_APP_URL) {
	process.env.AUTH_URL = process.env.NEXT_PUBLIC_APP_URL
}

export const { handlers, auth, signIn, signOut } = NextAuth({
	basePath: "/api/auth",
	trustHost: true,
	secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
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
			// Task A-18: this is safe ONLY while Google is the single sign-in
			// provider. Google verifies the email address it returns, so linking an
			// OAuth account to an existing user by email address cannot be used to
			// hijack an account today.
			//
			// If a second provider is ever added (email/password, magic link, GitHub,
			// etc.) this MUST be set to false or removed first. Otherwise an attacker
			// who can present an unverified address on the new provider would be
			// auto-linked into the existing Google account that owns that address.
			allowDangerousEmailAccountLinking: true,
			authorization: {
				params: {
					access_type: "offline",
					prompt: "consent",
					scope: "openid email profile",
				},
			},
		}),
	],
})
