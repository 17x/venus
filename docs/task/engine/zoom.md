# Smooth Zoom / Pan Rendering Strategy

## 1. Goal

This document defines how the editor should keep zooming and panning smooth when low-quality bitmap cache is allowed.

The editor already uses WebGL.

During zooming, the renderer should prioritize input responsiveness over visual quality.

Core rule:

```txt
smooth first, quality later
```

During zooming / panning:

```txt
- do not redraw all real vector elements
- do not rebuild the full display list every wheel event
- do not upload many textures in one frame
- use existing bitmap / tile / snapshot cache first
- keep selection / handles / guides clear and live
```

After zoom / pan becomes idle:

```txt
- progressively refresh visible tiles
- restore sharp vector / high-quality tile rendering
- restore shadow / filter / high-res images only after interaction ends
```

---

## 2. Rendering Modes

Add explicit rendering modes for zoom and pan interaction.

```ts
export type CameraRenderMode =
  | "idle"
  | "zooming-cache"
  | "zooming-snapshot"
  | "panning-cache"
  | "panning-snapshot"
  | "progressive-refresh";
```

Meaning:

```txt
idle:
  normal rendering or sharp cached tile rendering

zooming-cache:
  render base scene from existing tile textures

zooming-snapshot:
  render base scene from screen-space snapshot if tile cache is missing or too slow

panning-cache:
  render base scene from existing tile textures during pan

panning-snapshot:
  render base scene from screen-space snapshot if pan moves faster than tile cache can cover

progressive-refresh:
  after zoom idle, refresh visible tiles from center to edges
```

---

## 3. Zoom / Pan Frame Principle

Do not do this during zooming or panning:

```txt
wheel / pan event
  -> update camera
  -> cull 100K elements
  -> rebuild display list
  -> upload buffers
  -> redraw full WebGL scene
```

Do this instead:

```txt
wheel / pan event
  -> update target camera only

requestAnimationFrame
  -> smooth current camera toward target camera
  -> draw cached tile textures or snapshot texture
  -> draw live overlays
  -> schedule missing tile requests without blocking
```

During zooming / panning, one frame should only do cheap work:

```txt
1. update camera matrix
2. draw existing tile textures or snapshot texture
3. draw overlay layers live
4. enqueue cache refresh work
```

---

## 4. Cache Fallback Order

When zooming or panning, always draw the best available cached visual result.

Fallback order:

```txt
1. exact visible tile
2. same zoom bucket neighbor tile cache
3. nearest zoom bucket tile
4. overview tile
5. screen-space snapshot texture
6. blank background
```

Never block the frame waiting for an exact tile.

If the exact tile is missing, render a lower-quality fallback and enqueue exact tile generation. During panning, preload tiles in the pan direction first.

```ts
function resolveCameraVisual(
  tile: TileCoord,
  camera: Camera,
): TileTextureEntry | SnapshotTexture | null {
  return (
    tileCache.getExact(tile) ??
    tileCache.getSameZoomNeighbor(tile, camera) ??
    tileCache.getNearestZoom(tile, camera.zoom) ??
    overviewCache.getFallback(tile) ??
    cameraSnapshotCache.getCurrent() ??
    null
  );
}
```

---

## 5. Screen-Space Snapshot Fallback

At zoom start, capture the current base scene framebuffer into a low-quality snapshot texture.

```txt
zoom / pan start:
  capture current base scene as snapshot texture
```

During zooming or panning, if tile cache is missing, stale, or too expensive, draw the snapshot texture transformed by camera delta.

```txt
zooming / panning:
  draw snapshot texture with camera delta transform
```

The snapshot may become blurry or slightly stretched. That is acceptable during active zooming or panning.

The snapshot is only a temporary visual fallback.

It must not be used for hit testing, selection, or final rendering.

Recommended behavior:

```txt
zoom / pan start:
  freeze current visual base scene snapshot

zooming / panning:
  draw snapshot / cached tiles
  avoid full vector redraw

zoom / pan idle:
  discard snapshot after sharp visible tiles are available
```

---

## 6. Camera Update Rules

