

# Vector Cursor System Design

## 1. 核心结论

Cursor 不属于 document model。

Cursor 也不应该完全交给 engine 决定。

Cursor 本质上属于：

```txt
Application Interaction Runtime
```

它是应用层根据当前交互上下文即时解析出来的反馈结果。

核心关系：

```txt
Engine:
  负责 hit test
  负责告诉应用层“命中了什么”

Dynamic Overlay:
  提供 overlay hit target
  可以提供 cursor hint

Application Runtime:
  负责 current tool / modifier keys / active operation / editing mode

CursorManager:
  综合全部上下文，解析最终 CursorIntent

CursorApplier:
  把 CursorIntent 转成 CSS cursor，并应用到 canvas 或 document.body
```

一句话：

```txt
engine 负责“命中了什么”，overlay 提供“建议 cursor”，application runtime 决定“最终 cursor”。
```

---

## 2. Cursor 不应该进入哪里

Cursor 不是文档数据，也不是静态渲染数据。

明确禁止：

```txt
不要进入 document model
不要进入 history
不要进入 collaboration
不要进入 tile cache
不要进入 snapshot
不要进入 EngineRenderNode
不要由 engine 直接修改 canvas.style.cursor
```

原因：

```txt
1. cursor 是即时交互反馈。
2. cursor 依赖当前按键、工具、hover、active operation。
3. cursor 不属于用户文档内容。
4. cursor 不应该被 undo / redo。
5. cursor 不应该被协作同步。
6. cursor 不应该进入任何静态缓存。
```

---

## 3. Cursor 系统推荐分层

```txt
KeyboardRuntime
  记录 space / alt / shift / ctrl / meta

PointerRuntime
  记录 pointer position / pressed buttons / pointer capture

ToolRuntime
  记录 currentTool / previousTool / temporaryTool

InteractionRuntime
  记录 activeOperation / editingMode / appMode

DynamicOverlayRuntime
  记录 overlay models / overlayHit

Engine
  提供 overlay hitTest / scene hitTest

CursorManager
  统一解析 CursorIntent

CursorApplier
  转换 CSS cursor 并应用
```

数据流：

```txt
pointermove / keydown / keyup
  -> update runtime
  -> engine.hitTestOverlay / engine.hitTestScene
  -> cursorManager.resolve()
  -> cursorApplier.apply()
  -> engine.setDynamicLayer()
  -> engine.renderFrame()
```

---

## 4. Cursor 输入来源

最终 cursor 由以下信息共同决定：

```txt
1. appMode
   normal / readonly / disabled / loading / modal

2. activeOperation
   pan / move-selection / resize / rotate / marquee / draw / edit-text / edit-path

3. currentTool
   select / hand / zoom / text / pen / path-edit / rect / ellipse / line

4. modifierKeys
   space / alt / shift / ctrl / meta

5. overlayHit
   resize handle / rotate handle / path point / path segment / selection bounds / guide

6. sceneHit
   命中文档元素、locked、editable、hit type

7. editingMode
   none / text / path / group / component
```

类型建议：

```ts
export interface CursorResolveInput {
  pointer: Point;

  appMode: AppMode;
  currentTool: ToolType;
  modifierKeys: ModifierKeys;

  activeOperation?: ActiveOperation;
  editingMode?: EditingMode;

  overlayHit?: OverlayHitResult | null;
  sceneHit?: EngineHitResult | null;

  zoomTool?: ZoomToolRuntime;
}

export interface ModifierKeys {
  space?: boolean;
  alt?: boolean;
  shift?: boolean;
  ctrl?: boolean;
  meta?: boolean; // cmd on macOS
}

export type AppMode =
  | 'normal'
  | 'readonly'
  | 'disabled'
  | 'loading'
  | 'modal';

export type EditingMode =
  | 'none'
  | 'text'
  | 'path'
  | 'group'
  | 'component';
```

---

## 5. Tool Runtime

不要只看 currentTool。

应用层应该计算 effective tool。

例如：

```txt
currentTool = select
space pressed
=> effectiveTool = hand
```

类型：

