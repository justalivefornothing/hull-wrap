import { describe, expect, it } from 'vitest'
import { cross, hullSet, shoelaceArea, type Pt } from '../src/core/geometry'
import {
  ALGOS,
  grahamScan,
  grahamSteps,
  jarvisMarch,
  jarvisSteps,
  monotoneChain,
  monotoneSteps,
  runHull,
} from '../src/core/hull'
import { mulberry32, scatter, seededPoints } from '../src/core/scatter'

const square: Pt[] = [[0, 0], [1, 0], [1, 1], [0, 1]]

describe('spec assertions', () => {
  it('Graham scan drops the interior point of a square', () => {
    const pts: Pt[] = [[0, 0], [1, 0], [1, 1], [0, 1], [0.5, 0.5]]
    expect(hullSet(grahamScan(pts))).toEqual(hullSet([[0, 0], [1, 0], [1, 1], [0, 1]]))
  })

  it('all three algorithms agree on 500 seeded points', () => {
    const pts = seededPoints(500, 9)
    expect(hullSet(jarvisMarch(pts))).toEqual(hullSet(grahamScan(pts)))
    expect(hullSet(monotoneChain(pts))).toEqual(hullSet(grahamScan(pts)))
  })

  it('monotone chain keeps only the endpoints of a collinear run', () => {
    expect(hullSet(monotoneChain([[0, 0], [1, 0], [2, 0], [3, 0]]))).toEqual(hullSet([[0, 0], [3, 0]]))
  })

  it('cross product sign', () => {
    expect(cross([0, 0], [1, 0], [0, 1])).toBeGreaterThan(0)
    expect(cross([0, 0], [1, 0], [2, 0])).toBe(0)
  })

  it('shoelace area of the unit square', () => {
    expect(shoelaceArea([[0, 0], [1, 0], [1, 1], [0, 1]])).toBe(1)
  })
})

describe('hull edge cases', () => {
  it.each(ALGOS)('%s: collinear input yields the two extreme points', (algo) => {
    const line: Pt[] = [[0, 0], [1, 1], [2, 2], [3, 3], [-1, -1]]
    expect(hullSet(runHull(algo, line).hull)).toEqual(hullSet([[-1, -1], [3, 3]]))
  })

  it.each(ALGOS)('%s: collinear points on hull edges are excluded', (algo) => {
    const pts: Pt[] = [...square, [0.5, 0], [1, 0.5], [0.5, 1], [0, 0.5], [0.25, 0.75]]
    const hull = runHull(algo, pts).hull
    expect(hullSet(hull)).toEqual(hullSet(square))
    expect(hull).toHaveLength(4)
  })

  it.each(ALGOS)('%s: duplicates and tiny inputs are handled', (algo) => {
    expect(runHull(algo, []).hull).toEqual([])
    expect(runHull(algo, [[2, 3]]).hull).toEqual([[2, 3]])
    expect(hullSet(runHull(algo, [[0, 0], [0, 0], [1, 1], [1, 1]]).hull)).toEqual(['0,0', '1,1'])
    expect(hullSet(runHull(algo, [...square, ...square, [0.5, 0.5]]).hull)).toEqual(hullSet(square))
  })

  it.each(ALGOS)('%s: hull is a convex polygon in boundary order', (algo) => {
    const pts = seededPoints(300, 3)
    const hull = runHull(algo, pts).hull
    const n = hull.length
    expect(n).toBeGreaterThanOrEqual(3)
    const signs = hull.map((_, i) => Math.sign(cross(hull[i], hull[(i + 1) % n], hull[(i + 2) % n])))
    expect(new Set(signs).size).toBe(1)
    expect(shoelaceArea(hull)).toBeGreaterThan(0)
  })

  it('agrees across ring and gaussian scatters too', () => {
    for (const kind of ['ring', 'gaussian'] as const) {
      const pts = scatter(kind, 400, 11, { width: 800, height: 600, margin: 20 })
      const g = hullSet(grahamScan(pts))
      expect(hullSet(jarvisMarch(pts))).toEqual(g)
      expect(hullSet(monotoneChain(pts))).toEqual(g)
    }
  })
})

describe('step generators', () => {
  it('count orientation tests and report a done phase', () => {
    const pts = seededPoints(120, 5)
    for (const stepper of [grahamSteps, jarvisSteps, monotoneSteps]) {
      const gen = stepper(pts)
      let steps = 0
      let next = gen.next()
      let last = next.value
      while (!next.done) {
        steps++
        last = next.value
        next = gen.next()
      }
      expect(steps).toBeGreaterThan(pts.length)
      expect((last as { phase: string }).phase).toBe('done')
      expect(next.value.tests).toBeGreaterThan(0)
      expect(next.value.hull.length).toBe((last as { hull: number[] }).hull.length)
    }
  })

  it('Jarvis march does roughly n * h orientation tests', () => {
    const pts = seededPoints(200, 7)
    const { hull, tests } = runHull('jarvis', pts)
    expect(tests).toBeGreaterThanOrEqual((pts.length - 2) * hull.length)
    expect(tests).toBeLessThanOrEqual(pts.length * hull.length)
  })
})

describe('scatter', () => {
  it('is deterministic and stays inside the box', () => {
    expect(mulberry32(1)()).toBe(mulberry32(1)())
    expect(seededPoints(5, 9)).toEqual(seededPoints(5, 9))
    for (const kind of ['uniform', 'gaussian', 'ring'] as const) {
      const pts = scatter(kind, 500, 2, { width: 300, height: 200, margin: 10 })
      expect(pts).toHaveLength(500)
      for (const [x, y] of pts) {
        expect(x).toBeGreaterThanOrEqual(10)
        expect(x).toBeLessThanOrEqual(290)
        expect(y).toBeGreaterThanOrEqual(10)
        expect(y).toBeLessThanOrEqual(190)
      }
    }
  })
})
