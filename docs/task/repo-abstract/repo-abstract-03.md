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

### 10.2 Interaction Result

推荐定义统一返回值：

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

  preventDefault?: boolean;
  stopPropagation?: boolean;

  trace?: InteractionTrace;
}
```

设计原则：

```txt
editor-primitive 只产生 intent / patch / decision，
不直接产生 app 副作用。
```

也就是说：

```txt
不直接修改 DOM
不直接修改 document model
不直接调用 engine instance
不直接执行 undo/redo
不直接渲染 overlay
```

primitive 层只告诉 app：

```txt
下一步状态是什么
是否要 preview/commit/cancel command
cursor 应该变成什么
是否要更新 overlay
是否要 capture pointer
是否要 preventDefault / stopPropagation
```

真正的副作用由 `apps/vector` adapter 执行。

## 11. Adapter 边界协议

`@venus/editor-primitive` 不应该 import engine 类型，也不应该 import app document 类型。

因此需要明确 adapter 边界。

### 11.1 EngineHitAdapter

engine 可以产出自己的 hit-test result。

adapter 负责把它转换成 primitive 层能理解的 target。

```ts
export interface EngineHitAdapter<TRawHit> {
  toInteractionTargets(rawHits: TRawHit[]): InteractionTarget[];
}
```

流程：

```txt
engine.hitTest(...)
  → RawEngineHit[]
  → EngineHitAdapter
  → InteractionTarget[]
  → TargetResolver
  → TargetStack
```

规则：

```txt
- engine 可以有自己的内部 hit result 类型
- editor-primitive 不关心 engine 内部类型
- apps/vector adapter 负责转换
- 转换后只暴露 InteractionTarget
```

### 11.2 CommandAdapter

operation 只产出 patch，不直接改文档。

应用层负责把 patch 转成真实 command。

```ts
export interface CommandAdapter<TPatch, TCommand> {
  toCommand(patch: TPatch): TCommand;
  preview(command: TCommand): void;
  commit(command: TCommand): void;
  cancel(command: TCommand): void;
}
```

推荐流程：

```txt
OperationResult.patch
  → CommandAdapter.toCommand()
  → app command system
  → document model update
  → history / undo-redo
```

### 11.3 CursorAdapter

primitive 层只输出 `CursorIntent`。

DOM 或 app 层负责转换成具体 cursor。

```ts
export interface CursorAdapter {
  toCssCursor(intent: CursorIntent): string;
}
```

例如：

```txt
CursorIntent resize + rotation
  → nwse-resize / nesw-resize / custom cursor
```

### 11.4 OverlayAdapter

primitive 层只输出 overlay intent 或 overlay state。

应用层负责决定用 Canvas、SVG、DOM 还是 WebGL 渲染 overlay。

```ts
export interface OverlayAdapter<TOverlayRenderInput> {
  toRenderInput(intent: OverlayIntent): TOverlayRenderInput;
}
```

规则：

```txt
- editor-primitive 不直接渲染 overlay
- overlay 可以由 app/vector 使用 DOM/SVG/Canvas/WebGL 实现
- primitive 只负责 overlay 的交互语义和状态
```

## 12. Multi-hit Target Stack

编辑器必须支持重叠元素下的 multi-hit / piercing hit-test。

单个 hit target 不够。

推荐定义 target stack：

```ts
export interface TargetStack {
  pointer: Point;
  targets: InteractionTarget[];
  primary: InteractionTarget;
}
```

### 12.1 基本规则

```txt
- engine 可以返回多个 raw hits
- adapter 把 raw hits 转成 InteractionTarget[]
- target resolver 根据 priority 选出 primary
- targets 保留完整命中栈
- app 可以根据 targets 实现穿透选择或 target picker
```

### 12.2 推荐优先级

```txt
active capture
> active operation
> overlay handles
> overlay bounds / marquee
> scene node
> viewport background
> empty
```

### 12.3 穿透选择策略

推荐支持这些策略：

```txt
normal click
  使用 primary target

Alt / Option + click
  在 targets 中切换下一个 scene-node

right click
  使用 target stack 打开 context menu

long press
  可以展示 target picker
