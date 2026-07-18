import { describe, expect, it } from "vitest"
import { buildScene } from "../../lib/imprint/scene"
import { MOCK_FIXTURES } from "../../lib/imprint/fixtures"

describe("imprint-scene", () => {
  it("generates deterministic scene for identical inputs", () => {
    const scene1 = buildScene(MOCK_FIXTURES.fourBalanced)
    const scene2 = buildScene(MOCK_FIXTURES.fourBalanced)

    // Full meal scene: 4 meal shapes
    const mealShapes = scene1.shapes.filter((s) => s.kind === "meal")
    expect(mealShapes).toHaveLength(4)
    expect(scene1).toEqual(scene2)
  })

  it("aggregate state: totals with no meals emits one aggregate shape, suppressTimeAxis=true", () => {
    // Build an input with totals but no meals (simulates history summary scenario)
    const aggregateInput = {
      ...MOCK_FIXTURES.fourBalanced,
      meals: [],
    }
    const scene = buildScene(aggregateInput)

    expect(scene.shapes).toHaveLength(1)
    expect(scene.shapes[0].kind).toBe("aggregate")
    expect(scene.suppressTimeAxis).toBe(true)
    expect(scene.timeTicks).toHaveLength(0)
    expect(scene.accessibleSummary).not.toContain("No meals logged")
  })

  it("empty state: no meals and no totals emits no shapes, suppressTimeAxis=true", () => {
    const scene = buildScene(MOCK_FIXTURES.empty)

    expect(scene.state).toBe("empty")
    expect(scene.shapes).toHaveLength(0)
    expect(scene.suppressTimeAxis).toBe(true)
  })

  it("scales dimensions according to calorie ratio", () => {
    const scene = buildScene(MOCK_FIXTURES.fourBalanced)
    const breakfast = scene.shapes.find((s) => s.kind === "meal" && s.mealType === "Breakfast")
    const lunch = scene.shapes.find((s) => s.kind === "meal" && s.mealType === "Lunch")

    expect(breakfast?.kind).toBe("meal")
    expect(lunch?.kind).toBe("meal")

    // Lunch has 650 kcal, Breakfast has 400 kcal
    expect(lunch!.width).toBeGreaterThan(breakfast!.width)
    expect(lunch!.height).toBeGreaterThan(breakfast!.height)
  })

  it("keeps all visual nodes within the safe bounds", () => {
    const scene = buildScene(MOCK_FIXTURES.defensiveEdgeCase)
    scene.shapes.forEach((shape) => {
      // safe boundary left=60, right=60 (X in [60, 940])
      expect(shape.centerX).toBeGreaterThanOrEqual(60)
      expect(shape.centerX).toBeLessThanOrEqual(940)

      shape.contours.forEach((path) => {
        expect(path).not.toContain("NaN")
        expect(path).not.toContain("Infinity")
      })
    })
  })

  it("consolidates excess meals when more than 8: 10 meals → ≤8 shapes including Additional", () => {
    const fixture = MOCK_FIXTURES.manyMeals
    // Verify fixture itself has 10 meals (textual record integrity)
    expect(fixture.meals).toHaveLength(10)

    const scene = buildScene(fixture)
    const mealShapes = scene.shapes.filter((s) => s.kind === "meal")

    // Consolidation path: 7 primary rendered + 1 Additional shape = 8 total
    expect(mealShapes.length).toBeLessThanOrEqual(8)
    expect(mealShapes).toHaveLength(8)

    // The Additional shape should be present
    const additionalShape = mealShapes.find((s) => s.kind === "meal" && s.mealType === "Additional")
    expect(additionalShape).toBeDefined()

    // Lanes used
    const lanes = mealShapes.map((s) => (s.kind === "meal" ? s.lane : null))
    expect(lanes).toContain("A")
    expect(lanes).toContain("B")
  })

  it("manyMeals consolidation is deterministic across 100 runs", () => {
    const fixture = MOCK_FIXTURES.manyMeals
    const firstScene = buildScene(fixture)
    const firstShapeCount = firstScene.shapes.length

    for (let i = 1; i < 100; i++) {
      const scene = buildScene(fixture)
      expect(scene.shapes.length).toBe(firstShapeCount)
      expect(scene).toEqual(firstScene)
    }
  })


  it("all meal shapes have kind='meal' discriminant", () => {
    const scene = buildScene(MOCK_FIXTURES.fourBalanced)
    scene.shapes.forEach((shape) => {
      expect(shape.kind).toBe("meal")
    })
  })

  it("aggregate shape has no mealType, id, localTime, or lane fields", () => {
    const aggregateInput = { ...MOCK_FIXTURES.fourBalanced, meals: [] }
    const scene = buildScene(aggregateInput)

    const agg = scene.shapes[0]
    expect(agg.kind).toBe("aggregate")
    expect("id" in agg).toBe(false)
    expect("mealType" in agg).toBe(false)
    expect("localTime" in agg).toBe(false)
    expect("lane" in agg).toBe(false)
  })
})
