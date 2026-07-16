import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getUserEntries } from "@/lib/entries"

export const runtime = "nodejs"

export async function GET() {
	const session = await auth()
	if (!session?.user?.id) {
		return NextResponse.json({ error: "Not signed in" }, { status: 401 })
	}
	return NextResponse.json({ rows: await getUserEntries(session.user.id) })
}
