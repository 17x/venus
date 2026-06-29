# Venus Engine Audit Report

Status: Draft for review  
Date: 2026-06-28  
Scope: `packages/engine`, `apps/engine-docs`, `AI/ENGINE_DEVELOPMENT_BACKLOG.md`  
Audience: engine architecture review, implementation planning, and multi-agent handoff

---

## 1. Summary

Venus is a 2D document engine with a WebGL-first runtime. WebGL should be treated as the primary backend for interaction, composition, viewport transforms, batching, cache reuse, and final presentation. Canvas2D remains an intentional part of the rendering system, not a legacy fallback: it is the high-fidelity rasterization path for 2D features that are expensive, unstable, or not yet native in the WebGL packet/shader path.

The correct mental model is:

```text
Document Model
  → planning / bounds / hit-test / invalidation
  → WebGL packet path when feature can be represented cheaply
  → Canvas2D fidelity rasterization when feature is complex
  → optional texture upload to WebGL
  → WebGL composition / cache / presentation
```

So documentation should not say “WebGL implements every rendering feature.” A more accurate statement is:

> WebGL is the primary composition and interaction backend. Canvas2D is used as a fidelity rasterization path for complex 2D features, and its output may be uploaded as WebGL textures for final composition.

---

## 2. Verification Status

This report is not a release sign-off. It is an architecture and documentation audit. Validation numbers must be regenerated before commit because the working tree is still changing.

Observed locally during this audit:

| Gate | Status | Notes |
| --- | --- | --- |
| `pnpm -C packages/engine test` | Partial pass observed | Current script only reported a subset of tests in this environment; do not quote total test counts without rerunning. |
| `pnpm -C apps/engine-docs test` | Blocked in sandbox | `tsx` IPC pipe failed with `EPERM` in the managed sandbox. Use `node --experimental-strip-types --test ...` or rerun locally. |
| TypeScript gates | Require rerun | Use explicit `tsc` commands before commit. |
| ESLint | Not verified | No lint script was confirmed in the inspected package scripts. |

Recommended verification commands before commit:

```bash
pnpm -C packages/engine exec tsc --noEmit --pretty false
pnpm -C packages/engine test
pnpm -C apps/engine-docs exec tsc -b ./tsconfig.app.json --pretty false
pnpm -C apps/engine-docs exec node --experimental-strip-types --test src/testing/engine-docs.contract.test.ts
```

---

## 3. Backend Architecture

### 3.1 Backend Roles

| Layer | Primary responsibility | Notes |
| --- | --- | --- |
| WebGL packet path | Fast interactive drawing, transform updates, batching, viewport changes, simple shapes, texture composition | Preferred for high-frequency frames. |
| Canvas2D fidelity path | Complex 2D rasterization: text, gradients, dash/cap/join, shadows, blur, complex clip/mask, model-complete fallback | Output can become a WebGL texture. |
| WebGL composition path | Final composition, cached bitmap reuse, layer transforms, opacity, blend orchestration, viewport projection | Main presentation path. |
| CPU planning path | document traversal, bounds, hit-test candidate planning, invalidation classification, cache key generation | Must stay backend-neutral. |

### 3.2 `render.backend` Documentation Contract

`Venus` should document backend parameters like this:

| Value | Meaning |
| --- | --- |
| `auto` | Prefer WebGL for runtime composition and interaction. Use Canvas2D fidelity rasterization when needed. |
| `webgl` | Force WebGL as the presentation backend. Complex features may still be rasterized by Canvas2D and uploaded as textures. |
| `canvas2d` | Use Canvas2D directly. Useful for deterministic tests, local demos, constrained environments, and debugging fidelity output. |

Important wording rule:

- Avoid: “WebGL renders all features.”
- Prefer: “WebGL is the primary backend and may compose Canvas2D-rasterized textures for complex 2D features.”

### 3.3 Canvas2D → WebGL Texture Path

Some 2D rendering methods should intentionally choose Canvas2D first, then pass the rasterized result to WebGL as a texture. This is correct when the feature is high-fidelity, path-dependent, text-dependent, or would require disproportionate shader complexity.

Good candidates:

