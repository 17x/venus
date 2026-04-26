# WebGL 编辑器 Tile Cache / LOD / Progressive Rendering 设计方案

## 0. 目标

当前编辑器已经使用 WebGL 作为主要渲染后端。

在 10K / 50K / 100K 元素场景下，缩放、平移、拖拽时如果仍然实时重绘所有元素，会出现明显性能压力。

本方案的目标是：

```txt
交互过程中：
  不实时重绘全部矢量元素
  使用 WebGL tile texture cache 临时占位
  selection / handles / guides 保持实时绘制

交互结束后：
  渐进式刷新可见区域
  恢复清晰、准确的最终渲染结果
```

核心原则：

```txt
WebGL 仍然是主渲染器。
Tile cache 只是交互过程中的 base scene 加速层。
文档模型、命中测试、选择逻辑不能依赖 tile bitmap。
```

---

## 1. 总体架构

推荐将渲染拆成几类层：

```txt
WebGL Renderer
  ├─ Base Scene Layer
  │   ├─ vector-live render path
  │   └─ tile-cache render path
  │
  ├─ Image Layer
  │   ├─ image texture cache
  │   └─ image mipmap / scale bucket cache
  │
  ├─ Interaction Layer
  │   ├─ active dragging elements
  │   ├─ transform preview
  │   └─ marquee preview
  │
  ├─ Selection Layer
  │   ├─ selection bounds
  │   ├─ resize handles
  │   ├─ rotation handles
  │   └─ hover outline
  │
  ├─ Guide Layer
  │   ├─ snap lines
  │   ├─ ruler lines
  │   └─ alignment guides
  │
  └─ Cursor Layer
      └─ DOM CSS cursor
```

其中 Base Scene Layer 有三种模式：

```ts
export type BaseSceneRenderMode =
  | "vector-live"
  | "tile-cache"
  | "progressive-refresh";
```

含义：

```txt
vector-live:
  正常精确渲染，可用于静止状态或小场景。

tile-cache:
  zoom / pan / drag 等高频交互中使用 tile texture 代替完整矢量绘制。

progressive-refresh:
  交互停止后，按优先级刷新可见 tile，让画面逐步恢复清晰。
```

---

## 2. 为什么 WebGL 项目仍然需要 Tile Cache

WebGL 提升的是 GPU 绘制能力，但它不能自动消除所有成本。

100K 元素场景中仍然会有这些压力：

```txt
CPU 构建 display list
CPU 做 culling / sorting / style resolve
buffer 更新
uniform / texture / state 切换
复杂 path 的 tessellation
文字布局与纹理生成
图片纹理上传
hit test / hover / selection 计算
```

如果缩放过程中每帧都重新走完整渲染链路，WebGL 也会卡。

Tile cache 的作用是把大量元素提前渲染成纹理。

交互过程中只画：

```txt
几十个 tile textured quad
```

而不是画：

```txt
几万到十几万个真实元素
```

这对 WebGL 非常合适，因为 WebGL 画贴图 quad 很便宜。

---

## 3. 渲染流程

### 3.1 正常静止状态

```txt
camera stable
  -> render visible scene precisely
  -> update visible tile cache if needed
  -> render selection / handles / guides live
```

### 3.2 缩放 / 平移中

```txt
camera changing
  -> switch base scene to tile-cache mode
  -> compose cached tile textures by WebGL
  -> transform tile quads with camera matrix
  -> render interaction overlays live
  -> schedule missing / dirty tiles in background
```

### 3.3 交互结束后

```txt
camera idle
  -> enter progressive-refresh mode
  -> refresh visible missing / dirty tiles first
  -> refresh current zoom bucket tiles
  -> preload nearby tiles
  -> keep overlays live
```

---

## 4. Cache 分层

推荐分四类缓存。

```txt
L0: Live Vector Render
    最终精确 WebGL 渲染结果。

L1: Viewport Tile Texture Cache
    当前 zoom bucket 附近的 tile 纹理缓存。

L2: Overview Cache
    低分辨率大范围缓存，用于快速 zoom out / fast pan 的兜底。

L3: Image Texture Cache
    图片资源自己的 texture / mipmap / scale bucket 缓存。
```

