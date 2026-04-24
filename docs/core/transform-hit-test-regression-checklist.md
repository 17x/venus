# Transform And Hit-Test Overlap Regression Checklist

Use this checklist when changing selection, transform preview, overlay guides,
viewport motion policy, or hit-test candidate filtering.

## Scope

- Selector and direct-selector behavior parity
- Group-level vs deep hit behavior under modifiers
- Transform preview consistency while hit-test is active
- Overlay degradation interactions with hit highlight and snap guides

## Required Scenarios

1. Move selected shape across dense overlaps while hovering unrelated shapes.
2. Resize a selected shape so bounds cross grouped and ungrouped neighbors.
3. Rotate a selected shape through overlapping text/image/path stacks.
4. Pan and zoom during selection hover transitions on mixed scenes.
5. Toggle cmd/ctrl deep-hit modifiers during overlap-heavy selection.
6. Perform path-edit handle drag near overlap boundaries.
7. Repeat scenarios in `10k`, `50k`, `100k`, and `mixed(text/image/path)` scenes.

## Expected Results

- Top-hit target remains stable for the active interaction mode.
- Transform preview remains visually aligned with selected geometry.
- No intermittent flip between group-level and deep-hit semantics.
- Overlay degradation keeps expected minimum guidance and does not hide active path-edit chrome.
- No persistent hover-highlight ghosting after pan/zoom/transform settle.
- No full-scene redraw regressions for local transform operations.

## Diagnostics To Capture

- Runtime Debug Panel rows:
  - `Render Phase`, `Overlay Mode`, `Render Policy Quality`
  - `Offscreen Dirty Skip Rate`, `Forced Scene Dirty Rate`
  - `Scene Dirty Risk Status`, `Scene Dirty Risk Score`
  - `Scene Dirty Last Transition Reason`
- Export diagnostics snapshot via `Copy JSON` at:
  - pre-interaction baseline
  - mid-interaction overlap stress
  - post-settle state

## Pass/Fail Gate

- Pass: all required scenarios keep expected selection and transform behavior with no high-risk lock-in.
- Fail: any reproducible target flip, preview drift, or unresolved high-risk/churning state persists after settle.

## Handoff Notes

Record:

- Scene name and scale
- Active tool and modifiers
- Observed mismatch and expected behavior
- Exported diagnostics snapshot timestamps
