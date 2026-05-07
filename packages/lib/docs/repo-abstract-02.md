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
  Must not depend on React, app state, or engine internals.

apps/vector
  React UI, local product behavior, document model adapter, command implementation, and app-specific state.
```

## 2. What Is Already Good

The current package direction is correct.

The package already separates several important interaction areas:

```txt
pointer
keyboard
tool
operation
hover
overlay
cursor
viewport
capture
runtime
```

This is a healthy direction because it keeps common editor behavior out of the application layer.

The current split roughly maps to these responsibilities:

```txt
pointer / keyboard / capture
  Low-level input and capture handling.

tool / operation
  Tool resolution and active interaction operation handling.

hover / overlay / cursor
  Interaction feedback and visual intent.

viewport
  Viewport-related interaction state.

runtime
  Shared runtime contracts and state transition helpers.
```

The most important positive point is that this package does not directly depend on React, application-specific business state, or engine internals.

That is the right boundary.

## 3. Main Problem

The current package is closer to an interaction utilities package than a complete editor primitive layer.

It has useful modules, but the full interaction flow is not strict enough yet.

A real editor needs a stable interaction pipeline:

```txt
DOM Event
  ↓
Normalized Input Event
  ↓
Pointer / Keyboard Runtime
  ↓
Gesture / Shortcut Resolution
  ↓
Capture / Hit Target Resolution
  ↓
Effective Tool Resolution
  ↓
Active Operation Lifecycle
  ↓
Command Preview / Commit / Cancel Bridge
  ↓
Runtime Patch
  ↓
Hover / Cursor / Overlay / Viewport Update
```

Without this pipeline, AI-generated code will easily scatter interaction logic across app hooks, React components, and engine adapters.

The package should make the flow explicit.

## 4. Missing or Weak Areas

### 4.1 Interaction Pipeline

The package needs an explicit interaction pipeline document and contract.

Current low-level functions such as:

```ts
applyPointerDown()
applyPointerMove()
applyPointerUp()
```

are useful, but they do not explain the whole interaction order.

Recommended pipeline:

```txt
Input Event
→ Pointer Runtime
→ Gesture Runtime
→ Capture Runtime
→ Hit Target
→ Effective Tool
→ Active Operation
→ Runtime Patch
→ Cursor / Hover / Overlay Result
```

This pipeline should become the core mental model of the package.

### 4.2 Tool Handler Contract

Tool resolution alone is not enough.

The package should define a reusable tool handler contract.

Recommended interface:

```ts
export interface ToolHandler<TContext, TEvent, TResult> {
  onActivate?(ctx: TContext): TResult;
  onDeactivate?(ctx: TContext): TResult;

  onPointerDown?(ctx: TContext, event: TEvent): TResult;
  onPointerMove?(ctx: TContext, event: TEvent): TResult;
  onPointerUp?(ctx: TContext, event: TEvent): TResult;

  onKeyDown?(ctx: TContext, event: TEvent): TResult;
  onKeyUp?(ctx: TContext, event: TEvent): TResult;

  onCancel?(ctx: TContext): TResult;
}
```

The primitive layer does not need to implement concrete tools such as select, rect, text, or path.

However, it should define how tools are activated, deactivated, interrupted, cancelled, and routed.

Important future tools:

```txt
select
pan
hand
rect
path
text
resize
rotate
marquee
lasso
```

These tools need a consistent lifecycle.

### 4.3 Operation Lifecycle

The operation module should become stronger.

A real editor operation is not simply active or inactive.

Recommended phases:

```ts
export type OperationPhase =
  | 'idle'
  | 'pending'
  | 'active'
  | 'committing'
  | 'cancelled'
  | 'completed';
```

Reason:

```txt
pointer down
  → pending

move distance below drag threshold
  → still pending

move distance exceeds drag threshold
  → active

pointer up
  → commit

esc / pointer capture lost / tool changed
  → cancel
```

This is important for selection, drag, resize, rotate, marquee, and text editing.

Without lifecycle phases, interaction state will become fragile.

### 4.4 Interaction Target and Priority

The package needs a generic interaction target model.

It should not directly depend on engine hit-test internals.

It should define the shape of a resolved target.

Recommended type:

```ts
export type InteractionTarget =
  | { type: 'overlay-handle'; id: string; handle: string }
  | { type: 'overlay-bounds'; id: string }
  | { type: 'scene-node'; id: string }
  | { type: 'viewport' }
  | { type: 'empty' };
