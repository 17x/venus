

# Vector Dynamic Overlay Design

## 1. 核心结论

Engine 不提供产品语义。

Engine 只提供抽象出来的交互层能力：

```txt
overlay primitives
overlay rendering
overlay hit test
cursor hint passthrough
action payload passthrough
```

Vector 负责把产品语义转换成 Engine 能绘制和命中的 Dynamic Overlay。

也就是说：

```txt
Vector:
  决定什么情况下显示 overlay
  决定不同元素显示什么 overlay
  决定 selection / hover / editing mode / tool state
  决定 overlay action 对应什么交互行为

Engine:
  负责画 line / rect / polygon / handle / caret / label / hit-area
  负责 overlay hit test
  负责把 cursor hint / action payload 原样返回
  不理解 TextNode / PathNode / ImageCrop / AutoLayout 等产品语义
```

一句话：

```txt
Engine 提供“画什么基础图元”和“命中了哪个 overlay”，Vector 决定“为什么要画、画哪些、命中后做什么”。
```

---

## 2. Dynamic Overlay 不是什么

Dynamic Overlay 不是文档节点。

Dynamic Overlay 也不是静态渲染内容。

明确禁止：

```txt
不进入 document model
不进入 history
不进入 collaboration
不进入 tile cache
不进入 overview cache
不进入 static snapshot
不参与 static dirty bounds
不作为 EngineRenderNode
```

Dynamic Overlay 属于：

```txt
Application Runtime / Interaction Runtime / Overlay Runtime
```

它每帧可能变化，依赖：

```txt
selection
hover
current tool
editing mode
active operation
modifier keys
camera
```

---

## 3. 总体架构

推荐分层：

```txt
Vector Editor Runtime
  selection
  hover
  currentTool
  editingMode
  activeOperation
  modifierKeys

Vector Overlay Policy
  根据 node type / tool / editing mode 决定应该显示哪些 overlay

Vector Overlay Adapter
  把 policy 结果转换成 EngineDynamicLayer

Engine Dynamic Layer
  抽象 overlay primitives

Engine Overlay Renderer
  WebGL 渲染 overlay primitives

Engine Overlay HitTest
  命中 overlay primitives，返回 cursor hint / action payload
```

数据流：

```txt
document / runtime / selection / hover / tool / editingMode / activeOperation
  -> vectorOverlayPolicy.resolve()
  -> vectorOverlayAdapter.buildDynamicLayer()
  -> engine.setDynamicLayer(dynamicLayer)
  -> engine.renderDynamicOverlay()
```

---

## 4. EngineDynamicLayer

Engine 接收的是通用 Dynamic Overlay render model。

```ts
export interface EngineDynamicLayer {
  version: number;
  nodes: EngineOverlayNode[];
}
```

Overlay node 是抽象图元：

```ts
export type EngineOverlayNode =
  | OverlayLine
  | OverlayPolyline
  | OverlayRect
  | OverlayPolygon
  | OverlayCircle
  | OverlayHandle
  | OverlayGuide
  | OverlayCaret
  | OverlayLabel
  | OverlayHitArea;
```

Base overlay node：

```ts
export interface BaseOverlayNode {
  id: string;
  type: string;

  visible?: boolean;

  /**
   * Higher value renders on top.
   */
  zIndex?: number;

  /**
   * Whether this overlay participates in overlay hit test.
   */
  hittable?: boolean;

  /**
   * Optional cursor hint.
   * Final cursor is still decided by CursorManager.
   */
  cursor?: CursorIntent;

  /**
   * Product-neutral action payload.
   * Engine should not interpret this.
   */
  action?: OverlayAction;

  /**
   * Optional semantic payload.
   * Engine should not interpret this.
   */
  meta?: Record<string, unknown>;
}
```

规则：

```txt
1. EngineOverlayNode 是 render model，不是 document node。
2. cursor 是 hint，不是最终 cursor。
3. action 是 payload，engine 只负责原样返回。
4. meta 只用于 debug 或业务回传，engine 不解释。
```

---

## 5. 坐标规则

Overlay 通常需要同时支持 world-space 位置和 screen-space 尺寸。

