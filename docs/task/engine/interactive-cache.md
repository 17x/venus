# Interactive Cache 总结方案：一切为了丝滑操作

## 1. 核心目标

本方案的目标只有一个：

```txt
zoom / pan 等视图高频交互必须丝滑。
```

在 zoom / pan 这类视图交互过程中，渲染质量可以临时降低，但输入响应不能卡。

但是 drag、transform、编辑文本、修改元素属性等操作表示用户正在处理当前层或当前元素，这类操作不应该整体降级为低质量缓存，应尽量保持当前操作对象和当前层的渲染质量。

核心原则：

```txt
smooth first, quality later
```

也就是说：

```txt
zoom / pan 中：
  优先响应输入
  优先显示已有缓存
  允许低质量 bitmap / snapshot / overview
  不等待高清 tile
  不重绘全部元素
  不大量上传 texture

drag / transform / 属性编辑中：
  当前操作对象必须保持清晰
  当前层尽量保持正常质量
  不应把用户正在操作的内容降级成低质量 snapshot
  只允许对非当前操作区域做有限缓存或降级

交互结束后：
  progressive refresh
  逐步恢复清晰 tile / 精确矢量渲染
  清理临时 patch / snapshot
```

---

## 2. 总体架构

编辑器已经使用 WebGL，因此主画布应该作为最终 compositor。

推荐分层：

```txt
Main WebGL Canvas
  ├─ Base Scene Composite Layer
  │   ├─ tile texture
  │   ├─ overview texture
  │   ├─ snapshot texture
  │   └─ temporary patch texture
  │
  ├─ Live Local Render Layer
  │   ├─ active dragging elements
  │   ├─ high zoom local precise render
  │   └─ selected / editing element render
  │
  ├─ Overlay Layer
  │   ├─ selection bounds
  │   ├─ resize handles
  │   ├─ rotation handles
  │   ├─ hover outline
  │   ├─ marquee
  │   └─ snap guides
  │
  └─ Cursor / DOM Layer
```

职责：

```txt
Tile cache:
  world-space 内容缓存

Overview cache:
  低 zoom / 全局预览缓存

Snapshot cache:
  screen-space 临时交互兜底缓存

Temporary patch:
  pan / zoom 边缘缺 tile 时的临时补洞纹理

Overlay:
  永远 live render，不能因为 base scene 降级而变糊
```

### 2.1 Static / Active / Dynamic Layer 关系

Engine 内部至少应该分成三类渲染层：

```txt
Static Base Layer:
  静态文档元素层
  shapes / paths / text / images / groups
  可以进入 tile cache / overview cache / snapshot cache

Active Element Layer:
  当前正在操作的元素层
  dragging elements
  transform preview
  editing text
  editing path
  selected element local precise render
  不应该被低质量 snapshot 替代

Dynamic Overlay Layer:
  交互反馈层
  marquee
  selection bounds
  resize handles
  rotation handles
  hover outline
  snap guides
  cursor / caret
  永远 live render
```

渲染顺序：

```txt
1. Static Base Layer
   tile / overview / snapshot / local static render

2. Active Element Layer
   当前拖拽、编辑、transform preview 的元素

3. Dynamic Overlay Layer
   selection / handles / marquee / guides / hover

4. Debug Layer
```

规则：

```txt
1. Static Base Layer 可以缓存。
2. Active Element Layer 不进入长期 tile cache。
3. Dynamic Overlay Layer 不进入 tile / overview / snapshot。
4. Snapshot 默认只捕获 Static Base Layer。
5. Overlay 永远基于最新 camera 和最新交互状态 live render。
6. Active Element Layer 必须优先保持清晰。
7. 静态层变化才 dirty tile。
8. 动态层变化不 dirty tile，只触发 overlay redraw。
```

---

## 3. Engine 和应用层边界

为了保持 engine 纯粹，推荐边界如下：

```txt
Application owns canvas size.
Engine consumes canvas size.
```

应用层负责：

```txt
1. 控制 canvas CSS size
2. 控制 canvas.width / canvas.height
3. 决定 outputDpr
4. 监听容器 resize
5. 调用 engine.resize()
```

Engine 负责：

