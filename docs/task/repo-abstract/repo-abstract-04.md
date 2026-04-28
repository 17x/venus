

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

target
  处理 InteractionTarget、TargetStack、target priority。

capture
  处理 pointer capture 和 active capture 状态。

tool
  处理 tool state、effective tool、tool registry、tool lifecycle。

operation
  处理 active operation、operation phase、interrupt、cancel、commit。

command
  定义 command bridge、transaction、preview/commit/cancel 协议。

cursor
  定义 cursor intent，不直接操作 DOM cursor。

overlay
  定义 overlay target、overlay intent、overlay interaction schema。

viewport
  定义 viewport intent，例如 pan-by、zoom-at。

selection
  定义通用 selection state 和 selection reducer。

policy
  定义 interaction policy、tool switch policy、gesture policy。

runtime
  串联 input、gesture、target、tool、operation，输出 InteractionResult。

trace
  定义 debug trace，不依赖 React。
```

## 2. Public API 暴露规则

`index.ts` 只暴露稳定协议和必要 helper。

不应该把内部实现细节全部 export 出去。

### 2.1 可以从 package root 导出

```txt
- public types
- stable intent types
- pure helper
- reducer
- runtime dispatcher
- policy resolver
```

例如：

```ts
export type {
  InteractionRuntimeState,
  InteractionResult,
  InteractionTarget,
  TargetStack,
  ToolState,
  OperationPhase,
  CursorIntent,
  InteractionPolicy,
  NormalizedInteractionEvent,
} from './runtime';

export {
  resolveInteractionPolicy,
  dispatchInteractionEvent,
  pickPrimaryTarget,
  resolveTargetStack,
  resolveEffectiveTool,
  resolveCursorIntent,
} from './runtime';
```

### 2.2 不鼓励应用层深度 import

不鼓励：

```ts
import { xxx } from '@venus/editor-primitive/src/operation/internal/xxx';
```

推荐：

```ts
import { xxx } from '@venus/editor-primitive';
```

### 2.3 API 稳定级别

建议给 public API 标注稳定级别：

```txt
stable
  InteractionTarget
  TargetStack
  InteractionResult
  CursorIntent
  InteractionPolicy
  NormalizedInteractionEvent

experimental
  GestureIntent
  OverlayIntent
  InteractionTrace
  ViewportIntent

internal
  private resolver helper
  test fixtures
  debug-only helper
```

规则：

```txt
stable API
  app 可以长期依赖。

experimental API
  app 可以试用，但未来可能调整。

internal API
  不允许 app 直接依赖。
```

## 3. Normalized Interaction Event

`dispatchInteractionEvent()` 的输入必须统一。

不要让 runtime 同时接收原生 DOM `PointerEvent`、`KeyboardEvent`、`WheelEvent` 和自定义对象。

推荐定义统一事件 union：

```ts
export type NormalizedInteractionEvent =
  | { type: 'pointer-down'; event: NormalizedPointerEvent }
  | { type: 'pointer-move'; event: NormalizedPointerEvent }
  | { type: 'pointer-up'; event: NormalizedPointerEvent }
  | { type: 'pointer-cancel'; event: NormalizedPointerEvent }
  | { type: 'key-down'; event: NormalizedKeyboardEvent }
  | { type: 'key-up'; event: NormalizedKeyboardEvent }
  | { type: 'wheel'; event: NormalizedWheelEvent }
  | { type: 'blur' }
  | { type: 'visibility-hidden' }
  | { type: 'context-menu'; event: NormalizedPointerEvent };
```

### 3.1 Normalized Pointer Event

```ts
export interface NormalizedPointerEvent {
  pointerId: number;
  pointerType: 'mouse' | 'pen' | 'touch';

  button: number;
  buttons: number;

  client: Point;
  canvas: Point;
  screen: Point;
  world: Point;

  modifiers: ModifierState;

  timestamp: number;
  isPrimary: boolean;
  pressure?: number;

  isComposing?: boolean;
}
```

### 3.2 Normalized Keyboard Event

```ts
export interface NormalizedKeyboardEvent {
  key: string;
  code: string;

  modifiers: ModifierState;

  repeat: boolean;
  timestamp: number;

  isComposing: boolean;