推荐规则：

```txt
位置：
  通常使用 world space，跟随 camera zoom / pan

线宽 / handle 大小 / label 字号：
  通常使用 screen px，保持屏幕上大小稳定
```

例如：

```txt
selection bounds:
  world-space corners
  strokeWidthPx = 1

resize handle:
  worldPosition
  sizePx = 8

text caret:
  world from/to
  widthPx = 1
```

Overlay primitive 应显式声明坐标系：

```ts
export type OverlayCoordinate = 'world' | 'screen';
```

---

## 6. Overlay Style

Overlay style 应该轻量，不复用完整 document style。

```ts
export interface OverlayFill {
  color: string;
  opacity?: number;
}

export interface OverlayStroke {
  color: string;
  opacity?: number;
  widthPx: number;
  dash?: number[];
}
```

Overlay 不需要完整 Paint/Effect/TextRun。

禁止把这些复杂能力放进 overlay style：

```txt
gradient
shadow
blur
textRuns
component styles
image paints
```

原因：

```txt
overlay 是交互反馈，不是文档内容。
```

---

## 7. Engine Overlay Primitives

### 7.1 Rect / Bounds

```ts
export interface OverlayRect extends BaseOverlayNode {
  type: 'rect';

  coordinate: OverlayCoordinate;
  rect: Rect;

  stroke?: OverlayStroke;
  fill?: OverlayFill;

  /**
   * Stroke width is screen-fixed by default.
   */
  strokeWidthPx?: number;

  dash?: number[];
}
```

用途：

```txt
marquee
selection bbox
text editing box
image crop box
frame outline
screen-space tooltip background
```

---

### 7.2 Polygon / Rotated Bounds

```ts
export interface OverlayPolygon extends BaseOverlayNode {
  type: 'polygon';

  coordinate: OverlayCoordinate;
  points: Point[];

  stroke?: OverlayStroke;
  fill?: OverlayFill;
  strokeWidthPx?: number;
  closed?: boolean;
}
```

用途：

```txt
rotated selection bounds
rotated hover outline
path outline
frame bounds
image crop rotated bounds
```

---

### 7.3 Polyline

```ts
export interface OverlayPolyline extends BaseOverlayNode {
  type: 'polyline';

  coordinate: OverlayCoordinate;
  points: Point[];

  stroke: OverlayStroke;
  strokeWidthPx: number;
  dash?: number[];
}
```

用途：

```txt
path preview
pen drawing preview
freehand preview
measurement polyline
```

---

### 7.4 Line / Guide

```ts
export interface OverlayLine extends BaseOverlayNode {
  type: 'line';

  coordinate: OverlayCoordinate;
  from: Point;
  to: Point;

  stroke: OverlayStroke;
  strokeWidthPx: number;
  dash?: number[];
}
```

用途：

```txt
snap guide
alignment guide
measurement line
path tangent line
bezier control line
```

---

### 7.5 Circle

```ts
export interface OverlayCircle extends BaseOverlayNode {
  type: 'circle';

  coordinate: OverlayCoordinate;
  center: Point;

  /**
   * Radius in screen px if coordinate = world and screenFixed = true.
   */
  radiusPx?: number;
  radiusWorld?: number;
  screenFixed?: boolean;

  fill?: OverlayFill;
  stroke?: OverlayStroke;
}
```

用途：

```txt
path point
hover point
rotation center
custom circular control
```

---

### 7.6 Handle

```ts
export interface OverlayHandle extends BaseOverlayNode {
  type: 'handle';

  coordinate: 'world';
  worldPosition: Point;

  shape: 'square' | 'circle' | 'diamond';

  /**
   * Screen-fixed size.
   */
  sizePx: number;

  fill?: OverlayFill;
  stroke?: OverlayStroke;

  /**
   * Optional role. Engine does not interpret product semantics,
   * but can return it in hit result.
   */
  role?:
    | 'resize'
    | 'rotate'
    | 'anchor'
    | 'bezier'
    | 'crop'
    | 'layout'
    | 'custom';

  direction?: ResizeDirection;
}
```

用途：