Input events and rendering must be decoupled.

Do not render directly inside wheel events.

Wheel, pinch, and pan events should only update `targetCamera`.

```ts
let targetCamera: Camera = camera;
let cameraDirty = false;

function onWheel(event: WheelEvent): void {
  targetCamera = updateTargetCameraFromWheel(targetCamera, event);
  cameraDirty = true;
  setZoomingState();
}

function onPan(delta: Point): void {
  targetCamera = updateTargetCameraFromPan(targetCamera, delta);
  cameraDirty = true;
  setPanningState();
}
```

The render loop reads the latest camera once per frame.

```ts
function frame(now: number): void {
  if (
    cameraDirty ||
    interactionState === "zooming" ||
    interactionState === "panning"
  ) {
    camera = smoothCamera(camera, targetCamera, now);
    renderCameraInteractionFrame(camera);
    cameraDirty = false;
  }

  requestAnimationFrame(frame);
}
```

---

## 7. Smooth Camera Interpolation

Do not let camera jump abruptly when wheel or pan delta is large.

Use target camera and render camera separation.

```txt
input camera:
  updated immediately by wheel / gesture / pan input

render camera:
  smoothly follows input camera
```

Simple interpolation:

```ts
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function smoothCamera(current: Camera, target: Camera): Camera {
  return {
    x: lerp(current.x, target.x, 0.35),
    y: lerp(current.y, target.y, 0.35),
    zoom: lerp(current.zoom, target.zoom, 0.35),
  };
}
```

Preferred time-based damping:

```ts
function damp(
  current: number,
  target: number,
  lambda: number,
  dt: number,
): number {
  return target + (current - target) * Math.exp(-lambda * dt);
}

function smoothCameraByTime(
  current: Camera,
  target: Camera,
  dt: number,
): Camera {
  const lambda = 18;

  return {
    x: damp(current.x, target.x, lambda, dt),
    y: damp(current.y, target.y, lambda, dt),
    zoom: damp(current.zoom, target.zoom, lambda, dt),
  };
}
```

---

## 8. Cursor-Anchored Zoom

Zoom must be anchored around the cursor position.

The world point under the cursor before zoom should remain under the cursor after zoom.

Do not zoom around canvas center by default.

```ts
function zoomAtScreenPoint(
  camera: Camera,
  screenPoint: Point,
  nextZoom: number,
): Camera {
  const before = screenToWorld(screenPoint, camera);

  const nextCamera: Camera = {
    ...camera,
    zoom: nextZoom,
  };

  const after = screenToWorld(screenPoint, nextCamera);

  return {
    ...nextCamera,
    x: camera.x + (after.x - before.x) * nextZoom,
    y: camera.y + (after.y - before.y) * nextZoom,
  };
}
```

Required behavior:

```txt
mouse wheel zoom:
  anchor at mouse cursor

trackpad pinch zoom:
  anchor at pinch center

keyboard zoom:
  anchor at viewport center or current selection center
```

---

## 8.1 Panning Rules

Panning must feel directly connected to pointer / trackpad movement.

Required behavior:

```txt
pointer drag pan:
  camera translation follows pointer delta

trackpad pan:
  camera translation follows scroll delta

middle mouse pan / space drag:
  camera translation follows drag delta
```

During panning:

```txt
- do not rebuild full scene
- draw existing tile textures
- if visible tiles are missing, draw overview / snapshot fallback
- preload tiles in pan direction first
- cancel preload tiles behind the pan direction if budget is tight
- keep overlay live and sharp
```

Pan direction priority:

```txt
if panning right:
  prioritize tiles entering from the right edge

if panning left:
  prioritize tiles entering from the left edge

if panning down:
  prioritize tiles entering from the bottom edge

if panning up:
  prioritize tiles entering from the top edge
```

Pan frame rule:

```txt
panning frame:
  update camera translation
  draw exact visible tiles if available
  draw overview / snapshot for missing tiles
  render overlay live
  enqueue tiles entering viewport
  do not wait for tile generation
```

---

## 9. Quality Degrade During Zoom / Pan

