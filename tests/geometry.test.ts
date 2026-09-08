import { describe, expect, it } from 'vitest'
import { cross, dedupe, hullSet, orient, perimeter, shoelaceArea, type Pt } from '../src/core/geometry'

describe('cross / orient', () => {
  it('is positive for a left turn and zero for collinear points', () => {
    expect(cross([0, 0], [1, 0], [0, 1])).toBeGreaterThan(0)
    expect(cross([0, 0], [1, 0], [2, 0])).toBe(0)
  })

  it('is negative for a right turn', () => {
    expect(cross([0, 0], [1, 0], [0, -1])).toBeLessThan(0)
    expect(orient([0, 0], [1, 0], [0, -1])).toBe(-1)
    expect(orient([0, 0], [1, 0], [0, 1])).toBe(1)
  })

  it('treats sub-epsilon cross products as collinear', () => {
    expect(orient([0, 0], [1, 0], [2, 1e-12])).toBe(0)
  })
})

describe('shoelaceArea / perimeter', () => {
  it('measures the unit square', () => {
    expect(shoelaceArea([[0, 0], [1, 0], [1, 1], [0, 1]])).toBe(1)
    expect(perimeter([[0, 0], [1, 0], [1, 1], [0, 1]])).toBe(4)
  })

  it('is orientation independent and zero for degenerate shapes', () => {
    const tri: Pt[] = [[0, 0], [4, 0], [0, 3]]
    expect(shoelaceArea(tri)).toBe(6)
    expect(shoelaceArea([...tri].reverse())).toBe(6)
    expect(perimeter(tri)).toBe(12)
    expect(shoelaceArea([[0, 0], [5, 0]])).toBe(0)
    expect(perimeter([[2, 2]])).toBe(0)
  })
})

describe('hullSet / dedupe', () => {
  it('fingerprints a point set regardless of order or repeats', () => {
    expect(hullSet([[1, 0], [0, 0], [1, 0]])).toEqual(['0,0', '1,0'])
    expect(dedupe([[1, 0], [0, 0], [1, 0]])).toEqual([[1, 0], [0, 0]])
  })
})
