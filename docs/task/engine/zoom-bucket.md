# Zoom Bucket / Tile Cache / Snapshot Cache 策略

## 1. 背景

编辑器默认缩放范围：

```txt
minZoom = 0.01   = 1%
maxZoom = 640    = 64000%
```

这个范围非常大，不能用普通的少量 zoom bucket 硬套。

但是缩放范围不能写死。应用层可以配置更极端的范围，例如：

```txt
minZoom = 0.0001
maxZoom = 80000
```

因此 zoom bucket 必须由 `minZoom / maxZoom / bucketStep` 动态生成。

核心原则：

```txt
不要为 0.01 -> 640 的所有缩放值生成完整 tile cache。
不要让所有 zoom bucket 常驻内存。
不要在极低 zoom 渲染完整细节。
不要在极高 zoom 依赖大量 tile cache。
```

正确策略：

```txt
低 zoom:
  overview / aggregate / aggressive LOD

中 zoom:
  normal tile cache

高 zoom:
  local tile + live vector hybrid

极高 zoom:
  snapshot fallback + local precise render
```

---

## 2. Zoom Bucket 范围

默认使用 2 倍阶梯 bucket，覆盖默认 1% 到 64000% 的范围。

但是不要手写固定 bucket 表作为唯一来源。

应该通过配置动态生成：

```ts
export interface EngineZoomPerformanceConfig {
  /**
   * Minimum allowed camera zoom.
   * Default: 0.01 = 1%.
   */
  minZoom?: number;

  /**
   * Maximum allowed camera zoom.
   * Default: 640 = 64000%.
   */
  maxZoom?: number;

  /**
   * Zoom bucket multiplier.
   * 2 means each bucket is 2x the previous bucket.
   * Default: 2.
   */
  bucketStep?: number;

  /**
   * Number of neighbor buckets kept around current bucket.
   * 1 means previous / current / next.
   * Default: 1.
   */
  activeBucketRadius?: number;

  /**
   * Zoom strategy threshold config.
   */
  strategy?: EngineZoomStrategyConfig;
}

export interface EngineZoomStrategyConfig {
  /**
   * Below this zoom, use overview / aggregate rendering.
   * Default: 1 / 32 = 0.03125.
   */
  overviewMaxZoom?: number;

  /**
   * Below this zoom, use simplified tile rendering.
   * Default: 1 / 4 = 0.25.
   */
  simplifiedTileMaxZoom?: number;

  /**
   * Below this zoom, use normal tile cache as the main path.
   * Default: 8.
   */
  normalTileMaxZoom?: number;

  /**
   * Below this zoom, use local tile + vector hybrid.
   * Above this, prefer local precise render.
   * Default: 64.
   */
  localHybridMaxZoom?: number;

  /**
   * Visible element count threshold.
   * If visible element count is lower than this, prefer live local vector render at high zoom.
   * Default: 2000.
   */
  localRenderElementThreshold?: number;
}
```

默认值：

```ts
export const DEFAULT_ENGINE_ZOOM_PERFORMANCE_CONFIG: Required<
  Omit<EngineZoomPerformanceConfig, "strategy">
> & {
  strategy: Required<EngineZoomStrategyConfig>;
} = {
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

默认配置下生成的 bucket 大致是：

```ts
export const DEFAULT_ZOOM_BUCKETS = [
  1 / 128, // 0.0078125 = 0.78125%
  1 / 64, // 0.015625  = 1.5625%
  1 / 32, // 0.03125   = 3.125%
  1 / 16, // 0.0625    = 6.25%
  1 / 8, // 0.125     = 12.5%
  1 / 4, // 0.25      = 25%
  1 / 2, // 0.5       = 50%
  1,
  2,
  4,
  8,
  16,
  32,
  64,
  128,
  256,
  512,
  1024,
] as const;
```

说明：

```txt
默认 minZoom = 0.01，接近 1/128 或 1/64。
默认 maxZoom = 640，接近 512 或 1024。
bucket 可以覆盖 min/max 外侧邻近值，这是正常的。
```

注意：

```txt
支持完整 bucket 范围，不等于缓存所有 bucket。
```

运行时只保留：

```txt
current bucket
previous/next buckets within activeBucketRadius
overview cache
snapshot cache
```

例如默认 `activeBucketRadius = 1`：

```txt
当前 zoom = 12
current bucket = 16

