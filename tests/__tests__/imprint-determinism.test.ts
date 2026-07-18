import { describe, expect, it } from "vitest"
import { buildScene } from "../../lib/imprint/scene"
import { MOCK_FIXTURES } from "../../lib/imprint/fixtures"
import { fnv1a } from "../../lib/imprint/seed"

describe("imprint-determinism", () => {
  it("produces identical scene hash across 100 runs for all fixtures", () => {
    const fixtureKeys = Object.keys(MOCK_FIXTURES)

    fixtureKeys.forEach((key) => {
      const fixture = MOCK_FIXTURES[key]
      const firstRun = buildScene(fixture)
      const firstHash = fnv1a(JSON.stringify(firstRun))

      for (let i = 0; i < 100; i++) {
        const run = buildScene(fixture)
        const hash = fnv1a(JSON.stringify(run))
        expect(hash).toBe(firstHash)
      }
    })
  })
})
