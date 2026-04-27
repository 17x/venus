# Vector Runtime Adapter / History / Collaboration 设计

## 1. 核心结论

Vector Document、Runtime Cache、Engine Render Model、History、Collaboration 不能混成一坨。

推荐分层：

```txt
Vector Document Model
  源数据
  nodes / rootIds / assets / styles
  local transform / group / textRuns / fills / strokes / effects

Vector Command Layer
  用户操作语义
  move / resize / rotate / editText / createGroup / ungroup / reorder / changeStyle

History Layer
  本地 undo / redo
  基于 transaction + document patch / operation log

Collaboration Layer
  多人同步
  基于 operation / transaction / CRDT or OT

Vector Runtime Cache
  派生数据
  worldMatrix / worldBounds / renderBounds / effective style / drawOrder / layout result / text layout result

Vector -> Engine Adapter
  把 dirty runtime state 转成 EngineScenePatch

Engine Render Model
  扁平化或半扁平化 render nodes
  worldMatrix / bounds / normalized style / geometry / versions

Engine Runtime
  quadtree / tile cache / snapshot / LOD / render batches / hit test acceleration
```

一句话：

```txt
History 和 Collaboration 都应该基于 Vector Command / Document Operation。
Engine patch 只是 adapter 派生出来的渲染更新，不应该作为历史或协作的源数据。
```

---

## 2. 为什么不能用 Engine Patch 做历史或协作

Engine patch 是渲染层 patch，例如：

```txt
update worldMatrix
update renderBounds
update normalized style
update drawOrder
mark dirty tile bounds
update quadtree entry
```

这些都不是用户真正编辑的源语义。

不要这样：

```txt
History:
  record EngineScenePatch

Collaboration:
  sync EngineScenePatch
```

原因：

```txt
1. EngineScenePatch 是派生数据，不是 source of truth。
2. worldMatrix / renderBounds 可以从 document + runtime 重新算。
3. tile dirty / quadtree / GPU buffer 不应该进入历史。
4. 协作同步 engine patch 会导致不同客户端 runtime 状态不一致。
5. engine patch 无法表达用户意图，例如 createGroup / ungroup / editText / reorder。
6. undo / redo 需要恢复文档语义，不是恢复渲染缓存。
```

正确做法：

```txt
History:
  record Vector Transaction / Document Operation

Collaboration:
  sync Vector Transaction / Document Operation

Adapter:
  derive EngineScenePatch from updated document/runtime
```

---

## 3. 整体数据流

### 3.1 本地编辑流程

```txt
User Input
  -> Vector Command
  -> Vector Transaction
  -> apply Document Operations
  -> update Vector Document
  -> update Vector Runtime Cache
  -> generate RuntimeDirtyInfo
  -> Adapter creates EngineScenePatch
  -> Engine applies patch
  -> Engine invalidates quadtree / tile / cache
  -> render
  -> History records transaction
  -> Collaboration broadcasts operation if needed
```

### 3.2 Undo 流程

```txt
history.undo()
  -> get inverse transaction
  -> apply inverse Document Operations
  -> update Vector Document
  -> update Runtime Cache
  -> Adapter creates EngineScenePatch
  -> Engine applies patch
  -> optionally broadcast undo operation to collaboration layer
```

### 3.3 Redo 流程

```txt
history.redo()
  -> reapply transaction
  -> update Vector Document
  -> update Runtime Cache
  -> Adapter creates EngineScenePatch
  -> Engine applies patch
  -> optionally broadcast redo operation to collaboration layer
```

### 3.4 Remote Collaboration 流程

```txt
receive remote operations
  -> transform / merge / CRDT apply
  -> update Vector Document
  -> update Runtime Cache
  -> Adapter creates EngineScenePatch
  -> Engine applies patch
  -> render
  -> do not push into local undo stack as normal local history
```

---

## 4. Command / Operation / Patch 的区别

这三个概念必须分清。

```txt
Command:
  用户意图
  例如 moveSelectedNodes(dx, dy)

Operation:
  可同步、可回放的文档修改
  例如 setNodeTransform(nodeId, oldTransform, newTransform)

Patch:
  批量 apply 的文档差异
  例如 updated nodes / parent children changes / assets changes
```

