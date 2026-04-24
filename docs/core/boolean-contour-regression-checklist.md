# Boolean Contour Regression Checklist

Use this checklist when changing boolean geometry composition, path point encoding,
or path hit/render behavior for contour-encoded shapes.

## Scope

- Boolean output representation for disconnected polygons and interior rings
- Contour-aware path render and hit-test behavior
- Path sub-selection (anchor/segment/handle) against contour-encoded points
- History/collaboration correctness for multi-result boolean inserts
- Import/export round-trip stability

## Required Scenarios

1. Union of two overlapping closed paths produces one contour and remains editable.
2. Subtract operation produces at least one interior hole contour and keeps hole visibly open.
3. Intersect operation with disconnected overlap regions produces multiple result shapes.
4. Path sub-selection does not hit phantom segments between unrelated contours.
5. Segment hit near hole boundary resolves to the hole contour segment, not exterior seam.
6. Undo/redo of multi-result boolean restores all removed and inserted shapes.
7. Remote replay of `shape.boolean` matches local patch output shape count and order.
8. Save/open round-trip preserves contour-encoded path points and bounds.
9. Repeated boolean chaining (3+ operations) keeps stable selection and no NaN bounds.

## Expected Results

- No visual bridging between disjoint contours.
- Hole regions render as cutouts under nonzero winding behavior.
- Hit-test fill and stroke both resolve against contour-local geometry.
- Anchor and segment indices map to source point indices for editing callbacks.
- History backward patches remove all inserted boolean result shapes in reverse index order.

## Diagnostics To Capture

- Runtime Debug Panel rows:
  - `Hit Exact Checks`
  - `Hit Exact Ratio`
  - `Render Phase`
  - `Overlay Mode`
- For each failing scenario, record:
  - scene id/name
  - operation sequence
  - expected vs actual shape count
  - serialized point count per result shape

## Pass/Fail Gate

- Pass: all scenarios produce contour-consistent render/hit/edit/history outcomes.
- Fail: any seam bridge hit, hole fill regression, index drift, or replay mismatch is reproducible.

## Verification Record

- Task ID: `VT-20260424-02`
- Date: `2026-04-24`
- Command:
  - `pnpm --filter @venus/vector-editor-web regression:boolean-contour`
- Report:
  - `apps/vector-editor-web/scripts/boolean-contour-regression.result.json`

Scenario status:

1. Verified: overlapping union stability is covered by `boolean-chained-union-subtract-contour` (union phase asserts single merged contour before subtract).
2. Verified: hole contour subtract is covered by `boolean-subtract-hole-contour`.
3. Verified: disconnected intersect output is covered by `boolean-intersect-disconnected-results`.
4. Verified: phantom seam-bridge suppression is covered by `contour-anchor-subselection-edge-cases` (`seam-hit=null`).
5. Verified: hole-boundary segment selection is covered by `contour-anchor-subselection-edge-cases` (`hole-segment-index=5`).
6. Verified: undo/redo multi-insert behavior is covered by `local-history-multi-insert-undo`.
7. Verified: remote replay parity is covered by `remote-replay-patch-parity`.
8. Verified: save/open contour round-trip is covered by `file-roundtrip-contour-points`.
9. Verified: repeated boolean chaining stability is covered by `boolean-chained-union-subtract-contour`.
