import { NextResponse } from "next/server"
import NextAuth from "next-auth"
import { db } from "@/db"

export async function GET() {
  // Let's initialize NextAuth dynamically here to inspect what it does to the config at runtime!
  const config = {
    basePath: "/api/auth",
    trustHost: true,
    providers: [],
  }

  // We import setEnvDefaults from next-auth/lib/env.js to see what it does
  const { setEnvDefaults } = require("next-auth/lib/env.js")
  
  const before = { ...config }
  setEnvDefaults(config)
  const after = { ...config }

  return NextResponse.json({
    env: {
      AUTH_URL: process.env.AUTH_URL,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      VERCEL_URL: process.env.VERCEL_URL,
      VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
    },
    before,
    after,
  })
}
