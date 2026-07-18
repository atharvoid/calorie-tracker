import { formatShortDate } from "../nutrition-date"
import type { DayImprintInput, DayImprintScene } from "./types"

export function generateAccessibleSummary(scene: DayImprintScene, input: DayImprintInput): string {
  if (scene.state === "empty" || !input.totals) {
    return "No meals logged for this day."
  }

  const { kcal, proteinG, itemCount } = input.totals
  const dateFormatted = formatShortDate(input.date)

  let summary = `${dateFormatted} · ${kcal} kcal across ${itemCount} item${itemCount !== 1 ? "s" : ""} · ${proteinG}g protein`

  const targetKcal = input.target.targetKcal
  if (targetKcal !== null) {
    const diff = Math.abs(kcal - targetKcal)
    if (kcal > targetKcal) {
      summary += ` · ${diff} kcal above target`
    } else if (kcal < targetKcal) {
      summary += ` · ${diff} kcal below target`
    } else {
      summary += ` · exactly at target`
    }
  }

  return summary
}