```txt
resize handles
rotation handle
path anchor point
bezier handle
image crop handle
auto layout spacing handle
custom plugin handle
```

---

### 7.7 Caret

```ts
export interface OverlayCaret extends BaseOverlayNode {
  type: 'caret';

  coordinate: 'world';
  from: Point;
  to: Point;

  widthPx: number;
  color: string;
  blink?: boolean;
}
```

用途：

```txt
text editing caret
```

---

### 7.8 Label

```ts
export interface OverlayLabel extends BaseOverlayNode {
  type: 'label';

  coordinate: OverlayCoordinate;
  position: Point;
  text: string;

  fontSizePx: number;
  color: string;
  background?: string;
  paddingPx?: number;
}
```

用途：

```txt
尺寸提示
距离提示
angle label
layout spacing label
debug label
```

---

### 7.9 Invisible Hit Area

```ts
export interface OverlayHitArea extends BaseOverlayNode {
  type: 'hit-area';

  coordinate: OverlayCoordinate;

  shape:
    | { type: 'rect'; rect: Rect }
    | { type: 'circle'; center: Point; radiusPx: number }
    | { type: 'polygon'; points: Point[] }
    | { type: 'line'; from: Point; to: Point; tolerancePx: number };
}
```

用途：

```txt
扩大 handle 命中范围
path segment hit test
marquee border hit test
rotation ring hit test
thin guide hit test
```

---

## 8. Vector Overlay Policy

Vector 侧负责定义产品 overlay 语义。

不要让 engine 直接理解：

```txt
TextNode editing
PathNode anchor point
Image crop
Frame auto layout guide
Component variant editing
```

推荐集中定义 overlay policy：

```ts
export interface VectorOverlayPolicy {
  buildOverlay(input: VectorOverlayBuildInput): EngineOverlayNode[];
}
```

输入：

```ts
export interface VectorOverlayBuildInput {
  document: DocumentModel;
  runtime: RuntimeCache;

  selection: SelectionState;
  hover: HoverState;

  currentTool: ToolType;
  editingMode: EditingMode;
  activeOperation?: ActiveOperation;

  camera: Camera;
  modifierKeys?: ModifierKeys;
}
```

输出：

```ts
EngineOverlayNode[]
```

---

## 9. Overlay Builder Registry

不要把不同元素的 overlay 逻辑散落在 UI 代码里。

推荐按 node type / tool / editing mode 注册 builder。

```ts
export interface NodeOverlayBuilder<TNode extends SceneNode = SceneNode> {
  canBuild(input: NodeOverlayBuildInput<TNode>): boolean;

  build(input: NodeOverlayBuildInput<TNode>): EngineOverlayNode[];
}

export interface NodeOverlayBuildInput<TNode extends SceneNode> {
  node: TNode;
  runtime: RuntimeNodeState;

  selection: SelectionState;
  hover: HoverState;

  editingMode: EditingMode;
  currentTool: ToolType;
  activeOperation?: ActiveOperation;

  camera: Camera;
  modifierKeys?: ModifierKeys;
}
```

注册表：

```ts
const overlayRegistry = new Map<SceneNodeType, NodeOverlayBuilder[]>([
  ['rect', [rectSelectionOverlayBuilder]],
  ['ellipse', [shapeSelectionOverlayBuilder]],
  ['text', [textSelectionOverlayBuilder, textEditingOverlayBuilder]],
  ['path', [pathSelectionOverlayBuilder, pathEditingOverlayBuilder]],
  ['image', [imageSelectionOverlayBuilder, imageCropOverlayBuilder]],
  ['frame', [frameOverlayBuilder, autoLayoutOverlayBuilder]],
  ['group', [groupSelectionOverlayBuilder]],
]);
```

规则：

```txt
1. Engine 不知道 TextNode / PathNode / ImageCrop。
2. Vector 通过 builder 生成通用 overlay primitives。
3. 每种元素的 overlay customization 放在对应 builder。
4. Builder 可以按 editingMode / currentTool 决定是否生成 overlay。
```

---

## 10. Dynamic Layer 构建流程