不要一开始做太多层级。

推荐初始版本：

```txt
supported zoom range:
  0.02 - 30
  2% - 3000%

zoom buckets:
  1/64, 1/32, 1/16, 1/8,
  1/4, 1/2, 1, 2, 4,
  8, 16, 32

active cached buckets:
  previous bucket
  current bucket
  next bucket

cache policy:
  support the full bucket range
  only keep nearby buckets in memory
  evict far buckets by LRU / memory budget

tile size:
  512 CSS px

fallback order:
  exact tile
  nearest zoom bucket tile
  overview tile
  blank tile
```

---

## 5. Zoom Bucket

不要按真实 zoom 值缓存 tile。

错误方式：

```txt
zoom 1.01 一份 cache
zoom 1.02 一份 cache
zoom 1.03 一份 cache
```

正确方式：

```txt
按 2 倍阶梯建立 zoom bucket。
你的编辑器缩放范围是 2% - 3000%，也就是 0.02 - 30。
因此 bucket 需要覆盖到接近 0.02 和 30 的范围。

supported zoom buckets:
  1/64, 1/32, 1/16, 1/8,
  1/4, 1/2, 1, 2, 4,
  8, 16, 32
```

注意：支持这些 bucket 不等于所有 bucket 都长期常驻内存。

实际缓存策略应该是：

```txt
当前 zoom bucket
上一个 zoom bucket
下一个 zoom bucket
overview cache
```

例如当前 zoom 是 `1.7`，当前 bucket 是 `2`，那么主要保留：

```txt
1
2
4
```

远离当前 zoom 的 bucket 应该被 LRU 或 memory budget 淘汰。

实现：

```ts
export const ZOOM_BUCKETS = [
  1 / 64,
  1 / 32,
  1 / 16,
  1 / 8,
  1 / 4,
  1 / 2,
  1,
  2,
  4,
  8,
  16,
  32,
] as const;

export function getZoomBucket(zoom: number): number {
  let best = ZOOM_BUCKETS[0];
  let bestDiff = Math.abs(Math.log2(zoom / best));

  for (const bucket of ZOOM_BUCKETS) {
    const diff = Math.abs(Math.log2(zoom / bucket));

    if (diff < bestDiff) {
      best = bucket;
      bestDiff = diff;
    }
  }

  return best;
}
```

```ts
export function getActiveZoomBuckets(zoom: number): number[] {
  const current = getZoomBucket(zoom);
  const index = ZOOM_BUCKETS.indexOf(current as (typeof ZOOM_BUCKETS)[number]);

  return [
    ZOOM_BUCKETS[index - 1],
    ZOOM_BUCKETS[index],
    ZOOM_BUCKETS[index + 1],
  ].filter((value): value is number => typeof value === "number");
}
```

示例：

```txt
0.02 -> 1/64 或 1/32 附近
0.76 -> 1
1.3  -> 1
1.7  -> 2
2.9  -> 4
30   -> 32
```

### 5.1 不同缩放区间的策略

2% - 3000% 不能用同一种渲染策略硬套。

推荐分区：

```txt
2% - 12.5%:
  overview / LOD 为主
  不画完整细节
  tiny text / tiny path / tiny shape 可以跳过或合并

12.5% - 400%:
  normal tile cache 主力区间
  适合生成比较完整的 tile texture

400% - 3000%:
  high zoom 局部精细渲染
  viewport 覆盖的 world area 很小
  可以优先 live vector / 局部 tile refresh
```

也就是说：

```txt
极低 zoom:
  overview cache 更重要

中间 zoom:
  tile cache 最重要

极高 zoom:
  live vector / 局部 tile 更重要
```

---

## 6. Tile 坐标系统

Tile 应该基于 world space，而不是 screen space。

