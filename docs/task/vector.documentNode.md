# Vector Document Node Model

## 1. 目标

Vector 文档模型需要稳定支持：

```txt
普通元素
Group
Group 内多层 Group
z-order
local transform
undo / redo
quadtree / dirty / cache 系统的后续接入
```

核心原则：

```txt
文档模型存结构和局部变换。
runtime 存世界矩阵、bounds、索引和缓存。
```

---

## 2. 推荐数据结构

使用 normalized scene graph。

不要把 children 深度嵌套成巨大对象。

推荐：

```txt
Document
  rootIds: NodeId[]
  nodes: Record<NodeId, SceneNode>
```

每个 node 都有自己的 id。

Group 只保存 children 的 id 列表。

Child 通过 parentId 指回 parent。

---

## 3. 基础类型

```ts
type NodeId = string;

type SceneNodeType = "group" | "rect" | "path" | "text" | "image";

interface DocumentModel {
  version: number;
  rootIds: NodeId[];
  nodes: Record<NodeId, SceneNode>;
}

type SceneNode = GroupNode | RectNode | PathNode | TextNode | ImageNode;
```

---

## 4. BaseNode

每个节点只存 local transform。

不要在文档源数据里存 worldMatrix / worldBounds。

```ts
interface BaseNode {
  id: NodeId;
  type: SceneNodeType;

  /**
   * Parent node id.
   * null means this node is a root node.
   */
  parentId: NodeId | null;

  name?: string;

  /**
   * Local transform relative to parent.
   */
  transform: Matrix2D;

  visible?: boolean;
  locked?: boolean;

  opacity?: number;
  blendMode?: BlendMode;

  /** Common visual style. */
  fill?: Paint;
  stroke?: Stroke;
  effects?: Effect[];

  /** Compositing references. */
  clipPathId?: NodeId;
  maskId?: NodeId;

  /** Business / plugin extension data. */
  extensions?: Record<string, unknown>;

  createdAt?: number;
  updatedAt?: number;
}
```

规则：

```txt
node.transform 永远是相对 parent 的 local transform。
worldMatrix 是 runtime 派生结果，不写入文档源数据。
```

---

## 5. GroupNode

Group 是 scene graph 的结构节点。

Group 自身可以有 transform / opacity / blendMode / clip / mask。

Group 的 children 是有序 NodeId 数组。

```ts
interface GroupNode extends BaseNode {
  type: "group";

  /**
   * Ordered children.
   * children[0] is bottom.
   * children[children.length - 1] is top.
   */
  children: NodeId[];

  /**
   * Optional.
   * Helps runtime decide spatial index strategy.
   */
  indexingMode?: "auto" | "group" | "children";
}
```

规则：

```txt
1. group.children 只存 NodeId[]。
2. child.parentId 必须指向 group.id。
3. children 顺序表示 z-order。
4. children[0] 在底部。
5. children[last] 在顶部。
6. 渲染时正向遍历 children。
7. hit test 时反向遍历 children。
```

---

## 6. 普通元素节点

## 6.0 样式属性模型

核心渲染属性不要放进 `features: [{ fName }]` 数组。

推荐：

```txt
常用渲染属性直接字段化。
复杂属性使用结构化对象。
业务扩展属性放 extensions。
```

也就是：

```ts
interface BaseNode {
  id: NodeId;
  type: SceneNodeType;
  parentId: NodeId | null;

  transform: Matrix2D;

  visible?: boolean;
  locked?: boolean;

  opacity?: number;
  blendMode?: BlendMode;

  fill?: Paint;
  stroke?: Stroke;
  effects?: Effect[];

  extensions?: Record<string, unknown>;
}
```

不要这样：

```ts
features: [
  { fName: "stroke", config: strokeConfig },
  { fName: "fill", config: fillConfig },
];
```

原因：

```txt
1. 高频属性访问成本高。
2. TypeScript 类型难推导。
3. diff / undo / redo patch 不直观。
4. render pipeline 需要频繁 find feature。
5. AI 和人类都更难读。
```

可以这样理解：

```txt
Document Model:
  直接保存核心渲染属性。

Runtime / Renderer:
  可以把 fill / stroke / shadow / text / image 等处理逻辑 feature 化。
```

也就是：

```txt
文档数据不要过度 feature 化。
渲染管线可以 feature 化。
```

---

### 6.0.1 Paint

`Paint` 用于 fill / stroke / text fill 等颜色来源。

