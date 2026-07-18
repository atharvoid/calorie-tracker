"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import {
  type ThemeMode,
  THEME_STORAGE_KEY,
  DEFAULT_THEME,
  isThemeMode,
  persistTheme,
} from "@/lib/theme-mode"

type ThemeContextType = {
  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => unknown
}

function syncRootThemeAttributes(theme: ThemeMode) {
  if (typeof document === "undefined") return
  const root = document.documentElement
  root.dataset.theme = theme
  root.classList.toggle("dark", theme === "dark")
  root.style.colorScheme = theme
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof document !== "undefined") {
      const rootTheme = document.documentElement.dataset.theme
      if (isThemeMode(rootTheme)) return rootTheme
    }
    return DEFAULT_THEME
  })

  // Ensure DOM matches active state on mount
  useEffect(() => {
    syncRootThemeAttributes(theme)
  }, [theme])

  // Listen for storage changes from other tabs
  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (e.key === THEME_STORAGE_KEY && isThemeMode(e.newValue)) {
        setThemeState(e.newValue)
        syncRootThemeAttributes(e.newValue)
      }
    }
    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
  }, [])

  const applyTheme = (nextTheme: ThemeMode) => {
    if (nextTheme === theme) return

    const commitTheme = () => {
      setThemeState(nextTheme)
      syncRootThemeAttributes(nextTheme)
      persistTheme(nextTheme)
    }

    const doc = document as ViewTransitionDocument
    if (
      typeof window !== "undefined" &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
      typeof doc.startViewTransition === "function"
    ) {
      doc.startViewTransition(commitTheme)
    } else {
      commitTheme()
    }
  }

  const toggleTheme = () => {
    applyTheme(theme === "dark" ? "light" : "dark")
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme: applyTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}