```ts
export interface TileCoord {
  x: number;
  y: number;
  zoomBucket: number;
}
```

Tile key 需要包含足够的信息，避免拿到错误缓存。

```ts
export type TileKey = string;

export function createTileKey(input: {
  tileX: number;
  tileY: number;
  zoomBucket: number;
  dpr: number;
  themeVersion: number;
  renderVersion: number;
}): TileKey {
  return [
    input.zoomBucket,
    input.tileX,
    input.tileY,
    input.dpr,
    input.themeVersion,
    input.renderVersion,
  ].join(":");
}
```

至少应该包含：

```txt
zoomBucket
tileX
tileY
dpr
renderVersion
themeVersion / styleVersion
```

可选增加：

```txt
layerVersion
imageVersion
fontVersion
localeVersion
```

---

## 7. Tile Texture Entry

在 WebGL 项目里，tile cache 最终应该是 GPU texture。

```ts
export interface TileTextureEntry {
  key: TileKey;
  coord: TileCoord;

  texture: WebGLTexture;

  width: number;
  height: number;
  byteSize: number;

  worldBounds: Rect;

  createdAt: number;
  lastUsedAt: number;

  dirty: boolean;
  pending: boolean;

  sourceZoomBucket: number;
  renderVersion: number;
}
```

注意：

```txt
tile cache 不应该长期保存大量 ImageBitmap。
ImageBitmap 上传到 WebGLTexture 后，应尽量释放 CPU 侧引用。
真正参与交互合成的是 WebGLTexture。
```

---

## 8. Tile 生成流程

推荐流程：

```txt
tile render request
  -> calculate tile world bounds
  -> query spatial index / quadtree
  -> apply LOD rules
  -> build display list
  -> render tile to framebuffer / offscreen target
  -> produce WebGL texture
  -> store TileTextureEntry
```

请求结构：

```ts
export interface TileRenderRequest {
  key: TileKey;
  coord: TileCoord;
  worldBounds: Rect;
  priority: TilePriority;
  reason: TileRenderReason;
}

export type TilePriority = "urgent" | "visible" | "nearby" | "background";

export type TileRenderReason =
  | "missing"
  | "dirty"
  | "zoom-bucket-change"
  | "preload"
  | "overview-fallback";
```

接口：

```ts
export interface TileRenderer {
  renderTile(request: TileRenderRequest): Promise<TileTextureEntry>;
}
```

如果现有 WebGL renderer 支持自定义 viewport / projection，优先用 FBO 直接生成 tile texture。

```txt
优先方案：
  WebGL scene render -> framebuffer texture

备选方案：
  OffscreenCanvas render -> ImageBitmap -> upload to WebGLTexture
```

---

## 9. Tile Compositor

交互过程中 Base Scene 只需要合成 tile texture。

```txt
visible tiles
  -> resolve tile texture
  -> draw textured quad
  -> apply camera matrix in vertex shader
```

伪代码：

```ts
function renderBaseSceneDuringInteraction(camera: Camera): void {
  const zoomBucket = getClampedZoomBucket(camera.zoom);
  const visibleTiles = getVisibleTiles(camera, zoomBucket);

  beginTileCompositePass();

  for (const tile of visibleTiles) {
    const texture =
      tileCache.getExact(tile) ??
      tileCache.getNearestZoom(tile, camera.zoom) ??
      overviewCache.getFallback(tile);

    if (texture) {
      drawTileTexture(texture, tile, camera);
    } else {
      tileScheduler.requestMissingTile(tile, "urgent");
    }
  }

  endTileCompositePass();
}
```

Tile compositor 应该非常简单：

```txt
每个 tile 一个 quad
每个 quad 一个 texture
通过 camera matrix 变换到屏幕
不做复杂业务逻辑
不做 hit test
不做 selection 逻辑
```

---

## 10. Fallback 策略

当 exact tile 不存在时：

```txt
1. 当前 zoom bucket 的 exact tile
2. 最近 zoom bucket 的 tile
3. overview cache
4. blank tile
```

实现：

