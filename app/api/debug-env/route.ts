import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    NEXT_PUBLIC_DAILY_IMPRINT_UI: process.env.NEXT_PUBLIC_DAILY_IMPRINT_UI || "NOT_SET",
    VERCEL_ENV: process.env.VERCEL_ENV || "NOT_SET",
  })
}