```ts
export type ToolType =
  | 'select'
  | 'hand'
  | 'zoom'
  | 'text'
  | 'pen'
  | 'path-edit'
  | 'rect'
  | 'ellipse'
  | 'line';

export interface ToolRuntime {
  currentTool: ToolType;
  previousTool?: ToolType;
  temporaryTool?: ToolType;
}
```

Effective tool resolver：

```ts
export function resolveEffectiveTool(input: {
  currentTool: ToolType;
  modifierKeys: ModifierKeys;
  activeOperation?: ActiveOperation;
}): ToolType {
  const { currentTool, modifierKeys, activeOperation } = input;

  // Active operation 期间不要乱切 tool。
  if (activeOperation) {
    return currentTool;
  }

  // Space 临时 hand tool。
  if (modifierKeys.space) {
    return 'hand';
  }

  return currentTool;
}
```

规则：

```txt
1. currentTool 是用户选择的工具。
2. effectiveTool 是考虑临时按键后的真实工具。
3. activeOperation 期间不要切换 effectiveTool。
4. Space 临时 pan 应高于普通 hover。
```

---

## 6. CursorIntent

不要直接把 cursor 设计成 CSS 字符串。

推荐先产出语义化 CursorIntent。

```ts
export type CursorIntent =
  | { type: 'default' }
  | { type: 'pointer' }
  | { type: 'move' }
  | { type: 'grab' }
  | { type: 'grabbing' }
  | { type: 'text' }
  | { type: 'crosshair' }
  | { type: 'not-allowed' }
  | { type: 'wait' }
  | { type: 'progress' }
  | { type: 'zoom-in' }
  | { type: 'zoom-out' }
  | { type: 'pen' }
  | { type: 'add-point' }
  | { type: 'remove-point' }
  | { type: 'convert-point' }
  | { type: 'close-path' }
  | { type: 'resize'; direction: ResizeDirection; rotation?: number }
  | { type: 'rotate'; angle?: number }
  | { type: 'custom'; css: string };

export type ResizeDirection =
  | 'n'
  | 'ne'
  | 'e'
  | 'se'
  | 's'
  | 'sw'
  | 'w'
  | 'nw';
```

好处：

```txt
1. cursor 语义和 CSS 表现解耦。
2. 以后可以替换成自定义 cursor 图片。
3. Resize cursor 可以根据 rotation 动态映射。
4. Debug 时能知道 cursor 来源和原因。
```

---

## 7. CursorIntent 到 CSS Cursor

应用层负责把 CursorIntent 转成 CSS cursor。

```ts
export function cursorIntentToCss(intent: CursorIntent): string {
  switch (intent.type) {
    case 'default':
      return 'default';

    case 'pointer':
      return 'pointer';

    case 'move':
      return 'move';

    case 'grab':
      return 'grab';

    case 'grabbing':
      return 'grabbing';

    case 'text':
      return 'text';

    case 'crosshair':
      return 'crosshair';

    case 'not-allowed':
      return 'not-allowed';

    case 'wait':
      return 'wait';

    case 'progress':
      return 'progress';

    case 'zoom-in':
      return 'zoom-in';

    case 'zoom-out':
      return 'zoom-out';

    case 'pen':
      return 'crosshair';

    case 'add-point':
      return 'copy';

    case 'remove-point':
      return 'not-allowed';

    case 'convert-point':
      return 'alias';

    case 'close-path':
      return 'cell';

    case 'resize':
      return resizeDirectionToCssCursor(intent.direction, intent.rotation);

    case 'rotate':
      return 'grab';

    case 'custom':
      return intent.css;
  }
}
```

---

## 8. Cursor 优先级

Cursor 必须有统一优先级。

不要谁最后写谁赢。

推荐优先级：

```txt
1. appMode cursor
2. activeOperation cursor
3. temporary tool override cursor
4. overlayHit cursor
5. editingMode cursor
6. currentTool / effectiveTool cursor
7. sceneHit cursor
8. default cursor
```

解释：

```txt
appMode:
  readonly / disabled / loading / modal 优先级最高

activeOperation:
  正在 resize / rotate / pan / drag 时 cursor 必须锁定

temporary tool:
  Space 临时 pan，Alt/Cmd 改变 zoom mode 等

overlayHit:
  resize handle / rotate handle / path point 高于普通元素命中

editingMode:
  text / path / group editing 的专用 cursor

tool:
  当前工具默认 cursor

sceneHit:
  普通元素 hover cursor
```