推荐：

```txt
UI 层产生 Command。
Command 生成 Transaction。
Transaction 包含 Operations。
Operations 可以转成 DocumentPatch。
History 存 Transaction。
Collaboration 同步 Operations 或 Transaction。
Adapter 不关心 Command，只关心文档变更后的 dirty 信息。
```

---

## 5. Transaction 模型

```ts
export type TransactionId = string;
export type OperationId = string;
export type ClientId = string;

export interface VectorTransaction {
  id: TransactionId;
  clientId: ClientId;

  /**
   * Monotonic local sequence.
   */
  seq: number;

  name: string;

  operations: VectorOperation[];

  /**
   * Inverse operations for undo.
   * Can be generated at commit time.
   */
  inverseOperations?: VectorOperation[];

  /**
   * Optional editor state. Keep small.
   */
  beforeSelection?: SelectionState;
  afterSelection?: SelectionState;

  beforeViewport?: ViewportState;
  afterViewport?: ViewportState;

  createdAt: number;
}
```

规则：

```txt
1. 一个用户动作对应一个 transaction。
2. drag / transform 的 pointermove 不写 history。
3. drag start 创建 transaction draft。
4. drag end commit 成一个 transaction。
5. text editing 可以按输入批量合并 transaction。
6. style slider 连续调整可以 debounce / squash 成一个 transaction。
```

---

## 6. VectorOperation 设计

Operation 应该表达文档源数据变化，而不是 engine 渲染变化。

```ts
export type VectorOperation =
  | AddNodeOperation
  | RemoveNodeOperation
  | UpdateNodeOperation
  | SetParentChildrenOperation
  | ReorderNodeOperation
  | AddAssetOperation
  | RemoveAssetOperation
  | UpdateAssetOperation
  | SetRootIdsOperation;
```

### 6.1 Add / Remove Node

```ts
export interface AddNodeOperation {
  type: "add-node";
  node: SceneNode;
  parentId: NodeId | null;
  index: number;
}

export interface RemoveNodeOperation {
  type: "remove-node";
  nodeId: NodeId;

  /**
   * Required for undo.
   */
  oldNode: SceneNode;
  oldParentId: NodeId | null;
  oldIndex: number;
}
```

### 6.2 Update Node

```ts
export interface UpdateNodeOperation {
  type: "update-node";
  nodeId: NodeId;

  /**
   * JSON pointer / path-like field path.
   * Example: ['transform'], ['fills'], ['textStyle', 'fontSize']
   */
  path: Array<string | number>;

  oldValue: unknown;
  newValue: unknown;
}
```

示例：

```ts
const op: UpdateNodeOperation = {
  type: "update-node",
  nodeId: "rect-1",
  path: ["fills"],
  oldValue: [{ type: "solid", color: "#ff0000" }],
  newValue: [{ type: "solid", color: "#00ff00" }],
};
```

### 6.3 Parent / Children / Reorder

```ts
export interface SetParentChildrenOperation {
  type: "set-parent-children";
  parentId: NodeId | null;
  oldChildren: NodeId[];
  newChildren: NodeId[];
}

export interface ReorderNodeOperation {
  type: "reorder-node";
  parentId: NodeId | null;
  nodeId: NodeId;
  oldIndex: number;
  newIndex: number;
}
```

### 6.4 Assets

```ts
export interface AddAssetOperation {
  type: "add-asset";
  asset: AssetRef;
}

export interface RemoveAssetOperation {
  type: "remove-asset";
  assetId: AssetId;
  oldAsset: AssetRef;
}

export interface UpdateAssetOperation {
  type: "update-asset";
  assetId: AssetId;
  oldAsset: AssetRef;
  newAsset: AssetRef;
}
```

### 6.5 Root Ids

```ts
export interface SetRootIdsOperation {
  type: "set-root-ids";
  oldRootIds: NodeId[];
  newRootIds: NodeId[];
}
```

---

## 7. History 设计