```ts
type Paint =
  | SolidPaint
  | LinearGradientPaint
  | RadialGradientPaint
  | ImagePaint;

interface SolidPaint {
  type: "solid";
  color: string;
  opacity?: number;
}

interface GradientStop {
  offset: number; // 0 - 1
  color: string;
  opacity?: number;
}

interface LinearGradientPaint {
  type: "linear-gradient";

  /**
   * Gradient coordinates are in node local space by default.
   */
  from: Point;
  to: Point;
  stops: GradientStop[];

  opacity?: number;
}

interface RadialGradientPaint {
  type: "radial-gradient";

  center: Point;
  radius: number;
  stops: GradientStop[];

  focalPoint?: Point;
  opacity?: number;
}

interface ImagePaint {
  type: "image";
  assetId: string;

  /**
   * Similar to Figma image fill modes.
   */
  scaleMode?: "fill" | "fit" | "crop" | "tile";

  opacity?: number;
  transform?: Matrix2D;
}
```

规则：

```txt
1. fill / stroke / text fill 都可以复用 Paint。
2. gradient 坐标默认使用 node local space。
3. image fill 只引用 assetId，不直接把图片二进制塞进 node。
4. 复杂 gradient 不要拆成 feature 数组。
```

---

### 6.0.2 Stroke

`Stroke` 是边框 / 描边配置。

```ts
interface Stroke {
  paint: Paint;
  width: number;
  opacity?: number;

  alignment?: "center" | "inside" | "outside";
  lineCap?: "butt" | "round" | "square";
  lineJoin?: "miter" | "round" | "bevel";
  miterLimit?: number;

  dash?: number[];
  dashOffset?: number;
}
```

规则：

```txt
1. stroke 是核心渲染属性，直接放 node.stroke。
2. stroke.paint 可以是 solid / gradient / image。
3. path stroke 需要支持 lineCap / lineJoin / dash。
4. rect stroke 也复用同一套 Stroke 结构。
```

---

### 6.0.3 Border Radius

圆角不要只写一个 `radius?: number`，因为后续会遇到不同角不同半径。

推荐：

```ts
type CornerRadius =
  | number
  | {
      topLeft?: number;
      topRight?: number;
      bottomRight?: number;
      bottomLeft?: number;
    };
```

RectNode 使用：

```ts
interface RectNode extends BaseNode {
  type: "rect";

  x: number;
  y: number;
  width: number;
  height: number;

  radius?: CornerRadius;
}
```

规则：

```txt
1. 简单圆角可以用 number。
2. 独立四角圆角使用 object。
3. runtime 可以 normalize 成四个角。
4. radius 不能超过 width / height 的几何限制，runtime 需要 clamp。
```

---

### 6.0.4 Effects / Shadow / Blur

阴影、模糊、发光等属于 effects。

推荐：

```ts
type Effect =
  | DropShadowEffect
  | InnerShadowEffect
  | LayerBlurEffect
  | BackgroundBlurEffect;

interface BaseEffect {
  id?: string;
  visible?: boolean;
  blendMode?: BlendMode;
}

interface DropShadowEffect extends BaseEffect {
  type: "drop-shadow";
  color: string;
  offsetX: number;
  offsetY: number;
  blur: number;
  spread?: number;
  opacity?: number;
}

interface InnerShadowEffect extends BaseEffect {
  type: "inner-shadow";
  color: string;
  offsetX: number;
  offsetY: number;
  blur: number;
  spread?: number;
  opacity?: number;
}

interface LayerBlurEffect extends BaseEffect {
  type: "layer-blur";
  blur: number;
}

interface BackgroundBlurEffect extends BaseEffect {
  type: "background-blur";
  blur: number;
}
```

Node 使用：

```ts
interface BaseNode {
  effects?: Effect[];
}
```

规则：

```txt
1. effects 是有序数组。
2. effects 顺序会影响渲染结果。
3. shadow / blur 会影响 dirty bounds，需要 effectPadding。
4. LOD 可以在低 zoom / 小 screenArea 时关闭或简化 effects。
5. effects 不要放进 features 数组。
```

---

### 6.0.5 TextRun

TextNode 不应该只有一个纯字符串和 fontSize。

为了支持富文本，需要 textRuns。

推荐：