允许保留：
  8
  16
  32

应该淘汰：
  远离当前 zoom 的其他 bucket
```

---

## 3. Bucket 查找规则

Bucket 必须从配置生成，不能依赖固定常量。

不要按真实 zoom 值缓存。

错误：

```txt
zoom = 1.01 一份 cache
zoom = 1.02 一份 cache
zoom = 1.03 一份 cache
```

正确：

```txt
zoom 映射到最近的 ZOOM_BUCKETS bucket。
```

实现：

```ts
export function createZoomBuckets(input: {
  minZoom: number;
  maxZoom: number;
  bucketStep?: number;
}): number[] {
  const { minZoom, maxZoom, bucketStep = 2 } = input;

  if (minZoom <= 0) {
    throw new Error("minZoom must be greater than 0");
  }

  if (maxZoom <= minZoom) {
    throw new Error("maxZoom must be greater than minZoom");
  }

  if (bucketStep <= 1) {
    throw new Error("bucketStep must be greater than 1");
  }

  const startPower = Math.floor(Math.log(minZoom) / Math.log(bucketStep));
  const endPower = Math.ceil(Math.log(maxZoom) / Math.log(bucketStep));

  const buckets: number[] = [];

  for (let power = startPower; power <= endPower; power++) {
    buckets.push(Math.pow(bucketStep, power));
  }

  return buckets;
}

export function getZoomBucket(
  zoom: number,
  buckets: readonly number[],
): number {
  let best = buckets[0];
  let bestDiff = Math.abs(Math.log2(zoom / best));

  for (const bucket of buckets) {
    const diff = Math.abs(Math.log2(zoom / bucket));

    if (diff < bestDiff) {
      best = bucket;
      bestDiff = diff;
    }
  }

  return best;
}
```

获取当前附近可缓存 bucket：

```ts
export function getActiveZoomBuckets(
  zoom: number,
  buckets: readonly number[],
  activeBucketRadius = 1,
): number[] {
  const current = getZoomBucket(zoom, buckets);
  const index = buckets.indexOf(current);

  const active: number[] = [];

  for (
    let i = index - activeBucketRadius;
    i <= index + activeBucketRadius;
    i++
  ) {
    if (i >= 0 && i < buckets.length) {
      active.push(buckets[i]);
    }
  }

  return active;
}
```

示例：

```ts
const config = {
  minZoom: 0.0001,
  maxZoom: 80000,
  bucketStep: 2,
  activeBucketRadius: 1,
};

const buckets = createZoomBuckets(config);
const currentBucket = getZoomBucket(camera.zoom, buckets);
const activeBuckets = getActiveZoomBuckets(
  camera.zoom,
  buckets,
  config.activeBucketRadius,
);
```

`minZoom = 0.0001`、`maxZoom = 80000` 时，bucket 数量大约是 30 多个，不算多。

真正危险的不是 bucket 数量，而是缓存所有 bucket 的 tile。

---

## 4. 缩放区间分层策略

缩放区间不能完全写死，应由 `EngineZoomStrategyConfig` 决定。

默认分层：

```txt
zoom < overviewMaxZoom:
  overview / aggregate

zoom < simplifiedTileMaxZoom:
  overview + simplified tile

zoom < normalTileMaxZoom:
  normal tile cache

zoom < localHybridMaxZoom:
  local tile + vector hybrid

zoom >= localHybridMaxZoom:
  local precise render 为主
```

默认值对应：

```txt
0.01 - 0.03125:
  极低缩放 / world overview

0.03125 - 0.25:
  低缩放 / overview + simplified tile

0.25 - 8:
  主力 tile cache 区间

8 - 64:
  高缩放 / local tile + vector hybrid

64+:
  极高缩放 / local precise render 为主
```

对应默认用户缩放百分比：

```txt
1% - 3.125%:
  overview cache 为主
  不渲染完整细节
  小元素合并 / 聚合 / 色块 / density map

3.125% - 25%:
  simplified tile
  aggressive LOD
  text hidden / block
  path bbox / simplified
  image low thumbnail / average color

25% - 800%:
  normal tile cache 主力区间
  previous / current / next bucket
  visible + one ring preload

800% - 6400%:
  high zoom local tile
  viewport 覆盖的 world area 很小
  visible element 少时优先 live vector
  visible element 多时才使用 local tile