History 记录本地用户提交的 transaction。

```ts
export interface HistoryState {
  undoStack: VectorTransaction[];
  redoStack: VectorTransaction[];
}
```

提交本地 transaction：

```ts
function commitLocalTransaction(tx: VectorTransaction): void {
  applyOperations(document, tx.operations);
  updateRuntimeFromOperations(tx.operations);

  const enginePatch = adapter.createEnginePatchFromOperations(tx.operations);
  engine.applyScenePatch(enginePatch);

  history.undoStack.push(tx);
  history.redoStack.length = 0;

  collaboration.broadcast(tx);
}
```

Undo：

```ts
function undo(): void {
  const tx = history.undoStack.pop();
  if (!tx) return;

  const inverse = tx.inverseOperations ?? invertOperations(tx.operations);

  applyOperations(document, inverse);
  updateRuntimeFromOperations(inverse);

  const enginePatch = adapter.createEnginePatchFromOperations(inverse);
  engine.applyScenePatch(enginePatch);

  history.redoStack.push(tx);

  collaboration.broadcast({
    ...tx,
    id: createTransactionId(),
    name: `Undo ${tx.name}`,
    operations: inverse,
    inverseOperations: tx.operations,
  });
}
```

Redo：

```ts
function redo(): void {
  const tx = history.redoStack.pop();
  if (!tx) return;

  applyOperations(document, tx.operations);
  updateRuntimeFromOperations(tx.operations);

  const enginePatch = adapter.createEnginePatchFromOperations(tx.operations);
  engine.applyScenePatch(enginePatch);

  history.undoStack.push(tx);

  collaboration.broadcast(tx);
}
```

规则：

```txt
1. History 只记录本地用户 transaction。
2. Remote transaction 不应该直接进入本地 undoStack。
3. Undo / redo 本质上也是新的 document operation，需要同步给协作层。
4. EnginePatch 不写入 history。
```

---

## 8. Collaboration 设计

Collaboration 应该同步 operation / transaction，而不是同步 engine patch。

```ts
export interface CollaborationMessage {
  type: "transaction";
  documentId: string;
  baseVersion: number;
  transaction: VectorTransaction;
}
```

接收远程 transaction：

```ts
function applyRemoteTransaction(message: CollaborationMessage): void {
  const tx = transformRemoteTransactionIfNeeded(message.transaction);

  applyOperations(document, tx.operations);
  updateRuntimeFromOperations(tx.operations);

  const enginePatch = adapter.createEnginePatchFromOperations(tx.operations);
  engine.applyScenePatch(enginePatch);

  // Do not push remote tx into local undoStack.
  collaborationLog.append(tx);
}
```

规则：

```txt
1. Collaboration 同步 VectorTransaction / VectorOperation。
2. 不同步 EngineScenePatch。
3. 不同步 quadtree / tile / snapshot / GPU buffer。
4. 远程 transaction apply 后，也走同样的 runtime update + adapter + engine patch。
5. 远程 transaction 不进入本地 undoStack。
6. 本地 undo 产生新的 inverse operation，并同步给远程。
```

---

## 9. Collaboration 与 Undo 的关系

多人协作下，undo 不能简单理解成“回到上一个全局状态”。

推荐第一版策略：

```txt
local undo only undoes local user's own last transaction.
```

也就是说：

```txt
User A 操作 A1
User B 操作 B1
User A undo

结果：
  只撤销 A1
  不撤销 B1
```

这叫 local undo。

实现方式：

```txt
1. undoStack 只存本地 tx。
2. remote tx 只进入 collaboration log，不进入 undoStack。
3. 本地 undo 时生成 inverse tx。
4. inverse tx 通过 collaboration 同步出去。
```

注意：

```txt
如果 A1 和 B1 修改同一节点同一字段，undo 需要冲突处理。
```

第一版可以采用：

```txt
last writer wins + conflict warning
```

长期可以升级：

```txt
OT / CRDT / per-field operation transform
```

---

## 10. Operation Conflict 策略

协作里最容易冲突的是：