```ts
interface TextNode extends BaseNode {
  type: "text";

  text: string;
  textRuns?: TextRun[];

  width?: number;
  height?: number;

  textStyle?: TextStyle;
  paragraphStyle?: ParagraphStyle;
}

interface TextRun {
  start: number;
  end: number;
  style: Partial<TextStyle>;
}

interface TextStyle {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number | string;
  fontStyle?: "normal" | "italic";

  fill?: Paint;
  opacity?: number;

  letterSpacing?: number;
  lineHeight?: number | "auto";

  textDecoration?: "none" | "underline" | "line-through";
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
}

interface ParagraphStyle {
  textAlign?: "left" | "center" | "right" | "justify";
  verticalAlign?: "top" | "middle" | "bottom";

  autoResize?: "none" | "width" | "height" | "both";
  paragraphSpacing?: number;
}
```

规则：

```txt
1. text 保存完整纯文本。
2. textStyle 是默认样式。
3. textRuns 覆盖部分字符范围的样式。
4. textRun 使用 start/end 范围，不复制文本内容。
5. text layout 结果属于 runtime cache，不写进文档源数据。
```

示例：

```ts
const textNode: TextNode = {
  id: "text-1",
  type: "text",
  parentId: null,
  transform: identity(),
  text: "Hello World",
  textStyle: {
    fontFamily: "Inter",
    fontSize: 16,
    fill: { type: "solid", color: "#111111" },
  },
  textRuns: [
    {
      start: 6,
      end: 11,
      style: {
        fontWeight: 700,
        fill: { type: "solid", color: "#ff0000" },
      },
    },
  ],
};
```

---

### 6.0.6 Clip / Mask

Clip / mask 是 group 或 node 的 compositing 属性。

```ts
interface BaseNode {
  clipPathId?: NodeId;
  maskId?: NodeId;
}
```

规则：

```txt
1. clipPathId / maskId 引用其他 node。
2. clip / mask 会影响 render bounds 和 dirty bounds。
3. group 上的 clip / mask 会作用于 children。
4. runtime 需要计算 effective clip / mask stack。
```

---

### 6.0.7 Extensions

业务或插件属性放 extensions，不要污染核心模型。

```ts
interface BaseNode {
  extensions?: Record<string, unknown>;
}
```

适合放 extensions 的内容：

```txt
AI 标注
外部业务 id
插件数据
实验性属性
非核心渲染属性
```

示例：

```ts
extensions: {
  ai: {
    prompt: 'generate card layout',
  },
  app: {
    sourceId: 'external-id-1',
  },
}
```

---

### 6.1 RectNode

```ts
interface RectNode extends BaseNode {
  type: "rect";

  x: number;
  y: number;
  width: number;
  height: number;

  radius?: CornerRadius;
}
```

### 6.2 PathNode

```ts
interface PathNode extends BaseNode {
  type: "path";

  d: string;

  fill?: Paint;
  stroke?: Stroke;
}
```

### 6.3 TextNode

```ts
interface TextNode extends BaseNode {
  type: "text";

  text: string;
  textRuns?: TextRun[];

  width?: number;
  height?: number;

  textStyle?: TextStyle;
  paragraphStyle?: ParagraphStyle;
}
```

### 6.4 ImageNode

```ts
interface ImageNode extends BaseNode {
  type: "image";

  assetId: string;
  width: number;
  height: number;
}
```

---

## 7. 多层 Group 示例

结构：

```txt
Root
  Group A
    Rect 1
    Group B
      Path 1
      Group C
        Text 1
```

数据：

```ts
const doc: DocumentModel = {
  version: 1,
  rootIds: ["group-a"],
  nodes: {
    "group-a": {
      id: "group-a",
      type: "group",
      parentId: null,
      transform: identity(),
      visible: true,
      locked: false,
      children: ["rect-1", "group-b"],
    },

    "rect-1": {
      id: "rect-1",
      type: "rect",
      parentId: "group-a",
      transform: identity(),
      visible: true,
      locked: false,
      x: 0,
      y: 0,
      width: 100,
      height: 80,
      fill: { type: "solid", color: "#ff0000" },
    },

    "group-b": {
      id: "group-b",
      type: "group",
      parentId: "group-a",
      transform: translate(200, 0),
      visible: true,
      locked: false,
      children: ["path-1", "group-c"],
    },

    "path-1": {
      id: "path-1",
      type: "path",
      parentId: "group-b",
      transform: identity(),
      visible: true,
      locked: false,
      d: "M 0 0 L 100 100",
    },

    "group-c": {
      id: "group-c",
      type: "group",
      parentId: "group-b",
      transform: rotate(30),
      visible: true,
      locked: false,
      children: ["text-1"],
    },

    "text-1": {
      id: "text-1",
      type: "text",
      parentId: "group-c",
      transform: identity(),
      visible: true,
      locked: false,
      text: "Hello",
      fontSize: 16,
    },
  },
};
```