```txt
1. 不修改 canvas.style.width / height
2. 不修改 canvas.width / height
3. 不监听 DOM resize
4. 不读取 canvas.clientWidth 作为权威尺寸
5. 只根据 resize 参数更新 WebGL viewport / framebuffer / projection / cache
```

推荐 resize 输入：

```ts
export interface EngineSizeInput {
  /** CSS logical viewport size. */
  viewportWidth: number;
  viewportHeight: number;

  /** Real canvas drawing buffer size. Already set by application. */
  bufferWidth: number;
  bufferHeight: number;

  /** Standard high-quality output DPR. */
  outputDpr: number;
}
```

应用层示例：

```ts
const outputDpr = userDpr ?? window.devicePixelRatio;

function applyCanvasSize(width: number, height: number) {
  const viewportWidth = width;
  const viewportHeight = height;
  const bufferWidth = Math.round(viewportWidth * outputDpr);
  const bufferHeight = Math.round(viewportHeight * outputDpr);

  canvas.style.width = `${viewportWidth}px`;
  canvas.style.height = `${viewportHeight}px`;
  canvas.width = bufferWidth;
  canvas.height = bufferHeight;

  engine.resize({
    viewportWidth,
    viewportHeight,
    bufferWidth,
    bufferHeight,
    outputDpr,
  });
}
```

Engine 内部：

```ts
function resize(size: EngineSizeInput): void {
  viewport.width = size.viewportWidth;
  viewport.height = size.viewportHeight;
  viewport.bufferWidth = size.bufferWidth;
  viewport.bufferHeight = size.bufferHeight;
  viewport.outputDpr = size.outputDpr;

  gl.viewport(0, 0, size.bufferWidth, size.bufferHeight);
  resizeInternalFramebuffers(size.bufferWidth, size.bufferHeight);
  updateProjection(size.viewportWidth, size.viewportHeight, size.outputDpr);
  markViewportDirty();
}
```

注意：

```txt
resize 只在容器尺寸或 outputDpr 变化时触发。
zoom / pan / drag 绝对不能触发 canvas resize。
```

---

## 4. DPR 策略

推荐 engine 使用统一全局 `outputDpr`。

```txt
outputDpr:
  主画布高清输出标准
  overlay 高清输出标准
  idle / final render 高清标准
```

默认：

```ts
const outputDpr = Math.min(userDpr ?? window.devicePixelRatio, 2);
```

原因：

```txt
DPR = 1 -> 1x pixels
DPR = 2 -> 4x pixels
DPR = 3 -> 9x pixels
```

不建议默认超过 `2`，否则 tile texture / snapshot / framebuffer 成本会明显上升。

重要规则：

```txt
1. 主 canvas outputDpr 不随 zoom / pan 改变。
2. overlay 使用 outputDpr，保持清晰。
3. DPR 降级只允许发生在 side render target 内部，例如 tile / snapshot / overview。
4. 第一版可以不暴露 sideDpr，只用 visibilitySize LOD 降级。
5. 如果未来性能压力大，再内部引入 side quality mode。
```

---

## 5. Zoom Bucket 动态生成

缩放范围不能写死。

默认：

```txt
minZoom = 0.01   // 1%
maxZoom = 640    // 64000%
```

应用层可以传入更极端范围：

```txt
minZoom = 0.0001
maxZoom = 80000
```

因此 bucket 必须动态生成。

配置：

```ts
export interface EngineZoomPerformanceConfig {
  minZoom?: number;
  maxZoom?: number;
  bucketStep?: number;
  activeBucketRadius?: number;
  strategy?: EngineZoomStrategyConfig;
}

export interface EngineZoomStrategyConfig {
  overviewMaxZoom?: number;
  simplifiedTileMaxZoom?: number;
  normalTileMaxZoom?: number;
  localHybridMaxZoom?: number;
  localRenderElementThreshold?: number;
}
```

默认值：

```ts
export const DEFAULT_ENGINE_ZOOM_PERFORMANCE_CONFIG = {
  minZoom: 0.01,
  maxZoom: 640,
  bucketStep: 2,
  activeBucketRadius: 1,
  strategy: {
    overviewMaxZoom: 1 / 32,
    simplifiedTileMaxZoom: 1 / 4,
    normalTileMaxZoom: 8,
    localHybridMaxZoom: 64,
    localRenderElementThreshold: 2000,
  },
};
```