  targetTagName?: string;
  isContentEditable?: boolean;
}
```

### 3.3 Normalized Wheel Event

```ts
export interface NormalizedWheelEvent {
  deltaX: number;
  deltaY: number;
  deltaMode: 'pixel' | 'line' | 'page';

  client: Point;
  canvas: Point;
  screen: Point;
  world: Point;

  modifiers: ModifierState;
  timestamp: number;
}
```

### 3.4 Modifier State

```ts
export interface ModifierState {
  alt: boolean;
  ctrl: boolean;
  meta: boolean;
  shift: boolean;
  space: boolean;
}
```

规则：

```txt
- app adapter 负责从 DOM event 转换成 normalized event
- editor-primitive 不直接访问 DOM event
- runtime 只消费 NormalizedInteractionEvent
- 所有坐标转换在 app adapter 中完成
```

## 4. Immutable State 规则

`@venus/editor-primitive` 默认使用纯函数和不可变状态更新。

禁止直接修改传入对象。

不推荐：

```ts
state.operation.phase = 'active';
return state;
```

推荐：

```ts
return {
  ...state,
  operation: {
    ...state.operation,
    phase: 'active',
  },
};
```

核心规则：

```txt
- 不直接 mutate state
- 不直接 mutate event
- 不直接 mutate target
- 不直接 mutate policy
- 状态变化通过 nextState / patch 表达
- 高频路径可以做局部优化，但不能破坏外部不可变语义
```

### 4.1 Reducer 风格

推荐：

```txt
输入：
  state + event + policy

输出：
  InteractionResult
```

例如：

```ts
const result = dispatchInteractionEvent(state, event, policy);
```

不要让 reducer 内部直接调用 app 副作用。

## 5. 错误处理和 Warning 策略

交互层位于高频路径，不应该随便 throw。

尤其是 `pointermove`、`drag`、`resize`、`rotate` 过程中，如果遇到非法状态，应该安全降级。

### 5.1 错误码

推荐：

```ts
export type InteractionWarningCode =
  | 'missing-capture'
  | 'invalid-operation-phase'
  | 'unknown-tool'
  | 'invalid-target'
  | 'missing-command-bridge'
  | 'ignored-non-primary-pointer'
  | 'shortcut-blocked-by-ime'
  | 'operation-already-completed';
```

```ts
export interface InteractionWarning {
  code: InteractionWarningCode;
  message: string;
  eventType?: NormalizedInteractionEvent['type'];
}
```

### 5.2 Result 中携带 warnings

```ts
export interface InteractionResult<TPatch = unknown> {
  nextState?: Partial<InteractionRuntimeState>;

  command?: {
    type: 'preview' | 'commit' | 'cancel';
    patch?: TPatch;
  };

  cursor?: CursorIntent;
  overlay?: OverlayIntent;
  capture?: CaptureIntent;
  viewport?: ViewportIntent;

  preventDefault?: boolean;
  stopPropagation?: boolean;

  warnings?: InteractionWarning[];
  trace?: InteractionTrace;
}
```

### 5.3 规则

```txt
高频事件路径：
  不随意 throw。
  非法状态返回 noop result 或 warning。

开发环境：
  可以输出 trace warning。

生产环境：
  安全降级，不影响用户继续操作。
```

## 6. 性能约束

`@venus/editor-primitive` 会运行在 pointermove、drag、resize、rotate 等高频路径上，必须有性能约束。

### 6.1 高频路径禁止事项

pointermove / drag / resize / rotate 中应避免：

```txt
- 分配大量临时对象
- 深拷贝完整 runtime state
- 遍历全部 scene nodes
- 同步触发 React setState
- 每帧重复解析全部 tool registry
- 每帧重复计算完整 overlay tree
- 每帧创建大量闭包
- 每帧 JSON stringify / parse
```

### 6.2 复杂度目标

```txt
pointermove / drag / resize / rotate：
  尽量 O(1) 或 O(log n)

target stack：
  由 engine / adapter 提供，不在 primitive 内扫描场景

operation update：
  只更新 active operation 相关状态

cursor resolution：
  只基于当前 target / operation / tool 计算