```

Recommended priority order:

```txt
active capture
> active operation
> overlay handles
> overlay bounds / marquee
> scene node
> viewport background
> empty
```

This is critical for editor behavior.

For example, a resize handle should usually win over the selected shape body. A marquee border should usually win over the canvas background. An active drag should keep receiving events even if the pointer moves away from the original target.

### 4.5 Gesture Layer

`pointer` is too low-level, and `operation` is too high-level.

The missing middle layer is `gesture`.

Recommended module:

```txt
gesture
```

Responsibilities:

```txt
- drag threshold
- click tolerance
- double-click interval
- long press
- wheel gesture
- pinch gesture
- space-drag pan gesture
```

Minimum recommended contracts:

```ts
export interface GesturePolicy {
  dragThreshold: number;
  clickTolerance: number;
  doubleClickIntervalMs: number;
}
```

Common gesture outputs:

```ts
export type GestureIntent =
  | { type: 'click' }
  | { type: 'double-click' }
  | { type: 'drag-start' }
  | { type: 'drag-move' }
  | { type: 'drag-end' }
  | { type: 'wheel' }
  | { type: 'pinch' };
```

### 4.6 Command Bridge

The primitive layer should not implement application commands.

It should not know commands such as:

```txt
moveElement
resizeElement
deleteElement
insertText
```

But it should define how an operation communicates with command execution.

Recommended bridge:

```ts
export interface OperationCommandBridge<TPatch> {
  preview(patch: TPatch): void;
  commit(patch: TPatch): void;
  cancel(): void;
}
```

Or:

```ts
export interface CommandSession<TPatch> {
  id: string;
  status: 'previewing' | 'committed' | 'cancelled';
  preview(patch: TPatch): void;
  commit(patch: TPatch): void;
  cancel(): void;
}
```

This keeps `editor-primitive` generic while allowing `apps/vector` to connect its own document model and undo/redo system.

### 4.7 Cursor Intent

The cursor module should avoid spreading raw CSS cursor strings through the app.

Primitive should define cursor intent.

Recommended type:

```ts
export type CursorIntent =
  | { type: 'default' }
  | { type: 'move' }
  | { type: 'grab' }
  | { type: 'grabbing' }
  | { type: 'resize'; direction: ResizeDirection; rotation: number }
  | { type: 'rotate' }
  | { type: 'text' }
  | { type: 'crosshair' };
```

The DOM adapter can convert this to CSS cursor strings such as:

```txt
default
move
grab
grabbing
nwse-resize
nesw-resize
text
crosshair
```

This keeps the primitive layer portable across Canvas, WebGL, DOM overlay, and custom cursor implementations.

### 4.8 Shortcut Layer

`keyboard` tracks key state, but editor applications also need shortcut matching.

Recommended module:

```txt
shortcut
```

Responsibilities:

```txt
- normalize modifier keys
- support Cmd on macOS and Ctrl on Windows/Linux
- match shortcut combinations
- expose shortcut intent
```

Examples:

```txt
Space
  temporary pan

Cmd/Ctrl + Z
  undo

Cmd/Ctrl + Shift + Z
  redo

Esc
  cancel active operation

Delete / Backspace
  delete selection
```

The primitive package should only define matching utilities and shortcut intent contracts.

The application decides what command each shortcut triggers.

### 4.9 Selection Primitive

Selection is editor-generic enough to be considered for this package.

The package does not need to know the document model, but it can provide selection state contracts.

Recommended minimal state:

```ts
export interface SelectionState {
  selectedIds: string[];
  focusedId: string | null;
  anchorId: string | null;
}
```

Common operations:

```txt
replace selection
add to selection
remove from selection
toggle selection
clear selection
set focused item
set anchor item
```

This can stay generic because it only handles ids and selection behavior, not element semantics.

### 4.10 Interaction Policy

Some editor behavior should be configurable instead of hardcoded.

Recommended module:

```txt
policy
```

Recommended interface:

```ts
export interface InteractionPolicy {
  dragThreshold: number;
  clickTolerance: number;
  doubleClickIntervalMs: number;

  hoverDuringOperation: boolean;
  overlayHitPriority: boolean;