```ts
function resolveTileTexture(
  tile: TileCoord,
  cameraZoom: number,
): TileTextureEntry | null {
  const exact = tileCache.getExact(tile);
  if (exact && !exact.dirty) return exact;

  const nearest = tileCache.findNearestZoomBucket(tile, cameraZoom);
  if (nearest && !nearest.dirty) return nearest;

  const overview = overviewCache.find(tile);
  if (overview) return overview;

  return null;
}
```

只要使用了 fallback，就应该后台请求 exact tile。

---

## 11. Dirty Tile Invalidation

元素变化时，不要清空全部缓存。

正确方式：

```txt
old bounds + new bounds
  -> union dirty bounds
  -> 找到覆盖这些 bounds 的 tiles
  -> mark dirty
```

示例：

```ts
function markElementDirty(oldBounds: Rect, newBounds: Rect): void {
  const dirtyBounds = unionRect(oldBounds, newBounds);
  const affectedTiles = getTilesIntersectingWorldBounds(dirtyBounds);

  for (const tile of affectedTiles) {
    tileCache.markDirty(tile);
  }
}
```

不同变更类型：

```txt
单个元素移动：
  dirty old bounds + new bounds

单个元素样式变化：
  dirty element bounds

全局 theme 变化：
  increment themeVersion

renderer 版本变化：
  increment renderVersion

图片资源变化：
  invalidate image texture
  dirty containing tiles
```

---

## 12. 交互规则

### 12.1 Zoom / Pan

缩放和平移时：

```txt
Base Scene:
  draw tile texture only

Selection / Handles / Guides:
  live render every frame

Vector Scene:
  do not fully redraw every frame
```

流程：

```ts
function onCameraInteractionStart(): void {
  renderMode = "tile-cache";
  tileScheduler.boostVisibleTiles();
}

function onCameraChanging(camera: Camera): void {
  renderBaseSceneDuringInteraction(camera);
  renderInteractionLayers(camera);
  tileScheduler.scheduleVisibleTiles(camera);
}

function onCameraInteractionEnd(camera: Camera): void {
  renderMode = "progressive-refresh";
  tileScheduler.scheduleVisibleTiles(camera, "visible");
  tileScheduler.scheduleNearbyTiles(camera, "nearby");
}
```

### 12.2 Dragging

拖拽元素时不要每个 pointermove 都重新生成 tile。

```txt
drag start:
  record old bounds
  mark selected elements as active

dragging:
  draw base scene from tile cache
  draw active elements live above base scene
  draw selection overlay live

drag end:
  commit transform
  calculate old + new bounds
  mark dirty tiles
  schedule tile refresh
```

伪代码：

```ts
function onDragMove(activeElements: Element[], transform: Matrix): void {
  renderBaseSceneFromTiles(camera);
  renderActiveElementsLive(activeElements, transform);
  renderSelectionOverlay(activeElements, transform);
}
```

如果选中元素很多，不要每帧 live render 所有 active elements。

```txt
少量选中：
  live render active elements

大量选中：
  render selected elements once into temporary texture
  drag 时 transform temporary texture
```

初始阈值：

```txt
selected elements <= 300:
  live render

selected elements > 300:
  active selection snapshot texture
```

阈值以后根据 profiling 调整。

---

## 13. Selection / Handles / Guides 不进入 Tile Cache

这些内容应该实时绘制：

```txt
hover outline
selection bounds
resize handles
rotation handles
marquee rectangle
snap guides
cursor state
active text caret
path editing control points
```

原因：

```txt
变化频率高
需要保持清晰
不能等待 tile refresh
绘制成本相对 base scene 低
```

---

## 14. LOD 策略

LOD 应该在 tile 生成前生效。

```txt
tile render request
  -> query elements
  -> apply LOD
  -> build simplified display list
  -> render tile texture
```

示例规则：

