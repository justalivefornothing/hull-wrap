import type { Pt } from './geometry'

export type Distribution = 'uniform' | 'gaussian' | 'ring'

export const DISTRIBUTIONS: readonly Distribution[] = ['uniform', 'gaussian', 'ring']

/** mulberry32: tiny seeded PRNG returning floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Box-Muller: one standard normal sample from two uniforms. */
function gaussian(rand: () => number): number {
  const u = 1 - rand()
  const v = rand()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

export interface Box {
  width: number
  height: number
  /** Inset from the edges that points stay inside of. */
  margin?: number
}

/**
 * Scatter `n` points inside `box` using the given distribution. Deterministic
 * for a given seed, so the same seed always yields the same board.
 */
export function scatter(kind: Distribution, n: number, seed: number, box: Box): Pt[] {
  const rand = mulberry32(seed)
  const m = box.margin ?? 0
  const w = box.width - 2 * m
  const h = box.height - 2 * m
  const cx = box.width / 2
  const cy = box.height / 2
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
  const out: Pt[] = []
  for (let i = 0; i < n; i++) {
    let x: number
    let y: number
    if (kind === 'uniform') {
      x = m + rand() * w
      y = m + rand() * h
    } else if (kind === 'gaussian') {
      const sigma = Math.min(w, h) / 6
      x = cx + gaussian(rand) * sigma
      y = cy + gaussian(rand) * sigma
    } else {
      const r = Math.min(w, h) * (0.42 + (rand() - 0.5) * 0.06)
      const t = rand() * Math.PI * 2
      x = cx + Math.cos(t) * r
      y = cy + Math.sin(t) * r
    }
    out.push([clamp(x, m, box.width - m), clamp(y, m, box.height - m)])
  }
  return out
}

/** Uniform points in a 1000 x 1000 square — the fixture the tests use. */
export function seededPoints(n: number, seed: number): Pt[] {
  return scatter('uniform', n, seed, { width: 1000, height: 1000 })
}