```ts
export function buildDynamicLayer(input: VectorOverlayBuildInput): EngineDynamicLayer {
  const nodes: EngineOverlayNode[] = [];

  nodes.push(...buildToolOverlays(input));
  nodes.push(...buildHoverOverlays(input));
  nodes.push(...buildSelectionOverlays(input));
  nodes.push(...buildEditingOverlays(input));
  nodes.push(...buildGuideOverlays(input));
  nodes.push(...buildDebugOverlays(input));

  return {
    version: input.runtime.overlayVersion,
    nodes: sortByZIndex(nodes),
  };
}
```

Overlay 构建顺序建议：

```txt
1. tool overlay
   marquee / drawing preview / zoom box

2. hover overlay
   hover outline / hover path segment

3. selection overlay
   bounds / handles / rotate handle

4. editing overlay
   text caret / path anchors / bezier handles

5. guide overlay
   snap lines / alignment guides

6. debug overlay
```

最终渲染按 zIndex：

```txt
lower zIndex first
higher zIndex later
```

推荐 zIndex：

```txt
100 hover outline
200 selection bounds
250 selection handles
300 editing controls
400 snap guides
500 marquee / active tool overlay
900 debug
```

---

## 11. Rect / Shape Selection Overlay

Vector 语义：

```txt
选中 rect / shape:
  显示 bounds
  显示 8 个 resize handles
  显示 rotate handle
```

转成 engine overlay primitives：

```ts
function buildRectSelectionOverlay(
  input: NodeOverlayBuildInput<RectNode>,
): EngineOverlayNode[] {
  const { node, runtime } = input;

  const corners = getWorldCorners(runtime.worldMatrix, node);
  const handles = createResizeHandles({
    targetId: node.id,
    corners,
    rotation: runtime.rotation,
  });

  return [
    {
      id: `selection-bounds:${node.id}`,
      type: 'polygon',
      coordinate: 'world',
      points: corners,
      stroke: { color: '#4f7cff', opacity: 1, widthPx: 1 },
      strokeWidthPx: 1,
      hittable: false,
      zIndex: 200,
    },
    ...handles,
  ];
}
```

Resize handle 示例：

```ts
function createResizeHandle(input: {
  targetId: NodeId;
  direction: ResizeDirection;
  worldPosition: Point;
  rotation: number;
}): OverlayHandle {
  return {
    id: `resize:${input.targetId}:${input.direction}`,
    type: 'handle',
    coordinate: 'world',
    worldPosition: input.worldPosition,
    shape: 'square',
    sizePx: 8,
    fill: { color: '#ffffff', opacity: 1 },
    stroke: { color: '#4f7cff', opacity: 1, widthPx: 1 },
    role: 'resize',
    direction: input.direction,
    hittable: true,
    cursor: {
      type: 'resize',
      direction: input.direction,
      rotation: input.rotation,
    },
    action: {
      type: 'resize',
      targetId: input.targetId,
      direction: input.direction,
    },
    zIndex: 250,
  };
}
```

---

## 12. Text Overlay

### 12.1 Text Selection

Text 普通选中：

```txt
显示 text bounds
显示 resize handles
```

可以复用 shape selection overlay。

### 12.2 Text Editing

Text editing：

```txt
显示 caret
显示 text selection range
显示 composition underline
隐藏普通 resize handles 或降低优先级
```

```ts
function buildTextEditingOverlay(
  input: NodeOverlayBuildInput<TextNode>,
): EngineOverlayNode[] {
  const layout = input.runtime.textLayout;
  if (!layout) return [];

  return [
    {
      id: `text-caret:${input.node.id}`,
      type: 'caret',
      coordinate: 'world',
      from: layout.caretFrom,
      to: layout.caretTo,
      widthPx: 1,
      color: '#111111',
      blink: true,
      zIndex: 300,
      hittable: false,
    },
    ...layout.selectionRects.map((rect, index) => ({
      id: `text-selection:${input.node.id}:${index}`,
      type: 'rect',
      coordinate: 'world',
      rect,
      fill: { color: '#4f7cff', opacity: 0.25 },
      zIndex: 250,
      hittable: false,
    })),
  ];
}
```

规则：