```txt
zoom < 0.125:
  overview / very simplified rendering
  skip tiny text
  skip tiny paths
  merge dense tiny shapes when possible
  draw large groups as bbox / point cloud / heat block
  use very low-res image texture

0.125 <= zoom < 0.25:
  text draw as blocks
  simplify path heavily
  small shapes draw as bbox / point
  use low-res image texture

0.25 <= zoom < 1:
  simplify path moderately
  draw text only when readable
  use medium image texture

1 <= zoom <= 4:
  normal tile cache rendering
  full vector rendering where affordable
  normal text rendering
  proper image texture

zoom > 4:
  high zoom local rendering
  prefer visible local vector precision
  only cache current viewport / nearby tiles
```

接口：

```ts
export interface LodDecision {
  visible: boolean;
  mode: "full" | "simplified" | "bbox" | "point" | "skip";
  imageScale?: number;
  pathTolerance?: number;
}

export function getLodDecision(element: Element, zoom: number): LodDecision {
  const screenBounds = projectBoundsToScreen(element.bounds, zoom);

  if (screenBounds.width < 1 && screenBounds.height < 1) {
    return { visible: false, mode: "skip" };
  }

  if (zoom < 0.125) {
    return { visible: true, mode: "point", pathTolerance: 4 };
  }

  if (zoom < 0.25) {
    return { visible: true, mode: "bbox", pathTolerance: 2 };
  }

  if (zoom < 1) {
    return { visible: true, mode: "simplified", pathTolerance: 0.75 };
  }

  return { visible: true, mode: "full" };
}
```

注意：

```txt
LOD 只影响渲染。
LOD 不改变 document model。
LOD 不改变真实 geometry。
```

---

## 15. Image Texture Cache

图片不要重复塞进每个 tile 的长期缓存里。

需要单独做 image texture cache。

```ts
export interface ImageTextureEntry {
  imageId: string;
  scaleBucket: number;
  texture: WebGLTexture;
  width: number;
  height: number;
  byteSize: number;
  lastUsedAt: number;
}
```

推荐 scale buckets：

```txt
0.25
0.5
1
2
```

规则：

```txt
zoom out:
  use low-res texture

normal zoom:
  use normal texture

zoom in:
  use high-res texture if available
```

避免：

```txt
每次 tile render 都重新 decode image
每次 frame 都上传大图 texture
每个 tile 都持有独立大图副本
```

---

## 16. 内存预算

Tile texture 很吃内存。

估算：

```txt
512 x 512 x 4 bytes = 1MB
1024 x 1024 x 4 bytes = 4MB
DPR 2 + 1024 CSS px tile = 2048 x 2048 x 4 = 16MB
```

所以必须有预算和淘汰策略。

推荐初始值：

```txt
tile texture cache soft limit:
  256MB

tile texture cache hard limit:
  512MB

image texture cache soft limit:
  256MB

image texture cache hard limit:
  512MB
```

淘汰优先级：

```txt
1. viewport 外的 tile
2. 非当前 zoom bucket tile
3. dirty tile
4. least recently used tile
5. 最后才考虑当前可见 tile
```

示例：

```ts
export class WebGLTextureBudget {
  private usedBytes = 0;

  constructor(
    private readonly softLimitBytes: number,
    private readonly hardLimitBytes: number,
  ) {}

  shouldEvict(): boolean {
    return this.usedBytes > this.softLimitBytes;
  }

  mustEvict(): boolean {
    return this.usedBytes > this.hardLimitBytes;
  }
}
```

---

## 17. Tile Scheduler

Tile 不能无限生成，也不能一帧上传太多 texture。

优先级：

```txt
1. visible missing tiles
2. visible dirty tiles
3. current zoom bucket tiles
4. nearby preload tiles
5. overview / background tiles
```

接口：

```ts
export class TileScheduler {
  requestTile(request: TileRenderRequest): void {
    // dedupe by tile key
    // upgrade priority if needed
    // enqueue request
  }

  cancelOutdatedRequests(camera: Camera): void {
    // remove requests far away from viewport
  }

  tick(frameBudgetMs: number): void {
    // process limited render / upload work
  }
}
```

推荐预算：

