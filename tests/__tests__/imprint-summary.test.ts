import { describe, expect, it } from "vitest"
import { buildScene } from "../../lib/imprint/scene"
import { MOCK_FIXTURES } from "../../lib/imprint/fixtures"

describe("imprint-summary", () => {
  it("renders a correct empty summary", () => {
    const scene = buildScene(MOCK_FIXTURES.empty)
    expect(scene.accessibleSummary).toBe("No meals logged for this day.")
  })

  it("renders correct values in a target-configured summary", () => {
    const scene = buildScene(MOCK_FIXTURES.fourBalanced)
    // 1850 kcal vs 2000 target -> 150 kcal below target
    expect(scene.accessibleSummary).toContain("1850 kcal across 9 items")
    expect(scene.accessibleSummary).toContain("135g protein")
    expect(scene.accessibleSummary).toContain("150 kcal below target")
  })

  it("handles over-target status accurately", () => {
    const scene = buildScene(MOCK_FIXTURES.overTarget)
    // 2600 kcal vs 2000 target -> 600 kcal above target
    expect(scene.accessibleSummary).toContain("600 kcal above target")
  })

  it("handles unconfigured target gracefully", () => {
    const scene = buildScene(MOCK_FIXTURES.noTarget)
    expect(scene.accessibleSummary).not.toContain("target")
    expect(scene.accessibleSummary).toBe("Sat, 18 Jul · 1850 kcal across 9 items · 135g protein")
  })
})