```txt
1. text caret 来自 runtime text layout。
2. text selection rect 不进入 document。
3. text editing overlay 不进 history / collaboration。
4. text editing 的真实内容变更由 transaction 记录。
```

---

## 13. Path Editing Overlay

Path editing 是 overlay 最复杂的情况。

Vector 语义：

```txt
显示 anchor points
显示 bezier handles
显示 bezier tangent lines
显示 path segment hover hit area
Alt hover segment -> remove / convert
hover segment -> add point
```

Engine primitives：

```txt
line
circle / handle
hit-area line
```

示例：

```ts
function buildPathEditingOverlay(
  input: NodeOverlayBuildInput<PathNode>,
): EngineOverlayNode[] {
  const pathRuntime = input.runtime.pathRuntime;
  if (!pathRuntime) return [];

  const overlays: EngineOverlayNode[] = [];

  for (const tangent of pathRuntime.tangentLines) {
    overlays.push({
      id: `path-tangent:${input.node.id}:${tangent.id}`,
      type: 'line',
      coordinate: 'world',
      from: tangent.from,
      to: tangent.to,
      stroke: { color: '#4f7cff', opacity: 0.8, widthPx: 1 },
      strokeWidthPx: 1,
      zIndex: 260,
      hittable: false,
    });
  }

  for (const point of pathRuntime.anchorPoints) {
    overlays.push({
      id: `path-anchor:${input.node.id}:${point.id}`,
      type: 'handle',
      coordinate: 'world',
      worldPosition: point.worldPosition,
      shape: 'circle',
      sizePx: point.selected ? 8 : 6,
      fill: { color: point.selected ? '#4f7cff' : '#ffffff' },
      stroke: { color: '#4f7cff', widthPx: 1 },
      role: 'anchor',
      hittable: true,
      cursor: { type: 'move' },
      action: {
        type: 'path-anchor-drag',
        nodeId: input.node.id,
        pointId: point.id,
      },
      zIndex: 300,
    });
  }

  for (const segment of pathRuntime.segments) {
    overlays.push({
      id: `path-segment-hit:${input.node.id}:${segment.id}`,
      type: 'hit-area',
      coordinate: 'world',
      shape: {
        type: 'line',
        from: segment.from,
        to: segment.to,
        tolerancePx: 6,
      },
      hittable: true,
      cursor: { type: 'add-point' },
      action: {
        type: 'path-segment-add-point',
        nodeId: input.node.id,
        segmentId: segment.id,
      },
      zIndex: 250,
    });
  }

  return overlays;
}
```

规则：

```txt
1. anchor / bezier handle 是 overlay，不是 document node。
2. path segment hit area 可以是 invisible hit-area。
3. Engine 不解释 path-anchor-drag，只原样返回 action。
4. Vector 根据 action 启动 path editing interaction。
```

---

## 14. Image Crop Overlay

Vector 语义：

```txt
image crop mode:
  显示 crop bounds
  显示 crop handles
  显示 dim outside area
```

Engine overlay：

```txt
polygon / rect / handle / hit-area
```

示例：

```ts
function buildImageCropOverlay(
  input: NodeOverlayBuildInput<ImageNode>,
): EngineOverlayNode[] {
  const crop = input.runtime.imageCrop;
  if (!crop) return [];

  return [
    {
      id: `image-crop-bounds:${input.node.id}`,
      type: 'polygon',
      coordinate: 'world',
      points: crop.worldCorners,
      stroke: { color: '#4f7cff', opacity: 1, widthPx: 1 },
      strokeWidthPx: 1,
      zIndex: 300,
      hittable: false,
    },
    ...createCropHandles(input.node.id, crop.worldCorners),
  ];
}
```

规则：

```txt
1. crop overlay 不改变 image node，直到 commit。
2. crop handles 是 overlay handles。
3. crop preview 可以进入 Active Element Layer。
4. crop transaction commit 后才写 document。
```

---

## 15. Frame / Auto Layout Overlay

Vector 语义：

```txt
frame hover / selected
auto layout spacing
padding guides
alignment guides
```

Engine overlay：

```txt
rect / line / label / handle
```