```txt
同一 node 同一字段被多人修改
同一 parent.children 被多人 reorder
一人删除节点，另一人修改该节点
一人 ungroup，另一人移动 group child
文本多人编辑
```

第一版建议：

```txt
1. node scalar field:
   last writer wins

2. transform:
   last writer wins 或 matrix delta compose

3. style:
   per-field merge，例如 fills 和 effects 分开处理

4. parent.children reorder:
   使用 operation order + stable id 排序兜底

5. delete vs update:
   delete wins，update dropped or converted to no-op

6. text:
   第一版锁定 TextNode editing，长期使用 text CRDT
```

---

## 11. Runtime DirtyInfo

Operations apply 后，需要生成 RuntimeDirtyInfo。

```ts
export interface RuntimeDirtyInfo {
  changedNodeIds: NodeId[];
  addedNodeIds: NodeId[];
  removedNodeIds: NodeId[];

  transformChangedNodeIds: NodeId[];
  geometryChangedNodeIds: NodeId[];
  styleChangedNodeIds: NodeId[];
  textChangedNodeIds: NodeId[];
  orderChangedParentIds: Array<NodeId | null>;

  dirtyBounds: Rect[];
}
```

作用：

```txt
1. runtime cache 根据 dirty info 局部更新。
2. adapter 根据 dirty info 生成 engine patch。
3. engine 根据 dirtyBounds 做 cache invalidation。
```

---

---

## 11.1 Vector 到 Engine 的转换模型

Engine 不应该直接吃完整的 Vector Document。

Vector Document 会包含大量编辑语义：

```txt
group
frame
component
instance
variant
auto layout
textRuns
paint
effects
mask
clip
export settings
prototype
plugin data
extensions
```

这些不全是 engine 必须理解的渲染数据。

正确结构：

```txt
Vector Document Model
  完整语义源数据

Vector Runtime Cache
  worldMatrix / bounds / effective style / drawOrder / layout result / text layout result

Vector -> Engine Adapter
  把 runtime 派生数据转换成 engine 可消费的 render node / patch

Engine Render Model
  扁平化或半扁平化的渲染数据
```

一句话：

```txt
Vector 存完整语义，Engine 吃渲染友好的扁平数据。
```

不要这样：

```ts
engine.setDocument(vectorDocument);
```

推荐：

```ts
const patch = adapter.createEnginePatchFromDirtyInfo(runtimeDirtyInfo);
engine.applyScenePatch(patch);
```

---

## 11.2 EngineRenderNode

EngineRenderNode 应该是渲染友好的节点，不是完整业务节点。

Engine 需要的是：

```txt
id
type
drawOrder
parentId / ancestorIds
worldMatrix
worldBounds
renderBounds
visible
opacity
blendMode
geometry
normalized style
clip / mask boundary
versions
```

推荐结构：

```ts
export type EngineNodeId = string;

export type EngineRenderNodeType =
  | "rect"
  | "ellipse"
  | "polygon"
  | "star"
  | "line"
  | "path"
  | "text"
  | "image"
  | "group"
  | "frame"
  | "boolean-operation";

export interface EngineRenderNode {
  id: EngineNodeId;
  type: EngineRenderNodeType;

  /**
   * Flattened draw order.
   * Smaller means rendered earlier / lower.
   */
  drawOrder: number;

  /**
   * Optional original parent path.
   * Useful for debugging, group invalidation, and hit result path.
   */
  parentId?: EngineNodeId | null;
  ancestorIds?: EngineNodeId[];

  /**
   * Resolved world transform.
   * Engine should not walk parent chain for normal rendering.
   */
  worldMatrix: Matrix2D;

  /** Bounds in world space without effects. */
  worldBounds: Rect;

  /** Bounds including stroke / shadow / blur / effects. */
  renderBounds: Rect;

  visible: boolean;
  opacity: number;
  blendMode?: BlendMode;

  geometry: EngineGeometry;
  style: EngineStyle;

  clip?: EngineClipRef;
  mask?: EngineMaskRef;

  geometryVersion: number;
  styleVersion: number;
  transformVersion: number;
  layoutVersion?: number;
}
```

