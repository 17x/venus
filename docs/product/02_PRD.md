# Product Requirements Document

## Product Goal

Build a professional-grade web editor platform with a reusable runtime and
engine foundation, starting from vector editing and extending to flowchart,
mindmap, and whiteboard products.

## Primary Users

- Designers and product teams editing structured graphics
- Internal developers validating runtime and rendering capabilities

## Core Scenarios

- Create and edit vector scenes with common shape/text/path workflows
- Operate multi-selection, transform, align/distribute, group/ungroup
- Load/save files and iterate quickly with stable interaction behavior

## Functional Requirements (Current MVP+)

- Canvas editing shell with tools, properties, layers, and context actions
- Worker-based command execution and undo/redo history
- Runtime interaction support: marquee, snapping, transform preview
- Engine rendering and hit-test capability for large scene diagnostics

## Acceptance Baseline

- Core vector workflows run in `apps/vector-editor-web`
- Runtime and rendering diagnostics are verifiable in `apps/playground`
- Command/history paths are routed through runtime worker boundaries

## Scope Changes Policy

- Scope changes must be reflected in `scope.md` and `STATE.md`
- Confirmed product-direction decisions must be summarized in
  `../../04_DECISIONS.md`

## Non-Goals (Current Phase)

- Shipping complete collaboration UI
- Finalizing all advanced boolean/path editing capabilities in one phase
- Unifying all editor products before vector capability baseline is stable
