# Hull Wrap

Scatter points on a chalkboard canvas and watch **Graham scan**, **Jarvis march**, and **Andrew’s monotone chain** wrap them, each step drawn as chalk strokes.

## Features

- Click / drag to add points, random scatter (uniform / gaussian / ring), clear, undo
- Three classic convex-hull algorithms implemented from scratch as generators
- Step animation with speed control, orientation tests highlighted
- Stats: hull vertices, orientation tests, shoelace area, perimeter
- Compare mode (identical hulls + test counts)
- Export hull points as JSON

## Tech

Pure geometry core + chalkboard canvas renderer. Vitest for the algorithms.

## Status

See `PLAN.md` for full architecture and milestones.

## License

MIT