```

### 6.3 和 React 的关系

```txt
editor-primitive 不直接触发 React setState。
它只返回 InteractionResult。
apps/vector 可以根据 result 决定是否 batch update。
```

## 7. Multi-pointer / Touch 策略

MVP 阶段建议只支持 single primary pointer。

不要半吊子支持复杂多指触控。

### 7.1 Pointer State

```ts
export interface PointerState {
  primaryPointerId: number | null;
  activePointers: Record<number, NormalizedPointerEvent>;
}
```

### 7.2 MVP 规则

```txt
- 只处理 isPrimary === true 的 pointer
- 非 primary pointer 默认 ignored
- ignored event 可以返回 warning
- pen primary 等同 left mouse button
- touch primary MVP 可用于 pan 或按产品策略处理
- pinch / multi-touch zoom 后续再扩展
```

### 7.3 后续扩展

未来可以扩展：

```txt
- two-finger pan
- pinch zoom
- touch long press target picker
- stylus pressure
- stylus barrel button
```

## 8. Pointer Button 策略

鼠标左键、中键、右键、触控笔都需要明确规则。

### 8.1 推荐规则

```txt
left button
  select / drag / create / transform

middle button
  pan viewport

right button
  context menu，不默认开始 drag

pen primary
  等同 left button

touch primary
  MVP 可只用于 pan 或忽略复杂编辑
```

### 8.2 不要写死 button === 0

不推荐到处写：

```ts
if (event.button === 0) {
  // do everything
}
```

应该通过 policy 解析：

```ts
export type PointerButtonIntent =
  | 'primary-action'
  | 'pan'
  | 'context-menu'
  | 'ignored';
```

```ts
export interface PointerButtonPolicy {
  primaryButton: number;
  panButton: number;
  contextMenuButton: number;
}
```

## 9. Wheel / Trackpad 规范

浏览器中的 wheel 行为很复杂，特别是 macOS trackpad。

需要提前统一。

### 9.1 推荐行为

```txt
wheel without modifier
  pan viewport

Ctrl/Cmd + wheel
  zoom at pointer

Shift + wheel
  horizontal pan

trackpad pinch
  如果浏览器表现为 ctrlKey + wheel，则统一走 zoom-at
```

### 9.2 Viewport Intent

primitive 不应该直接修改 viewport/camera。

它只输出 viewport intent：

```ts
export type ViewportIntent =
  | { type: 'pan-by'; dx: number; dy: number }
  | { type: 'zoom-at'; scaleDelta: number; anchor: Point }
  | { type: 'none' };
```

app/vector adapter 负责真正执行：

```txt
ViewportIntent
  → app viewport store
  → engine.setViewport / render request
```

## 10. Interaction Mode 总状态机

除了 tool 和 operation，还需要一个最高层 interaction mode。

它用于避免状态冲突。

```ts
export type InteractionMode =
  | 'idle'
  | 'pointing'
  | 'dragging'
  | 'transforming'
  | 'marquee'
  | 'panning'
  | 'text-editing'
  | 'composing'
  | 'context-menu'
  | 'disabled';
```

### 10.1 规则

```txt
idle
  可以 hover、select、切 tool。

pointing
  pointer down 后，但还没进入 drag/transform/marquee。

dragging
  正在拖拽元素，不允许普通 tool switch。

transforming
  正在 resize / rotate，不允许普通 tool switch。

marquee
  正在框选。

panning
  正在移动 viewport。

text-editing
  正在编辑文本，不处理普通 editor shortcut。

composing
  IME 输入中，不处理普通 editor shortcut。

context-menu
  菜单打开时，不继续 hover / drag。

disabled
  所有 interaction result 都应该 noop。
```

### 10.2 mode 和 operation 的关系

```txt
mode 是高层状态。
operation 是具体操作实例。

例如：
  mode = transforming
  operation.kind = resize
