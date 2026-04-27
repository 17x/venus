# Transform / Quadtree / Dirty / Cache Invalidation 关系

元素 transform、quadtree、dirty check、cache invalidation 是一条链。

```txt
元素 transform 改变
  -> 元素 world bounds 改变
  -> spatial index / quadtree 需要更新
  -> old bounds + new bounds 需要 dirty
  -> 命中的 tile / overview / render cache / hit cache 需要失效
```

Transform 不只是影响渲染，也会影响：

```txt
world matrix
world bounds
screen bounds
hit test bounds
tile coverage
quadtree index range
render batch / GPU instance transform
```

---

## 1. Transform 与 Quadtree

Quadtree / spatial index 不应该存元素的视觉纹理，而应该存元素的 `world bounds / AABB`。

推荐规则：

```txt
transform start:
  record oldWorldBounds
  mark element as active

transforming:
  不要每帧更新 quadtree
  不要每帧 dirty tile
  通过 Active Element Layer live render 当前操作对象

transform commit:
  compute newWorldBounds
  update spatial index / quadtree
```

除非业务明确需要在 transform 中实时对新位置做 hit test，否则不要在每个 pointermove 中更新 quadtree。

---

## 2. Transform 与 Dirty Bounds

Transform 提交后，dirty 区域必须同时包含旧位置和新位置。

```txt
dirtyBounds = union(oldWorldBounds, newWorldBounds)
```

原因：

```txt
oldWorldBounds:
  旧位置的元素图像需要被清除

newWorldBounds:
  新位置的元素图像需要被绘制
```

如果元素有 stroke / shadow / filter / blur，需要扩大 dirty bounds：

```txt
dirtyBounds = inflate(union(oldWorldBounds, newWorldBounds), effectPadding)
```

`effectPadding` 至少考虑：

```txt
stroke width
shadow offset
shadow blur
filter blur
outer glow
mask / clip 可能产生的扩展范围
```

---

## 3. Transform 与 Cache Invalidation

Transform commit 后，以下缓存可能失效：

```txt
tile cache:
  old/new dirty bounds 覆盖的 tile dirty

overview cache:
  如果 overview 包含该元素，需要标记 dirty 或过期

snapshot cache:
  snapshot 可能包含旧位置，只能作为临时 fallback，不能作为最终正确结果

hit test cache:
  bounds / path transform 变化后失效

screen bounds cache:
  element screen bounds 失效

render batch / GPU buffer:
  instance transform 或 geometry buffer 需要更新

group thumbnail cache:
  如果元素属于 group，父 group thumbnail dirty
```

注意：

```txt
snapshot 是临时 screen-space fallback。
transform commit 后，snapshot 不能代表最终正确画面。
需要通过 progressive refresh 恢复正式 tile / precise render。
```

---

## 4. Transform 生命周期

### 4.1 transform start

```txt
1. record oldWorldBounds
2. record old matrix / transform state
3. mark element as active
4. optionally hide active element from Static Base Layer live render
5. keep Static Base Layer cache as background
```

建议 session 数据：

```ts
export interface TransformSession {
  elementId: string;
  oldWorldBounds: Rect;
  oldMatrix: Matrix;
}
```

### 4.2 transforming

```txt
1. 不每帧更新 quadtree
2. 不每帧 dirty tile
3. 不每帧 rebuild overview
4. Static Base Layer 使用 tile / snapshot 作为背景
5. Active Element Layer live render 当前 transform 后的元素
6. Dynamic Overlay Layer live render handles / bounds / guides
```

### 4.3 transform commit

```txt
1. apply transform to document model
2. compute newWorldBounds
3. dirtyBounds = union(oldWorldBounds, newWorldBounds)
4. inflate dirtyBounds by stroke / shadow / filter padding
5. update spatial index / quadtree
6. invalidate affected tile / overview / render / hit cache
7. schedule progressive refresh for affected visible tiles
8. clear active element state
```

伪代码：

