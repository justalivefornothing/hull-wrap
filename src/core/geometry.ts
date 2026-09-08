/** A point as an `[x, y]` tuple. Kept as a plain array so hull results serialise directly. */
export type Pt = [number, number]

/**
 * Tolerance for treating a cross product as zero. Board coordinates are CSS
 * pixels (a few thousand at most), so cross products sit far above this unless
 * the three points really are collinear.
 */
export const EPS = 1e-9

/**
 * Twice the signed area of triangle (o, a, b): positive when a -> b turns
 * counter-clockwise around o, negative when clockwise, zero when collinear.
 * Every hull algorithm in this project is built on this one primitive.
 */
export function cross(o: Pt, a: Pt, b: Pt): number {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
}

/** Orientation of (o, a, b) with epsilon: 1 = left turn, -1 = right turn, 0 = collinear. */
export function orient(o: Pt, a: Pt, b: Pt): -1 | 0 | 1 {
  const c = cross(o, a, b)
  return c > EPS ? 1 : c < -EPS ? -1 : 0
}

export function dist2(a: Pt, b: Pt): number {
  const dx = a[0] - b[0]
  const dy = a[1] - b[1]
  return dx * dx + dy * dy
}

/** Absolute polygon area via the shoelace formula. Vertices in boundary order. */
export function shoelaceArea(poly: readonly Pt[]): number {
  let sum = 0
  for (let i = 0, n = poly.length; i < n; i++) {
    const [x1, y1] = poly[i]
    const [x2, y2] = poly[(i + 1) % n]
    sum += x1 * y2 - x2 * y1
  }
  return Math.abs(sum) / 2
}

export function perimeter(poly: readonly Pt[]): number {
  let total = 0
  for (let i = 0, n = poly.length; i < n; i++) {
    total += Math.sqrt(dist2(poly[i], poly[(i + 1) % n]))
  }
  return poly.length < 2 ? 0 : total
}

/** Order-independent fingerprint of a point set, for comparing hulls across algorithms. */
export function hullSet(pts: readonly Pt[]): string[] {
  return [...new Set(pts.map((p) => `${p[0]},${p[1]}`))].sort()
}

/** Remove exact duplicates, keeping first occurrence order. */
export function dedupe(pts: readonly Pt[]): Pt[] {
  const seen = new Set<string>()
  const out: Pt[] = []
  for (const p of pts) {
    const key = `${p[0]},${p[1]}`
    if (!seen.has(key)) {
      seen.add(key)
      out.push(p)
    }
  }
  return out
}