---

## 9. CursorManager

CursorManager 是唯一解析最终 cursor 的地方。

```ts
export interface CursorResolveResult {
  intent: CursorIntent;
  css: string;
  source:
    | 'app-mode'
    | 'active-operation'
    | 'temporary-tool'
    | 'overlay'
    | 'editing-mode'
    | 'tool'
    | 'scene'
    | 'default';

  reason?: string;
}
```

核心 resolver：

```ts
export function resolveCursor(input: CursorResolveInput): CursorResolveResult {
  const appModeCursor = resolveAppModeCursor(input);
  if (appModeCursor) return appModeCursor;

  const activeCursor = resolveActiveOperationCursor(input);
  if (activeCursor) return activeCursor;

  const temporaryCursor = resolveTemporaryToolCursor(input);
  if (temporaryCursor) return temporaryCursor;

  const overlayCursor = resolveOverlayCursor(input);
  if (overlayCursor) return overlayCursor;

  const editingCursor = resolveEditingModeCursor(input);
  if (editingCursor) return editingCursor;

  const toolCursor = resolveToolCursor(input);
  if (toolCursor) return toolCursor;

  const sceneCursor = resolveSceneCursor(input);
  if (sceneCursor) return sceneCursor;

  return finalizeCursor({ type: 'default' }, 'default');
}
```

Finalize：

```ts
export function finalizeCursor(
  intent: CursorIntent,
  source: CursorResolveResult['source'],
  reason?: string,
): CursorResolveResult {
  return {
    intent,
    css: cursorIntentToCss(intent),
    source,
    reason,
  };
}
```

---

## 10. AppMode Cursor

```ts
export function resolveAppModeCursor(
  input: CursorResolveInput,
): CursorResolveResult | null {
  switch (input.appMode) {
    case 'disabled':
      return finalizeCursor({ type: 'not-allowed' }, 'app-mode', 'disabled');

    case 'loading':
      return finalizeCursor({ type: 'progress' }, 'app-mode', 'loading');

    case 'readonly':
      // 只读模式下仍可允许 hover pointer，这里按产品策略决定。
      return null;

    case 'modal':
      return finalizeCursor({ type: 'default' }, 'app-mode', 'modal');

    case 'normal':
    default:
      return null;
  }
}
```

规则：

```txt
1. disabled / loading / modal 优先级最高。
2. readonly 可以选择 default / not-allowed / pointer，取决于是否允许选择。
3. appMode 不应该由 engine 决定。
```

---

## 11. Active Operation Cursor

Active operation 期间 cursor 必须锁定。

例如：

```txt
mousedown on east resize handle
  -> activeOperation = resize(e)
  -> cursor locked to resize(e)

mousemove:
  -> 不再根据 hover 改 cursor

mouseup:
  -> activeOperation cleared
  -> 重新 resolve hover cursor
```

类型：

```ts
export type ActiveOperation =
  | { type: 'pan' }
  | { type: 'move-selection' }
  | { type: 'resize'; direction: ResizeDirection; rotation?: number }
  | { type: 'rotate'; angle?: number }
  | { type: 'marquee' }
  | { type: 'draw-shape' }
  | { type: 'edit-text' }
  | { type: 'edit-path' };
```

Resolver：

```ts
export function resolveActiveOperationCursor(
  input: CursorResolveInput,
): CursorResolveResult | null {
  const op = input.activeOperation;
  if (!op) return null;

  switch (op.type) {
    case 'pan':
      return finalizeCursor({ type: 'grabbing' }, 'active-operation', 'pan');

    case 'move-selection':
      return finalizeCursor({ type: 'move' }, 'active-operation', 'move-selection');

    case 'resize':
      return finalizeCursor(
        {
          type: 'resize',
          direction: op.direction,
          rotation: op.rotation,
        },
        'active-operation',
        'resize',
      );

    case 'rotate':
      return finalizeCursor({ type: 'rotate', angle: op.angle }, 'active-operation', 'rotate');

    case 'marquee':
    case 'draw-shape':
      return finalizeCursor({ type: 'crosshair' }, 'active-operation', op.type);

    case 'edit-text':
      return finalizeCursor({ type: 'text' }, 'active-operation', 'edit-text');

    case 'edit-path':
      return finalizeCursor({ type: 'pen' }, 'active-operation', 'edit-path');
  }
}
```