示例：

```ts
function buildAutoLayoutOverlay(
  input: NodeOverlayBuildInput<FrameNode>,
): EngineOverlayNode[] {
  if (!input.node.layout?.enabled) return [];

  const layout = input.runtime.layoutResult;
  if (!layout) return [];

  return [
    ...layout.paddingGuides.map((guide) => ({
      id: `layout-padding:${input.node.id}:${guide.id}`,
      type: 'line',
      coordinate: 'world',
      from: guide.from,
      to: guide.to,
      stroke: { color: '#a855f7', opacity: 0.8, widthPx: 1 },
      strokeWidthPx: 1,
      dash: [4, 4],
      zIndex: 200,
      hittable: false,
    })),
    ...layout.spacingLabels.map((label) => ({
      id: `layout-label:${input.node.id}:${label.id}`,
      type: 'label',
      coordinate: 'world',
      position: label.position,
      text: String(label.value),
      fontSizePx: 11,
      color: '#ffffff',
      background: '#a855f7',
      paddingPx: 4,
      zIndex: 220,
      hittable: false,
    })),
  ];
}
```

规则：

```txt
1. auto layout guides 来自 runtime layout result。
2. spacing drag handle 可以作为 OverlayHandle。
3. layout overlay 不进入 document。
4. layout 参数修改 commit 后才生成 transaction。
```

---

## 16. Marquee Overlay

Marquee 不是某个元素的 overlay。

Marquee 是 tool / interaction overlay。

Vector 根据 activeOperation 生成：

```ts
function buildMarqueeOverlay(input: VectorOverlayBuildInput): EngineOverlayNode[] {
  const op = input.activeOperation;

  if (op?.type !== 'marquee') return [];

  return [
    {
      id: 'marquee',
      type: 'rect',
      coordinate: 'world',
      rect: op.worldRect,
      fill: { color: '#4f7cff', opacity: 0.12 },
      stroke: { color: '#4f7cff', widthPx: 1 },
      strokeWidthPx: 1,
      dash: [4, 4],
      zIndex: 500,
      hittable: false,
    },
  ];
}
```

规则：

```txt
1. marquee 是 interaction overlay。
2. marquee 不是 document node。
3. marquee 不进 history。
4. marquee 不进 collaboration。
5. marquee 不进 tile cache。
```

---

## 17. Drawing Preview Overlay

绘制工具，例如 rect / ellipse / line / pen，需要 preview overlay。

```ts
function buildDrawingPreviewOverlay(input: VectorOverlayBuildInput): EngineOverlayNode[] {
  const op = input.activeOperation;

  if (op?.type !== 'draw-shape') return [];

  if (op.shape === 'rect') {
    return [
      {
        id: 'draw-preview:rect',
        type: 'rect',
        coordinate: 'world',
        rect: op.worldRect,
        stroke: { color: '#4f7cff', widthPx: 1 },
        fill: { color: '#4f7cff', opacity: 0.08 },
        strokeWidthPx: 1,
        zIndex: 500,
        hittable: false,
      },
    ];
  }

  if (op.shape === 'line') {
    return [
      {
        id: 'draw-preview:line',
        type: 'line',
        coordinate: 'world',
        from: op.from,
        to: op.to,
        stroke: { color: '#4f7cff', widthPx: 1 },
        strokeWidthPx: 1,
        zIndex: 500,
        hittable: false,
      },
    ];
  }

  return [];
}
```

规则：

```txt
1. drawing preview 不进入 document。
2. pointer up commit 后才创建真实 node。
3. preview 使用 overlay 或 Active Element Layer 取决于是否需要真实样式。
```

---

## 18. Overlay Action

Engine 不理解产品语义，但可以返回 action payload。

```ts
export type OverlayAction =
  | {
      type: 'resize';
      targetId: NodeId;
      direction: ResizeDirection;
    }
  | {
      type: 'rotate';
      targetId: NodeId;
    }
  | {
      type: 'path-anchor-drag';
      nodeId: NodeId;
      pointId: string;
    }
  | {
      type: 'path-segment-add-point';
      nodeId: NodeId;
      segmentId: string;
    }
  | {
      type: 'image-crop-resize';
      nodeId: NodeId;
      direction: ResizeDirection;
    }
  | {
      type: 'auto-layout-spacing-drag';
      frameId: NodeId;
      gapId: string;
    }
  | {
      type: 'custom';
      name: string;
      payload?: unknown;
    };
```