```

## 11. Focus / Active Surface 管理

如果一个页面有多个 editor/canvas，需要知道哪个 surface 当前激活。

推荐状态：

```ts
export interface ActiveSurfaceState {
  activeSurfaceId: string | null;
  focusedSurfaceId: string | null;
  hoveredSurfaceId: string | null;
}
```

规则：

```txt
- 只有 active surface 处理 keyboard shortcut
- hovered surface 可以处理 cursor
- pointer down 可以激活 surface
- blur 后清理 temporary tool 和 active gesture
- 多 editor 实例不能共享 active operation
```

这个对 playground、多画布、多文档场景很重要。

## 12. Constraint Modifier 规则

编辑器里 Shift / Alt / Option / Space 的行为必须提前规定。

推荐状态：

```ts
export interface ConstraintState {
  keepAspectRatio: boolean;
  fromCenter: boolean;
  angleSnap: boolean;
  piercingSelect: boolean;
  temporaryPan: boolean;
}
```

### 12.1 推荐映射

```txt
Shift during resize
  keep aspect ratio

Alt / Option during resize
  resize from center

Shift during rotate
  angle snapping

Alt / Option + click
  piercing select next target

Space
  temporary pan
```

### 12.2 规则

```txt
- constraint modifier 应由 normalized event + policy 推导
- operation 消费 ConstraintState
- operation 不应该自己到处读 raw KeyboardEvent
```

## 13. Snap / Guide Intent 边界

吸附和参考线不应该混进 operation 里乱写。

primitive 可以定义 snap intent 协议，但不应该扫描全部元素。

```ts
export type SnapIntent =
  | { type: 'none' }
  | { type: 'snap-point'; from: Point; to: Point; reason: string }
  | { type: 'snap-line'; line: unknown; reason: string };
```

规则：

```txt
- primitive 可以定义 snap intent 协议
- 具体 snap 计算可以在 apps/vector 或独立 geometry/snap 包
- operation 只消费 snap result
- operation 不直接扫描全部 scene nodes
- guide rendering 由 app/overlay 负责
```

## 14. Transaction 边界

拖拽、resize、rotate 不能每一帧都生成一个 undo record。

必须定义 transaction 生命周期。

```ts
export interface InteractionTransaction {
  id: string;
  kind: string;
  status: 'open' | 'previewing' | 'committed' | 'cancelled';
}
```

推荐流程：

```txt
pointer down
  begin transaction

pointer move
  preview transaction

pointer up
  commit transaction as one undo step

cancel
  rollback transaction
```

规则：

```txt
- 一个 drag 操作最终只产生一个 undo step
- pointermove 只做 preview
- commit 后才能写入 history
- cancel 必须回滚 preview
```

## 15. Preview State 和 Committed State 分离

交互预览状态和正式文档状态必须分离。

### 15.1 推荐规则

```txt
preview 不等于 committed document。
preview 可以显示在 overlay 或 temporary transform layer。
commit 后才写入 document model。
cancel 必须完全回滚 preview。
```

### 15.2 不推荐

不推荐在 pointermove 中直接写 document model：

```txt
pointermove
  → update document
  → push history
```

这会导致：

```txt
- history 爆炸
- cancel 很难回滚
- drag 中状态污染
- React 高频更新
```

### 15.3 推荐

```txt
pointermove
  → preview patch

pointerup
  → commit patch

escape / cancel
  → discard preview patch
```

## 16. Idempotency / Re-entrant 安全

交互事件可能重复到达，cancel 也可能被调用多次。

必须保证关键操作幂等。

规则：

```txt
cancel operation 必须幂等。
commit operation 必须只能成功一次。
pointerup after cancel 应该 noop。
lostpointercapture after pointerup 应该 noop。
pointercancel after commit 应该 noop。
unknown pointerId 的 move/up 应该 noop 或 warning。
```

推荐状态判断：

```txt
idle + cancel
  noop

completed + commit
  noop / warning

cancelled + pointerup
  noop

active + cancel
  cancel once
```

## 17. Selection 与 Operation 关系

selection 和 operation 的关系必须明确。

否则 AI 很容易在 drag / marquee / resize 时乱改 selection。

### 17.1 推荐规则

```txt
click scene-node
  idle 状态下 replace selection

shift click scene-node
  toggle selection

Alt / Option click scene-node
  piercing select next target

drag selected node
  不立即改变 selection，进入 drag operation

drag unselected node
  先 replace selection，再进入 drag operation

marquee
  operation active 时 preview selection
  pointer up 时 commit selection

resize / rotate
  不改变 selection，只产生 transform patch

click empty
  clear selection，除非 policy 禁止