```

primitive 层不需要实现 UI picker。

它只需要保留 target stack，并提供选择下一个 target 的纯函数。

```ts
export function pickNextTarget(
  stack: TargetStack,
  current: InteractionTarget | null,
): InteractionTarget;
```

## 13. Tool 切换和 Temporary Tool 规则

编辑器工具系统必须区分 current tool、temporary tool、locked tool 和 active operation。

推荐状态：

```ts
export interface ToolState {
  currentTool: ToolId;
  temporaryTool: ToolId | null;
  lockedTool: ToolId | null;
  previousTool: ToolId | null;
}
```

### 13.1 current tool

`currentTool` 是用户当前选择的主工具。

例如：

```txt
select
rect
text
path
```

### 13.2 temporary tool

`temporaryTool` 是临时工具。

典型例子：

```txt
当前是 select
按住 Space
临时进入 pan
松开 Space
回到 select
```

### 13.3 locked tool

`lockedTool` 用于连续创建模式。

例如：

```txt
锁定 rect tool
每次拖拽都创建一个 rectangle
创建后不自动回到 select
```

### 13.4 工具切换规则

推荐规则：

```txt
- active operation 期间不允许普通 tool 切换
- 除非当前 operation 明确支持 interrupt
- temporary tool 只在 idle 状态下生效
- text editing 状态下 Space 不应该触发 temporary pan
- IME composing 状态下不触发普通 shortcut
- tool changed 时，如果存在 active operation，应按 policy cancel 或 commit
```

推荐 policy：

```ts
export interface ToolSwitchPolicy {
  allowSwitchDuringOperation: boolean;
  cancelOperationOnToolChange: boolean;
  allowTemporaryToolDuringTextEditing: boolean;
}
```

## 14. IME / Text Editing 保护

以后只要支持 text，就必须处理 IME。

中文、日文、韩文输入法下，很多 keydown 不能当快捷键处理。

### 14.1 规则

当输入事件满足下面条件时：

```ts
event.isComposing === true
```

或者当前 interaction mode 是 text editing / composing：

```txt
- 不触发普通 shortcut
- 不把 Space 识别为 temporary pan
- 不把 Backspace/Delete 识别为删除元素
- 不把 Esc 随便识别为 cancel editor operation
- 不应该中断 text operation
```

### 14.2 推荐状态

```ts
export interface TextEditingState {
  isEditingText: boolean;
  isComposing: boolean;
  editingTargetId: string | null;
}
```

### 14.3 Shortcut Guard

推荐所有 shortcut matcher 都先经过 guard：

```ts
export interface ShortcutGuardContext {
  isTextEditing: boolean;
  isComposing: boolean;
  targetTagName?: string;
}

export function shouldHandleEditorShortcut(ctx: ShortcutGuardContext): boolean;
```

规则：

```txt
input / textarea / contenteditable 中默认不处理 editor shortcut
IME composing 中默认不处理 editor shortcut
text editing operation 中只允许 text tool 自己处理快捷键
```

这个保护非常重要。

否则中文、日文输入时，编辑器会误删元素、误 pan、误 cancel。

## 15. Coordinate Spaces 坐标约定

编辑器交互必须明确坐标空间。

否则 resize、rotate、zoom、pan、hit-test 都会乱。

### 15.1 坐标类型

至少定义四类坐标：

```txt
client point
  浏览器 viewport 坐标，来自 PointerEvent.clientX/clientY。

canvas point
  canvas DOM 局部坐标，已经减去 canvas DOMRect offset。

screen point
  渲染屏幕坐标，通常接近 canvas pixel 坐标，可能考虑 devicePixelRatio。

world point
  编辑器世界坐标，经过 viewport/camera 逆变换得到。
```

### 15.2 Normalized Pointer Event

primitive 层不应该直接读 DOMRect。

app adapter 负责把 DOM event 转成 normalized input event。

推荐类型：

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
}
```

### 15.3 坐标规则

```txt
- DOM adapter 负责 client → canvas
- viewport adapter 负责 canvas/screen → world
- engine 使用 world 或 screen，由 engine 自己决定
- editor-primitive 消费 normalized event，不直接访问 DOM
- operation patch 中应该明确使用 world 坐标还是 local 坐标
```

### 15.4 Transform 操作建议

对于 resize / rotate / drag：

```txt
pointer event 使用 world point
handle hit-test 可以使用 screen/canvas point
最终 patch 应该使用 document model 需要的坐标空间
```

不要在 operation 内部混用 client/canvas/world。

## 16. Interrupt / Cancel 规则

复杂编辑器必须有统一的中断规则。

否则 pointercancel、lostpointercapture、window blur 等事件会让状态卡死。

### 16.1 需要处理的事件

```txt
pointercancel
lostpointercapture
window blur
visibilitychange hidden
contextmenu
wheel during drag
Escape
right button down during operation
tool changed during operation
```

### 16.2 推荐规则

```txt
pointercancel
  cancel active operation

lostpointercapture
  根据 policy cancel 或 commit，默认 cancel

window blur
  cancel temporary tool、active gesture 和 active operation

visibilitychange hidden
  cancel active operation

contextmenu
  如果没有 active operation，可以打开 context target
  如果有 active operation，默认 prevent 并 cancel 或 ignore

wheel during drag
  默认 ignore 或 prevent，避免 viewport 和 drag 状态冲突

Escape
  cancel active operation
  如果没有 active operation，则 clear temporary tool 或 clear selection

tool changed during operation
  根据 policy cancel 或禁止切换
```

### 16.3 Cancel Result

推荐 cancel 也走统一 result：

```ts
export interface CancelInteractionResult {
  command?: {
    type: 'cancel';
  };
  nextState: Partial<InteractionRuntimeState>;
  cursor?: CursorIntent;
  overlay?: OverlayIntent;
}
```