During zooming or panning, base scene quality should be reduced.

Rules:

```txt
base scene DPR <= 1
fast zoom / fast pan base scene DPR <= 0.75
very fast zoom / very fast pan base scene DPR <= 0.5
no shadow
no filter / blur
no expensive mask
no high-res image upload
image max LOD = thumbnail-512 or thumbnail-1024
text below 12px becomes block or hidden
path uses simplified / bbox mode
```

Important exception:

```txt
selection / handles / guides / cursor / hover overlay must stay live and sharp
```

Base scene may be blurry.

Interaction overlay must remain precise.

---

## 10. Zoom Velocity Quality Mode

Use zoom velocity to choose temporary quality.

```txt
zoomVelocity = abs(log2(currentZoom / previousZoom)) / deltaTime
```

Quality mode:

```ts
export type ZoomQualityMode = "medium" | "low" | "very-low";

export function getZoomQualityMode(zoomVelocity: number): ZoomQualityMode {
  if (zoomVelocity > 4) {
    return "very-low";
  }

  if (zoomVelocity > 1.5) {
    return "low";
  }

  return "medium";
}
```

Rules:

```txt
medium:
  draw exact / nearest tiles
  allow at most 1 tile upload per frame

low:
  draw nearest tile / overview / snapshot
  avoid tile upload during active zoom

very-low:
  draw snapshot / overview only
  no tile upload during active zoom
```

---

## 10.1 Pan Velocity Quality Mode

Use pan velocity to choose temporary quality during panning.

```txt
panVelocity = length(currentCameraPosition - previousCameraPosition) / deltaTime
```

Quality mode:

```ts
export type PanQualityMode = "medium" | "low" | "very-low";

export function getPanQualityMode(panVelocity: number): PanQualityMode {
  if (panVelocity > 3000) {
    return "very-low";
  }

  if (panVelocity > 1000) {
    return "low";
  }

  return "medium";
}
```

Rules:

```txt
medium:
  draw exact visible tiles
  preload one-ring tiles in pan direction
  allow at most 1 tile upload per frame

low:
  draw exact tiles if available
  use overview / snapshot for missing entering tiles
  avoid most tile upload during active pan

very-low:
  draw snapshot / overview for missing tiles
  no tile upload during active pan
```

Pan velocity thresholds are starting values and should be tuned by profiling.

---

## 11. Tile Generation and Upload Budget

Never generate or upload many tiles during active zooming or panning.

During zooming / panning:

```txt
max tile uploads per frame: 0 - 1
max tile render budget: 1ms - 2ms
```

During progressive refresh:

```txt
max tile uploads per frame: 2 - 4
max tile render budget: 6ms - 8ms
```

During idle background preload:

```txt
max tile uploads per frame: 2 - 6
max tile render budget: 8ms - 12ms
```

Rules:

```txt
visible missing tile has highest priority
tiles entering viewport during pan have higher priority than tiles leaving viewport
center viewport tile before edge tile
current zoom bucket before nearby bucket
nearby preload only after visible tiles are ready
```

Do not block input handling for tile work.

---

## 12. Zoom / Pan Idle Detection

Use idle delay before restoring quality after zooming or panning.

Recommended value:

```txt
zoom idle delay = 120ms
pan idle delay = 80ms - 120ms
recommended pan idle delay = 100ms
```

Behavior:

```txt
wheel / pinch event:
  set interactionState = zooming
  reset zoom idle timer

pan event:
  set interactionState = panning
  reset pan idle timer

no zoom input for 120ms:
  set interactionState = progressive-refresh
  start visible tile refresh

no pan input for 100ms:
  set interactionState = progressive-refresh
  start visible tile refresh
```

Example:

```ts
let zoomIdleTimer: number | null = null;
let panIdleTimer: number | null = null;

function onZoomInput(): void {
  interactionState = "zooming";

  if (zoomIdleTimer !== null) {
    clearTimeout(zoomIdleTimer);
  }

  zoomIdleTimer = window.setTimeout(() => {
    interactionState = "progressive-refresh";
    startProgressiveRefresh();
  }, 120);
}

function onPanInput(): void {
  interactionState = "panning";

  if (panIdleTimer !== null) {
    clearTimeout(panIdleTimer);
  }

  panIdleTimer = window.setTimeout(() => {
    interactionState = "progressive-refresh";
    startProgressiveRefresh();
  }, 100);
}
```