right click scene-node
  不一定改变 selection，可由 policy 决定
```

### 17.2 Selection Policy

```ts
export interface SelectionPolicy {
  clearOnEmptyClick: boolean;
  selectOnRightClick: boolean;
  additiveModifier: 'shift' | 'meta' | 'ctrl';
  piercingModifier: 'alt';
}
```

## 18. Overlay Target 所属权

overlay 可以由 app 渲染，但 overlay 的交互 schema 应该统一。

否则 overlay 交互会完全变成 app 私有逻辑，primitive 管不到。

推荐类型：

```ts
export type OverlayTarget =
  | { type: 'resize-handle'; selectionId: string; handle: ResizeHandle }
  | { type: 'rotate-handle'; selectionId: string }
  | { type: 'selection-bounds'; selectionId: string }
  | { type: 'marquee-border' };
```

规则：

```txt
- overlay 可以由 DOM/SVG/Canvas/WebGL 渲染
- overlay target schema 由 editor-primitive 定义
- overlay hit-test 可以由 app 或 engine 执行
- 最终必须转换成 InteractionTarget
- overlay handle priority 高于 scene-node
```

## 19. Tool Registry

`ToolHandler` 还需要配合 tool registry。

```ts
export interface ToolRegistry<TContext, TEvent, TResult> {
  get(toolId: ToolId): ToolHandler<TContext, TEvent, TResult> | null;
  has(toolId: ToolId): boolean;
}
```

规则：

```txt
- unknown tool 不应该导致 runtime 崩溃
- unknown tool fallback 到 select 或 noop
- registry 不应该依赖 React
- registry 可以由 app/vector 注入
- primitive 只定义协议和 resolver
```

推荐 fallback：

```ts
export type UnknownToolFallback = 'select' | 'noop' | 'throw-in-dev';
```

## 20. Clipboard Intent

复制、剪切、粘贴不应该由 primitive 直接读写系统 clipboard。

primitive 只产生 intent。

```ts
export type ClipboardIntent =
  | { type: 'copy-selection' }
  | { type: 'cut-selection' }
  | { type: 'paste-at'; world: Point | null };
```

规则：

```txt
- editor-primitive 不直接访问 navigator.clipboard
- app/vector 负责真实 clipboard IO
- primitive 可以根据 shortcut 产出 ClipboardIntent
- app 根据 intent 执行 copy/cut/paste
```

## 21. Drag-and-Drop / External Files

图片、SVG、JSON 拖入画布时，需要明确边界。

primitive 可以定义 drop intent，但不解析文件。

```ts
export type DropIntent =
  | { type: 'drop-files'; world: Point }
  | { type: 'drop-text'; world: Point }
  | { type: 'drop-nodes'; world: Point };
```

规则：

```txt
- primitive 可以定义 drop target / drop intent
- app 负责解析 File / DataTransfer
- app 负责创建 document element
- app 负责资源管理和上传
```

## 22. Serialization 不进入 primitive

明确禁止：

```txt
editor-primitive 不负责保存文件。
editor-primitive 不负责导入导出 SVG/PNG/JSON。
editor-primitive 不负责 document schema migration。
editor-primitive 不负责资源管理。
editor-primitive 不负责图片上传。
```

这些属于 app/vector、document-model、asset-manager 或 export/import 模块。

## 23. Accessibility / Keyboard-only 最低规则

即使不是第一阶段，也要保留 keyboard-only 和 accessibility 的边界。

推荐规则：

```txt
Tab / Shift + Tab
  不应该被编辑器随便吞掉，除非明确处于 canvas focus mode。

Arrow keys
  可用于 nudging selection。

Enter
  可进入 text editing 或 confirm 当前 operation。

Escape
  cancel active operation / exit text editing。

Delete / Backspace
  非 text editing 状态下可删除 selection。
  text editing / IME composing 状态下不删除元素。
```

不要让 primitive 默认 `preventDefault` 所有键盘事件。

## 24. Viewport 行为边界

viewport 很容易和 engine/app 混在一起。

必须明确：

```txt
editor-primitive 可以决定 viewport intent。
editor-primitive 不能直接修改 camera。
editor-primitive 不能直接调用 engine.setViewport。
editor-primitive 不能直接触发 render。
```

推荐：

```ts
export type ViewportIntent =
  | { type: 'pan-by'; dx: number; dy: number }
  | { type: 'zoom-at'; scaleDelta: number; anchor: Point }
  | { type: 'fit-selection' }
  | { type: 'fit-content' }
  | { type: 'none' };