---

## 12. Space 临时 Pan Cursor

Space 临时切换 hand / pan 是应用层 runtime 行为。

规则：

```txt
Space down:
  effectiveTool = hand
  cursor = grab

Space + mouse down:
  activeOperation = pan
  cursor = grabbing

mouse up:
  activeOperation cleared
  cursor = grab if Space still down

Space up:
  effectiveTool back to previous tool
  cursor resolved by current tool / hover
```

Resolver：

```ts
export function resolveSpacePanCursor(
  input: CursorResolveInput,
): CursorResolveResult | null {
  if (input.activeOperation?.type === 'pan') {
    return finalizeCursor({ type: 'grabbing' }, 'active-operation', 'space-pan-active');
  }

  if (input.modifierKeys.space) {
    return finalizeCursor({ type: 'grab' }, 'temporary-tool', 'space-pan');
  }

  return null;
}
```

注意：

```txt
Space 临时 pan 应高于 overlay hover。
否则按住 Space 想拖动画布时，鼠标在 handle 上却显示 resize，会很烦。
```

---

## 13. Zoom Tool Cursor

Zoom 工具的 cursor 由 tool config 和 modifier keys 决定。

例如：

```txt
zoom 工具默认 zoom-out
按住 Alt / Cmd 临时 zoom-in
```

类型：

```ts
export interface ZoomToolRuntime {
  defaultMode: 'zoom-in' | 'zoom-out';
  invertWithAlt?: boolean;
  invertWithMeta?: boolean;
  invertWithCtrl?: boolean;
}
```

Resolver：

```ts
export function resolveZoomCursor(input: {
  zoomTool: ZoomToolRuntime;
  modifierKeys: ModifierKeys;
}): CursorIntent {
  const { zoomTool, modifierKeys } = input;

  const invert =
    (zoomTool.invertWithAlt !== false && modifierKeys.alt) ||
    (zoomTool.invertWithMeta !== false && modifierKeys.meta) ||
    (zoomTool.invertWithCtrl === true && modifierKeys.ctrl);

  if (!invert) {
    return { type: zoomTool.defaultMode };
  }

  return {
    type: zoomTool.defaultMode === 'zoom-in' ? 'zoom-out' : 'zoom-in',
  };
}
```

Tool cursor：

```ts
export function resolveToolCursor(
  input: CursorResolveInput,
): CursorResolveResult | null {
  const effectiveTool = resolveEffectiveTool({
    currentTool: input.currentTool,
    modifierKeys: input.modifierKeys,
    activeOperation: input.activeOperation,
  });

  switch (effectiveTool) {
    case 'hand':
      return finalizeCursor({ type: 'grab' }, 'tool', 'hand');

    case 'zoom':
      return finalizeCursor(
        resolveZoomCursor({
          zoomTool: input.zoomTool ?? {
            defaultMode: 'zoom-in',
            invertWithAlt: true,
            invertWithMeta: true,
          },
          modifierKeys: input.modifierKeys,
        }),
        'tool',
        'zoom',
      );

    case 'text':
      return finalizeCursor({ type: 'text' }, 'tool', 'text');

    case 'pen':
      return finalizeCursor({ type: 'pen' }, 'tool', 'pen');

    case 'rect':
    case 'ellipse':
    case 'line':
      return finalizeCursor({ type: 'crosshair' }, 'tool', effectiveTool);

    default:
      return null;
  }
}
```

---

## 14. Overlay Cursor Hint

Dynamic Overlay item 可以提供 cursor hint。

但它只是候选，不是最终结果。

```ts
export interface EngineOverlayNode {
  id: string;
  type: string;
  hittable?: boolean;
  cursor?: CursorIntent;
}
```

Resize handle：

