

# Isolation Editing 设计文档

## 1. 目标

Isolation Editing 指的是元素进入独立编辑状态后，正常场景变暗或变灰，被编辑元素从普通场景中视觉上分离出来，在一个独立编辑层中进行修改。

典型效果：

```txt
普通画布
  ↓
双击元素 / 进入特殊编辑模式
  ↓
主场景变灰、弱化、不可交互
  ↓
目标元素在独立层中编辑
  ↓
提交或取消
  ↓
回到普通编辑模式
```

这个能力适合：

```txt
path-edit
  编辑路径锚点和贝塞尔控制柄

text-edit
  编辑文本内容

image-crop
  裁剪图片

group-edit
  进入 group 内部编辑

component-edit
  编辑组件内部结构
```

## 2. 核心原则

Isolation Editing 不是把元素真的从 document 中移走。

正确方式：

```txt
原 document 保持不变
进入 isolation 时复制目标节点为 draft
普通场景渲染时排除原始目标节点
独立编辑层渲染 draft
编辑过程只修改 draft
commit 时把 draft diff 回原节点
cancel 时丢弃 draft
```

错误方式：

```txt
进入 isolation 时从 document 删除 node
把 node 移动到另一个 document
退出时再插回原 document
```

不要这样做。它会导致：

```txt
- history 混乱
- selection id 变化
- undo / redo 难处理
- collaboration 难处理
- layer panel 状态混乱
- document tree 结构被临时污染
```

## 3. 分层职责

按照当前结构，职责应该这样分：

```txt
@venus/lib
  提供底层通用能力，例如 clone、diff、geometry、id、matrix、rect、point。

@venus/editor-primitive
  定义 isolation interaction mode、session 协议、事件路由规则、target priority、operation result intent。
  不知道具体 vector document 结构。
  不持有真实 draft 数据。
  不执行 commit/cancel 副作用。

engine
  提供隔离渲染能力。
  支持 dim scene、exclude node、render isolation draft、hit-test scope。
  不持有 isolation session。
  不知道 commit/cancel。
  不修改 document。

apps/vector
  持有 isolation session。
  负责 snapshot、draft、enter、commit、cancel。
  负责把 draft diff 成 command。
  负责 undo/redo history。
  负责 Done / Cancel UI。
```

一句话：

```txt
隔离状态在 apps/vector。
隔离交互协议在 editor-primitive。
隔离渲染能力在 engine。
底层算法工具在 @venus/lib。
```

## 4. Runtime 模型

进入 isolation 后，可以理解为临时创建了一个子 runtime。

它不是新的 app，也不是新的 document。

它是一个局部编辑 runtime：

```txt
Normal Runtime
  负责普通 scene、普通 selection、普通 tool、普通 operation。

Isolation Runtime
  只负责当前被隔离对象的内部编辑。
  有自己的 draft。
  有自己的局部 selection。
  有自己的局部 operation。
  有自己的 overlay。
  有自己的 hit-test scope。
```

推荐状态结构：

```ts
export interface VectorEditorRuntimeState {
  mode: 'normal' | 'isolation';
  normal: NormalRuntimeState;
  isolation: IsolationRuntimeState | null;
}
```

```ts
export interface IsolationRuntimeState<TDraft = unknown> {
  sessionId: string;
  targetId: string;
  kind: IsolationKind;

  snapshot: TDraft;
  draft: TDraft;

  selection: IsolationSelectionState;
  operation: IsolationOperationState;
  tool: IsolationToolState;

  phase: 'active' | 'committing' | 'cancelled' | 'completed';
}
```

```ts
export type IsolationKind =
  | 'path-edit'
  | 'text-edit'
  | 'image-crop'
  | 'group-edit'
  | 'component-edit';
```

## 5. `@venus/lib` 职责

`@venus/lib` 只放底层通用能力。

它可以提供：

```txt
- id generator
- deep clone / structured clone helper
- object diff / patch helper
- point / rect / matrix / bounds utilities
- geometry transform helper
- hit tolerance helper
```

示例：

```ts
export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

```ts
export function cloneDraft<T>(value: T): T;
```

```ts
export interface Patch<T = unknown> {
  before: T;
  after: T;
}
```

注意：

```txt
@venus/lib 不应该知道 IsolationSession。
@venus/lib 不应该知道 vector document node。
@venus/lib 不应该知道 editor mode。
```

## 6. `@venus/editor-primitive` 职责

`@venus/editor-primitive` 可以知道存在 isolation mode，但不能知道具体 vector document 结构。

### 6.1 Interaction Mode

在 interaction mode 中增加：

```ts
export type InteractionMode =
  | 'idle'
  | 'pointing'
  | 'dragging'
  | 'transforming'
  | 'marquee'
  | 'panning'
  | 'text-editing'
  | 'isolation-editing'
  | 'disabled';