```txt
active interaction frame:
  2ms - 4ms for tile scheduling / upload

idle frame:
  8ms - 12ms for progressive refresh
```

---

## 18. Progressive Refresh

交互结束后，不要一次性刷新所有 tile。

```txt
step 1:
  refresh visible missing / dirty tiles

step 2:
  refresh visible exact zoom bucket tiles

step 3:
  refresh nearby preload ring

step 4:
  refresh overview cache if needed
```

实现：

```ts
function onInteractionIdle(camera: Camera): void {
  const zoomBucket = getClampedZoomBucket(camera.zoom);
  const visible = getVisibleTiles(camera, zoomBucket);
  const nearby = getNearbyTiles(camera, zoomBucket, 1);

  tileScheduler.enqueue(visible, "visible");
  tileScheduler.enqueue(nearby, "nearby");
}
```

idle 判断：

```txt
wheel / pointermove active:
  interaction active

camera no change for 100ms - 160ms:
  interaction idle

recommended initial value:
  120ms
```

---

## 19. Hit Test 不依赖 Tile Cache

Tile cache 只负责显示。

不要用 tile bitmap 作为主要 hit test 来源。

Hit test 应继续基于：

```txt
document model
spatial index / quadtree
geometry bounds
path hit test
stroke tolerance
z-order sorting
multi-hit list
```

规则：

```txt
visual rendering:
  tile texture cache

semantic interaction:
  document model + spatial index + hit test pipeline
```

GPU picking 可以作为优化，但不能替代语义 hit test。

---

## 20. WebGL 实现注意点

### 20.1 Texture Upload

`texImage2D` / `texSubImage2D` 可能造成卡顿。

规则：

```txt
限制每帧 texture upload 数量
优先上传 visible tile
大图上传走 scheduler
上传后释放 CPU bitmap 引用
尽量复用 texture object
```

### 20.2 FBO Tile Rendering

如果已有 WebGL renderer 能支持自定义 projection 和 viewport，建议用 FBO 直接渲染 tile。

```txt
scene render with tile projection
  -> framebuffer texture
  -> TileTextureEntry.texture
```

优点：

```txt
少一次 CPU bitmap 过程
不需要 OffscreenCanvas 2D
更符合 WebGL pipeline
```

缺点：

```txt
需要 renderer 支持 tile projection
需要处理 FBO 生命周期
需要处理 texture memory
```

### 20.3 Tile Compositor Shader

Tile compositor shader 应该非常简单。

输入：

```txt
tile quad position
uv
tile world bounds
camera matrix
sampler2D tileTexture
opacity
```

输出：

```txt
screen framebuffer
```

不要把业务逻辑塞进 tile compositor。

---

## 21. 推荐实现阶段

### Stage 1: WebGL Tile Compositor

实现：

```txt
TileCoord
TileKey
TileTextureEntry
visible tile calculation
tile texture draw quad
manual tile cache injection for testing
```

目标：

```txt
能在交互中用 tile texture 画 base scene。
```

### Stage 2: Tile Render To Texture

实现：

```txt
render visible tile to FBO texture
store TileTextureEntry
resolve exact tile
```

目标：

```txt
不用全屏缓存，而是按 tile 生成 texture。
```

### Stage 3: Dirty Tile

实现：

```txt
element old/new bounds
bounds -> affected tiles
dirty tile marking
visible dirty refresh
```

目标：

```txt
元素变化只刷新局部。
```

### Stage 4: Scheduler

实现：

```txt
priority queue
request dedupe
cancel outdated requests
per-frame upload budget
idle refresh
```

目标：

```txt
tile 生成和 texture 上传不阻塞输入。
```

### Stage 5: Zoom Bucket Fallback

实现：

```txt
full zoom bucket range: 1/64 -> 32
active cached buckets: previous / current / next
nearest zoom fallback
overview fallback
far bucket eviction
```

目标：

```txt
快速缩放时没有大面积空白。
```

### Stage 6: LOD

实现：

