import { dedupe, dist2, orient, type Pt } from './geometry'

export type Algo = 'graham' | 'jarvis' | 'monotone'

export const ALGOS: readonly Algo[] = ['graham', 'jarvis', 'monotone']

export const ALGO_LABEL: Record<Algo, string> = {
  graham: 'Graham scan',
  jarvis: 'Jarvis march',
  monotone: 'Monotone chain',
}

/**
 * One frame of an algorithm's progress. All indices refer to the deduplicated
 * `points` array on the step. Arrays and sets are shared and mutated between
 * yields, so consumers should render a step immediately rather than keep it.
 */
export interface HullStep {
  points: Pt[]
  phase: 'sort' | 'scan' | 'lower' | 'upper' | 'done'
  /** Current stack / chain (Graham stack, Jarvis hull so far, monotone chain being built). */
  hull: number[]
  /** Monotone chain only: the finished lower chain while the upper one is built. */
  lower: number[] | null
  /** Point the ray starts from (Graham pivot, Jarvis current vertex). -1 if none. */
  anchor: number
  /** Jarvis: the best candidate so far, i.e. where the ray currently points. */
  best: number
  /** The point currently being considered. */
  candidate: number
  /** Orientation test (o, a, b) being evaluated this step, and its sign. */
  test: [number, number, number] | null
  testSign: -1 | 0 | 1
  /** Points popped or passed over in the current phase; drawn faded. */
  rejected: Set<number>
  tests: number
  note: string
}

export interface HullResult {
  /** Hull vertices in counter-clockwise order (in the board's y-down space this reads clockwise). */
  hull: Pt[]
  tests: number
}

function blank(points: Pt[]): HullStep {
  return {
    points,
    phase: 'scan',
    hull: [],
    lower: null,
    anchor: -1,
    best: -1,
    candidate: -1,
    test: null,
    testSign: 0,
    rejected: new Set(),
    tests: 0,
    note: '',
  }
}

function finish(st: HullStep, hull: number[]): HullResult {
  st.phase = 'done'
  st.hull = hull
  st.lower = null
  st.anchor = -1
  st.best = -1
  st.candidate = -1
  st.test = null
  st.rejected.clear()
  st.note = `done — ${hull.length} hull vertices after ${st.tests} orientation tests`
  return { hull: hull.map((i) => st.points[i]), tests: st.tests }
}

/** Degenerate inputs (fewer than three distinct points) are their own hull. */
function* trivial(st: HullStep): Generator<HullStep, HullResult | null> {
  if (st.points.length >= 3) return null
  const all = st.points.map((_, i) => i)
  const result = finish(st, all)
  yield st
  return result
}

// ---- Graham scan -----------------------------------------------------------

/**
 * Graham scan: pick the lowest point as pivot, sort the rest by polar angle
 * using only cross products (no atan2), then walk the sorted list keeping a
 * stack and popping anything that would make a non-left turn.
 */
export function* grahamSteps(input: readonly Pt[]): Generator<HullStep, HullResult> {
  const pts = dedupe(input)
  const st = blank(pts)
  const early = yield* trivial(st)
  if (early) return early

  let pivot = 0
  for (let i = 1; i < pts.length; i++) {
    const [x, y] = pts[i]
    const [px, py] = pts[pivot]
    if (y < py || (y === py && x < px)) pivot = i
  }
  const p = pts[pivot]

  // Every point sits on or above the pivot, so angles fall in [0, PI] and a
  // single cross product decides which comes first. Collinear ties go nearest first.
  const order = pts.map((_, i) => i).filter((i) => i !== pivot)
  order.sort((a, b) => {
    st.tests++
    const s = orient(p, pts[a], pts[b])
    if (s !== 0) return -s
    return dist2(p, pts[a]) - dist2(p, pts[b])
  })

  st.phase = 'sort'
  st.anchor = pivot
  st.hull = [pivot]
  for (let k = 0; k < order.length; k++) {
    st.candidate = order[k]
    st.note = `sweeping by angle around the pivot: ${k + 1} of ${order.length}`
    yield st
  }

  st.phase = 'scan'
  const stack = [pivot, order[0]]
  st.hull = stack
  for (let k = 1; k < order.length; k++) {
    const i = order[k]
    st.candidate = i
    while (stack.length >= 2) {
      const o = stack[stack.length - 2]
      const a = stack[stack.length - 1]
      const sign = orient(pts[o], pts[a], pts[i])
      st.tests++
      st.test = [o, a, i]
      st.testSign = sign
      st.note = sign > 0 ? 'left turn — keep the stack top' : 'not a left turn — pop the stack top'
      yield st
      if (sign > 0) break
      st.rejected.add(stack.pop()!)
    }
    stack.push(i)
    st.test = null
    st.note = `pushed point ${i}; stack has ${stack.length}`
    yield st
  }

  const result = finish(st, stack)
  yield st
  return result
}