6400% 以上:
  极高 zoom
  不依赖大量 tile cache
  interaction 期间使用 snapshot fallback
  idle 后 local precise render
```

策略函数：

```ts
export type ZoomRenderStrategy =
  | "overview"
  | "simplified-tile"
  | "normal-tile"
  | "local-tile-vector-hybrid"
  | "local-precise";

export function getZoomRenderStrategy(input: {
  zoom: number;
  visibleElementCount: number;
  interactionState: "idle" | "zooming" | "panning" | "dragging";
  strategy: Required<EngineZoomStrategyConfig>;
}): ZoomRenderStrategy {
  const { zoom, visibleElementCount, interactionState, strategy } = input;

  if (interactionState !== "idle") {
    if (zoom < strategy.overviewMaxZoom) return "overview";
    if (zoom < strategy.simplifiedTileMaxZoom) return "simplified-tile";
    return "normal-tile";
  }

  if (zoom < strategy.overviewMaxZoom) return "overview";
  if (zoom < strategy.simplifiedTileMaxZoom) return "simplified-tile";
  if (zoom < strategy.normalTileMaxZoom) return "normal-tile";

  if (visibleElementCount < strategy.localRenderElementThreshold) {
    return "local-precise";
  }

  if (zoom < strategy.localHybridMaxZoom) {
    return "local-tile-vector-hybrid";
  }

  return "local-precise";
}
```

一句话：

```txt
低 zoom 看整体密度。
中 zoom 靠 tile cache。
高 zoom 优先局部精确渲染。
具体阈值由配置决定。
```

---

## 5. Tile Cache 设计

### 5.1 Tile 逻辑尺寸

推荐默认：

```txt
tileCssSize = 512
```

`tileCssSize` 是屏幕 CSS px 逻辑尺寸，不是固定 world size。

某个 zoom bucket 下 tile 覆盖的 world 尺寸：

```txt
tileWorldSize = tileCssSize / zoomBucket
```

例子：

```txt
zoomBucket = 1:
  tileWorldSize = 512 world units

zoomBucket = 0.01:
  tileWorldSize = 51200 world units

zoomBucket = 640:
  tileWorldSize = 0.8 world units
```

结论：

```txt
低 zoom 下，一个 tile 覆盖巨大 world 区域。
高 zoom 下，一个 tile 覆盖极小 world 区域。
```

所以：

```txt
极低 zoom 不应该渲染完整细节。
极高 zoom 不应该缓存大量 tile。
```

---

### 5.2 Tile Key

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

示例：

```ts
export type TileKey = string;

export interface TileCoord {
  x: number;
  y: number;
  zoomBucket: number;
}

export interface TileEntry {
  key: TileKey;
  coord: TileCoord;
  worldBounds: Rect;
  texture: WebGLTexture;
  textureWidth: number;
  textureHeight: number;
  byteSize: number;
  dirty: boolean;
  pending: boolean;
  lastUsedAt: number;
}

export function createTileKey(input: {
  zoomBucket: number;
  tileX: number;
  tileY: number;
  outputDpr: number;
  renderVersion: number;
  styleVersion: number;
  lodVersion: number;
}): TileKey {
  return [
    input.zoomBucket,
    input.tileX,
    input.tileY,
    input.outputDpr,
    input.renderVersion,
    input.styleVersion,
    input.lodVersion,
  ].join(":");
}
```

---

## 6. 不同 Zoom 区间的 Tile 策略

### 6.1 极低 Zoom：0.01 - 0.03125

不要生成完整细节 tile。

使用：

```txt
overview texture
density map
group thumbnail
dominant color block
large object only
```

LOD 规则：

```txt
text:
  hidden

small shapes:
  merged / skipped

paths:
  bbox / point / skipped

images:
  average color / 64px thumbnail

groups:
  group thumbnail / bbox

shadow / filter:
  disabled
```

Tile 类型：

```txt
overview tile
large tile
aggregate tile
```

推荐：

```txt
overview tile size:
  1024 或 2048 CSS px equivalent

render mode:
  overview / aggregate
```

---

### 6.2 低 Zoom：0.03125 - 0.25

可以生成 simplified tile。

规则：

```txt
tile cache:
  enabled

LOD:
  aggressive

text:
  block or hidden

image:
  thumbnail-64 / thumbnail-128