  temporaryPanKey: string;
  cancelOnPointerCaptureLost: boolean;
  cancelOnToolChange: boolean;
}
```

This prevents app-level hooks from accumulating random hardcoded interaction rules.

## 5. Recommended Final Module Structure

Recommended structure:

```txt
@venus/editor-primitive
├─ pointer
├─ keyboard
├─ shortcut
├─ gesture
├─ capture
├─ target
├─ hover
├─ cursor
├─ overlay
├─ viewport
├─ tool
├─ operation
├─ command
├─ selection
├─ policy
└─ runtime
```

Recommended core flow:

```txt
pointer / keyboard
  ↓
gesture / shortcut
  ↓
target / capture
  ↓
tool
  ↓
operation
  ↓
command bridge
  ↓
runtime result
  ↓
hover / cursor / overlay / viewport
```

## 6. Boundary Rules

### Allowed

`@venus/editor-primitive` may:

```txt
- depend on @venus/lib
- define interaction contracts
- define runtime state machines
- define target and cursor intent types
- define gesture and shortcut matchers
- define operation lifecycle helpers
- define command bridge interfaces
- consume engine-produced data through abstract contracts
```

### Not Allowed

`@venus/editor-primitive` must not:

```txt
- depend on React
- depend on app UI components
- depend on application-specific document model
- depend on engine implementation internals
- directly mutate app document state
- directly render Canvas/WebGL/DOM UI
- implement product-specific commands
```

Important clarification:

```txt
editor-primitive should not depend on engine internals,
but it may consume engine-produced hit-test results through package-agnostic contracts.
```

Correct adapter relationship:

```txt
engine
  produces raw hit-test / render / viewport data

apps/vector adapter
  converts engine output into editor-primitive contracts

editor-primitive
  resolves interaction behavior from abstract contracts

apps/vector
  applies commands to the real document model
```

## 7. Recommended Implementation Priority

### Phase 1: Hard Contracts

Implement these first:

```txt
1. InteractionTarget
2. Hit priority resolver
3. OperationPhase
4. ToolHandler contract
5. CursorIntent
6. InteractionPolicy
```

These define the skeleton of the interaction system.

### Phase 2: Runtime Flow

Implement:

```txt
1. Interaction pipeline function
2. pointer → gesture conversion
3. capture resolution
4. effective tool resolution
5. active operation routing
6. runtime patch result
```

### Phase 3: App Integration

In `apps/vector`, build adapters:

```txt
engine hit-test result
  → InteractionTarget

editor operation patch
  → vector document command

CursorIntent
  → DOM canvas cursor

Overlay runtime state
  → vector overlay renderer
```

### Phase 4: Optional Generic Features

Add later:

```txt
selection
shortcut
advanced gesture
multi-hit target picking
operation debugging
interaction trace logs
```

## 8. Suggested Package Score

Current design direction:

```txt
7 / 10
```

Good parts:

```txt
- Module split is reasonable.
- Boundary direction is correct.
- It does not pollute engine or app layers.
- It is reusable across multiple editor apps.
```

Weak parts:

```txt
- Interaction pipeline is not explicit enough.
- Tool handler lifecycle is still missing.
- Operation lifecycle phases are not strong enough.
- Interaction target and priority model is missing.
- Gesture layer is missing.
- Command bridge is not formalized.
- Policy configuration is not centralized.
```

## 9. Final Conclusion

`@venus/editor-primitive` is going in the right direction.

However, it should not remain a loose collection of helpers.

It should become the formal reusable interaction layer between the pure rendering engine and the application-specific editor.

The most important missing pieces are:

```txt
1. ToolHandler
2. OperationLifecycle
3. InteractionTarget
4. Gesture
5. CommandBridge
6. InteractionPolicy
```

Once these are added, `@venus/editor-primitive` can support different editor products such as vector editors, playground editors, and xmind-like editors without pushing shared interaction complexity back into the application layer.

# `@venus/editor-primitive` 评审与补强方案

## 1. 当前定位

`@venus/editor-primitive` 应该是编辑器类应用可复用的交互基础层。

它负责提供通用的交互协议、运行时状态、事件流转规则和基础 helper，服务于：

- `apps/vector`
- 未来的 playground 编辑器
- 未来的 xmind 类编辑器

它不应该包含 React UI 逻辑，不应该绑定具体业务文档模型，也不应该依赖 engine 的内部实现细节。

推荐依赖关系：

```txt
@venus/lib
  ↓
engine
  ↓
@venus/editor-primitive
  ↓
apps/vector
```

更准确地说：

```txt
@venus/lib
  共享底层能力。
  例如 math、geometry、events、id、通用 helper。