```

执行流程：

```txt
wheel / pan gesture
  → ViewportIntent
  → apps/vector viewport adapter
  → viewport store update
  → engine render request
```

## 25. Cross-package Ownership 表

为了防止 AI 把逻辑放错包，需要明确职责归属。

```txt
能力 / 逻辑                         归属

低级 math / geometry                @venus/lib
通用事件类型                         @venus/lib 或 editor-primitive/input
DOM event normalization              apps/vector adapter
坐标转换 client → canvas/world       apps/vector adapter
scene hit-test                       engine
raw hit result                       engine
raw hit → InteractionTarget          apps/vector adapter
target priority                      @venus/editor-primitive
target stack                         @venus/editor-primitive
tool lifecycle                       @venus/editor-primitive
operation lifecycle                  @venus/editor-primitive
gesture 判断                         @venus/editor-primitive
shortcut matcher                     @venus/editor-primitive
IME guard                            @venus/editor-primitive
cursor intent                        @venus/editor-primitive
CSS cursor 应用                      apps/vector adapter
viewport intent                      @venus/editor-primitive
camera / viewport store 更新         apps/vector
document update                      apps/vector command
undo / redo stack                    apps/vector/history
transaction preview/commit/cancel    apps/vector command/history
scene render                         engine
overlay schema                       @venus/editor-primitive
overlay render                       apps/vector 或 engine overlay layer
clipboard intent                     @venus/editor-primitive
clipboard IO                         apps/vector
file import/export                   apps/vector 或 import/export package
asset/resource 管理                  apps/vector 或 asset package
React UI                             apps/vector
```

一句话：

```txt
editor-primitive 负责交互决策。
apps/vector 负责副作用执行。
engine 负责渲染和 hit-test。
@venus/lib 负责底层通用能力。
```

## 26. Milestone 验收标准

每个阶段必须有明确 done 标准。

否则 AI 很容易“看起来写完了”，但实际不可用。

### 26.1 M1 Done：Types Only

```txt
- 所有核心 type 已定义
- 所有核心 type 从 package root 正确导出
- 无 React import
- 无 DOM 访问
- 无 engine import
- 无 app document import
- pnpm typecheck 通过
```

核心类型：

```txt
InteractionRuntimeState
InteractionResult
NormalizedInteractionEvent
InteractionTarget
TargetStack
ToolState
OperationPhase
CursorIntent
ViewportIntent
InteractionPolicy
```

### 26.2 M2 Done：Pure Helpers

```txt
- 所有 helper 是纯函数
- 不 mutate 输入 state
- target priority resolver 有测试
- target stack 有测试
- shortcut IME guard 有测试
- drag threshold 有测试
- cursor rotation mapping 有测试
- pnpm test 通过
```

核心 helper：

```txt
resolveInteractionPolicy()
resolveTargetStack()
pickPrimaryTarget()
pickNextTarget()
shouldStartDrag()
resolveEffectiveTool()
resolveCursorIntent()
shouldHandleEditorShortcut()
transitionOperationPhase()
```

### 26.3 M3 Done：Pipeline Runner

```txt
- dispatchInteractionEvent() 可用
- pointer down / move / up 流程可模拟
- operation pending → active → commit 可模拟
- cancel / interrupt 流程可模拟
- pointer capture lost 流程可模拟
- result 中能输出 command / cursor / overlay / viewport intent
- 关键流程有单元测试
```

### 26.4 M4 Done：Vector Adapter

```txt
- apps/vector 提供 DOM event → normalized event adapter
- apps/vector 提供 engine hit → InteractionTarget adapter
- apps/vector 消费 InteractionResult.command
- apps/vector 消费 CursorIntent
- apps/vector 消费 OverlayIntent
- apps/vector 消费 ViewportIntent
- app 层不再散落重复 cursor/target/operation 判断
```

### 26.5 M5 Done：Integration Tests / Debug Trace

```txt
- select 流程可测
- marquee 流程可测
- drag 流程可测
- resize 流程可测
- rotate 流程可测
- temporary pan 流程可测
- multi-hit picking 流程可测
- text editing IME guard 可测
- debug trace 能显示事件流
```

## 27. AI 实施 Prompt 模板

后续让 AI 实施时，不要一次性让它“完成全部”。

按里程碑给强约束 prompt。

### 27.1 M1 Prompt

```txt
Implement only M1 for @venus/editor-primitive.