```ts
function commitTransform(elementId: string, nextTransform: Matrix): void {
  const session = transformSessions.get(elementId);
  if (!session) return;

  const oldBounds = session.oldWorldBounds;

  document.updateTransform(elementId, nextTransform);

  const newBounds = getElementWorldBounds(elementId);
  const effectPadding = getElementEffectPadding(elementId);
  const dirtyBounds = inflateRect(
    unionRect(oldBounds, newBounds),
    effectPadding,
  );

  spatialIndex.update(elementId, newBounds);

  tileCache.markDirtyByBounds(dirtyBounds);
  overviewCache.markDirtyByBounds(dirtyBounds);
  renderCache.invalidateElement(elementId);
  hitTestCache.invalidateElement(elementId);

  scheduler.requestVisibleRefresh(dirtyBounds);

  transformSessions.delete(elementId);
}
```

---

## 5. Rotate / Scale / Group Transform 注意点

旋转和缩放不能只使用元素原始 `x / y / width / height`。

必须使用 transform 后的 world AABB：

```txt
worldBounds = AABB(transform(localBounds.corners))
```

示例：

```ts
function getTransformedAabb(localBounds: Rect, worldMatrix: Matrix): Rect {
  const corners = rectToCorners(localBounds);
  const points = corners.map((point) => transformPoint(point, worldMatrix));
  return pointsToAabb(points);
}
```

Group transform 更复杂：

```txt
group transform 改变
  -> group world bounds 改变
  -> children world matrix 改变
  -> children hit test 结果可能改变
```

推荐混合策略：

```txt
small group:
  update children bounds in spatial index

large group:
  update group bounds first
  children bounds lazy update
  hit test 时进入 group-local coordinate 做精细判断
```

不要在大 group transform 的每一帧更新所有 children 的 quadtree entry。

---

## 6. 操作类型与 Dirty 规则

```txt
move:
  dirty old bounds + new bounds

resize:
  dirty old bounds + new bounds

rotate:
  dirty old rotated AABB + new rotated AABB

scale:
  dirty old bounds + new bounds

style change:
  dirty current bounds
  如果 stroke / shadow / filter 改变，dirty old effect bounds + new effect bounds

text edit:
  dirty old text bounds + new text bounds

image change:
  dirty image bounds
  invalidate image texture cache

z-index change:
  dirty affected stacking area
  简单版可以 dirty element bounds
  严格版需要 dirty affected overlap region

group transform:
  dirty old group bounds + new group bounds
  update group / children spatial index according to group size strategy
```

---

## 7. 与 Static / Active / Dynamic Layer 的关系

Transform 期间不应该强制刷新全部静态层。

推荐关系：

```txt
Static Base Layer:
  使用已有 tile / snapshot / overview 作为背景
  不因为 pointermove 每帧重建

Active Element Layer:
  live render 当前 transform 后的元素
  保证当前操作对象清晰
  不使用低质量 snapshot 替代

Dynamic Overlay Layer:
  live render handles / bounds / guides / hover / cursor
  不进入 tile / overview / snapshot
```

Transform commit 后再做正确性更新：

```txt
1. compute oldWorldBounds + newWorldBounds
2. dirty union(oldWorldBounds, newWorldBounds)
3. inflate dirty bounds by stroke / shadow / filter padding
4. update spatial index / quadtree
5. invalidate affected tile / overview / render / hit cache
6. progressive refresh affected visible tiles
7. clear active layer state
8. overlay remains live
```

---

## 8. 最终规则

```txt
1. Transform 会改变 world bounds。
2. world bounds 会影响 quadtree / spatial index。
3. world bounds 变化会产生 dirty bounds。
4. dirty bounds 会决定 tile / overview / render cache 的失效范围。
5. transform start 记录 oldWorldBounds。
6. transforming 阶段通过 Active Element Layer live render，不每帧 dirty tile。
7. transform commit 计算 newWorldBounds。
8. dirty union(oldWorldBounds, newWorldBounds)。
9. dirtyBounds 需要按 stroke / shadow / filter padding 扩大。
10. commit 后更新 quadtree，并 invalidate affected caches。
11. 最后 progressive refresh 受影响区域。
```

一句话：

```txt
transform 过程中追求当前操作对象清晰和输入响应；transform 提交后再更新空间索引和缓存正确性。
```
