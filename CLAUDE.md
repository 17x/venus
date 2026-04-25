# CLAUDE.md

Venus codebase implementation rules for AI-assisted design-to-code and MCP workflows.

## 1. Non-Negotiable Architecture Rules

Source references:

- docs/architecture/layering.md
- docs/engineering/coding-standards.md

Required boundary:

- apps/\* -> @venus/runtime + @venus/runtime/interaction -> @venus/runtime/worker + @venus/runtime/shared-memory -> @venus/engine

Ownership:

- App layer (apps/\*): product UI orchestration and feature composition only.
- Runtime layer (@venus/runtime\*): command dispatch, viewport/runtime policy, worker bridge.
- Engine layer (@venus/engine): render/hit-test/math/spatial mechanism only.
- Persistence semantics are app-owned (vector currently uses `@vector/model`).

Do not:

- Put product UI policy into runtime or engine.
- Bypass runtime to mutate worker or engine internals from app code.
- Re-implement engine hit-test/render math inside app components.

## 2. Vector App Structure Rules

Current app structure root:

- apps/vector-editor-web/src

High-level folders:

- src/editor: runtime/interaction/tooling state and adapters for the vector editor.
- src/shared: app-wide constants, types, and utilities.
- src/ui: app-local UI kit barrel and components.
- src/components: composed product UI surfaces (toolbar, panels, frame, menus).
- src/contexts: file/document/application context orchestration.
- src/features: focused feature modules (template presets, etc.).

Placement rules:

- New reusable UI primitives go in src/ui/kit/components/ui.
- App-level editor behavior goes in src/editor.
- Pure utility helpers with no React concerns go in src/shared/utilities.
- Large composed panels and shell components stay in src/components.

## 3. Design Tokens, Typography, and Theming Rules

Primary token surface (current state):

- apps/vector-editor-web/src/index.css

Current editor tokens are CSS custom properties under .venus-editor:

- --venus-editor-font-body
- --venus-editor-line-body
- --venus-editor-font-label
- --venus-editor-line-label
- --venus-editor-font-meta
- --venus-editor-line-meta
- --venus-editor-font-heading
- --venus-editor-line-heading

Typography binding surface:

- apps/vector-editor-web/src/components/editorChrome/editorTypography.ts

Rules:

- For editor text scales, extend existing --venus-editor-\* variables in index.css first.
- Reuse existing editor text classes (venus-editor-text-\*) before introducing new ad-hoc typography classes.
- Keep token naming with the venus-editor prefix for editor-shell-local variables.
- Keep Tailwind utility usage aligned with existing neutral-gray palette unless product direction explicitly changes.

Figma mapping guidance:

- Map Figma text styles to existing editor typography tokens where possible.
- If new token is unavoidable, add to index.css and wire through editorTypography class constants.

## 4. Component System and UI Framework Rules

UI barrel source:

- apps/vector-editor-web/src/ui/index.ts
- apps/vector-editor-web/src/ui/kit/index.ts

Alias contract:

- Import reusable app UI from @vector/ui.
- Alias is configured in:
  - apps/vector-editor-web/tsconfig.app.json
  - apps/vector-editor-web/vite.config.ts

Current primitive stack:

- Radix UI primitives for dialog/select/tooltip/scroll-area.
- Tailwind class composition via cn utility.
- App-local button/select/input/layout/modal/panel/tooltip/notification primitives in src/ui/kit.

Rules:

- Prefer existing @vector/ui exports before creating new primitives.
- Add new primitives to src/ui/kit and re-export in src/ui/kit/index.ts and src/ui/index.ts.
- Preserve backward-compatible props where compatibility is already in place (example: Button primary boolean in button.tsx).
- Keep primitive APIs framework-local and avoid leaking runtime or engine concerns into UI-kit components.

## 5. Icons and Visual Asset Rules

Icon sources in current codebase:

- react-icons/lu and lucide-react (generic UI icons)
- app-local svg React nodes for custom icons in apps/vector-editor-web/src/assets/svg/icons.tsx
- local specialized layer icons in components/header/shortcutBar/Icons/LayerIcons.tsx

Shared icon sizing/style anchors:

