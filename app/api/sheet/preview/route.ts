export const dynamic = "force-dynamic";
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { readRows } from "@/lib/sheets-sync"

export const runtime = "nodejs"

export async function GET() {
	const session = await auth()
	if (!session?.user?.id) {
		return NextResponse.json({ error: "Not signed in" }, { status: 401 })
	}
	try {
		return NextResponse.json(await readRows(session.user.id))
	} catch (err) {
		console.error("[sheet/preview]", err)
		return NextResponse.json({ error: "Preview failed" }, { status: 500 })
	}
}
