import { randomBytes } from "crypto"
import { db } from "@/db"
import { linkTokens } from "@/db/schema"

export async function createLinkToken(userId: string): Promise<string> {
	const token = randomBytes(12).toString("hex")
	const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 min
	await db.insert(linkTokens).values({ token, userId, expiresAt })
	return token
}