---

## 8. Transform 规则

### 8.1 Local Transform

每个节点只保存 local transform。

```txt
worldMatrix(node) = worldMatrix(parent) * node.transform
```

例如：

```txt
Group A transform = translate(100, 100)
Group B transform = rotate(30)
Rect transform = scale(2, 2)

Rect worldMatrix =
  GroupA.matrix * GroupB.matrix * Rect.matrix
```

### 8.2 移动 Group

移动 group 时，只修改 group.transform。

不要修改所有 children 的 x / y / geometry。

```ts
function moveGroup(groupId: NodeId, dx: number, dy: number) {
  const group = doc.nodes[groupId];
  group.transform = multiply(group.transform, translate(dx, dy));

  markSubtreeWorldMatrixDirty(groupId);
  markBoundsDirtyUpward(groupId);
}
```

规则：

```txt
group transform 改变时，children local geometry 不变。
children worldMatrix 由 runtime 重新计算。
```

---

## 9. World Matrix 计算

递归计算可以这样理解：

```ts
function getWorldMatrix(nodeId: NodeId, doc: DocumentModel): Matrix2D {
  const node = doc.nodes[nodeId];

  if (!node.parentId) {
    return node.transform;
  }

  return multiply(getWorldMatrix(node.parentId, doc), node.transform);
}
```

实际 runtime 应使用缓存，避免重复递归。

```ts
function updateWorldMatrixTree(
  nodeId: NodeId,
  parentWorldMatrix: Matrix2D,
  doc: DocumentModel,
  runtime: RuntimeCache,
) {
  const node = doc.nodes[nodeId];
  const worldMatrix = multiply(parentWorldMatrix, node.transform);

  runtime.nodes[nodeId].worldMatrix = worldMatrix;
  runtime.nodes[nodeId].inverseWorldMatrix = invert(worldMatrix);

  if (node.type === "group") {
    for (const childId of node.children) {
      updateWorldMatrixTree(childId, worldMatrix, doc, runtime);
    }
  }
}
```

规则：

```txt
当一个 group transform 改变时，只需要重算这个 group subtree 的 worldMatrix。
```

---

## 10. Group Bounds

Group 本身没有固定几何。

Group bounds 应该由 children 推导。

```txt
groupLocalBounds = union(children bounds in group local space)
groupWorldBounds = AABB(groupWorldMatrix applied to groupLocalBounds)
```

不要每帧深度遍历所有 children。

Runtime 应缓存：

```ts
interface GroupRuntimeCache {
  localBounds: Rect;
  worldBounds: Rect;
  subtreeVersion: number;
}
```

当 child bounds 改变：

```txt
child bounds dirty
  -> parent group bounds dirty
  -> parent parent group bounds dirty
  -> until root
```

---

## 11. Create Group

把多个节点包进 group 时，要保持视觉位置不变。

原结构：

```txt
parent
  A
  B
```

新结构：

```txt
parent
  group G
    A
    B
```

简单版：

```txt
group.transform = identity
children transform 不变
```

更标准版：

```txt
group.transform = translate(groupBounds.x, groupBounds.y)
child.transform = inverse(group.transform) * oldChildTransform
```

这样 group local 坐标从 group bounds 左上角开始，更适合编辑器。

创建 group 时必须更新：

```txt
1. 新建 group node
2. group.parentId = original parent
3. group.children = selected node ids
4. selected nodes parentId = group.id
5. parent.children 中用 group id 替换 selected node ids
6. 保持 z-order
7. mark worldMatrix / bounds dirty
```

---

## 12. Ungroup

Ungroup 时才需要把 group transform bake 到 children。

原结构：

```txt
parent
  group G
    child A
    child B
```

Ungroup 后：

```txt
parent
  child A
  child B
```

为了视觉不变：

```txt
child.transform = group.transform * child.transform
child.parentId = group.parentId
```

伪代码：

```ts
function ungroup(groupId: NodeId) {
  const group = doc.nodes[groupId] as GroupNode;
  const parentId = group.parentId;

  for (const childId of group.children) {
    const child = doc.nodes[childId];

    child.transform = multiply(group.transform, child.transform);
    child.parentId = parentId;
  }

  replaceGroupWithChildrenInParent(groupId, group.children);
  delete doc.nodes[groupId];
}
```

注意：

```txt
如果 group 有 opacity / clip / mask / blendMode，不能简单 ungroup。
需要 bake compositing，或者阻止 ungroup，或者提示视觉可能变化。
```