Scope:
- Add core public types only.
- Add exports from package root.
- Do not implement runtime behavior yet.
- Do not modify apps/vector.
- Do not modify engine.
- Do not introduce React imports.
- Do not access DOM.
- Do not import app document model.
- Do not call engine APIs.

Required types:
- InteractionRuntimeState
- InteractionResult
- NormalizedInteractionEvent
- NormalizedPointerEvent
- NormalizedKeyboardEvent
- NormalizedWheelEvent
- InteractionTarget
- TargetStack
- ToolState
- OperationPhase
- CursorIntent
- ViewportIntent
- InteractionPolicy

Acceptance:
- pnpm typecheck passes.
- package root exports the public types.
```

### 27.2 M2 Prompt

```txt
Implement only M2 pure helpers for @venus/editor-primitive.

Scope:
- Add pure helper functions.
- Add unit tests for every exported helper.
- Do not modify apps/vector.
- Do not access DOM.
- Do not import React.
- Do not import engine.
- Do not mutate input state.

Required helpers:
- resolveInteractionPolicy()
- resolveTargetStack()
- pickPrimaryTarget()
- pickNextTarget()
- shouldStartDrag()
- resolveEffectiveTool()
- resolveCursorIntent()
- shouldHandleEditorShortcut()
- transitionOperationPhase()

Acceptance:
- pnpm typecheck passes.
- pnpm test passes.
- All helpers are pure functions.
```

### 27.3 M3 Prompt

```txt
Implement only M3 pipeline runner for @venus/editor-primitive.

Scope:
- Add dispatchInteractionEvent().
- Connect normalized event, gesture, target, tool, operation, and result.
- Do not modify apps/vector.
- Do not access DOM.
- Do not import React.
- Do not import engine.
- Runtime should return InteractionResult only.
- Runtime must not execute app side effects.

Acceptance:
- pointer down / move / up flow has tests.
- pending → active → commit flow has tests.
- cancel / pointercancel / lostpointercapture flow has tests.
- IME composing guard has tests.
- pnpm typecheck passes.
- pnpm test passes.
```

### 27.4 M4 Prompt

```txt
Implement only M4 vector adapter integration.

Scope:
- Modify apps/vector only where adapter integration is needed.
- Convert DOM events to NormalizedInteractionEvent.
- Convert engine hit-test results to InteractionTarget[].
- Consume InteractionResult.command through vector command system.
- Consume CursorIntent through cursor adapter.
- Consume OverlayIntent through overlay renderer.
- Consume ViewportIntent through viewport adapter.
- Do not move app document model into editor-primitive.
- Do not make editor-primitive import app or engine internals.

Acceptance:
- Existing editor behavior still works.
- Cursor behavior still works.
- Selection / drag basic flow works.
- pnpm typecheck passes.
- pnpm test passes.
```

## 28. 最终硬原则

这部分是给 AI 和人共同看的。

```txt
@venus/editor-primitive 不是 app。
@venus/editor-primitive 不是 engine。
@venus/editor-primitive 不是 document model。
@venus/editor-primitive 不是 React UI layer。
@venus/editor-primitive 不是 undo/redo history。
@venus/editor-primitive 不是 import/export 系统。
```

它只做一件事：

```txt
把 normalized input + runtime state + policy
转换成 interaction decision。
```

也就是：

```txt
Input
  NormalizedInteractionEvent
  InteractionRuntimeState
  InteractionPolicy
  InteractionTarget[]

Output
  InteractionResult
  CursorIntent
  OverlayIntent
  ViewportIntent
  CommandIntent
  Trace
```

最终原则：

```txt
editor-primitive 负责交互决策。
apps/vector 负责副作用执行。
engine 负责渲染和 hit-test。
@venus/lib 负责底层通用能力。
```