```

### 6.2 Isolation Session 协议

primitive 层可以定义泛型 session 协议：

```ts
export interface IsolationSession<TDraft = unknown> {
  id: string;
  targetId: string;
  kind: IsolationKind;
  phase: IsolationPhase;
  draft: TDraft;
}
```

```ts
export type IsolationPhase =
  | 'active'
  | 'committing'
  | 'cancelled'
  | 'completed';
```

注意：

```txt
TDraft 是泛型。
editor-primitive 不理解 draft 内部结构。
```

### 6.3 Interaction Target

isolation 模式下需要自己的 target 类型。

推荐扩展：

```ts
export type InteractionTarget =
  | { type: 'scene-node'; id: string }
  | { type: 'overlay-handle'; id: string; handle: string }
  | { type: 'isolation-draft'; sessionId: string; targetId: string }
  | { type: 'isolation-handle'; sessionId: string; handle: string }
  | { type: 'isolation-backdrop'; sessionId: string }
  | { type: 'viewport' }
  | { type: 'empty' };
```

### 6.4 Target Priority

普通模式：

```txt
overlay handle
> scene node
> viewport
> empty
```

isolation 模式：

```txt
isolation handle
> isolation draft
> isolation backdrop
> disabled normal scene
```

主 scene 在 isolation 期间默认不可编辑。

### 6.5 Interaction Result

primitive 层只输出 intent，不执行副作用。

```ts
export type IsolationIntent =
  | { type: 'enter'; targetId: string; kind: IsolationKind }
  | { type: 'commit'; sessionId: string }
  | { type: 'cancel'; sessionId: string }
  | { type: 'update-draft'; sessionId: string; patch: unknown };
```

可以放进统一 result：

```ts
export interface InteractionResult<TPatch = unknown> {
  nextState?: unknown;
  patch?: TPatch;
  cursor?: CursorIntent;
  viewport?: ViewportIntent;
  isolation?: IsolationIntent;
  preventDefault?: boolean;
  stopPropagation?: boolean;
}
```

注意：

```txt
editor-primitive 只告诉 app 应该 enter / commit / cancel / update-draft。
真正创建 draft、diff、写 document、push history 都由 apps/vector 完成。
```

## 7. engine 职责

engine 不持有 isolation session。

engine 只支持隔离渲染和 hit-test scope。

### 7.1 Render Options

推荐 render options：

```ts
export interface EngineRenderOptions<TRenderableNode = unknown> {
  scene?: {
    dimmed?: boolean;
    dimOpacity?: number;
    excludeNodeIds?: string[];
  };

  isolation?: {
    enabled: boolean;
    draftNode: TRenderableNode | null;
    backdrop?: {
      enabled: boolean;
      color: string;
      opacity: number;
    };
  };

  overlay?: {
    enabled: boolean;
  };
}
```

apps/vector 调用：

```ts
engine.render(document, {
  scene: {
    dimmed: isolation.active,
    dimOpacity: 0.25,
    excludeNodeIds: isolation.active ? [isolation.targetId] : [],
  },
  isolation: {
    enabled: isolation.active,
    draftNode: isolation.active ? isolation.draft : null,
    backdrop: {
      enabled: isolation.active,
      color: '#808080',
      opacity: 0.25,
    },
  },
  overlay: {
    enabled: true,
  },
});
```

engine 可以做：

```txt
- 正常渲染 scene，但跳过 excludeNodeIds
- dimmed=true 时降低普通 scene opacity 或加灰色遮罩
- 渲染 isolation backdrop
- 渲染 isolation draft
- 渲染 overlay
```

engine 不应该做：

```txt
- 创建 IsolationSession
- clone node
- diff draft
- commit document
- cancel draft
- push history
- 判断双击进入哪种 isolation kind
```

### 7.2 Render Pass

推荐渲染顺序：

```txt
1. normal scene pass
   - exclude original target node
   - optionally dimmed

2. isolation backdrop pass
   - gray translucent background

3. isolation draft pass
   - render draft node with full opacity

4. isolation overlay pass
   - anchors, handles, crop box, text cursor
```

视觉效果：

```txt
normal scene, dimmed
  ↓
gray backdrop
  ↓
isolated draft
  ↓
isolation handles / controls
```

### 7.3 Hit-test Scope

engine 可以支持 hit-test scope：

```ts
export type HitTestScope<TRenderableNode = unknown> =
  | { mode: 'normal' }
  | {
      mode: 'isolation';
      draftNode: TRenderableNode;
      excludeScene: boolean;
    };
```

apps/vector 调用：

```ts
const scope = isolation.active
  ? {
      mode: 'isolation' as const,
      draftNode: isolation.draft,
      excludeScene: true,
    }
  : {
      mode: 'normal' as const,
    };

