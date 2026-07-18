"use client"

export type ExperienceMode = "off" | "preview" | "on"

export function getExperienceMode(): ExperienceMode {
  const env = process.env.NEXT_PUBLIC_DAILY_IMPRINT_UI || "off"
  if (env === "on" || env === "preview" || env === "off") return env as ExperienceMode
  return "off"
}

// Retrieve active experience mode, checking query params, local storage, and the global flag
export function getActiveExperience(searchParams?: URLSearchParams): "classic" | "imprint" {
  const mode = getExperienceMode()
  if (mode === "off") return "classic"
  if (mode === "on") {
    if (searchParams?.get("experience") === "classic") return "classic"
    if (typeof window !== "undefined" && localStorage.getItem("experience") === "classic") return "classic"
    return "imprint"
  }

  // preview mode
  let exp: string | null = null
  if (searchParams) {
    exp = searchParams.get("experience")
  }
  if (!exp && typeof window !== "undefined") {
    exp = localStorage.getItem("experience")
  }

  if (exp === "imprint") {
    if (typeof window !== "undefined") {
      localStorage.setItem("experience", "imprint")
    }
    return "imprint"
  }
  if (exp === "classic") {
    if (typeof window !== "undefined") {
      localStorage.setItem("experience", "classic")
    }
    return "classic"
  }

  return "classic"
}