```ts
export interface ResizeHandleOverlay extends EngineOverlayNode {
  type: 'resize-handle';
  targetId: NodeId;
  worldPosition: Point;
  direction: ResizeDirection;
  rotation?: number;
  sizePx: number;
}
```

示例：

```ts
const resizeHandle: ResizeHandleOverlay = {
  id: 'resize-e',
  type: 'resize-handle',
  targetId: 'rect-1',
  worldPosition,
  direction: 'e',
  rotation: elementRotation,
  sizePx: 8,
  hittable: true,
  cursor: {
    type: 'resize',
    direction: 'e',
    rotation: elementRotation,
  },
};
```

Overlay hit result：

```ts
export interface OverlayHitResult {
  overlayId: string;
  overlayType: string;
  targetId?: string;
  cursor?: CursorIntent;
  action?: OverlayAction;
}

export type OverlayAction =
  | 'resize'
  | 'rotate'
  | 'move'
  | 'marquee'
  | 'edit-text'
  | 'path-control'
  | 'none';
```

Overlay cursor resolver：

```ts
export function resolveOverlayCursor(
  input: CursorResolveInput,
): CursorResolveResult | null {
  const hit = input.overlayHit;
  if (!hit) return null;

  if (hit.cursor) {
    return finalizeCursor(hit.cursor, 'overlay', hit.overlayType);
  }

  switch (hit.action) {
    case 'resize':
      return finalizeCursor({ type: 'move' }, 'overlay', 'resize-without-cursor-hint');

    case 'rotate':
      return finalizeCursor({ type: 'rotate' }, 'overlay', 'rotate');

    case 'move':
      return finalizeCursor({ type: 'move' }, 'overlay', 'move');

    case 'edit-text':
      return finalizeCursor({ type: 'text' }, 'overlay', 'edit-text');

    case 'path-control':
      return finalizeCursor({ type: 'pen' }, 'overlay', 'path-control');

    default:
      return null;
  }
}
```

---

## 15. Resize Cursor Rotation

Resize cursor 必须考虑元素旋转。

普通 CSS 只有：

```txt
n-resize
ne-resize
e-resize
se-resize
s-resize
sw-resize
w-resize
nw-resize
```

但元素可以旋转，所以应该根据：

```txt
handle direction + element rotation + camera rotation
```

映射到最近的 CSS resize cursor。

```ts
const resizeCursorByAngle = [
  'e-resize',
  'se-resize',
  's-resize',
  'sw-resize',
  'w-resize',
  'nw-resize',
  'n-resize',
  'ne-resize',
] as const;

export function resizeDirectionToAngle(direction: ResizeDirection): number {
  switch (direction) {
    case 'e':
      return 0;
    case 'se':
      return 45;
    case 's':
      return 90;
    case 'sw':
      return 135;
    case 'w':
      return 180;
    case 'nw':
      return 225;
    case 'n':
      return 270;
    case 'ne':
      return 315;
  }
}

export function resizeDirectionToCssCursor(
  direction: ResizeDirection,
  rotation = 0,
): string {
  const angle = normalizeAngle(resizeDirectionToAngle(direction) + rotation);
  const index = Math.round(angle / 45) % 8;
  return resizeCursorByAngle[index];
}

export function normalizeAngle(angle: number): number {
  return ((angle % 360) + 360) % 360;
}
```

规则：

```txt
1. 如果 camera 不支持 rotation，只加 element rotation。
2. 如果 camera 支持 rotation，还要加 camera rotation。
3. active resize 时 cursor 要锁定，不再随 hover 变化。
```

---

## 16. Path / Node Editing Cursor

Path edit / node edit 是复杂状态，不应该直接套普通 select cursor。

常见状态：

```txt
hover anchor point:
  move point

hover segment:
  add point

hover selected point + Alt:
  convert point

hover point + delete mode:
  remove point

pen tool over empty:
  pen

pen tool over first point:
  close path

pen tool over existing point:
  connect / continue
```

Path edit hit result：

```ts
export type PathEditHit =
  | { type: 'anchor-point'; pointId: string; selected: boolean }
  | { type: 'bezier-handle'; handleId: string }
  | { type: 'segment'; segmentId: string }
  | { type: 'path-fill'; pathId: string }
  | { type: 'first-point'; pointId: string };
```