生成 bucket：

```ts
export function createZoomBuckets(input: {
  minZoom: number;
  maxZoom: number;
  bucketStep?: number;
}): number[] {
  const { minZoom, maxZoom, bucketStep = 2 } = input;

  if (minZoom <= 0) throw new Error("minZoom must be greater than 0");
  if (maxZoom <= minZoom)
    throw new Error("maxZoom must be greater than minZoom");
  if (bucketStep <= 1) throw new Error("bucketStep must be greater than 1");

  const startPower = Math.floor(Math.log(minZoom) / Math.log(bucketStep));
  const endPower = Math.ceil(Math.log(maxZoom) / Math.log(bucketStep));

  const buckets: number[] = [];

  for (let power = startPower; power <= endPower; power++) {
    buckets.push(Math.pow(bucketStep, power));
  }

  return buckets;
}
```

运行时只保留：

```txt
current bucket
previous / next buckets within activeBucketRadius
overview cache
snapshot cache
```

默认 `activeBucketRadius = 1`：

```txt
previous bucket
current bucket
next bucket
```

禁止：

```txt
为所有 bucket 常驻 tile cache。
```

---

## 6. Zoom Strategy 与 Screen Size LOD 的关系

二者不是替代关系。

```txt
Zoom Strategy:
  决定这一帧走什么渲染路径。

Screen Size LOD:
  决定每个元素画到什么细节。
```

也就是：

```txt
Zoom Strategy 选通道。
Screen Size LOD 选质量。
```

执行顺序：

```txt
1. 根据 zoom / interactionState / visibleElementCount 计算 ZoomRenderStrategy。
2. 如果使用 snapshot fallback，不重新计算元素 LOD，直接绘制 snapshot。
3. 如果使用 overview / tile / local render，则对候选元素计算 screenArea / screenMaxSide / projectedFontSize / projectedStrokeWidth。
4. 根据 ZoomRenderStrategy 选择不同强度的 Screen Size LOD。
5. selected / hovered / editing 的 overlay 不受 LOD 降级影响。
```

策略：

```txt
overview:
  最激进 LOD
  聚合、色块、密度图、group thumbnail

simplified-tile:
  aggressive LOD
  text block / hidden
  image low thumbnail
  path bbox / simplified

normal-tile:
  标准 screen-size LOD

local-tile-vector-hybrid:
  visible count 少 -> live local render
  visible count 多 -> local tile + LOD

local-precise:
  保守 LOD
  只跳过极小或不可见元素

snapshot:
  不重新跑 LOD
  直接用已有 screen-space 纹理
```

---

## 7. Screen Size LOD 基础规则

每个元素渲染前计算：

```txt
screenWidth = abs(elementWorldWidth * zoom)
screenHeight = abs(elementWorldHeight * zoom)
screenArea = screenWidth * screenHeight
screenMaxSide = max(screenWidth, screenHeight)
screenMinSide = min(screenWidth, screenHeight)
projectedFontSize = fontSize * zoom
projectedStrokeWidth = strokeWidth * zoom
```

通用规则：

```txt
screenArea < 0.25 px²:
  skip

screenArea < 1 px²:
  point

screenArea < 9 px²:
  color block

screenArea < 64 px²:
  bbox

screenArea < 4096 px²:
  simplified

screenArea >= 4096 px²:
  normal
```

Shadow：

```txt
zoom < 0.5:
  off

screenArea < 4096:
  off

screenArea < 16384:
  simplified

screenArea >= 16384:
  normal
```

Filter / blur：

```txt
zoom < 0.5:
  off

screenArea < 8192:
  off

screenArea < 32768:
  simplified

screenArea >= 32768:
  normal
```

Text：

```txt
projectedFontSize < 3px:
  hidden

projectedFontSize < 6px:
  block

projectedFontSize < 10px:
  simplified

projectedFontSize >= 10px:
  normal

projectedFontSize >= 18px:
  full if idle
```

Image：

