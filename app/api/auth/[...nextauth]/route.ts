import { handlers } from "@/auth"
import { NextRequest } from "next/server"

export async function GET(req: NextRequest) {
  console.log("AUTH_GET_REQ_URL:", req.url)
  console.log("AUTH_GET_NEXTURL_HREF:", req.nextUrl.href)
  console.log("AUTH_GET_HEADERS_HOST:", req.headers.get("host"))
  console.log("AUTH_GET_HEADERS_X_FORWARDED_HOST:", req.headers.get("x-forwarded-host"))
  return handlers.GET(req)
}

export async function POST(req: NextRequest) {
  console.log("AUTH_POST_REQ_URL:", req.url)
  return handlers.POST(req)
}