- complex text layout, multiline text, rich text runs
- gradients with multiple stops and opacity
- dash patterns, stroke caps, stroke joins, stroke alignment
- inner shadow, drop shadow, layer blur
- clip/mask subtrees with complex local transforms
- image cropping and mixed composite operations
- future SVG/path effects or filter-like features

Poor candidates for per-frame Canvas2D rasterization:

- simple transform / opacity animation
- pan/zoom viewport changes
- simple rectangles, ellipses, lines that are directly packet-friendly
- hover overlays and debug outlines
- high-frequency drag previews when geometry does not change

---

## 4. Rendering Feature Documentation

When documenting a feature, each feature should state both its model support and its rendering strategy.

Recommended fields for API docs:

```text
Support: document model / hit-test / bounds / Canvas2D fidelity / WebGL packet / WebGL texture composition
Invalidates: transform / geometry / paint / text / effect / clip-mask / cache
Interactive path: WebGL packet | WebGL composition | Canvas2D raster texture | settle-only fidelity
```

Example wording:

```text
Gradient fills are part of the document model. During interactive rendering, simple cases may use the WebGL packet path when available. Complex gradient fidelity can be rasterized through Canvas2D and composed by WebGL as a texture.
```

This avoids overclaiming while still making the engine architecture clear.

---

## 5. Animation Model

Animation is scheduled by `Venus`, but rendering strategy depends on what changes. The animation system should not blindly treat all animated properties the same.

### 5.1 Animation Categories

| Animation type | Preferred path | Invalidation |
| --- | --- | --- |
| transform, rotation, scale, skew, flip | WebGL composition / matrix update | `transformOnly` |
| opacity | WebGL composition / uniform or layer alpha | `opacityOnly` |
| visibility | render list / composition update | `visibility` |
| fill/stroke color | WebGL packet if simple; Canvas2D texture if complex | `paint` |
| gradient stops / gradient geometry | often Canvas2D raster texture unless shader-native | `paint` |
| stroke width / dash / cap / join | packet if supported; otherwise Canvas2D raster texture | `geometry + paint` |
| path points / bezier points / polygon points | rebuild geometry, hit-test, bounds, then render | `geometry` |
| text content / text runs / font metrics | text layout + Canvas2D or text atlas update | `text` |
| blur / shadows / filters | Canvas2D fidelity texture or dedicated WebGL filter path | `effect` |
| clip/mask shape mutation | bounds, hit-test, offscreen/fidelity recompute | `clipMask` |
| group transform only | WebGL composition if children are cached or packet-friendly | `transformOnly` |

### 5.2 Required Invalidation Model

The engine should classify each document mutation before rendering:

```typescript
type VenusInvalidationKind =
  | 'none'
  | 'transformOnly'
  | 'opacityOnly'
  | 'visibility'
  | 'geometry'
  | 'paint'
  | 'text'
  | 'effect'
  | 'clipMask'
  | 'structural'
```

Rendering decisions should flow from that classification:

| Invalidation | Engine response |
| --- | --- |
| `transformOnly` | keep geometry/cache, update matrix/composition |
| `opacityOnly` | keep geometry/cache, update alpha/composition |
| `geometry` | recompute bounds, hit-test geometry, packet or raster output |
| `paint` | preserve bounds when possible, rebuild material/texture |
| `text` | reshape/remeasure, update bounds and raster/atlas |
| `effect` | update offscreen/fidelity output and cache keys |
| `clipMask` | recompute visible bounds, hit-test clipping, offscreen output |
| `structural` | rebuild tree indices, z-order, bounds, hit-test candidates |

### 5.3 Documentation Rule for Animation

Use this wording in public docs:

> Animations are scheduled by Venus, but rendering strategy depends on the invalidation type. Transform-like animations stay on the WebGL composition path. Paint, text, blur, shadow, clip, mask, and complex geometry animations may trigger Canvas2D rasterization and texture upload before WebGL composition.

---

## 6. Document Model Notes

### 6.1 Flat Properties vs Structured Feature Model

Current model fields are flat across node types, such as:

```text
fill, fills, stroke, strokes, strokeWidth, strokeAlign, strokeDashArray,
strokeCap, strokeJoin, shadow, innerShadow, layerBlur, opacity, blendMode
```