规则：

```txt
1. Engine 接收 worldMatrix，不接收 local transform 链。
2. Engine 接收 worldBounds / renderBounds，不自己理解完整 group 树。
3. Engine 接收已经 normalize 的 fills / strokes / effects。
4. EngineRenderNode 是 render data，不是 document source。
```

---

## 11.3 EngineGeometry

Vector 几何需要在 adapter 层转换成 engine 几何。

例如：

```txt
PathNode.d
  -> PathCommand[]

TextNode.textRuns
  -> EngineTextRun[]

CornerRadius
  -> NormalizedCornerRadius
```

推荐结构：

```ts
export type EngineGeometry =
  | EngineRectGeometry
  | EngineEllipseGeometry
  | EnginePolygonGeometry
  | EngineStarGeometry
  | EngineLineGeometry
  | EnginePathGeometry
  | EngineTextGeometry
  | EngineImageGeometry
  | EngineGroupGeometry;

export interface EngineRectGeometry {
  type: "rect";
  x: number;
  y: number;
  width: number;
  height: number;
  radius?: NormalizedCornerRadius;
  cornerSmoothing?: number;
}

export interface EngineEllipseGeometry {
  type: "ellipse";
  x: number;
  y: number;
  width: number;
  height: number;
  startAngle?: number;
  endAngle?: number;
  innerRadius?: number;
}

export interface EnginePolygonGeometry {
  type: "polygon";
  x: number;
  y: number;
  radius: number;
  sides: number;
}

export interface EngineStarGeometry {
  type: "star";
  x: number;
  y: number;
  outerRadius: number;
  innerRadius: number;
  points: number;
}

export interface EngineLineGeometry {
  type: "line";
  from: Point;
  to: Point;
}

export interface EnginePathGeometry {
  type: "path";
  commands: PathCommand[];
  fillRule?: "nonzero" | "evenodd";
}

export interface EngineTextGeometry {
  type: "text";
  text: string;
  runs: EngineTextRun[];
  width?: number;
  height?: number;
}

export interface EngineImageGeometry {
  type: "image";
  assetId: AssetId;
  width: number;
  height: number;
}

export interface EngineGroupGeometry {
  type: "group";
}
```

规则：

```txt
1. EngineGeometry 应该尽量贴近 renderer 需要的数据。
2. adapter 负责 path string -> path commands。
3. adapter 负责 textRuns -> engine text runs。
4. adapter 负责 radius normalize。
5. engine 不应该反复解析 document 级复杂结构。
```

---

## 11.4 EngineStyle

EngineStyle 应该是 normalized style。

不要让 engine 同时处理 `fill` 和 `fills` 的兼容逻辑。

```ts
export interface EngineStyle {
  fills: EnginePaint[];
  strokes: EngineStroke[];
  effects: EngineEffect[];

  opacity: number;
  blendMode: BlendMode;
}
```

Adapter 负责 normalize：

```ts
function normalizeFills(node: BaseNode): Paint[] {
  if (node.fills) return node.fills;
  if (node.fill) return [node.fill];
  return [];
}

function normalizeStrokes(node: BaseNode): Stroke[] {
  if (node.strokes) return node.strokes;
  if (node.stroke) return [node.stroke];
  return [];
}
```

规则：

```txt
1. engine 不关心 fill / fills 的兼容分支。
2. engine 只接收 normalized fills / strokes / effects。
3. adapter 负责从 vector node 转换到 engine style。
4. styleVersion 只在 normalized style 变化时增加。
```

---

## 11.5 Flatten / Semi-flatten 策略

### 11.5.1 完全 Flatten

把 group 展开，engine 只拿 leaf render nodes。

```txt
Vector:
  Group A
    Rect 1
    Group B
      Text 1

Engine:
  Rect 1 with resolved worldMatrix
  Text 1 with resolved worldMatrix
```

优点：

```txt
1. engine 简单。
2. 渲染快。
3. tile / quadtree / hittest 容易。
```

缺点：

```txt
1. group opacity / blendMode / clip / mask 较难处理。
2. group cache / group thumbnail 不方便。
3. hit test 返回 group 需要额外映射。
```