---

## 13. Progressive Refresh Order

After zoom or pan becomes idle, do not refresh everything at once.

Refresh order:

```txt
1. tile under cursor or viewport center
2. tiles entering viewport from last pan direction
3. remaining visible tiles
4. viewport edge tiles
5. one-ring nearby preload tiles
6. overview cache / far cache
```

This makes the visible area become sharp quickly without causing a frame spike.

Progressive refresh must be interruptible.

If a new zoom or pan event happens:

```txt
cancel outdated refresh work
return to zooming mode
use existing cache / snapshot again
```

---

## 14. Tile Replacement Without Flicker

When a new sharp tile is ready, replace the blurry fallback carefully.

Rules:

```txt
tile world bounds must match exactly
tile edge must align with neighboring tiles
texture filtering must be consistent
avoid white gap between tiles
```

Recommended WebGL texture settings:

```txt
TEXTURE_WRAP_S = CLAMP_TO_EDGE
TEXTURE_WRAP_T = CLAMP_TO_EDGE
MIN_FILTER = LINEAR
MAG_FILTER = LINEAR
```

Optional:

```txt
fade in sharp tile over 50ms - 100ms
```

If fade is too costly, direct replacement is acceptable, but avoid flicker and gaps.

---

## 15. Overlay Rendering Rules

Base scene can use low-quality cache.

Overlay must stay precise.

Always render these live:

```txt
selection bounds
resize handles
rotation handles
hover outline
snap guides
marquee rectangle
cursor
active editing caret
active path control points
```

Overlay should use:

```txt
device DPR
current camera matrix
fresh geometry from document model
```

Overlay should not depend on bitmap cache.

---

## 16. Minimal Implementation

Implement this first:

```txt
1. on zoom / pan start, capture base scene snapshot texture
2. during zooming / panning, do not redraw all real elements
3. during zooming / panning, draw exact tile / nearest tile / overview / snapshot fallback
4. base scene DPR <= 1 during zooming / panning
5. disable shadow / filter / blur during zooming / panning
6. image LOD max = thumbnail-512 or thumbnail-1024 during zooming / panning
7. render overlay live and sharp
8. no zoom input for 120ms -> progressive refresh
9. no pan input for 100ms -> progressive refresh
10. during zooming / panning, upload at most 1 tile per frame
11. during panning, prioritize tiles entering viewport from pan direction
12. during progressive refresh, refresh visible center tiles first
```

---

## 17. Required Debug Stats

Expose these stats in dev mode:

```txt
cameraRenderMode
zoomQualityMode
panQualityMode
zoomVelocity
panVelocity
panDirection
baseSceneDpr
usedSnapshotFallback
exactTileHitCount
nearestTileHitCount
overviewFallbackCount
snapshotFallbackCount
missingTileCount
enteringViewportTileCount
leavingViewportTileCount
tileUploadCountThisFrame
tileRenderBudgetMs
tileUploadBudgetMs
progressiveRefreshQueueSize
zoomIdleDelayMs
panIdleDelayMs
frameTimeMs
```

These stats are required to verify that zooming and panning do not accidentally trigger full rendering work.

---

## 18. Final Rules

```txt
1. Zoom / pan input must never wait for rendering quality.
2. Wheel / pinch / pan events only update target camera.
3. Rendering happens once per animation frame.
4. During zooming / panning, base scene uses cache or snapshot.
5. During zooming / panning, do not fully redraw all elements.
6. During zooming / panning, do not upload many textures.
7. During zooming / panning, base scene quality may be low.
8. Overlay must remain sharp and live.
9. Zoom must be anchored around cursor / pinch center.
10. Pan must prioritize tiles entering the viewport.
11. After zoom / pan idle, progressively restore sharp result.
```
