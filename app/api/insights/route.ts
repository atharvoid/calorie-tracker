import { NextRequest, NextResponse } from "next/server"
import { generateObject } from "ai"
import { z } from "zod"
import { TEXT_MODEL } from "@/lib/ai"

export const runtime = "nodejs"
export const maxDuration = 30

const insightsSchema = z.object({
	insights: z.array(z.string()).min(3).max(6),
})

const SYSTEM = `You are a sharp, plain-spoken business analyst for a small Indian trading business owner.
You are given PRE-COMPUTED metrics that are already accurate. Never recompute or invent numbers.
Write 4-6 short, punchy insights the owner actually cares about.
Rules:
- Focus on money: biggest customers, who owes, collection vs outstanding, what's selling, growth/decline.
- One line each. Use concrete numbers from the metrics. Currency is INR (use the rupee sign, "L" for lakh, "k" for thousand where natural).
- Plain language, no jargon. A light Hindi/English mix is welcome.
- Pick the most decision-driving points; don't just restate every metric.
- Never state a number that isn't derivable from the given metrics.`

export async function POST(req: NextRequest) {
	let metrics: unknown
	try {
		metrics = (await req.json())?.metrics
	} catch {
		return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
	}

	if (metrics == null) {
		return NextResponse.json({ error: "No metrics provided" }, { status: 400 })
	}

	try {
		const { object } = await generateObject({
			model: TEXT_MODEL,
			schema: insightsSchema,
			system: SYSTEM,
			temperature: 0.4,
			prompt: `Metrics JSON:\n${JSON.stringify(metrics)}\n\nWrite the insights.`,
		})
		return NextResponse.json(object)
	} catch (err) {
		console.error("[insights] failed:", err)
		return NextResponse.json({ error: "Insights failed" }, { status: 500 })
	}
}