That is acceptable during capability validation, but docs should explain that these are current public fields rather than final product ergonomics.

A later structured model may group related fields:

```typescript
interface VenusStroke {
  paints: VenusPaint[]
  width?: number
  align?: 'center' | 'inside' | 'outside'
  dash?: number[]
  cap?: 'butt' | 'round' | 'square'
  join?: 'miter' | 'round' | 'bevel'
}

type VenusEffect =
  | { type: 'dropShadow'; color: string; blur: number; offsetX: number; offsetY: number }
  | { type: 'innerShadow'; color: string; blur: number }
  | { type: 'layerBlur'; amount: number }
```

Recommendation: do not migrate immediately. First add explicit compatibility rules and tests:

1. If both `fill` and `fills` exist, define precedence.
2. If both `stroke` and `strokes` exist, define precedence.
3. Define whether `shadow`, `innerShadow`, and `layerBlur` ordering is fixed or user-controlled.
4. Define cache keys for every paint/effect field.
5. Define which fields affect hit-test and bounds.

---

## 7. Hit Test, Clip, and Mask Notes

Hit testing must remain backend-neutral. It should not depend on whether a node is drawn by WebGL packets or Canvas2D texture fallback.

Important rules:

- Hit-test operates on document geometry and visibility, not pixels by default.
- Clip/mask must constrain hit visibility consistently with rendered output.
- Stroke hit area must respect `strokeWidth`, `strokeAlign`, dash, caps, joins, and tolerance where supported.
- Hover and click can use different default tolerance, but should call the same geometry engine.
- Locked nodes should have documented behavior: selectable, skipped, or returned only with `includeLocked`.

Open decision:

```text
Should mask hit-test use source geometry, alpha-visible pixels, or clip-like vector bounds?
```

Recommendation: document current behavior explicitly and add tests before changing it.

---

## 8. Documentation Changes Recommended

### 8.1 `apps/engine-docs`

Update these sections:

1. `Venus Parameters > render.backend`
   - explain WebGL primary backend
   - explain Canvas2D fidelity raster path
   - explain `auto`, `webgl`, `canvas2d`

2. `Performance Settings`
   - add texture upload / rasterization cost notes
   - explain why transform animations are cheaper than paint/text/effect animations

3. `Animation`
   - add invalidation categories
   - distinguish WebGL composition animations from Canvas2D rerasterized animations

4. `Document Models`
   - for gradient, stroke style, shadow, blur, clip, mask, text, image: state rendering strategy and invalidation impact

5. `Debug`
   - expose cache diagnostics in user terms: geometry cache, raster texture cache, frame reuse, texture upload cost

### 8.2 `AI/ENGINE_DEVELOPMENT_BACKLOG.md`

Rename backend isolation tasks around this idea:

```text
WebGL orchestration + Canvas2D fidelity rasterization isolation
```

Avoid implying Canvas2D is only a fallback or temporary legacy path.

### 8.3 `AI/ENGINE_AUDIT_REPORT.md`

Keep this report as a living audit. Do not call it final until:

- full verification commands are rerun and pasted with counts
- docs accurately describe WebGL + Canvas2D texture composition
- animation invalidation rules are tested
- clip/mask hit-test semantics are explicitly decided

---

## 9. Recommended Next Work

Priority order:

1. **Docs correction**: update `apps/engine-docs` backend and animation pages with the exact architecture above.
2. **Invalidation model**: add typed mutation classification for transform/opacity/geometry/paint/text/effect/clipMask.
3. **Cache model**: make cache keys include paint/effect fields and expose user-readable cache diagnostics.
4. **Clip/mask semantics**: document and test transform + hit-test behavior before adding more UI controls.
5. **WebGL native upgrades**: only after fallback correctness is stable, add shader-native gradient/shadow paths where it improves performance.

---

## 10. Commit Guidance

Do not commit based on this report alone. Before commit:

1. inspect `git status --short`
2. rerun TypeScript and test gates
3. manually review `apps/engine-docs` in browser
4. confirm `AI/ENGINE_DEVELOPMENT_BACKLOG.md` and this report describe the same architecture
5. separate mechanical cleanup commits from behavior-changing engine commits when possible
