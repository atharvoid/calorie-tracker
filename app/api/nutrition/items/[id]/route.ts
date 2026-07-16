import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { updateMealItem, deleteMealItem } from "@/lib/nutrition-queries"
import { z } from "zod"

export const runtime = "nodejs"

type ErrorBody = { error: { code: string; message: string; fieldErrors?: Record<string, string[]> } }
function errResponse(
  code: string, message: string, status: number,
  fieldErrors?: Record<string, string[]>
): NextResponse<ErrorBody> {
  return NextResponse.json(
    { error: { code, message, ...(fieldErrors ? { fieldErrors } : {}) } },
    { status }
  )
}

const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  grams: z.number().min(0).max(10000).nullable().optional(),
  kcal: z.number().min(0).max(10000).optional(),
  proteinG: z.number().min(0).max(1000).optional(),
  carbsG: z.number().min(0).max(2000).optional(),
  fatG: z.number().min(0).max(1000).optional(),
  notes: z.string().max(500).nullable().optional(),
  mealType: z
    .enum(["Breakfast", "Lunch", "Dinner", "Snack"])
    .nullable()
    .optional(),
})

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(
  req: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user?.id) return errResponse("UNAUTHORIZED", "Not signed in", 401)

  const { id } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return errResponse("INVALID_JSON", "Invalid JSON body", 400)
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "root"
      fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message]
    }
    return errResponse("VALIDATION_ERROR", "Invalid input", 422, fieldErrors)
  }

  try {
    const updated = await updateMealItem(session.user.id, id, parsed.data)
    return NextResponse.json({ item: updated })
  } catch (err) {
    if (err instanceof Error && err.message.includes("not found")) {
      return errResponse("NOT_FOUND", "Meal item not found", 404)
    }
    throw err
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user?.id) return errResponse("UNAUTHORIZED", "Not signed in", 401)

  const { id } = await params

  try {
    await deleteMealItem(session.user.id, id)
    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof Error && err.message.includes("not found")) {
      return errResponse("NOT_FOUND", "Meal item not found", 404)
    }
    throw err
  }
}