```txt
screenArea < 1:
  hidden

screenArea < 16:
  average color block

screenMaxSide <= 64:
  thumbnail-64

screenMaxSide <= 128:
  thumbnail-128

screenMaxSide <= 256:
  thumbnail-256

screenMaxSide <= 512:
  thumbnail-512

screenMaxSide <= 1024:
  thumbnail-1024

screenMaxSide > 1024:
  original / high-res only when idle
```

---

## 8. Tile Cache 策略

Tile 是 world-space cache。

```txt
Tile:
  内容缓存
  可以低质量
  可以延迟生成
  可以 LRU 淘汰
  不参与 hit test 语义
```

Tile 逻辑尺寸默认：

```txt
tileCssSize = 512
```

某个 zoom bucket 下：

```txt
tileWorldSize = tileCssSize / zoomBucket
```

结论：

```txt
低 zoom 下，一个 tile 覆盖巨大 world 区域。
高 zoom 下，一个 tile 覆盖极小 world 区域。
```

所以：

```txt
极低 zoom:
  不渲染完整细节，使用 overview / aggregate。

中 zoom:
  tile cache 是主力。

高 zoom:
  优先 local precise render，tile cache 只是辅助。
```

Tile key 至少包含：

```txt
zoomBucket
tileX
tileY
outputDpr
renderVersion
styleVersion
lodVersion
```

Tile memory：

```txt
512 CSS px tile, DPR = 2:
  1024 x 1024 x 4 = 4MB

100 个 tile:
  400MB
```

推荐预算：

```txt
tileSoftLimit = 256MB
tileHardLimit = 512MB
highZoomTileLimit = 64MB - 128MB
```

---

## 9. Overview Cache 策略

Overview 用于低 zoom 和快速 zoom out。

使用场景：

```txt
极低 zoom
快速 zoom out
missing low-zoom tile
initial scene preview
```

Overview 渲染规则：

```txt
aggregated / simplified
no shadow
no filter
text hidden / block
image average color / low thumbnail
group thumbnail / density map
small elements merged or skipped
```

预算：

```txt
overviewSoftLimit = 64MB
overviewHardLimit = 128MB
```

Overview 不应该无限细分。

---

## 10. Snapshot Cache 策略

Snapshot 是 screen-space cache。

它不是 tile。

```txt
Snapshot:
  当前屏幕画面的临时纹理
  用于 zoom / pan 期间兜底
  允许模糊
  不参与 hit test
  不作为最终画质
```

生成时机：

```txt
zoom start
pan start
fast interaction start
quality downgrade start
```

生成内容：

```txt
只包含 base scene。
不要包含 overlay。
```

Overlay 必须 live render。

Snapshot 数量：

```txt
current snapshot: 1
previous snapshot: optional 1
最多 2 张
```

Snapshot 内存：

```txt
viewport = 1600 x 1000
DPR = 2
snapshot = 3200 x 2000 x 4 = 25.6MB
2 张 = 51.2MB
```

使用顺序：

```txt
medium:
  exact tile -> nearest tile -> overview -> snapshot

low:
  nearest tile -> overview -> snapshot

very-low:
  snapshot -> overview
```

---

## 11. Zoom 期间的缺 tile 策略

Zoom 缺 tile 和 pan 缺 tile 不一样。

```txt
zoom in:
  主要问题是旧 tile 被放大变糊。

zoom out:
  主要问题是可见 world 范围变大，四周可能出现新区域。
```

Zoom fallback 顺序：

```txt
1. exact zoom bucket tile
2. nearest zoom bucket tile
3. overview tile
4. zoom snapshot
5. temporary zoom patch
6. blank
```

快速 zoom 时：

```txt
snapshot -> overview -> nearest tile
```

Zoom in 优先级：

```txt
1. cursor anchor tile
2. viewport center tile
3. selected element 所在 tile
4. remaining visible tiles
5. nearby tiles
```

Zoom out 优先级：

```txt
1. overview tile
2. visible tiles covering full new viewport
3. newly visible ring tiles
4. center tiles
5. nearby preload
```

第一版建议：

```txt
先不做复杂 zoom patch。
优先做好 snapshot + overview + newly-visible tile priority。
```

