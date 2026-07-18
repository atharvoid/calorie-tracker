"use client"

import React, { useState } from "react"
import { Sun, Moon } from "lucide-react"
import { useTheme } from "@/components/theme-provider"
import { cn } from "@/lib/utils"

type Props = {
  className?: string
}

export function ThemeToggle({ className }: Props) {
  const { theme, toggleTheme } = useTheme()
  const [announcement, setAnnouncement] = useState<string>("")

  const isDark = theme === "dark"
  const label = isDark ? "Switch to light theme" : "Switch to dark theme"

  const handleClick = () => {
    toggleTheme()
    setAnnouncement(isDark ? "Light theme enabled" : "Dark theme enabled")
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        aria-label={label}
        title={label}
        className={cn(
          "h-11 w-11 rounded-full flex items-center justify-center transition-colors border border-subtle bg-surface hover:bg-elevated text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer shadow-sm",
          className
        )}
      >
        {isDark ? (
          <Sun className="h-5 w-5 text-accent transition-transform duration-200 hover:rotate-45" />
        ) : (
          <Moon className="h-5 w-5 text-accent transition-transform duration-200 hover:-rotate-12" />
        )}
      </button>

      {/* Screen-reader live region announcement */}
      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
    </>
  )
}