path:
  simplified / bbox

shadow / filter:
  disabled
```

目标：

```txt
提供稳定视觉密度，不追求细节。
```

---

### 6.3 主力 Zoom：0.25 - 8

这是 tile cache 最有价值的区间。

规则：

```txt
tile cache:
  full enabled

active buckets:
  previous / current / next

preload:
  visible + one ring

LOD:
  normal thresholds

image:
  thumbnail by screen size

shadow / filter:
  threshold based
```

目标：

```txt
保证 zoom / pan 中不重绘所有元素。
保证 tile 命中率。
保证停止后快速恢复清晰。
```

---

### 6.4 高 Zoom：8 - 64

此时 viewport 覆盖的 world area 很小。

策略：

```txt
visible local render 优先
tile cache 辅助
```

规则：

```txt
if visible element count < 2000:
  live vector render

if visible element count >= 2000:
  local tile cache / simplified local tile
```

说明：

```txt
高 zoom 下，直接画 visible elements 可能比生成 tile 更划算。
```

---

### 6.5 极高 Zoom：64 - 640

不要依赖全量 tile cache。

原因：

```txt
每个 tile 覆盖 world 范围非常小。
用户 pan 一点点就可能进入新 tile。
tile cache 命中率可能很低。
tile 管理成本可能高于直接画 visible elements。
```

策略：

```txt
interaction:
  snapshot fallback

idle:
  local precise render

tile cache:
  optional
  current viewport only
  no multi-bucket preload
```

规则：

```txt
preload rings:
  0 或 1

active zoom buckets:
  current only

live render:
  preferred if visible count is manageable

snapshot:
  required during fast zoom / pan
```

---

## 7. Snapshot Cache 设计

Snapshot 不是 tile。

```txt
Snapshot:
  screen-space temporary cache

Tile:
  world-space persistent-ish cache
```

Snapshot 的作用：

```txt
zoom / pan 期间立即响应输入。
当 tile 缺失、tile 过旧、tile 生成太慢时兜底。
允许模糊，但不能卡。
```

---

### 7.1 Snapshot 生成时机

```txt
zoom start
pan start
fast interaction start
quality downgrade start
```

生成逻辑：

```txt
capture current base scene framebuffer
store as snapshot texture
```

注意：

```txt
snapshot 只包含 base scene。
不要包含 selection / handles / guides / cursor overlay。
```

Overlay 必须 live render。

---

### 7.2 Snapshot 数据结构

```ts
export interface CameraSnapshot {
  texture: WebGLTexture;

  viewportWidth: number;
  viewportHeight: number;

  bufferWidth: number;
  bufferHeight: number;

  camera: Camera;
  outputDpr: number;

  createdAt: number;
}
```

---

### 7.3 Snapshot 绘制规则

当前 camera 和 snapshot camera 做 delta transform。

```txt
snapshot camera -> current camera
```

用法：

```txt
fast zoom:
  draw snapshot transformed

fast pan:
  draw snapshot translated

missing tile:
  draw snapshot fallback

extreme high zoom:
  draw snapshot during interaction, idle 后 local precise render
```

---

### 7.4 Snapshot 数量限制

不要保存很多 snapshot。

推荐：

```txt
current snapshot: 1
previous snapshot: optional 1
```

最多：

```txt
2 张
```

原因：

```txt
snapshot 是 viewport-sized texture，DPR 高时很大。
```

例子：

```txt
viewport = 1600 x 1000
DPR = 2
snapshot texture = 3200 x 2000 x 4 = 25.6MB
2 张 = 51.2MB
```

---

## 8. Snapshot 与 Tile 的使用顺序

中等速度交互：

```txt
exact tile
  -> nearest zoom tile
  -> overview tile
  -> snapshot
  -> blank
```

低质量模式：

```txt
nearest zoom tile
  -> overview tile
  -> snapshot
  -> blank
```

极快交互：

```txt
snapshot
  -> overview tile
  -> blank
```

质量模式建议：

```txt
medium:
  exact tile -> nearest tile -> overview -> snapshot

low:
  nearest tile -> overview -> snapshot

very-low:
  snapshot -> overview
```

---

## 9. Overview Cache 设计

Overview 用于极低 zoom 和快速 zoom out。

使用场景：

```txt
1% - 25% zoom
missing low-zoom tile
very fast zoom out
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

