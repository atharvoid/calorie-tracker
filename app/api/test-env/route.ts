import { NextResponse } from "next/server"

export async function GET() {
  const envKeys = Object.keys(process.env)
  const authKeys = envKeys.filter(k => k.includes("AUTH") || k.includes("APP_URL") || k.includes("VERCEL"))
  
  // Return presence of values and their lengths for debugging
  const debugInfo = authKeys.reduce((acc, key) => {
    const val = process.env[key]
    acc[key] = {
      exists: val !== undefined,
      length: val ? val.length : 0,
      prefix: val ? val.substring(0, Math.min(15, val.length)) : ""
    }
    return acc;
  }, {} as Record<string, any>)

  return NextResponse.json(debugInfo)
}
