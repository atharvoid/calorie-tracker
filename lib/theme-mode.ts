export type ThemeMode = "dark" | "light"

export const THEME_STORAGE_KEY = "logcals-theme"
export const DEFAULT_THEME: ThemeMode = "dark"

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === "dark" || value === "light"
}

export function getStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return DEFAULT_THEME
  try {
    const val = localStorage.getItem(THEME_STORAGE_KEY)
    if (isThemeMode(val)) return val
  } catch {}
  return DEFAULT_THEME
}

export function persistTheme(theme: ThemeMode): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {}
}
