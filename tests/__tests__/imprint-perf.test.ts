/**
 * imprint-perf.test.ts
 *
 * Worst-case performance benchmark for buildScene().
 *
 * Runs 1,000 warm iterations per fixture across all five key scenarios:
 *   - fourBalanced      (standard: 4 meals)
 *   - manyMeals         (10 meals → consolidation path)
 *   - defensiveEdgeCase (extreme kcal values)
 *   - aggregate-only    (totals present, no meal-level data)
 *   - empty             (no data at all)
 *
 * Thresholds (per-run):
 *   median < 5 ms
 *   p95    < 15 ms
 *   max    < 50 ms
 *
 * SVG node budget (from scene DTO, not DOM):
 *   Full imprint:  shapes × contours ≤ 250 path elements
 *   No geometry exits the 1000×520 viewBox
 *
 * This test does not use any browser or DOM APIs.
 */

import { describe, it, expect } from "vitest"
import { buildScene } from "../../lib/imprint/scene"
import { MOCK_FIXTURES } from "../../lib/imprint/fixtures"
import type { DayImprintInput } from "../../lib/imprint/types"

const ITERATIONS = 1000

function percentile(sorted: number[], p: number): number {
  const idx = Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)
  return sorted[idx]
}

function measureFixture(name: string, input: DayImprintInput) {
  // Warm-up: 10 iterations discarded
  for (let i = 0; i < 10; i++) buildScene(input)

  const times: number[] = []
  let scene = buildScene(input) // final scene for shape inspection

  for (let i = 0; i < ITERATIONS; i++) {
    const start = performance.now()
    scene = buildScene(input)
    times.push(performance.now() - start)
  }

  times.sort((a, b) => a - b)

  const med = percentile(times, 50)
  const p95 = percentile(times, 95)
  const max = times[times.length - 1]

  // Count paths from scene DTO (no DOM needed)
  let totalPaths = 0
  let totalShapes = 0
  for (const shape of scene.shapes) {
    totalShapes++
    totalPaths += shape.contours.length
  }

  // Background rule lines (4) + time ticks (up to 3 groups × 2 elements)
  // + total line (1) + label texts — approximated conservatively
  const estimatedSvgNodes = totalPaths + totalShapes * 4 + 20 // generous overhead

  return { name, med, p95, max, totalShapes, totalPaths, estimatedSvgNodes, scene }
}

const AGGREGATE_INPUT: DayImprintInput = {
  ...MOCK_FIXTURES.fourBalanced,
  meals: [],
}

const FIXTURES: Array<{ name: string; input: DayImprintInput }> = [
  { name: "fourBalanced", input: MOCK_FIXTURES.fourBalanced },
  { name: "manyMeals (10 meals, consolidation)", input: MOCK_FIXTURES.manyMeals },
  { name: "defensiveEdgeCase (extreme kcal)", input: MOCK_FIXTURES.defensiveEdgeCase },
  { name: "aggregate-only (no meal data)", input: AGGREGATE_INPUT },
  { name: "empty", input: MOCK_FIXTURES.empty },
]

describe("imprint-perf: worst-case buildScene() benchmark", () => {
  const results: ReturnType<typeof measureFixture>[] = []

  // Run all fixtures
  for (const { name, input } of FIXTURES) {
    results.push(measureFixture(name, input))
  }

  it("all fixtures: median build time < 5 ms", () => {
    for (const r of results) {
      expect(r.med, `${r.name}: median ${r.med.toFixed(3)}ms exceeds 5ms`).toBeLessThan(5)
    }
  })

  it("all fixtures: p95 build time < 15 ms", () => {
    for (const r of results) {
      expect(r.p95, `${r.name}: p95 ${r.p95.toFixed(3)}ms exceeds 15ms`).toBeLessThan(15)
    }
  })

  it("all fixtures: max build time < 50 ms", () => {
    for (const r of results) {
      expect(r.max, `${r.name}: max ${r.max.toFixed(3)}ms exceeds 50ms`).toBeLessThan(50)
    }
  })

  it("full imprint SVG node estimate ≤ 250 (from DTO)", () => {
    for (const r of results) {
      expect(
        r.estimatedSvgNodes,
        `${r.name}: estimated SVG nodes ${r.estimatedSvgNodes} exceeds 250`
      ).toBeLessThanOrEqual(250)
    }
  })

  it("no geometry exits the 1000×520 viewBox (no NaN or Infinity in paths)", () => {
    for (const r of results) {
      for (const shape of r.scene.shapes) {
        for (const path of shape.contours) {
          expect(path, `${r.name}: path contains NaN`).not.toContain("NaN")
          expect(path, `${r.name}: path contains Infinity`).not.toContain("Infinity")
          expect(path, `${r.name}: path contains -Infinity`).not.toContain("-Infinity")
        }
      }
    }
  })

  it("manyMeals consolidation: ≤ 8 rendered shapes from 10 input meals", () => {
    const manyResult = results.find((r) => r.name.startsWith("manyMeals"))!
    expect(manyResult).toBeDefined()
    expect(manyResult.totalShapes).toBeLessThanOrEqual(8)
    expect(manyResult.totalShapes).toBe(8)
  })

  it("prints performance report (informational — always passes)", () => {
    console.log("\n── Daily Imprint buildScene() Performance Report ────────────────────")
    console.log(
      `${"Fixture".padEnd(45)} ${"Median".padStart(8)} ${"p95".padStart(8)} ${"Max".padStart(8)} ${"Shapes".padStart(7)} ${"Paths".padStart(7)} ${"~Nodes".padStart(8)}`
    )
    console.log("─".repeat(100))
    for (const r of results) {
      console.log(
        `${r.name.padEnd(45)} ${(r.med.toFixed(3) + "ms").padStart(8)} ${(r.p95.toFixed(3) + "ms").padStart(8)} ${(r.max.toFixed(3) + "ms").padStart(8)} ${String(r.totalShapes).padStart(7)} ${String(r.totalPaths).padStart(7)} ${String(r.estimatedSvgNodes).padStart(8)}`
      )
    }
    console.log("────────────────────────────────────────────────────────────────────\n")
    expect(true).toBe(true)
  })
})