engine
  纯渲染与 hit-test 引擎。
  可以依赖 @venus/lib。
  不应该依赖 editor-primitive，也不应该依赖 app 层。

@venus/editor-primitive
  编辑器交互协议和可复用交互运行时。
  可以依赖 @venus/lib。
  不应该依赖 React、app state 或 engine internals。

apps/vector
  React UI、本地产品行为、文档模型 adapter、command 实现、应用状态管理。
```

## 2. 目前做得好的地方

当前方向是对的。

现在已经把一些重要交互模块拆出来了：

```txt
pointer
keyboard
tool
operation
hover
overlay
cursor
viewport
capture
runtime
```

这个拆分是健康的，因为它把通用编辑器行为从 app 层抽离出来了。

大致职责可以这样理解：

```txt
pointer / keyboard / capture
  低级输入和 pointer capture 处理。

tool / operation
  工具解析和当前交互操作管理。

hover / overlay / cursor
  交互反馈和视觉意图。

viewport
  视口相关交互状态。

runtime
  共享运行时协议和状态更新 helper。
```

最重要的是：这个包目前没有直接依赖 React、业务状态或 engine 内部实现。

这个边界是对的。

## 3. 当前主要问题

现在的 `@venus/editor-primitive` 更像是一个交互工具包，还没有完全成为一个稳定的编辑器 primitive 层。

它已经有一些模块，但完整交互流程还不够硬。

一个真实编辑器需要一条明确的交互管线：

```txt
DOM Event
  ↓
Normalized Input Event
  ↓
Pointer / Keyboard Runtime
  ↓
Gesture / Shortcut Resolution
  ↓
Capture / Hit Target Resolution
  ↓
Effective Tool Resolution
  ↓
Active Operation Lifecycle
  ↓
Command Preview / Commit / Cancel Bridge
  ↓
Runtime Patch
  ↓
Hover / Cursor / Overlay / Viewport Update
```

如果没有这条管线，AI 很容易把交互逻辑散落到 app hooks、React 组件和 engine adapter 里。

这个包应该把交互顺序明确下来。

## 4. 缺失或偏弱的部分

### 4.1 Interaction Pipeline

需要明确的交互管线文档和协议。

目前类似下面的低级函数是有用的：

```ts
applyPointerDown()
applyPointerMove()
applyPointerUp()
```

但它们没有解释完整的交互顺序。

推荐管线：

```txt
Input Event
→ Pointer Runtime
→ Gesture Runtime
→ Capture Runtime
→ Hit Target
→ Effective Tool
→ Active Operation
→ Runtime Patch
→ Cursor / Hover / Overlay Result
```

这条 pipeline 应该成为整个包的核心心智模型。

### 4.2 Tool Handler Contract

只做 tool resolution 不够。

这个包应该定义可复用的 tool handler 协议。

推荐接口：

```ts
export interface ToolHandler<TContext, TEvent, TResult> {
  onActivate?(ctx: TContext): TResult;
  onDeactivate?(ctx: TContext): TResult;

  onPointerDown?(ctx: TContext, event: TEvent): TResult;
  onPointerMove?(ctx: TContext, event: TEvent): TResult;
  onPointerUp?(ctx: TContext, event: TEvent): TResult;

  onKeyDown?(ctx: TContext, event: TEvent): TResult;
  onKeyUp?(ctx: TContext, event: TEvent): TResult;

  onCancel?(ctx: TContext): TResult;
}
```

primitive 层不需要实现具体工具，比如 select、rect、text、path。

但它应该定义工具如何激活、失活、中断、取消和路由事件。

未来可能需要的工具：

```txt
select
pan
hand
rect
path
text
resize
rotate
marquee
lasso
```

这些工具都需要统一的生命周期。

### 4.3 Operation Lifecycle

operation 模块还需要加强。

真实编辑器里的 operation 不是简单的 active / inactive。

推荐状态：

```ts
export type OperationPhase =
  | 'idle'
  | 'pending'
  | 'active'
  | 'committing'
  | 'cancelled'
  | 'completed';
```

原因：

```txt
pointer down
  → pending

移动距离小于 drag threshold
  → 仍然 pending

移动距离超过 drag threshold
  → active

pointer up
  → commit

esc / pointer capture lost / tool changed
  → cancel
