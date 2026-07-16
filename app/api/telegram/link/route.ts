import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { createLinkToken } from "@/lib/link"

export const runtime = "nodejs"

export async function POST() {
	const session = await auth()
	if (!session?.user?.id) {
		return NextResponse.json({ error: "Not signed in" }, { status: 401 })
	}
	const token = await createLinkToken(session.user.id)
	const username = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME
	return NextResponse.json({ url: `https://t.me/${username}?start=${token}` })
}