```txt
small object skip
text placeholder
path simplification
image scale bucket selection
```

目标：

```txt
低 zoom 下 tile 生成更快。
```

### Stage 7: Active Selection Snapshot

实现：

```txt
small selection live render
large selection temporary texture
transform snapshot during drag
commit后 dirty old/new bounds
```

目标：

```txt
大量元素拖拽保持流畅。
```

---

## 22. 推荐接口汇总

```ts
export interface TileCacheManager {
  getExact(coord: TileCoord): TileTextureEntry | null;
  getNearestZoom(coord: TileCoord, zoom: number): TileTextureEntry | null;
  markDirtyByBounds(bounds: Rect): void;
  put(entry: TileTextureEntry): void;
  evictIfNeeded(camera: Camera): void;
}
```

```ts
export interface TileCompositor {
  draw(entries: TileTextureEntry[], camera: Camera): void;
}
```

```ts
export interface TileRenderService {
  request(request: TileRenderRequest): void;
  cancelOutdated(camera: Camera): void;
  tick(frameBudgetMs: number): void;
}
```

```ts
export interface LodService {
  getDecision(element: Element, camera: Camera): LodDecision;
}
```

```ts
export interface ImageTextureCache {
  get(imageId: string, scaleBucket: number): ImageTextureEntry | null;
  request(imageId: string, scaleBucket: number): void;
  evictIfNeeded(): void;
}
```

---

## 23. 性能指标

需要覆盖这些测试场景：

```txt
10K mixed elements
50K mixed elements
100K mixed elements
1K images with random sizes
10K images with random sizes
large sparse scene
large dense clustered scene
large selected elements dragging
fast zoom in / zoom out
fast pan across large canvas
```

记录指标：

```txt
FPS during pan
FPS during zoom
frame time p95
tile generation time
tile upload time
tile cache hit rate
tile cache miss rate
dirty tile count per edit
GPU texture memory estimate
CPU memory estimate
input latency
```

建议 stats：

```ts
export interface RenderPerformanceStats {
  frameTimeMs: number;
  tileHitCount: number;
  tileMissCount: number;
  tileUploadCount: number;
  tileRenderCount: number;
  dirtyTileCount: number;
  visibleTileCount: number;
  gpuTextureBytes: number;
  imageTextureBytes: number;
  activeRenderMode: BaseSceneRenderMode;
}
```

---

## 24. 最终规则

```txt
1. zoom / pan 中不要重绘全部元素。
2. Base scene 可以用 tile texture 临时代替。
3. Selection / handles / guides 必须实时绘制。
4. Tile cache 只做视觉缓存，不做文档语义。
5. Hit test 不依赖 tile bitmap。
6. Dirty invalidation 必须局部化。
7. Tile texture 和 image texture 必须有内存预算。
8. Texture upload 必须被 scheduler 控制。
9. LOD 只影响渲染，不改变 document model。
10. 交互结束后必须 progressive refresh，恢复清晰画面。
```

---

## 25. 最小可执行版本

第一版不要做太大。

直接做：

```txt
Base scene tile-cache mode
512 CSS px tile
supported zoom buckets: 1/64 -> 32
active cached buckets: previous / current / next only
visible tile calculation
tile texture compositor
FBO render tile texture
exact tile lookup
nearest zoom fallback
120ms idle progressive refresh
selection / handles / guides live layer
256MB tile cache soft budget
```

暂时可以不做：

```txt
复杂 overview cache
复杂 image mipmap
复杂 path simplification
worker tile generation
GPU picking
large selection snapshot
```

等 Stage 1 - Stage 3 稳定后再加。

---

## 26. 一句话总结

```txt
WebGL 负责最终渲染和 tile 合成。
Tile texture cache 负责交互过程中的 base scene 加速。
LOD 降低 tile 生成成本。
Dirty tile 保证局部刷新。
Scheduler 避免生成和上传造成卡顿。
Selection / handles / guides 始终实时绘制。
交互结束后 progressive refresh，恢复清晰结果。
```
