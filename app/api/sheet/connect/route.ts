export const dynamic = "force-dynamic";
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { ensureMealSheet } from "@/lib/sheets-sync"

export const runtime = "nodejs"

export async function POST() {
	const session = await auth()
	if (!session?.user?.id) {
		return NextResponse.json({ error: "Not signed in" }, { status: 401 })
	}
	try {
		const spreadsheetId = await ensureMealSheet(session.user.id)
		return NextResponse.json({
			spreadsheetId,
			url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
		})
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err)
		console.error("[sheet/connect]", err)
		return NextResponse.json({ error: "Connect failed", detail: msg }, { status: 500 })
	}
}