如果后续需要 zoom patch，只做四周 ring strip：

```txt
top strip
right strip
bottom strip
left strip
```

规则：

```txt
只在 zoom out 时生成
只在 missing area 明显时生成
只在 zoom velocity 不太高时生成
使用 interaction LOD
不进入长期 tile cache
正式 tile ready 后替换
```

---

## 12. Pan 期间的 Overscan 与 Patch 策略

Pan 缺 tile 的原因：

```txt
画布移动到边缘，即将进入视口的区域没有 tile。
```

Pan 需要两件事：

```txt
overscan:
  提前预加载

patch:
  缺 tile 后临时补洞
```

一句话：

```txt
overscan 是预防。
patch 是补救。
```

### 12.1 Directional Overscan

平移时 overscan 应该偏向移动方向。

```txt
panning right:
  right overscan = high priority
  left overscan = low priority

panning left:
  left overscan = high priority
  right overscan = low priority

panning down:
  bottom overscan = high priority
  top overscan = low priority

panning up:
  top overscan = high priority
  bottom overscan = low priority
```

默认配置建议：

```ts
export interface EnginePanOverscanConfig {
  enabled?: boolean;
  baseOverscanPx?: number;
  directionOverscanPx?: number;
  trailingOverscanPx?: number;
  temporaryPatch?: boolean;
  patchSizePx?: number;
  maxPatchRenderPerFrame?: number;
  patchMemoryLimitMB?: number;
}

export const DEFAULT_PAN_OVERSCAN_CONFIG: Required<EnginePanOverscanConfig> = {
  enabled: true,
  baseOverscanPx: 256,
  directionOverscanPx: 768,
  trailingOverscanPx: 128,
  temporaryPatch: true,
  patchSizePx: 256,
  maxPatchRenderPerFrame: 1,
  patchMemoryLimitMB: 64,
};
```

### 12.2 Temporary Pan Patch

当 entering area 没有 tile 时，生成临时 patch。

```txt
patch:
  只覆盖缺失边缘区域
  使用 interaction LOD
  不画 shadow / filter
  image 使用 thumbnail
  text 使用 block / simplified
  不进入长期 tile cache
```

生命周期：

```txt
pan start:
  clear old patches

panning:
  create / update entering patches

tile ready:
  replace patch with real tile

pan idle:
  progressive refresh 后清理 patch
```

推荐 patch 尺寸：

```txt
128 - 256 CSS px strip
```

限制：

```txt
max patch render per frame = 1
max patch upload per frame = 1
patch memory limit = 32MB - 64MB
```

---

## 13. 交互期间统一渲染流程

Zoom / pan / drag 中不能走完整重绘。

每帧流程：

```txt
1. input event 只更新 targetCamera / interaction state。
2. requestAnimationFrame 中读取最新 camera。
3. draw exact tile if available。
4. draw nearest tile / overview / snapshot fallback。
5. 对明显缺口可绘制 temporary patch。
6. draw live local active elements。
7. draw overlay live。
8. enqueue missing tile / patch，不等待完成。
```

禁止：

```txt
wheel / pan event 中同步 render。
interaction frame 中重绘全部元素。
interaction frame 中大量 upload texture。
interaction frame 中等待 tile 生成。
```

---

## 14. Scheduler 策略

交互中预算：

```txt
max tile uploads per frame = 0 - 1
tile render budget = 1ms - 2ms
max patch render per frame = 1
```

交互 idle 后：

```txt
max tile uploads per frame = 2 - 4
tile render budget = 6ms - 8ms
```

后台 idle：

```txt
max tile uploads per frame = 2 - 6
tile render budget = 8ms - 12ms
```

优先级：

```txt
1. visible missing tile
2. pan direction entering tile
3. zoom newly-visible tile
4. cursor anchor tile
5. viewport center tile
6. remaining visible tile
7. nearby preload tile
```

Scheduler 必须支持取消：

```txt
camera changed
zoom bucket changed
tile no longer visible
request outdated
```

---

## 15. Overlay 永远实时清晰

Base scene 可以低质量。

Overlay 不能低质量。

必须 live render：

```txt
selection bounds
resize handles
rotation handles
hover outline
marquee
snap guides
active editing caret
active path control points
cursor
```