Resolver：

```ts
export function resolvePathEditCursor(input: {
  hit: PathEditHit | null;
  modifierKeys: ModifierKeys;
}): CursorIntent {
  const { hit, modifierKeys } = input;

  if (!hit) {
    return { type: 'pen' };
  }

  if (hit.type === 'first-point') {
    return { type: 'close-path' };
  }

  if (hit.type === 'anchor-point') {
    if (modifierKeys.alt) {
      return { type: 'convert-point' };
    }

    return { type: 'move' };
  }

  if (hit.type === 'bezier-handle') {
    return { type: 'move' };
  }

  if (hit.type === 'segment') {
    if (modifierKeys.alt || modifierKeys.meta) {
      return { type: 'remove-point' };
    }

    return { type: 'add-point' };
  }

  return { type: 'pen' };
}
```

注意：

```txt
path point / bezier handle / segment 通常是 overlay hit，不是 static scene hit。
```

---

## 17. Editing Mode Cursor

```ts
export function resolveEditingModeCursor(
  input: CursorResolveInput,
): CursorResolveResult | null {
  switch (input.editingMode) {
    case 'text':
      return finalizeCursor({ type: 'text' }, 'editing-mode', 'text');

    case 'path': {
      const pathHit = input.overlayHit?.pathEditHit ?? null;

      return finalizeCursor(
        resolvePathEditCursor({
          hit: pathHit,
          modifierKeys: input.modifierKeys,
        }),
        'editing-mode',
        'path',
      );
    }

    case 'group':
    case 'component':
      return null;

    case 'none':
    default:
      return null;
  }
}
```

规则：

```txt
1. editingMode 高于普通 sceneHit。
2. path editing 主要依赖 overlay hit。
3. text editing 默认 text cursor。
4. group / component editing 可以继续走 overlay / scene cursor。
```

---

## 18. Scene Cursor

Scene hit 是普通元素 hover 的 cursor。

```ts
export function resolveSceneCursor(
  input: CursorResolveInput,
): CursorResolveResult | null {
  const hit = input.sceneHit;
  if (!hit) return null;

  if (hit.locked) {
    return finalizeCursor({ type: 'not-allowed' }, 'scene', 'locked-node');
  }

  if (input.currentTool === 'select') {
    return finalizeCursor({ type: 'move' }, 'scene', 'select-hover');
  }

  return finalizeCursor({ type: 'pointer' }, 'scene', 'scene-hit');
}
```

规则：

```txt
1. locked node 可以显示 not-allowed。
2. select tool hover selectable node 通常是 move。
3. readonly 模式是否 pointer 由 appMode 决定。
```

---

## 19. CursorApplier

Cursor 高频更新，不能每次都 set DOM。

```ts
export class CursorApplier {
  private lastCss = '';
  private target: HTMLElement;

  constructor(target: HTMLElement) {
    this.target = target;
  }

  apply(css: string): void {
    if (css === this.lastCss) return;

    this.target.style.cursor = css;
    this.lastCss = css;
  }

  reset(): void {
    this.apply('default');
  }
}
```

如果只想作用在 canvas：

```ts
const cursorApplier = new CursorApplier(canvas);
```

但 active operation 期间，鼠标可能离开 canvas。

建议：

```txt
normal hover:
  apply cursor to canvas

active operation:
  apply cursor to document.body

operation end:
  restore body cursor
  continue using canvas cursor
```

---

## 20. Pointer / Keyboard 更新流程

Pointer move：

```ts
function onPointerMove(event: PointerEvent) {
  pointerRuntime.update(event);

  const pointer = getPointer(event);

  const overlayHit = engine.hitTestOverlay(pointer);
  const sceneHit = overlayHit ? null : engine.hitTestScene(pointer);

  const cursor = cursorManager.resolve({
    pointer,
    appMode: appRuntime.mode,
    currentTool: toolRuntime.currentTool,
    modifierKeys: keyboardRuntime.modifierKeys,
    activeOperation: interactionRuntime.activeOperation,
    editingMode: interactionRuntime.editingMode,
    overlayHit,
    sceneHit,
    zoomTool: toolRuntime.zoom,
  });

  cursorApplier.apply(cursor.css);
}
```

