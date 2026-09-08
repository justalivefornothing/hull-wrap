# Hullwrap — plan

Scatter points on a chalkboard canvas and watch Graham scan, Jarvis march, and
Andrew's monotone chain wrap them, each step drawn as chalk strokes.

## Goal

A small, polished convex-hull visualiser. The three classic O(n log n) / O(nh)
hull algorithms are implemented from scratch as generators so the renderer can
draw every orientation test as it happens: the candidate ray pivots like a
compass needle, rejected points fade to grey, the stack/chain grows in chalk.

## Features (all required by the spec)

- Canvas with click and drag-to-add points, random scatter (uniform, gaussian,
  ring), clear, and undo.
- Graham scan (polar sort with cross products, no atan2), Jarvis march (gift
  wrapping), Andrew's monotone chain — all from scratch.
- Step animation with speed control: candidate points, current stack/chain and
  the orientation test being evaluated are highlighted.
- Stats panel: hull vertex count, orientation tests, shoelace area, perimeter.
- Drag existing points; in instant mode the hull recomputes live.
- Compare mode: run all three, confirm identical hulls, show test counts.
- Export hull points as JSON.

## Architecture

```
src/
  core/geometry.ts   Pt type, cross / orient (epsilon), shoelaceArea, perimeter,
                     hullSet, dedupe — pure, DOM-free
  core/hull.ts       grahamSteps / jarvisSteps / monotoneSteps generators that
                     yield a HullStep (stack, candidate, test, rejected, count);
                     sync wrappers grahamScan / jarvisMarch / monotoneChain
  core/scatter.ts    mulberry32 PRNG, seededPoints, uniform / gaussian / ring
  ui/board.ts        canvas renderer: chalkboard with eraser smudges, chalk
                     dots, jittered chalk strokes, dashed yellow candidate ray
  ui/tray.ts         wooden toolbar markup + control wiring helpers
  main.ts            app state, undo stack, pointer handling, animation loop
tests/               vitest for geometry, the three hulls, and scatter
```

Design: dark slate-green board, chalk-white points, jittered chalk hull edges,
dashed yellow chalk candidate ray, grey rejected points. Handwritten title
(Caveat, cursive fallback), plain sans (Nunito Sans) for controls in a wooden
tray at the bottom. Responsive to ~380px, keyboard shortcuts for every action.

## Milestones

1. Plan, license, scaffold (vite vanilla-ts + vitest).
2. Geometry primitives + three hull generators, tests green.
3. Chalkboard renderer and point editing (click, drag-to-add, drag, undo, clear, scatter).
4. Step playback with speed control, stats panel, compare mode, JSON export.
5. Build, headless smoke test, screenshot, README, publish.
