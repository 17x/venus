# Apps Workspace

Apps under `apps/*` are product surfaces. They orchestrate runtime behavior,
compose UI flows, and wire package capabilities into runnable experiences.

## Responsibility Boundary

- Own product UX, route-level composition, and editor shell integration.
- Own app-specific feature toggles, menu wiring, and diagnostics views.
- Do not duplicate shared runtime/engine mechanisms that belong in `packages/*`.

## Current Apps

- `vector-editor-web`: primary vector editor product surface.
- `playground`: diagnostics and runtime behavior sandbox.
- `flowchart`: flowchart-focused app surface.
- `streamline-editor`: streamline/diagram-focused editor scaffold.
- `mindmap-editor`: mindmap-focused editor scaffold.
- `whiteboard`: whiteboard app surface.

## Implementation Guidance

- Keep app bootstrapping and product workflows in `apps/*`.
- Move reusable primitives and cross-app runtime logic to `packages/*`.
- Prefer `@venus/*` shared packages (or app-local `@vector/*` aliases) over app-to-app imports.