## 17. Testing Strategy

这个包必须强制单元测试。

原因很简单：

```txt
AI 生成的交互代码看起来可能正确，
但如果没有测试，很容易在真实编辑器里出现隐蔽 bug。
```

### 17.1 测试范围

必须覆盖：

```txt
- target priority resolver
- multi-hit target stack
- drag threshold
- click tolerance
- double click interval
- temporary tool
- locked tool
- operation pending → active → commit
- operation cancel
- pointer capture lost
- cursor rotation mapping
- shortcut matcher
- IME composing skip
- command preview / commit / cancel
- coordinate conversion input contract
```

### 17.2 推荐测试风格

primitive 层尽量使用纯函数测试。

推荐：

```txt
输入 state + event + policy
输出 nextState + InteractionResult
```

示例：

```ts
const result = dispatchInteractionEvent(state, event, policy);

expect(result.nextState.operation.phase).toBe('active');
expect(result.command?.type).toBe('preview');
expect(result.cursor?.type).toBe('move');
```

### 17.3 不推荐的测试方式

primitive 层测试不应该依赖：

```txt
- React Testing Library
- DOM canvas
- real engine instance
- real document store
- real browser layout
```

这些应该放到 `apps/vector` 的 integration test 里。

## 18. Debug Trace

复杂编辑器一定需要交互 trace。

否则排查问题时很难知道：

```txt
事件被谁处理了
命中了哪个 target
为什么 cursor 变了
为什么 operation 没有 commit
为什么 command 没有发出去
```

### 18.1 推荐 Trace 类型

```ts
export interface InteractionTrace {
  eventId: string;
  inputType: string;

  targetStack: InteractionTarget[];
  selectedTarget: InteractionTarget;

  tool: ToolId;
  operationPhase: OperationPhase;

  result: InteractionResult;
  timestamp: number;
}
```

### 18.2 Trace 内容

debug 面板可以展示：

```txt
当前事件
→ normalized pointer event
→ target stack
→ selected primary target
→ effective tool
→ operation phase before / after
→ command result
→ cursor intent
→ overlay intent
```

### 18.3 规则

```txt
- trace 默认开发环境开启
- 生产环境可关闭
- trace 不应该影响 runtime 行为
- trace 不应该依赖 React
- trace 可以被 apps/vector debug panel 消费
```

## 19. 最小落地里程碑

为了避免 AI 一次性乱写，建议按里程碑推进。

### M1：Types Only

先只补核心类型，不实现复杂逻辑。

范围：

```txt
InteractionRuntimeState
InteractionResult
InteractionTarget
TargetStack
ToolState
OperationPhase
CursorIntent
InteractionPolicy
NormalizedPointerEvent
```

目标：

```txt
先把边界和数据结构钉死。
```

### M2：Pure Reducers / Helpers

实现纯函数，不接 React，不接 DOM，不接 engine。

范围：

```txt
resolveInteractionPolicy()
resolveTargetStack()
pickPrimaryTarget()
shouldStartDrag()
resolveEffectiveTool()
resolveCursorIntent()
shouldHandleEditorShortcut()
transitionOperationPhase()
```

目标：

```txt
所有核心行为先通过纯函数测试。
```

### M3：Pipeline Runner

实现统一事件派发函数：

```ts
export function dispatchInteractionEvent(
  state: InteractionRuntimeState,
  event: NormalizedInteractionEvent,
  policy: InteractionPolicy,
): InteractionResult;
```

目标：

```txt
把 pointer / gesture / target / tool / operation 串起来。
```

### M4：Vector Adapter

在 `apps/vector` 接入 adapter。

范围：

```txt
DOM event → NormalizedPointerEvent
engine hit-test → InteractionTarget[]
InteractionResult.command → vector command
CursorIntent → CSS cursor
OverlayIntent → overlay renderer input
```

目标：

```txt
让 app 只负责 adapter 和副作用执行，不再散落交互判断。
```

### M5：Integration Tests / Debug Trace

最后补集成测试和 trace 面板。

范围：

```txt
select
marquee
drag
resize
rotate
temporary pan
multi-hit picking
text editing IME guard
```

目标：

```txt
保证真实编辑器场景稳定。
```

## 20. 更硬的禁止事项

为了防止 AI 实现跑偏，明确禁止：

```txt
- 不在 editor-primitive 中写 React hooks
- 不在 editor-primitive 中访问 DOM
- 不在 editor-primitive 中调用 canvas context
- 不在 editor-primitive 中调用 engine instance
- 不在 editor-primitive 中 import app document store
- 不在 editor-primitive 中实现 undo/redo stack
- 不在 editor-primitive 中渲染 selection box
- 不在 editor-primitive 中渲染 resize handles
- 不在 editor-primitive 中定义 vector 专用 shape 类型
- 不在 editor-primitive 中写业务命令，例如 moveElement / resizeElement
```

一句话原则：

```txt
editor-primitive 只负责交互决策，
apps/vector 负责副作用执行。
```