const rawHits = engine.hitTest(point, scope);
```

规则：

```txt
isolation active 时：
  默认只 hit-test isolation draft / isolation overlay / backdrop。

normal scene：
  只显示，不参与普通选择。
```

## 8. apps/vector 职责

`apps/vector` 是 isolation editing 的真正 owner。

它负责：

```txt
- 判断是否可以进入 isolation
- 创建 session
- clone snapshot
- 创建 draft
- 更新 draft
- commit draft
- cancel draft
- diff snapshot/draft
- 生成 command
- push history
- 控制 Done / Cancel UI
- 控制 render options
- 控制 hit-test scope
```

### 8.1 State

推荐状态：

```ts
export interface VectorIsolationState<TNode = unknown> {
  active: boolean;
  sessionId: string | null;
  targetId: string | null;
  kind: IsolationKind | null;

  snapshot: TNode | null;
  draft: TNode | null;

  phase: 'active' | 'committing' | 'cancelled' | 'completed';
}
```

### 8.2 Enter Isolation

流程：

```txt
double click supported node
  → get target node
  → clone snapshot
  → clone draft
  → create isolation session
  → set editor mode = isolation
  → render dimmed scene
  → exclude original target node
  → render draft in isolation layer
```

伪代码：

```ts
function enterIsolation(targetId: string, kind: IsolationKind) {
  const node = documentStore.getNode(targetId);

  const snapshot = cloneDraft(node);
  const draft = cloneDraft(node);

  isolationStore.set({
    active: true,
    sessionId: createId(),
    targetId,
    kind,
    snapshot,
    draft,
    phase: 'active',
  });
}
```

### 8.3 Update Draft

编辑过程中只修改 draft。

```ts
function updateIsolationDraft(patch: unknown) {
  isolationStore.update((state) => {
    if (!state.active || !state.draft) return state;

    return {
      ...state,
      draft: applyPatchToDraft(state.draft, patch),
    };
  });
}
```

规则：

```txt
- 不修改 original node
- 不 push 主 history
- 不触发 document commit
- 只更新 isolation draft
```

### 8.4 Commit Isolation

提交时才更新 document。

```ts
function commitIsolation() {
  const state = isolationStore.get();
  if (!state.active || !state.snapshot || !state.draft || !state.targetId) return;

  const patch = diffNode(state.snapshot, state.draft);

  commandManager.execute({
    type: 'update-node',
    id: state.targetId,
    patch,
  });

  isolationStore.clear();
}
```

规则：

```txt
- diff snapshot 和 draft
- 生成一个 command
- 只产生一个 undo record
- 清理 isolation session
- 回到 normal mode
```

### 8.5 Cancel Isolation

取消时直接丢弃 draft。

```ts
function cancelIsolation() {
  isolationStore.clear();
}
```

规则：

```txt
- 不修改 document
- 不 push history
- 丢弃 draft
- 恢复 normal scene 渲染
```

## 9. 交互路由

普通模式：

```txt
DOM event
  → normalize event
  → normal hit-test
  → normal runtime
  → normal tool / operation
```

isolation 模式：

```txt
DOM event
  → normalize event
  → isolation hit-test scope
  → isolation runtime
  → isolation tool / operation
  → update draft / commit / cancel intent
```

主 runtime 在 isolation 期间应该冻结：

```txt
normal selection 保留
normal operation 为空
normal scene 不参与普通 hit-test
normal tool 不响应普通编辑事件
```

## 10. Selection 关系

进入 isolation 后，普通 selection 和 isolation selection 应该分开。

例如 path-edit：

```txt
normal selection
  selectedIds = ['path-1']

isolation selection
  selectedAnchorPointIds = ['p2', 'p3']
```

推荐：

```ts
export interface VectorSelectionState {
  sceneSelection: string[];
  isolationSelection?: unknown;
}
```

规则：

```txt
- scene selection 保留原 targetId
- isolation selection 只表示 draft 内部选择
- 不要把 path point 当成普通 scene node
- 退出 isolation 后清理 isolation selection
```

## 11. Overlay 关系

普通 overlay：

```txt
selection bounds
resize handles
rotate handle
hover outline
```

isolation overlay：

```txt
path anchor points
bezier handles
text cursor
crop box
component internal selection
```

overlay resolver 应根据 mode 切换：

```ts
function resolveOverlay(state: VectorEditorRuntimeState) {
  if (state.mode === 'isolation') {
    return resolveIsolationOverlay(state.isolation);
  }

  return resolveNormalOverlay(state.normal);
}
```

## 12. Undo / Redo 规则

isolation 编辑期间不要污染主 undo stack。

第一版建议：

```txt
isolation 内部不做独立 undo
Esc 取消全部 draft 修改
Enter / Done 提交全部 draft 修改
主 history 只记录最终 commit
```

未来高级版可以：

```txt
isolation session 内部有 local history
Cmd+Z 先撤销 draft 操作
退出时 commit 为一个主 history 记录
```

第一版先不要做 local history。

## 13. 退出规则

推荐行为：

```txt
Esc
  cancel isolation

