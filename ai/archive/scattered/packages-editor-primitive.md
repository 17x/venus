## Source: ./packages/editor-primitive/docs/repo-abstract-01.md
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

## Source: ./packages/editor-primitive/docs/repo-abstract-05.md
```markdown
# Selector & Pointer Selector 设计（editor-primitive）

## 1. 目标

```
统一 selection / hover / marquee / click 的语义与执行分层
```

---

## 2. 核心分层

### 2.1 Engine（能力层）

提供纯查询能力：

```
hitTest(point)
queryRect(rect)
queryPath(path)
```

特点：

- 无 UI
- 无交互状态
- 支持 transform / group / mask
- 基于 scene graph 或 spatial index

---

### 2.2 Editor-Primitive（交互层）

负责 pointer selector：

```
- pointer down / move / up
- click / marquee 判定
- modifier（shift / cmd）
- selection 模式（replace / add / toggle）
```

## Source: ./packages/editor-primitive/docs/repo-abstract-04.md
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

## Source: ./packages/editor-primitive/docs/README.md
```markdown
# Editor Primitive Docs

Editor-primitive extracted docs from repository-level docs live under:

- `repo-extracted/docs/task/repo-abstract/*`

Start here:

- `repo-extracted/docs/task/repo-abstract/repo-abstract-01.md`
```

## Source: ./packages/editor-primitive/docs/repo-abstract-03.md
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

## Source: ./packages/editor-primitive/docs/repo-abstract-02.md
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

## Source: ./packages/editor-primitive/README.md
```markdown
# @venus/editor-primitive

`@venus/editor-primitive` defines reusable editor interaction primitives.

## Responsibility

- Own package-agnostic interaction contracts and runtime helpers.
- Provide a full interaction pipeline: pointer/keyboard -> gesture/shortcut -> target/capture -> tool/operation -> command bridge -> runtime feedback.
- Provide pointer/keyboard/shortcut/gesture/tool/operation/target/command/selection/policy/hover/overlay/cursor/viewport/capture/runtime modules.
- Provide normalized input contracts in `input` + `runtime` so adapters can dispatch stable event unions.
- Depend only on low-level abstractions from `@venus/lib`.

## Module Coverage

- `pointer`: pointer runtime contracts, drag threshold helpers, pointer state reducers, normalized pointer event contract.
- `keyboard`: modifier/key runtime contracts and keydown/keyup reducers.
- `input`: normalized modifier-state contract shared by pointer/keyboard/wheel adapters.
- `shortcut`: platform-aware shortcut chord parser/matcher and IME/text-editing shortcut guard.
- `gesture`: gesture policy + pointer-to-gesture intent resolver.
- `tool`: current/temporary/effective tool contracts and resolver helpers.
- `operation`: active operation, drag/gesture, command session, lifecycle manager + explicit operation phases.
- `target`: interaction target contracts, stable priority resolver, multi-hit target stack, piercing-target picker.
- `command`: operation-to-command preview/commit/cancel bridge contracts.
- `selection`: id-only selection primitive state and mutators.
- `policy`: central interaction policy defaults and override resolver.
- `hover`: overlay/scene hover runtime contract and change detection helper.
- `overlay`: overlay node schema, runtime state, sorting, hit-tolerance helpers.
- `cursor`: cursor intent schema, resize mapping, runtime resolver, DOM applier.
- `viewport`: viewport interaction runtime and shared zoom preset policy.
- `capture`: pointer capture ownership runtime contract.
- `runtime`: top-level interaction runtime composition contracts, normalized interaction event union, pipeline orchestrator, runtime state/result contracts, and pure event dispatcher.
  - emits structured warning diagnostics (`InteractionWarning`) for guarded/degraded branches.
  - emits viewport intents (`ViewportIntent`) for wheel and gesture-driven camera policy routing.

## Canonical Pipeline

```txt
Input event
-> Pointer + Keyboard runtime normalization
-> Gesture + Shortcut resolution
```