Overview 内存限制：

```txt
overviewSoftLimit = 64MB
overviewHardLimit = 128MB
```

Overview 不应该无限细分。

---

## 10. 内存预算

### 10.1 Tile Memory

512 CSS px tile，DPR = 2：

```txt
texture = 1024 x 1024 x 4 = 4MB
```

100 个 tile：

```txt
400MB
```

推荐：

```txt
tileSoftLimit = 256MB
tileHardLimit = 512MB
```

高 zoom tile 命中率较低，应单独限制：

```txt
highZoomTileLimit = 64MB - 128MB
```

---

### 10.2 Snapshot Memory

推荐：

```txt
snapshotCount = 1
optionalPreviousSnapshot = 1
snapshotMemoryLimit = 64MB
```

如果 viewport 特别大：

```txt
降低 snapshot DPR
或者只保存当前 snapshot
```

---

### 10.3 Active Bucket Memory

普通 zoom：

```txt
previous bucket
current bucket
next bucket
```

低 zoom：

```txt
current bucket
overview cache
```

高 zoom：

```txt
current bucket only
current viewport tiles only
```

---

## 11. Tile Eviction 策略

优先淘汰：

```txt
1. 非当前 zoom bucket
2. 远离当前 viewport 的 tile
3. 非 pan 方向的 preload tile
4. dirty tile
5. old LRU tile
6. 高 zoom 下的远 tile
```

优先保留：

```txt
1. 当前 viewport visible tile
2. 当前 zoom bucket tile
3. pan 方向即将进入的 tile
4. 当前 cursor 附近 tile
```

极高 zoom 下：

```txt
只保留当前 viewport tiles。
最多保留一小圈。
不要保留多 bucket。
```

---

## 12. Preload 策略

### 12.1 普通 Zoom

```txt
visible tiles + 1 ring
```

### 12.2 快速 Pan

根据方向预加载：

```txt
panning right:
  preload right edge + right one-ring
  deprioritize left side

panning left:
  preload left edge
  deprioritize right side

panning down:
  preload bottom edge
  deprioritize top side

panning up:
  preload top edge
  deprioritize bottom side
```

### 12.3 极低 Zoom

```txt
overview preload
不要 preload 过多 normal tile
```

### 12.4 极高 Zoom

```txt
preload rings = 0 或 1
只 preload pan direction
不要多 zoom bucket preload
```

---

## 13. Scheduler 策略

交互中：

```txt
max tile uploads per frame = 0 - 1
tile render budget = 1ms - 2ms
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

Scheduler 必须支持取消：

```txt
camera changed
zoom bucket changed
tile no longer visible
request outdated
```

否则会浪费大量 tile render。

---

## 14. 极端 Zoom 下的策略总结

### 14.1 1% - 25%

```txt
overview + aggressive LOD
```

不要渲染完整细节。

---

### 14.2 25% - 800%

```txt
normal tile cache 主力
```

这个区间 tile cache 最有价值。

---

### 14.3 800% - 6400%

```txt
local tile + live vector hybrid
```

visible element 少时直接 live render。

---

### 14.4 6400% - 64000%

```txt
snapshot during interaction
local precise render after idle
```

不要缓存大量 tile。

---

## 15. 最终规则

```txt
1. zoom bucket 不写死，根据 minZoom / maxZoom / bucketStep 动态生成。
2. 默认 minZoom = 0.01，maxZoom = 640，bucketStep = 2。
3. 默认 bucket 范围大致为 1/128 -> 1024。
4. 运行时只缓存 current bucket 以及 activeBucketRadius 范围内的邻近 bucket。
5. 默认 activeBucketRadius = 1，也就是 previous / current / next。
6. 极低 zoom 使用 overview / aggregate，不渲染完整细节。
7. normal tile cache 的主力区间由 normalTileMaxZoom 决定，默认 0.25 - 8。
8. 高 zoom 下优先 local render，tile cache 作为辅助。
9. 极高 zoom 下 snapshot fallback 比 tile cache 更重要。
10. snapshot 是 screen-space，只保留 1 - 2 张。
11. tile 是 world-space，需要 LRU / memory budget。
12. pan 方向进入视口的 tile 优先级最高。
13. interaction 中不能等待 tile 生成。
14. idle 后 progressive refresh 恢复清晰结果。
```
