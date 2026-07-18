import { describe, it, expect, beforeEach, afterEach } from "vitest"
import {
  THEME_STORAGE_KEY,
  DEFAULT_THEME,
  isThemeMode,
  getStoredTheme,
  persistTheme,
} from "@/lib/theme-mode"

class LocalStorageMock {
  private store: Record<string, string> = {}
  getItem(key: string) {
    return this.store[key] ?? null
  }
  setItem(key: string, value: string) {
    this.store[key] = String(value)
  }
  removeItem(key: string) {
    delete this.store[key]
  }
  clear() {
    this.store = {}
  }
}

const mockStorage = new LocalStorageMock()
globalThis.localStorage = mockStorage as unknown as Storage
globalThis.window = { localStorage: mockStorage } as unknown as Window & typeof globalThis

describe("Theme Mode Architecture", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it("isThemeMode correctly validates theme values", () => {
    expect(isThemeMode("dark")).toBe(true)
    expect(isThemeMode("light")).toBe(true)
    expect(isThemeMode("classic")).toBe(false)
    expect(isThemeMode("imprint")).toBe(false)
    expect(isThemeMode(null)).toBe(false)
    expect(isThemeMode(undefined)).toBe(false)
    expect(isThemeMode(123)).toBe(false)
  })

  it("defaults to dark when localStorage is empty", () => {
    expect(getStoredTheme()).toBe("dark")
    expect(DEFAULT_THEME).toBe("dark")
  })

  it("returns stored light theme when persisted", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "light")
    expect(getStoredTheme()).toBe("light")
  })

  it("falls back safely to dark if localStorage contains invalid string", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "invalid-theme-value")
    expect(getStoredTheme()).toBe("dark")
  })

  it("persists theme correctly to localStorage", () => {
    persistTheme("light")
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light")

    persistTheme("dark")
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark")
  })

  it("isolates color theme from product experience localStorage keys", () => {
    persistTheme("light")
    localStorage.setItem("experience", "classic")

    expect(getStoredTheme()).toBe("light")
    expect(localStorage.getItem("experience")).toBe("classic")
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light")
  })
})