- apps/vector-editor-web/src/components/editorChrome/chromeIconStyles.ts

Rules:

- Use CHROME_ICON_SIZE and shared chrome icon class constants for editor chrome consistency.
- Use library icons for standard concepts (history/settings/zoom/layer operations).
- Use app-local SVG functions only for icons not represented well by icon libraries (example: mouse pointer variant, line segment).
- Keep icon components pure and stateless.
- Keep icon stroke/fill tied to currentColor to inherit theme classes.

Naming guidance:

- Prefer semantic names by intent (PointerToolIcon) over geometry names when adding new assets.
- Keep file-local naming consistent in existing modules when touching legacy code.

## 6. Styling Rules (Tailwind + CSS)

Current stack:

- Tailwind v4 via @tailwindcss/vite
- Global CSS layers in apps/vector-editor-web/src/index.css
- Utility class composition in TSX via className and cn

Rules:

- Prefer composing styles using Tailwind utility classes and existing editor class constants.
- Keep long repeated class strings centralized when shared (see chromeIconStyles.ts).
- Use @layer components or @layer utilities in index.css for reusable global patterns only.
- Avoid introducing CSS-in-JS libraries.
- Avoid one-off inline style objects unless values are dynamic (dimensions, transforms, runtime-calculated values).

Consistency checks:

- Reuse existing neutral spacing/border/background rhythm found across editor frame, toolbar, status bar, and panels.
- Keep focus-visible and disabled states explicit for interactive controls.

## 7. Image and File Asset Pipeline Rules

Asset ingest and metadata helpers:

- apps/vector-editor-web/src/shared/utilities/readImageHelper.ts
- apps/vector-editor-web/src/contexts/fileContext/readFileHelper.ts
- apps/vector-editor-web/src/contexts/fileContext/saveFileHelper.ts

Current persisted zip format:

- file.json + assets/<asset.id>

Rules:

- Preserve asset metadata shape (id, name, type, mimeType) in serialization.
- Preserve zip folder structure for compatibility.
- Keep asset objectUrl lifecycle explicit when creating temporary URLs.
- Route image sizing through waitImageSize helper for image assets.
- Keep document/image adapter logic in editor adapters/runtime codepaths, not in presentational components.

Caution:

- Object URL creation is used in multiple places; when refactoring, verify revoke behavior to avoid leaks.

## 8. MCP (Figma) Design-To-Code Workflow Rules

When user provides Figma URL or requests Figma integration:

1. Parse fileKey/nodeId from URL.
2. Call get_design_context first for the target node.
3. Treat returned code as reference, not drop-in final code.
4. Adapt to Venus stack and boundaries:
   - Reuse @vector/ui components.
   - Reuse existing editor tokens/classes.
   - Respect app/runtime/engine boundaries.
5. Implement in correct folder based on ownership.
6. Update mapping documentation:
   - docs/product/figma-mapping.md
7. Validate with repository checks.

Do not:

- Copy external design code blindly if it breaks local conventions.
- Introduce parallel component systems.
- Put product-specific behavior into engine/runtime packages.

## 9. Verification and Documentation Rules

Comment rule:

- Every newly written or modified code block must include a comment.
- Prefer concise but clear intent comments, and keep comment coverage mandatory
  for fresh code.
- Keep source files under 500 lines where practical; split oversized files by
  responsibility.

Validation commands (repository standard):

- pnpm typecheck
- pnpm lint
- pnpm build

Notes:

- pnpm test is placeholder and should not be reported as meaningful validation.

When behavior or structure changes:

- Update closest relevant docs first.
- At minimum, update docs/core/current-work.md for direction changes.
- Update docs/product/figma-mapping.md for accepted design mapping changes.
- Log notable deltas in 05_CHANGELOG.md.

## 10. AI Change Checklist (Before PR or Handoff)

- Correct layer ownership preserved.
- @vector/ui reused before adding new primitives.
- Tokens/classes reused before introducing new style systems.
- Icon and chrome sizing consistency preserved.
- Asset serialization compatibility preserved.
- Validation commands run and reported accurately.
- Relevant docs updated with factual change notes.
