export const dynamic = "force-dynamic";
import { NextResponse } from "next/server"

export const runtime = "nodejs"

// This endpoint was used in v2 (order tracker) and is no longer active in v3 (calorie tracker).
// Meals are committed via the Telegram bot → commitNutrition().
export async function POST() {
	return NextResponse.json(
		{ error: "Endpoint retired in v3. Use the Telegram bot to log meals." },
		{ status: 410 }
	)
}
