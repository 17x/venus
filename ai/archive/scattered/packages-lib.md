## Source: ./packages/lib/docs/repo-abstract-01.md
```markdown


# packages/editor-interaction 抽象设计

## 1. 最终决定

不把 interaction / overlay / cursor 合并进 engine。

单独做一个通用包：

```txt
packages/editor-interaction
```

定位：

```txt
editor-interaction 是编辑器交互运行时抽象层。

它负责：
  pointer / keyboard / modifier runtime
  tool runtime
  active operation lifecycle
  drag / gesture runtime
  hover runtime
  cursor intent / cursor manager / cursor applier
  dynamic overlay primitives
  overlay hit test helpers
  overlay action passthrough

它不负责：
  WebGL 渲染
  tile cache
  snapshot cache
  quadtree
  vector document model
  vector history / collaboration
  vector path / text / image / frame 产品语义
```

```

## Source: ./packages/lib/docs/repo-abstract-04.md
```markdown


# `@venus/editor-primitive` 工程化补强规范

## 1. 推荐分层目录结构

`@venus/editor-primitive` 不应该把所有类型、helper、runtime 逻辑堆进一个文件。

推荐目录结构：

```txt
packages/editor-primitive/src/
├─ input/
│  ├─ pointer/
│  ├─ keyboard/
│  └─ shortcut/
├─ gesture/
├─ target/
├─ capture/
├─ tool/
├─ operation/
├─ command/
├─ cursor/
├─ overlay/
├─ viewport/
├─ selection/
├─ policy/
├─ runtime/
├─ trace/
└─ index.ts
```

推荐职责：

```txt
input
  处理低级输入协议，例如 pointer、keyboard、shortcut。

gesture
  处理 click、double-click、drag、wheel、pinch 等手势判断。
```

## Source: ./packages/lib/docs/README.md
```markdown
# Lib Docs

Lib-owned extracted docs from repository-level docs live under:

- `repo-extracted/docs/task/repo-abstract/*`

Start here:

- `repo-extracted/docs/task/repo-abstract/repo-abstract-01.md`
```

## Source: ./packages/lib/docs/repo-abstract-03.md
```markdown
## 9. 结论

（此处保留原有内容）

## 10. Runtime State 和 Interaction Result 协议

`@venus/editor-primitive` 不应该只提供零散 helper。

它需要定义统一的 runtime state 和 interaction result。

这样 tool、operation、gesture、shortcut、target resolver 都可以返回同一种结果，应用层 adapter 也可以用统一方式消费。

### 10.1 Runtime State

推荐定义整体交互状态：

```ts
export interface InteractionRuntimeState {
  pointer: PointerState;
  keyboard: KeyboardState;
  gesture: GestureState;
  capture: CaptureState;
  hover: HoverState;
  cursor: CursorIntent;
  tool: ToolState;
  operation: OperationState;
  selection?: SelectionState;
  viewport?: ViewportInteractionState;
}
```

这个 state 不一定要作为一个巨大 store 存在。

它的价值是明确：

```txt
这些状态属于 interaction runtime，
不应该散落在 React useState、组件局部变量、engine adapter 或 document store 里。
```

```

## Source: ./packages/lib/docs/repo-abstract-02.md
```markdown
# `@venus/editor-primitive` Review and Improvement Plan

## 1. Current Positioning

`@venus/editor-primitive` should be the reusable interaction primitive layer for editor-style applications.

It should provide common interaction contracts and runtime helpers for applications such as:

- `apps/vector`
- future playground editors
- future xmind-like editors

It should not contain React UI logic, application-specific document model logic, or engine implementation details.

Recommended positioning:

```txt
@venus/lib
  ↓
engine
  ↓
@venus/editor-primitive
  ↓
apps/vector
```

More accurately:

```txt
@venus/lib
  Shared low-level utilities, math, geometry, events, ids, helpers.

engine
  Pure rendering and hit-test engine.
  May depend on @venus/lib.
  Must not depend on editor-primitive or app layer.

@venus/editor-primitive
  Editor interaction contracts and reusable interaction runtime helpers.
  May depend on @venus/lib.
```

## Source: ./packages/lib/README.md
```markdown
# @venus/lib

`@venus/lib` is the shared low-level foundation package for Venus.

## Responsibility

- Own package-agnostic primitives and utility contracts.
- Provide reusable modules for math, geometry, ids, events, lifecycle, scheduler,
  patch helpers, collections, logger, worker base contracts, serialization, and
  assertions.
- Stay independent from product semantics and rendering implementations.

## Modules

- `@venus/lib/math`: matrix and point primitives.
- `@venus/lib/geometry`: normalized bounds and rectangle helpers.
- `@venus/lib/ids`: short non-cryptographic id helpers.
- `@venus/lib/events`: lightweight event emitter primitives.
- `@venus/lib/lifecycle`: disposable resource contracts.
- `@venus/lib/scheduler`: single-flight frame scheduler primitives.
- `@venus/lib/patch`: patch classification and batch apply helpers.
- `@venus/lib/collections`: map/set helper utilities.
- `@venus/lib/logger`: level-filtered logger primitives.
- `@venus/lib/worker`: worker capability and rpc envelope helpers.
- `@venus/lib/serialization`: safe JSON parse/stringify helpers.
- `@venus/lib/assert`: invariant and exhaustive-guard assertions.
- `@venus/lib/viewport`: shared viewport, pan, and zoom interaction primitives.

## API Usage

### `@venus/lib/math`

```ts
import {
  applyAffineMatrixToPoint,
  createAffineMatrixAroundPoint,
  invertAffineMatrix,
  multiplyAffineMatrices,
  type AffineMatrix,
  type Mat3,
```