// ---- Jarvis march ----------------------------------------------------------

/**
 * Jarvis march (gift wrapping): start at the leftmost point and repeatedly
 * pick the candidate that every other point lies to the left of, i.e. the
 * most clockwise ray from the current vertex. O(n * h).
 */
export function* jarvisSteps(input: readonly Pt[]): Generator<HullStep, HullResult> {
  const pts = dedupe(input)
  const st = blank(pts)
  const early = yield* trivial(st)
  if (early) return early

  let start = 0
  for (let i = 1; i < pts.length; i++) {
    const [x, y] = pts[i]
    const [sx, sy] = pts[start]
    if (x < sx || (x === sx && y < sy)) start = i
  }

  const hull: number[] = [start]
  st.hull = hull
  let cur = start
  while (hull.length <= pts.length) {
    st.anchor = cur
    st.rejected.clear()
    let best = cur === 0 ? 1 : 0
    st.best = best
    for (let i = 0; i < pts.length; i++) {
      if (i === cur || i === best) continue
      const sign = orient(pts[cur], pts[best], pts[i])
      st.tests++
      st.candidate = i
      st.test = [cur, best, i]
      st.testSign = sign
      // A right turn means i is further clockwise; on a tie prefer the farther point.
      const farther = sign === 0 && dist2(pts[cur], pts[i]) > dist2(pts[cur], pts[best])
      if (sign < 0 || farther) {
        st.note = `point ${i} is more clockwise — the ray snaps to it`
        st.rejected.add(best)
        best = i
        st.best = best
      } else {
        st.note = `point ${i} lies left of the ray — rejected`
        st.rejected.add(i)
      }
      yield st
    }
    if (best === start) break
    hull.push(best)
    cur = best
    st.test = null
    st.candidate = -1
    st.note = `wrapped to point ${best}; ${hull.length} hull vertices so far`
    yield st
  }

  const result = finish(st, hull)
  yield st
  return result
}

// ---- Andrew's monotone chain -----------------------------------------------

/**
 * Andrew's monotone chain: sort by x (then y), build the lower hull left to
 * right and the upper hull right to left with the same pop-on-non-left-turn
 * stack rule, then glue the two chains together.
 */
export function* monotoneSteps(input: readonly Pt[]): Generator<HullStep, HullResult> {
  const pts = dedupe(input)
  const st = blank(pts)
  const early = yield* trivial(st)
  if (early) return early

  const order = pts.map((_, i) => i)
  order.sort((a, b) => pts[a][0] - pts[b][0] || pts[a][1] - pts[b][1])

  function* half(seq: number[], chain: number[], label: string): Generator<HullStep, void> {
    st.hull = chain
    st.rejected.clear()
    for (const i of seq) {
      st.candidate = i
      while (chain.length >= 2) {
        const o = chain[chain.length - 2]
        const a = chain[chain.length - 1]
        const sign = orient(pts[o], pts[a], pts[i])
        st.tests++
        st.test = [o, a, i]
        st.testSign = sign
        st.note = sign > 0 ? `${label}: left turn — keep` : `${label}: not a left turn — pop`
        yield st
        if (sign > 0) break
        st.rejected.add(chain.pop()!)
      }
      chain.push(i)
      st.test = null
      st.note = `${label}: pushed point ${i}`
      yield st
    }
  }

  st.phase = 'lower'
  const lower: number[] = []
  yield* half(order, lower, 'lower chain')

  st.phase = 'upper'
  st.lower = lower
  const upper: number[] = []
  yield* half([...order].reverse(), upper, 'upper chain')

  const hull = lower.slice(0, -1).concat(upper.slice(0, -1))
  const result = finish(st, hull)
  yield st
  return result
}

// ---- synchronous wrappers --------------------------------------------------

export const STEPPERS: Record<Algo, (pts: readonly Pt[]) => Generator<HullStep, HullResult>> = {
  graham: grahamSteps,
  jarvis: jarvisSteps,
  monotone: monotoneSteps,
}

/** Run a generator to completion and return its result. */
export function runHull(algo: Algo, pts: readonly Pt[]): HullResult {
  const gen = STEPPERS[algo](pts)
  let next = gen.next()
  while (!next.done) next = gen.next()
  return next.value
}

export const grahamScan = (pts: readonly Pt[]): Pt[] => runHull('graham', pts).hull
export const jarvisMarch = (pts: readonly Pt[]): Pt[] => runHull('jarvis', pts).hull
export const monotoneChain = (pts: readonly Pt[]): Pt[] => runHull('monotone', pts).hull
