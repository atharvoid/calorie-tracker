"use client"

import { Suspense } from "react"
import { Utensils } from "lucide-react"
import { EmptyState } from "@/components/ui/empty-state"
import { NutritionShell } from "./nutrition/nutrition-shell"

type DemoAppProps = {
  signedIn?: boolean
  userId?: string
}

export function DemoApp({ signedIn = false, userId }: DemoAppProps) {
  return (
    <div className="w-full">
      {signedIn && userId ? (
        <Suspense fallback={null}>
          <NutritionShell userId={userId} />
        </Suspense>
      ) : (
        <EmptyState
          icon={<Utensils className="h-8 w-8" />}
          title="Sign in to see your Calorie Tracker"
          hint="Your logged meals from Telegram will appear here live."
        />
      )}
    </div>
  )
}