```

这对 selection、drag、resize、rotate、marquee、text editing 都很重要。

没有这些状态，交互状态会很脆。

### 4.4 Interaction Target 和优先级

需要一个通用的交互目标模型。

它不应该依赖 engine 的 hit-test 内部实现。

它只应该定义最终解析出来的交互目标结构。

推荐类型：

```ts
export type InteractionTarget =
  | { type: 'overlay-handle'; id: string; handle: string }
  | { type: 'overlay-bounds'; id: string }
  | { type: 'scene-node'; id: string }
  | { type: 'viewport' }
  | { type: 'empty' };
```

推荐优先级：

```txt
active capture
> active operation
> overlay handles
> overlay bounds / marquee
> scene node
> viewport background
> empty
```

这个非常关键。

例如 resize handle 通常应该优先于被选中图形本体。marquee border 通常应该优先于 canvas background。active drag 过程中，即使鼠标离开原目标，也应该继续接收事件。

### 4.5 Gesture 层

`pointer` 太低级，`operation` 又太高级，中间缺一层 `gesture`。

推荐模块：

```txt
gesture
```

职责：

```txt
- drag threshold
- click tolerance
- double-click interval
- long press
- wheel gesture
- pinch gesture
- space-drag pan gesture
```

最低推荐协议：

```ts
export interface GesturePolicy {
  dragThreshold: number;
  clickTolerance: number;
  doubleClickIntervalMs: number;
}
```

常见 gesture 输出：

```ts
export type GestureIntent =
  | { type: 'click' }
  | { type: 'double-click' }
  | { type: 'drag-start' }
  | { type: 'drag-move' }
  | { type: 'drag-end' }
  | { type: 'wheel' }
  | { type: 'pinch' };
```

### 4.6 Command Bridge

primitive 层不应该实现具体应用命令。

它不应该知道这些命令：

```txt
moveElement
resizeElement
deleteElement
insertText
```

但它应该定义 operation 如何和命令系统通信。

推荐 bridge：

```ts
export interface OperationCommandBridge<TPatch> {
  preview(patch: TPatch): void;
  commit(patch: TPatch): void;
  cancel(): void;
}
```

或者：

```ts
export interface CommandSession<TPatch> {
  id: string;
  status: 'previewing' | 'committed' | 'cancelled';
  preview(patch: TPatch): void;
  commit(patch: TPatch): void;
  cancel(): void;
}
```

这样 `editor-primitive` 仍然保持通用，而 `apps/vector` 可以接自己的 document model 和 undo/redo 系统。

### 4.7 Cursor Intent

cursor 模块不应该让 app 到处传原始 CSS cursor 字符串。

primitive 层应该定义 cursor intent。

推荐类型：

```ts
export type CursorIntent =
  | { type: 'default' }
  | { type: 'move' }
  | { type: 'grab' }
  | { type: 'grabbing' }
  | { type: 'resize'; direction: ResizeDirection; rotation: number }
  | { type: 'rotate' }
  | { type: 'text' }
  | { type: 'crosshair' };
```

DOM adapter 再把它转换成 CSS cursor：

```txt
default
move
grab
grabbing
nwse-resize
nesw-resize
text
crosshair
```

这样可以保证 primitive 层能适配 Canvas、WebGL、DOM overlay 和 custom cursor。

### 4.8 Shortcut 层

`keyboard` 只能追踪按键状态，但编辑器还需要 shortcut matching。

推荐模块：

```txt
shortcut
```

职责：

```txt
- 标准化 modifier keys
- 支持 macOS 的 Cmd 和 Windows/Linux 的 Ctrl
- 匹配快捷键组合
- 输出 shortcut intent
```

例子：

```txt
Space
  临时 pan

Cmd/Ctrl + Z
  undo

Cmd/Ctrl + Shift + Z
  redo

Esc
  cancel active operation

Delete / Backspace
  delete selection
```

primitive 包只定义快捷键匹配工具和 shortcut intent。

具体 shortcut 触发什么 command，由应用层决定。

### 4.9 Selection Primitive

selection 足够通用，可以考虑放进这个包。

这个包不需要知道文档模型，但可以提供 selection state 协议。

推荐最小状态：

```ts
export interface SelectionState {
  selectedIds: string[];
  focusedId: string | null;
  anchorId: string | null;
}
```

常见操作：

```txt
replace selection
add to selection
remove from selection
toggle selection
clear selection
set focused item
set anchor item
```

这仍然是通用能力，因为它只处理 id 和 selection 行为，不处理元素语义。

### 4.10 Interaction Policy

很多编辑器行为应该配置化，而不是硬编码。

推荐模块：

```txt
policy
```

推荐接口：

```ts
export interface InteractionPolicy {
  dragThreshold: number;
  clickTolerance: number;
  doubleClickIntervalMs: number;