Enter
  commit isolation

Done button
  commit isolation

Cancel button
  cancel isolation

click isolation backdrop
  可选：commit / cancel / no-op，由产品策略决定

double click outside
  可选：commit and exit
```

建议第一版：

```txt
Esc = cancel
Done = commit
Cancel = cancel
Backdrop click = no-op
```

这样最安全。

## 14. 最小实现范围

第一版只做：

```txt
1. VectorIsolationState
2. enterIsolation()
3. updateIsolationDraft()
4. commitIsolation()
5. cancelIsolation()
6. engine render options: dimScene / excludeNodeIds / isolationDraft
7. isolation hit-test scope
8. Esc cancel
9. Done commit
```

暂时不做：

```txt
- isolation local history
- nested isolation
- group internal full editor
- component override system
- advanced target picker
- backdrop click auto commit
- collaboration sync
```

## 15. 推荐文件位置

建议：

```txt
packages/editor-primitive/src/isolation/
  isolationTypes.ts
  isolationTarget.ts
  isolationRouting.ts

apps/vector/src/features/isolation/
  isolationStore.ts
  isolationActions.ts
  isolationCommands.ts
  isolationOverlay.ts
  isolationRenderAdapter.ts
  isolationHitAdapter.ts

engine/src/render/
  renderOptions.ts
  renderIsolationPass.ts

engine/src/hit-test/
  hitTestScope.ts
```

如果第一版想更简单，可以先只在 apps/vector 做：

```txt
apps/vector/src/features/isolation/
  isolationState.ts
  isolationActions.ts
  isolationRenderAdapter.ts
```

然后等逻辑稳定后，再把通用协议沉淀到 `@venus/editor-primitive`。

## 16. 实现 Prompt

可以给 AI 使用：

```txt
Add isolation editing support for apps/vector based on the current @venus/lib, @venus/editor-primitive, and engine architecture.

Goal:
When a supported node enters isolation editing, the normal scene should be dimmed, the original node should be excluded from normal scene rendering, and a draft copy of the node should be rendered in an isolated editing layer. Editing operations should update only the draft. Commit should apply one patch to the original node. Cancel should discard the draft.

Architecture rules:
- Do not remove the node from the document when entering isolation.
- Do not mutate the original node during isolation editing.
- Keep snapshot and draft in apps/vector isolation state.
- @venus/editor-primitive may only define interaction mode, target routing contracts, and isolation intent types.
- engine should only receive render options such as dimScene, dimOpacity, excludeNodeIds, and isolationDraft.
- engine must not own IsolationSession.
- engine must not commit or cancel isolation.
- apps/vector owns enter, update draft, commit, cancel, diff, and history.
- Do not push history records during draft editing.
- Commit isolation as one undoable command.
- Cancel must discard all draft changes.
- Normal scene should not be hit-testable while isolation is active, except for backdrop behavior if explicitly supported.
- Isolated draft and isolation overlay should have higher hit priority than normal scene.

Required behavior:
1. Enter isolation by double clicking a supported node.
2. Dim normal scene.
3. Exclude the original target node from normal scene rendering.
4. Render isolation backdrop.
5. Render draft node in isolation layer.
6. Route pointer events only to isolation draft / isolation overlay.
7. Esc cancels and exits isolation.
8. Done commits and exits isolation.
9. Cancel restores original visual state without document changes.
10. Commit updates the original node once and creates one history record.

Acceptance:
- The original document node is not mutated during isolation editing.
- Cancel leaves document unchanged.
- Commit creates exactly one document update command.
- Normal scene is dimmed while isolation is active.
- Original target is not drawn twice.
- Typecheck passes.
```

## 17. 最终结论

Isolation Editing 应该被实现成：

```txt
apps/vector 持有的临时子 runtime + draft 编辑层
```

不是 engine 状态，也不是 document 层级移动。

最终结构：

```txt
apps/vector
  owns IsolationSession
  owns snapshot/draft
  owns commit/cancel

@venus/editor-primitive
  defines isolation mode / routing / intent contracts

engine
  supports render isolation layer and hit-test scope

@venus/lib
  provides low-level clone/diff/geometry helpers
```

一句话：

```txt
Isolation Editing 是临时 draft 编辑层。
原 document 不动，engine 只负责画，apps/vector 负责提交或取消。
```