Engine hit result：

```ts
export interface OverlayHitResult {
  overlayId: string;
  overlayType: string;

  cursor?: CursorIntent;
  action?: OverlayAction;

  /** Screen-space hit position. */
  screenPoint: Point;

  /** World-space hit position. */
  worldPoint: Point;
}
```

Engine 做：

```txt
hit test overlay
return overlay.action
```

Vector 做：

```txt
根据 overlay.action 创建对应 interaction operation
```

示例：

```ts
function handleOverlayPointerDown(hit: OverlayHitResult) {
  switch (hit.action?.type) {
    case 'resize':
      interaction.startResize(hit.action.targetId, hit.action.direction);
      break;

    case 'rotate':
      interaction.startRotate(hit.action.targetId);
      break;

    case 'path-anchor-drag':
      interaction.startPathAnchorDrag(hit.action.nodeId, hit.action.pointId);
      break;

    case 'path-segment-add-point':
      interaction.addPointOnSegment(hit.action.nodeId, hit.action.segmentId, hit.worldPoint);
      break;

    case 'image-crop-resize':
      interaction.startImageCropResize(hit.action.nodeId, hit.action.direction);
      break;

    case 'auto-layout-spacing-drag':
      interaction.startAutoLayoutSpacingDrag(hit.action.frameId, hit.action.gapId);
      break;
  }
}
```

---

## 19. Overlay Hit Test

如果 overlay 不走 DOM/SVG，那么 overlay hit test 由 engine 负责。

Overlay hit test 优先级高于 scene hit test。

流程：

```txt
pointer down / move
  -> engine.hitTestOverlay(pointer)
  -> if hit overlay, return overlayHit
  -> else engine.hitTestScene(pointer)
```

Overlay hit test 应尽量使用 screen-space。

原因：

```txt
1. handle size 是 screen px。
2. line tolerance 是 screen px。
3. label / caret / hit-area 通常按屏幕判断。
```

规则：

```txt
1. reverse zIndex hit test。
2. hittable=false 的 overlay 不参与命中。
3. hit-area 可以不可见但可命中。
4. overlayHit 返回 cursor hint 和 action payload。
```

---

## 20. Active Element Layer vs Dynamic Overlay Layer

这两个必须分开。

```txt
Active Element Layer:
  正在被拖拽 / transform / 编辑的真实元素预览
  是 document element 的 live render
  需要保持元素原始样式

Dynamic Overlay Layer:
  selection box / handles / guides / marquee
  是交互辅助图形
  不是真实文档元素
```

拖拽元素时：

```txt
Static Base Layer:
  旧缓存背景

Active Element Layer:
  被拖拽的元素 live render

Dynamic Overlay Layer:
  selection bounds / handles / snap guides
```

规则：

```txt
1. Active Element Layer 可以使用真实元素样式。
2. Dynamic Overlay 使用轻量 overlay style。
3. Active Element Layer commit 后会影响 document。
4. Dynamic Overlay 不影响 document。
```

---

## 21. Cursor 与 Dynamic Overlay 的关系

Overlay item 可以带 cursor hint：

```ts
cursor: {
  type: 'resize',
  direction: 'e',
  rotation: elementRotation,
}
```

命中 overlay 后：

```txt
engine.hitTestOverlay()
  -> returns overlayHit.cursor

CursorManager
  -> 根据 appMode / activeOperation / modifierKeys / overlayHit 决定最终 cursor
```

规则：

```txt
1. overlay cursor 是 hint，不是最终 cursor。
2. Space 临时 pan 可以覆盖 overlay cursor。
3. activeOperation cursor 可以锁定并覆盖 hover cursor。
4. engine 不直接 set DOM cursor。
```

---

## 22. 性能策略

Dynamic overlay 数量通常很少，可以每帧全量生成。

典型数量：

