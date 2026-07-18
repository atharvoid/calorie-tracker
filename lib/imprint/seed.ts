export function fnv1a(str: string): number {
  let hash = 2166136261
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i)
    // 32-bit integer multiplication
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function generateSeededPRNG(sceneVersion: number, date: string, mealId: string, kcal: number, itemCount: number): () => number {
  const roundedKcal = Math.round(kcal)
  const compositeString = `${sceneVersion}:${date}:${mealId}:${roundedKcal}:${itemCount}`
  const seed = fnv1a(compositeString)
  return mulberry32(seed)
}
