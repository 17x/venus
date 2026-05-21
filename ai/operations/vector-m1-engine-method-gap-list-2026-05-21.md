# Vector M1 -> Engine 方法缺口清单（2026-05-21）

状态：待 engine 评估
来源：

1. vector-editor-web 当前 Product/Runtime 调用面
2. Engine Full Surface 文档：engine-api-requirements-full-surface-from-capability-mapping-2026-05-21.md

## 0. 当前已可用（EngineHandle）

1. `engine.query(bounds)`
2. `engine.pick(point, options)`
3. `engine.raycast(ray, options)`
4. `engine.getDiagnostics()`

说明：以上在 `packages/engine/src/api/public-types.ts` 中已定义。

## 1. M1 关键缺口（建议优先）

## GAP-1: `engine.pickRect(rect, options)`

用途：

1. 替代 vector 侧 `requestEngineGeometry({marqueeBounds, marqueeMode})` 的矩形框选解析路径。

当前状态：

1. 在 Full Surface 文档中存在（Developer API/L1），但 EngineHandle 公开类型中暂无该方法。

建议契约：

1. 输入：

- rect: {minX, minY, maxX, maxY}
- options.mode: 'contain' | 'intersect'
- options.includeLocked?: boolean
- options.includeHidden?: boolean

2. 输出：

- { hits: readonly {id: string; rank: number}[] }

优先级：P0
阻断影响：

1. 框选语义仍依赖 vector 本地 geometry payload 组合逻辑，难以统一口径。

## GAP-2: `engine.pickLasso(path, options)`

用途：

1. 为后续套索选择预留 canonical API，避免再次走本地几何实现。

当前状态：

1. Full Surface 文档中存在，EngineHandle 暂无。

建议契约：

1. 输入：

- path: Array<{x: number; y: number}>
- options.mode: 'contain' | 'intersect'

2. 输出：

- { hits: readonly {id: string; rank: number}[] }

优先级：P1
阻断影响：

1. 套索能力上线将被迫先走临时本地实现。

## GAP-3: `engine.pick` 选项扩展（预算与命中策略）

用途：

1. 将现有 `requestEngineGeometry` 中的命中预算能力收敛为 pick options。

当前状态：

1. 现有 `EnginePickOptions` 仅含 `tolerance`。

建议扩展：

1. options.hitMode?: 'exact' | 'bbox_then_exact' | 'bbox'
2. options.maxExactCandidateCount?: number
3. options.allowFrameSelection?: boolean

优先级：P1
阻断影响：

1. M1 可先用现状运行，但 hover/click/cycle-hit 策略难以完全统一到单一 API。

## 2. 非阻断项（可继续在 vector/runtime 本地）

1. `resolveEngineAdaptiveHitTolerance`

- 当前可继续走 runtime bridge helper（后续可评估迁移至 lib 或 runtime local policy）。

2. `resolveEngineGeometryPayload`

- 当前作为 bridge 兼容层可继续使用；M1 之后建议逐步由 pick/pickRect/query 组合替代。

## 3. 对 engine 的请求格式（建议直接回写）

1. 是否接受 GAP-1 / GAP-2 / GAP-3（Y/N）。
2. 若接受：给出预计版本与 contract 草案链接。
3. 若不接受：给出官方替代路径与 vector 侧建议实现。
