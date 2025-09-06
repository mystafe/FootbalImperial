// Simple xorshift32 based PRNG seeded with a string
function xorshift32(seed: number) {
  let state = seed || 123456789
  return () => {
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    // Convert to [0,1)
    return (state >>> 0) / 0xffffffff
  }
}

export function hashStringToSeed(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24)
  }
  return h >>> 0
}

export function createRng(seedString: string) {
  return xorshift32(hashStringToSeed(seedString))
}

export function weightedChoice(weights: number[], rng: () => number): number {
  const total = weights.reduce((a, b) => a + Math.max(0, b), 0)
  if (!isFinite(total) || total <= 0) return 0
  let r = rng() * total
  for (let i = 0; i < weights.length; i++) {
    const w = Math.max(0, weights[i])
    if (r < w) return i
    r -= w
  }
  return weights.length - 1
}