适合第一版。

### 11.5.2 Semi-flatten with Render Boundary

保留有渲染边界的 group / frame / component。

需要 render boundary 的情况：

```txt
group opacity != 1
group blendMode != pass-through / normal
group has clip / mask
group has effects
frame clipsContent = true
component thumbnail cache
```

推荐长期方案：

```txt
简单 group:
  flatten children

有 opacity / blendMode / clip / mask / effects 的 group:
  作为 render boundary 传给 engine
```

规则：

```txt
1. 第一版可以完全 flatten。
2. 遇到 compositing 需求时引入 render boundary。
3. render boundary 仍然是 EngineRenderNode，不是完整 Vector GroupNode。
4. hit test 返回 leaf 后，由 vector/editor 决定选 child 还是选 group。
```

---

## 11.6 Vector 到 Engine 的转换性能

转换本身不是最大问题。

真正危险的是：

```txt
1. 每帧全量遍历 document tree。
2. 每帧重新计算所有 worldMatrix。
3. 每帧 normalize 所有 style。
4. 每帧生成完整 EngineScene。
5. 每帧重建 quadtree。
6. 每帧重建 tile cache。
```

正确方式：

```txt
1. vector runtime 缓存 worldMatrix / bounds / effective style。
2. adapter 只转换 dirty nodes。
3. engine 只接收 patch。
4. transform 中 active element live render，不每帧 dirty tile。
5. commit 后再更新 quadtree 和 cache invalidation。
6. dynamic overlay 单独传，不进入 static scene。
```

结论：

```txt
如果全量转换：
  100K 元素会非常危险。

如果增量 patch：
  性能瓶颈主要在渲染 / tile / texture upload，而不是 vector -> engine 转换。
```

---

## 12. Adapter 生成 EngineScenePatch

Adapter 不应该重新深遍历整棵树。

它应该基于 RuntimeDirtyInfo 处理局部节点。

```ts
function createEnginePatchFromDirtyInfo(
  dirty: RuntimeDirtyInfo,
): EngineScenePatch {
  return {
    sceneVersion: runtime.sceneVersion,
    added: dirty.addedNodeIds.map(toEngineRenderNode),
    updated: dirty.changedNodeIds.map(toEngineRenderNodeUpdate),
    removed: dirty.removedNodeIds,
    dirtyBounds: dirty.dirtyBounds,
    orderChanged: dirty.orderChangedParentIds.flatMap(createOrderUpdates),
  };
}
```

规则：

```txt
1. transform change -> EngineRenderNodeUpdate.transform。
2. style change -> EngineRenderNodeUpdate.style。
3. geometry change -> EngineRenderNodeUpdate.geometry。
4. text change -> EngineRenderNodeUpdate.geometry + layoutVersion。
5. reorder -> orderChanged。
6. add node -> added。
7. remove node -> removed。
```

---

## 13. Transform / Drag 与 History / Collaboration

Drag / transform 不能每帧写 history 或 broadcast。

正确流程：

```txt
transform start:
  record oldWorldBounds
  record old transform
  start transaction draft
  mark active element

transforming:
  Active Element Layer live render
  do not write history
  do not broadcast every pointermove
  optionally broadcast lightweight presence / preview only

transform commit:
  produce update-node operation for transform
  compute inverse operation
  commit one transaction
  history.push(transaction)
  collaboration.broadcast(transaction)
  update runtime
  adapter sends engine patch
```

实时协作预览可以单独走 presence channel：

```ts
interface PresenceTransformPreview {
  type: "presence-transform-preview";
  clientId: ClientId;
  nodeIds: NodeId[];
  previewTransform: Matrix2D;
  color?: string;
}
```

规则：

```txt
1. presence preview 不进入 document。
2. presence preview 不进入 history。
3. presence preview 不 dirty tile。
4. commit transaction 才改变 document source。
```

---

## 14. Text Editing 与 History / Collaboration

Text editing 比 transform 更复杂。

第一版建议：