Overlay 规则：

```txt
使用 outputDpr。
使用最新 camera。
使用 document model 的真实几何。
不依赖 tile / snapshot / overview。
不被 screen-size LOD 降级隐藏。
```

---

## 16. Hit Test 不依赖缓存

Tile / overview / snapshot / patch 都只是视觉缓存。

Hit test 必须基于：

```txt
document model
spatial index / quadtree
geometry bounds
path hit test
stroke tolerance
z-order sorting
multi-hit list
```

禁止：

```txt
用 tile bitmap 作为主要语义 hit test 来源。
用 snapshot 判断元素选择。
```

---

## 17. Progressive Refresh

交互停止后，不能一次性恢复全部高清。

使用 progressive refresh。

Zoom idle：

```txt
1. cursor anchor tile
2. selected element tile
3. viewport center tile
4. visible tiles by distance
5. nearby tiles
```

Pan idle：

```txt
1. tiles entering viewport from last pan direction
2. viewport center tile
3. remaining visible tiles
4. edge tiles
5. nearby preload
```

Refresh 规则：

```txt
每帧限制 tile render / upload 数量。
新交互发生时取消旧 refresh。
正式 tile ready 后替换 temporary patch。
refresh 完成后清理 snapshot / patch。
```

---

## 18. Debug Stats

必须暴露统计，否则无法判断是否真的丝滑。

建议 stats：

```txt
cameraRenderMode
zoomRenderStrategy
zoomBucket
activeZoomBuckets
zoomVelocity
panVelocity
panDirection
visibleTileCount
exactTileHitCount
nearestTileHitCount
overviewFallbackCount
snapshotFallbackCount
temporaryPatchCount
missingTileCount
tileUploadCountThisFrame
tileRenderBudgetMs
patchRenderBudgetMs
gpuTextureMemoryMB
tileMemoryMB
overviewMemoryMB
snapshotMemoryMB
lodHiddenCount
lodBlockCount
lodBboxCount
lodSimplifiedCount
frameTimeMs
inputLatencyMs
```

---

## 19. 最小可执行版本

第一版不要贪多。

必须先实现：

```txt
1. outputDpr 统一。
2. 应用层 owns canvas size，engine consumes size。
3. zoom bucket 动态生成。
4. 只缓存 current / previous / next bucket。
5. Screen Size LOD 基础规则。
6. tile cache fallback。
7. snapshot fallback。
8. overview fallback。
9. pan direction overscan。
10. pan temporary patch。
11. zoom newly-visible tile priority。
12. overlay live render。
13. scheduler budget。
14. progressive refresh。
15. debug stats。
```

可以第二阶段再做：

```txt
复杂 zoom ring patch
复杂 group thumbnail cache
复杂 density map
side render target DPR 独立配置
高级 texture reuse
GPU picking
```

---

## 20. 最终规则总结

```txt
1. 一切以交互丝滑为先。
2. 交互中不等待高清 tile。
3. 交互中不重绘全部元素。
4. 交互中不大量上传 texture。
5. 主 canvas outputDpr 稳定，不因 zoom / pan 改变。
6. overlay 永远 live render 且清晰。
7. zoom bucket 根据 minZoom / maxZoom 动态生成。
8. 运行时只缓存当前附近 bucket。
9. Zoom Strategy 决定渲染通道。
10. Screen Size LOD 决定元素细节。
11. 低 zoom 用 overview / aggregate。
12. 中 zoom 用 normal tile cache。
13. 高 zoom 优先 local precise render。
14. 极高 zoom 更依赖 snapshot，而不是大量 tile。
15. Pan 缺口靠 directional overscan + temporary patch。
16. Zoom 缺口靠 snapshot + overview + newly-visible tile priority。
17. Tile / snapshot / patch 只做视觉缓存，不做语义。
18. Hit test 基于 document model 和 spatial index。
19. idle 后 progressive refresh 恢复清晰。
20. Debug stats 必须能证明没有误触发 full render。
```

一句话：

```txt
缓存负责不断帧，LOD 负责少画，scheduler 负责不阻塞，overlay 负责可编辑感，progressive refresh 负责最终清晰。
```