---

## 13. Z-Order

同一个 parent 下，children 数组顺序就是层级顺序。

推荐规则：

```txt
children[0] = bottom
children[children.length - 1] = top
```

渲染时：

```txt
正向遍历 children
```

Hit test 时：

```txt
反向遍历 children
```

移动层级只修改 parent.children 顺序。

不要通过修改 geometry 或 transform 表示层级。

---

## 14. Visible / Locked / Opacity 继承

不要把 inherited visible / locked / opacity 写进文档源数据。

Runtime 中计算：

```ts
effectiveVisible = parentEffectiveVisible && node.visible;
effectiveLocked = parentEffectiveLocked || node.locked;
effectiveOpacity = parentEffectiveOpacity * (node.opacity ?? 1);
```

规则：

```txt
parent hidden:
  children 全部不可见

parent locked:
  children 全部不可编辑

parent opacity:
  children effectiveOpacity 会继承相乘
```

---

## 15. Runtime Cache

以下数据不要写进文档源数据。

应该放在 runtime cache。

```ts
interface RuntimeNodeState {
  id: NodeId;

  worldMatrix: Matrix2D;
  inverseWorldMatrix: Matrix2D;

  localBounds: Rect;
  worldBounds: Rect;
  screenBounds: Rect;

  effectiveVisible: boolean;
  effectiveLocked: boolean;
  effectiveOpacity: number;

  subtreeVersion: number;
  boundsVersion: number;
  renderVersion: number;
}

interface RuntimeCache {
  nodes: Record<NodeId, RuntimeNodeState>;
}
```

规则：

```txt
Document Model 是源数据。
Runtime Cache 是派生数据。
Runtime Cache 可以随时重建。
```

---

## 16. 与 Quadtree 的关系

Group 和 quadtree 可以有两种策略。

### 16.1 Leaf Index

```txt
quadtree contains rect/path/text/image
Group 不进 quadtree 或只作为辅助
```

优点：

```txt
hit test 精确
```

缺点：

```txt
大 group transform 时要更新所有 children bounds
```

### 16.2 Group Index

```txt
quadtree contains group bounds
hit group 后进入 group local hit test
```

优点：

```txt
group transform 更新便宜
```

缺点：

```txt
hit test pipeline 更复杂
```

推荐混合：

```txt
small group:
  index children

large group:
  index group bounds
  children lazy / local hit test
```

默认阈值：

```txt
groupChildrenCount > 500:
  index group bounds

groupChildrenCount <= 500:
  index leaf children
```

也可以由 group.indexingMode 控制：

```txt
indexingMode = auto:
  runtime 根据 children count 决定

indexingMode = group:
  index group bounds

indexingMode = children:
  index children
```

---

## 17. 与 Dirty / Cache Invalidation 的关系

文档模型不直接存 tile dirty 状态，但文档操作必须能产出 dirty 信息。

Transform commit 后：

```txt
1. oldWorldBounds
2. newWorldBounds
3. dirtyBounds = union(oldWorldBounds, newWorldBounds)
4. dirtyBounds inflate by effect padding
5. affected tile / overview / render cache invalidated
```

Group transform commit 后：

```txt
small group:
  update children world bounds
  dirty old group bounds + new group bounds

large group:
  update group world bounds
  dirty old group bounds + new group bounds
  children bounds lazy update if possible
```

---

## 18. 最终规则

```txt
1. Document 使用 normalized graph。
2. group.children 只存 NodeId[]。
3. child.parentId 指向 parent。
4. 每个节点只存 local transform。
5. worldMatrix / worldBounds / screenBounds 是 runtime cache。
6. group bounds 由 children union 推导。
7. group transform 改变时，不改 child geometry。
8. ungroup 时才 bake group transform 到 children。
9. children 顺序表示 z-order。
10. visible / locked / opacity 在 runtime 继承计算。
11. 大 group 可以在 spatial index 中按 group bounds 索引。
12. 小 group 可以按 children 索引。
13. transform commit 后，用 old bounds + new bounds 做 dirty。
14. dirty bounds 决定后续 cache invalidation。
15. 核心渲染属性直接字段化，例如 fill / stroke / effects / radius / textRuns。
16. 阴影 / blur 等统一放 effects。
17. 渐变通过 Paint 表达，不做 features 数组。
18. 业务或插件属性放 extensions。
```

一句话：

```txt
文档模型存结构和局部变换，runtime 存世界矩阵、bounds、索引和缓存。
```