```txt
单人锁定当前 TextNode editing。
远程用户看到 editing presence。
commit 时提交 text update transaction。
```

长期方案：

```txt
Text CRDT。
```

推荐第一版流程：

```txt
text edit start:
  lock text node locally or broadcast editing presence

editing:
  update local active text layer
  optional debounce local document update
  do not create history entry per keystroke

commit:
  squash changes into one transaction
  update text / textRuns
  dirty old text bounds + new text bounds
  broadcast transaction
```

规则：

```txt
1. 不要每个字符一个 history entry。
2. 使用 composition transaction。
3. 以 blur / enter / idle debounce 作为 commit 边界。
4. 多人同文本文档长期需要 CRDT。
```

---

## 15. Group / Ungroup 与 History / Collaboration

Group / ungroup 是结构操作，需要记录 parent.children 和 parentId 变化。

Create group transaction 应包含：

```txt
1. add-node group
2. update selected nodes parentId
3. set-parent-children old parent children
4. set-parent-children group children
5. optional transform changes to preserve visual position
```

Ungroup transaction 应包含：

```txt
1. update children transform = group.transform * child.transform
2. update children parentId
3. replace group with children in parent.children
4. remove group node
```

规则：

```txt
1. group / ungroup 必须是一个 transaction。
2. undo group 可以恢复原 parent/children 状态。
3. 协作同步 group / ungroup 时，需要处理其他用户对相关 children 的并发修改。
```

---

## 16. Remote Operations 对 History 的影响

远程操作来了以后，本地 undoStack 里的 oldValue 可能过期。

简单版可以接受：

```txt
local undo 使用 transaction 创建时记录的 inverseOperations。
如果字段已被 remote 修改，undo 可能覆盖 remote 结果。
```

更好的策略：

```txt
undo 前检查 touched fields 当前值是否仍然等于 redo 后的值。
```

例如：

```txt
A 把 rect fill 从 red 改 blue。
B 把 rect fill 从 blue 改 green。
A undo。

如果直接 undo：
  fill 变 red，覆盖 B 的 green。

更安全：
  检查当前 fill 是否等于 blue。
  如果不是 blue，则提示 conflict 或 skip。
```

第一版建议：

```txt
per-field conflict check。
冲突时 skip undo op 或提示用户。
```

---

## 17. EngineScenePatch 不进 Collaboration

EngineScenePatch 可以包含：

```txt
worldMatrix
renderBounds
normalized style
drawOrder
dirtyBounds
```

但是这些不应该同步。

原因：

```txt
1. 不同客户端 viewport / dpr / cache / LOD 不同。
2. 不同客户端字体 / image decode / GPU 状态可能不同。
3. renderBounds 可能依赖本地字体度量或 renderer 实现。
4. 同步 engine patch 会增加网络流量。
```

正确做法：

```txt
sync document operations
local derive engine patch
```

---

## 18. 最终规则

```txt
1. History 记录 VectorTransaction，不记录 EngineScenePatch。
2. Collaboration 同步 VectorTransaction / VectorOperation，不同步 EngineScenePatch。
3. Engine patch 是 adapter 派生产物，可以随时重建。
4. Remote transaction 不进入本地 undoStack。
5. 本地 undo 生成新的 inverse transaction，并同步给远程。
6. Drag / transform 每次 commit 一个 transaction，不每帧写 history。
7. Transform preview 可以走 presence，不进入 document/history。
8. Text editing 需要合并 transaction，不要每个字符一个 history entry。
9. Group / ungroup 必须作为一个 transaction。
10. RuntimeDirtyInfo 是 document operation 到 engine patch 的桥梁。
11. Adapter 基于 dirty info 增量生成 EngineScenePatch。
12. 不要每帧全量转换 document。
13. 不要把 quadtree / tile / snapshot / GPU buffer 放进历史或协作。
14. 多人协作下 undo 默认只撤销本地用户自己的 transaction。
15. 冲突处理第一版可用 last writer wins + per-field conflict check。
```

一句话：

```txt
Document Operation 是历史和协作的共同语言；Engine Patch 只是本地渲染派生结果。
```