  hoverDuringOperation: boolean;
  overlayHitPriority: boolean;

  temporaryPanKey: string;
  cancelOnPointerCaptureLost: boolean;
  cancelOnToolChange: boolean;
}
```

这样可以避免 app hooks 里到处散落随机规则。

## 5. 推荐最终模块结构

推荐结构：

```txt
@venus/editor-primitive
├─ pointer
├─ keyboard
├─ shortcut
├─ gesture
├─ capture
├─ target
├─ hover
├─ cursor
├─ overlay
├─ viewport
├─ tool
├─ operation
├─ command
├─ selection
├─ policy
└─ runtime
```

推荐核心流程：

```txt
pointer / keyboard
  ↓
gesture / shortcut
  ↓
target / capture
  ↓
tool
  ↓
operation
  ↓
command bridge
  ↓
runtime result
  ↓
hover / cursor / overlay / viewport
```

## 6. 边界规则

### 允许做的事

`@venus/editor-primitive` 可以：

```txt
- 依赖 @venus/lib
- 定义交互协议
- 定义运行时状态机
- 定义 target 和 cursor intent 类型
- 定义 gesture 和 shortcut matcher
- 定义 operation lifecycle helper
- 定义 command bridge interface
- 通过抽象协议消费 engine 产出的数据
```

### 不允许做的事

`@venus/editor-primitive` 不应该：

```txt
- 依赖 React
- 依赖 app UI components
- 依赖具体应用的 document model
- 依赖 engine implementation internals
- 直接修改 app document state
- 直接渲染 Canvas/WebGL/DOM UI
- 实现具体产品命令
```

重要补充：

```txt
editor-primitive 不应该依赖 engine internals，
但可以通过包无关的抽象协议消费 engine 产出的 hit-test 结果。
```

正确 adapter 关系：

```txt
engine
  产出 raw hit-test / render / viewport data

apps/vector adapter
  把 engine output 转成 editor-primitive contracts

editor-primitive
  基于抽象 contract 解析交互行为

apps/vector
  把 command 应用到真实 document model
```

## 7. 推荐实现优先级

### Phase 1：先补硬协议

优先实现：

```txt
1. InteractionTarget
2. Hit priority resolver
3. OperationPhase
4. ToolHandler contract
5. CursorIntent
6. InteractionPolicy
```

这些是交互系统骨架。

### Phase 2：补运行时流程

实现：

```txt
1. Interaction pipeline function
2. pointer → gesture conversion
3. capture resolution
4. effective tool resolution
5. active operation routing
6. runtime patch result
```

### Phase 3：接入 apps/vector

在 `apps/vector` 里做 adapter：

```txt
engine hit-test result
  → InteractionTarget

editor operation patch
  → vector document command

CursorIntent
  → DOM canvas cursor

Overlay runtime state
  → vector overlay renderer
```

### Phase 4：后续可选能力

后面再加：

```txt
selection
shortcut
advanced gesture
multi-hit target picking
operation debugging
interaction trace logs
```

## 8. 当前评分

只看设计方向：

```txt
7 / 10
```

好的地方：

```txt
- 模块拆分方向合理。
- 边界意识正确。
- 没有污染 engine 或 app 层。
- 可以复用于多个编辑器应用。
```

弱的地方：

```txt
- Interaction pipeline 不够明确。
- Tool handler lifecycle 还缺失。
- Operation lifecycle phases 还不够强。
- Interaction target 和 priority model 缺失。
- Gesture 层缺失。
- Command bridge 没有正式化。
- Policy 配置没有集中管理。
```

## 9. 结论

`@venus/editor-primitive` 的方向是对的。

但它不应该停留在零散 helper 集合。

它应该成为 pure rendering engine 和 application-specific editor 之间的正式交互层。

最重要的缺口是：

```txt
1. ToolHandler
2. OperationLifecycle
3. InteractionTarget
4. Gesture
5. CommandBridge
6. InteractionPolicy
```

这些补上以后，`@venus/editor-primitive` 才能真正支撑 vector editor、playground editor、xmind-like editor 这类不同编辑器产品，而不是把共享交互复杂度重新推回应用层。