Key down / up：

```ts
function onKeyChange(event: KeyboardEvent) {
  keyboardRuntime.update(event);

  const cursor = cursorManager.resolve(getCurrentCursorInput());
  cursorApplier.apply(cursor.css);
}
```

规则：

```txt
1. pointermove 会影响 hover hit。
2. keydown / keyup 也可能改变 cursor。
3. Alt / Cmd / Space 改变 cursor 时，不需要 pointermove 才更新。
4. active operation 状态变化时，也要重新 resolve cursor。
```

---

## 21. 和 Engine / Dynamic Overlay 的关系

Engine 提供：

```txt
hitTestOverlay(pointer)
hitTestScene(pointer)
```

Dynamic Overlay 提供：

```txt
overlay geometry
overlay hit area
overlay cursor hint
overlay action
```

CursorManager 使用：

```txt
overlayHit.cursor
sceneHit.locked
currentTool
modifierKeys
activeOperation
editingMode
appMode
```

但最终 cursor 由应用层决定。

规则：

```txt
1. Engine 不直接 set DOM cursor。
2. Overlay cursor hint 不是最终 cursor。
3. Application Runtime 的临时按键和 activeOperation 可以覆盖 overlay hint。
4. Cursor 不进入 DynamicLayer 渲染结果，只作为交互 hint。
```

---

## 22. 性能注意点

Cursor resolve 发生在 pointermove / keydown / keyup，高频。

禁止：

```txt
1. 每次 cursor resolve 重建 dynamic overlay。
2. 每次 cursor resolve 深遍历 document tree。
3. 每次 cursor resolve 重建 spatial index。
4. 每次 cursor resolve 触发 React 大范围 setState。
5. 每次 pointermove 都 set canvas.style.cursor，即使 cursor 没变。
```

推荐：

```txt
1. overlay hit test 使用轻量 screen-space geometry。
2. scene hit test 使用 engine spatial index。
3. CursorManager 只做纯函数解析。
4. CursorApplier 对 CSS cursor 做去重。
5. activeOperation 期间跳过普通 hover cursor resolve。
```

---

## 23. Debug Stats

建议暴露 cursor debug 信息：

```ts
export interface CursorDebugInfo {
  intent: CursorIntent;
  css: string;
  source: CursorResolveResult['source'];
  reason?: string;

  currentTool: ToolType;
  effectiveTool: ToolType;
  modifierKeys: ModifierKeys;

  activeOperation?: ActiveOperation;
  editingMode?: EditingMode;

  overlayHitType?: string;
  sceneHitId?: NodeId;
}
```

用途：

```txt
1. 判断为什么 cursor 是 resize。
2. 判断 Space 临时 pan 是否覆盖 overlay。
3. 判断 active operation cursor 是否锁定。
4. 判断 zoom in/out modifier 是否生效。
```

---

## 24. 最终规则

```txt
1. Cursor 属于 Application Interaction Runtime。
2. Cursor 不属于 document / history / collaboration / tile / snapshot。
3. Engine 负责 hit test，不直接决定最终 cursor。
4. Dynamic Overlay item 可以提供 cursor hint。
5. CursorManager 统一解析最终 CursorIntent。
6. CursorIntent 先语义化，再映射成 CSS cursor。
7. activeOperation 期间 cursor 必须锁定。
8. Space 临时 pan 属于 temporary tool override。
9. Zoom tool 的 zoom-in / zoom-out 根据 modifierKeys 解析。
10. Path edit / node edit cursor 由 editingMode + overlayHit + modifierKeys 决定。
11. Overlay hit cursor 高于 scene hit cursor。
12. AppMode cursor 高于一切普通交互 cursor。
13. 只有 CSS cursor 变化时才真正 set DOM。
14. Active operation 时可以把 cursor 设置到 document.body，避免离开 canvas 后丢失。
15. Cursor 系统应该独立于 renderer，但可以依赖 engine hit test 结果。
```

一句话：

```txt
Cursor 是应用层 runtime 对 tool、modifier、overlay hit、scene hit、active operation 的最终解释结果。
```