```txt
selection handles:
  8 - 12 个

hover outline:
  1 个

marquee:
  1 个

snap guides:
  几条到几十条
```

第一版：

```txt
每帧全量 buildDynamicLayer 没问题。
```

但某些场景需要优化：

```txt
path editing with thousands of points:
  只生成 viewport 内 points
  或 LOD 隐藏过密 point
  或只显示 selected / hovered / nearby points

auto layout guides:
  只在 selected frame 上生成

text caret:
  只在 active text node 上生成
```

建议：

```ts
interface OverlayBuildOptions {
  viewportWorldBounds: Rect;
  zoom: number;
  maxPathPoints?: number;
  showDensePathPoints?: boolean;
}
```

禁止：

```txt
1. overlay build 深遍历 100K nodes。
2. 每次 pointermove 重算所有 node overlay。
3. overlay 变化 dirty static tile。
4. overlay 进入 React 大状态导致大范围 re-render。
```

---

## 23. Engine API

推荐：

```ts
export interface Engine {
  applyScenePatch(patch: EngineScenePatch): void;

  setCamera(camera: Camera): void;

  setDynamicLayer(layer: EngineDynamicLayer | null): void;

  hitTestOverlay(point: Point): OverlayHitResult | null;

  hitTestScene(point: Point): EngineHitResult | null;

  renderFrame(): void;
}
```

Editor 侧：

```ts
function onPointerMove(event: PointerEvent) {
  const pointer = getPointer(event);

  const overlayHit = engine.hitTestOverlay(pointer);
  const sceneHit = overlayHit ? null : engine.hitTestScene(pointer);

  const dynamicLayer = buildDynamicLayer({
    document,
    runtime,
    selection,
    hover: { overlayHit, sceneHit },
    currentTool,
    editingMode,
    activeOperation,
    camera,
    modifierKeys,
  });

  engine.setDynamicLayer(dynamicLayer);

  const cursor = cursorManager.resolve({
    pointer,
    appMode,
    currentTool,
    modifierKeys,
    activeOperation,
    editingMode,
    overlayHit,
    sceneHit,
  });

  cursorApplier.apply(cursor.css);

  engine.renderFrame();
}
```

---

## 24. Debug 信息

建议 Dynamic Overlay 暴露 debug stats：

```ts
export interface DynamicOverlayDebugInfo {
  version: number;
  nodeCount: number;
  hittableCount: number;

  byType: Record<string, number>;

  buildTimeMs: number;
  hitTestTimeMs: number;

  lastOverlayHit?: OverlayHitResult;
}
```

用途：

```txt
1. 判断 overlay 是否过多。
2. 判断 path editing 是否生成了太多 points。
3. 判断 hit test 是否过慢。
4. 判断 overlay cursor/action 是否正确返回。
```

---

## 25. 最终规则

```txt
1. Engine 不提供产品语义，只提供抽象 overlay primitives。
2. Vector 负责把 selection / hover / tool / editing mode 转成 EngineDynamicLayer。
3. Dynamic Overlay 是 render model，不是 document model。
4. 每种元素的 overlay customization 放在 Vector overlay builder / policy。
5. Engine overlay node 可以携带 cursor hint 和 action payload，但 engine 不解释产品语义。
6. Overlay hit test 返回 action，Vector 根据 action 启动对应 interaction。
7. Marquee 是 tool / interaction overlay，不是元素 overlay。
8. Text / Path / Image / Frame 等特殊 overlay 由各自 builder 生成。
9. Active Element Layer 和 Dynamic Overlay Layer 分开：前者是真实元素预览，后者是交互辅助图形。
10. Dynamic Overlay 不进 history / collaboration / tile / snapshot。
11. Overlay position 通常用 world space，size / stroke / label 通常用 screen px。
12. 第一版可以每帧全量 setDynamicLayer，因为 overlay 数量通常很少。
13. path editing / massive overlay 场景需要 viewport culling 和 overlay LOD。
```

一句话：

```txt
Dynamic Overlay 不是 DOM，也不是文档节点；它是 Vector 每帧传给 Engine 的轻量 WebGL overlay render model。
```