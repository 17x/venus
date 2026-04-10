# Canvas-Base 梳理与 Mindmap 接入指南

## 目标

这份文档只回答一个问题：如何基于当前 `runtime-*` 包族快速起一个可扩展的 mindmap 编辑器运行时。

当前建议是：

- 复用 `@venus/runtime` / `@venus/runtime-react` 的 runtime/viewport/gesture 能力
- 在 app 层定义 mindmap 的节点语义和命令语义
- 在 worker 层扩展 mindmap 命令执行与命中检测
- 渲染层可先用 `renderer-canvas`，再按需求切到 `renderer-skia`

## Runtime 包族当前职责

`runtime-*` 是基础设施层，不是产品层。

它们负责：

- `@venus/runtime`：runtime lifecycle、viewport、gesture、worker bridge
- `@venus/runtime-react`：`useCanvasRuntime`、`useCanvasViewer`、`CanvasViewport`
- `@venus/runtime-interaction`：选择框、吸附、变换等共享交互算法
- SAB 桥接：创建 shared memory，读取快照

它们不负责：

- mindmap 节点语义（topic、edge、fold、layout）
- 产品 UI（工具栏、右侧面板、菜单）
- 文件格式定义
- 具体渲染风格

## Viewer 模式（纯展示）已支持

当前 `runtime` 包族已提供无 worker 的 viewer runtime：

- `createCanvasViewerController`
- `useCanvasViewer`

适用场景：

- 文档预览
- 只读嵌入页
- 模板市场详情页

特性：

- 不依赖 worker / SAB
- 复用 viewport + gesture + renderer 契约
- 可选 hittest（hover）
- 可选 pointerdown 选中（`selectOnPointerDown`）

注意：

- viewer 模式默认只处理 viewport 命令（`zoomIn` / `zoomOut` / `fit`）
- shape 编辑命令在 viewer 模式会被忽略

## 关键模块分层

### 1. Runtime 层（`createCanvasRuntimeController`）

入口：`packages/runtime/src/runtime/createCanvasRuntimeController.ts`

提供：

- `dispatchCommand`
- `postPointer`
- `panViewport` / `zoomViewport` / `resizeViewport` / `fitViewport`
- `subscribe` / `getSnapshot`

这是主线程与 worker 的唯一桥。

### 2. React 适配层（`useCanvasRuntime`）

入口：`packages/runtime-react/src/react/useCanvasRuntime.ts`

作用：

- 把 controller 包装成 React 可订阅状态
- 对外暴露统一 snapshot（document/shapes/stats/history/collaboration/viewport）

### 3. Viewport + Gesture 层（`CanvasViewport` + `bindViewportGestures`）

入口：

- `packages/runtime-react/src/react/CanvasViewport.tsx`
- `packages/runtime/src/gesture/index.ts`
- `packages/runtime/src/zoom/index.ts`

作用：

- 统一 pointer/wheel 事件入口
- 设备差异处理（mouse/trackpad）
- 交互态渲染质量切换（`interactive` / `full`）
- pan preview overscan（避免拖拽边缘空白闪烁）

### 4. Renderer 契约层（`CanvasRendererProps`）

入口：`packages/runtime-react/src/renderer/types.ts`

渲染器只吃这组输入：

- `document`
- `shapes`（snapshot）
- `stats`
- `viewport`
- `renderQuality`

意味着渲染器可插拔。

## 当前数据链路（你做 mindmap 需要复用的主线）

1. app 创建 document + worker factory
2. `useCanvasRuntime` 启动 controller
3. controller 创建 SAB 并 `postMessage(init)`
4. worker 执行命令、更新 SAB、回发 `scene-update`
5. 主线程读取 snapshot 并交给 renderer
6. `CanvasViewport` 处理交互并回写 viewport/command

## Mindmap 接入建议（最小可运行版本）

### A. 先定义一个 app 级适配层

建议在 `apps/mindmap-editor/src/adapters` 下新增：

- `mindmapDocumentAdapter.ts`
- `mindmapCommandAdapter.ts`

职责：

- mindmap JSON <-> runtime document（当前可先映射到 `DocumentNode`）
- UI intent -> worker command

### B. Worker 先扩展命令，不动 runtime core

建议新增：

- `packages/editor-worker/src/runtime/commands/mindmap/*`

先做 4 个命令：

- `topic.insert`
- `topic.rename`
- `topic.move`
- `topic.delete`

后续再加：

- `topic.toggleFold`
- `branch.relayout`

### C. 命中检测先复用 spatial index

worker 内继续走 spatial index，不把 hittest 放回主线程。

mindmap 的 edge 命中可以先粗糙处理：

- 优先 topic 命中
- edge 命中后补（线段距离阈值）

### D. 渲染建议

起步优先：

- `@venus/renderer-canvas`（开发快、调试轻）

需要高一致性/高质量导出时再补：

- `@venus/renderer-skia`

## 当前边界与现实约束

现在 runtime 栈仍绑定 `EditorDocument`（`@venus/document-core`）。

对你做 mindmap 的现实策略：

- 短期：app 层做 adapter，把 topic/edge 映射到当前 `DocumentNode`
- 中期：抽象更通用的 runtime document 契约（例如 `DocumentNode + Features`）

结论：不用等底层大改，mindmap 可以先跑起来。

## 推荐目录结构（mindmap）

```text
apps/mindmap-editor
  src/
    adapters/
      mindmapDocumentAdapter.ts
      mindmapCommandAdapter.ts
    hooks/
      useMindmapRuntime.ts
    components/
      MindmapFrame.tsx
    worker/
      editor.worker.ts
```

## 开发清单（按顺序）

1. 建 app 壳：`useCanvasRuntime + CanvasViewport + Canvas2DRenderer`
2. 打通 mock 文档加载与渲染
3. 实现 topic 的插入/重命名/删除/拖拽
4. 实现 edge 的显示与基本命中
5. 接 history/undo/redo
6. 接文件格式（mindmap file-format）
7. 再做布局算法与折叠逻辑

## Viewer 模式最小示例

```ts
import {CanvasViewport, useCanvasViewer} from '@venus/runtime-react'
import {Canvas2DRenderer} from '@venus/renderer-canvas'

const viewer = useCanvasViewer({
  document,
  enableHitTest: true,
  selectOnPointerDown: false,
})

<CanvasViewport
  document={viewer.document}
  renderer={Canvas2DRenderer}
  shapes={viewer.shapes}
  stats={viewer.stats}
  viewport={viewer.viewport}
  onPointerMove={(pointer) => viewer.postPointer('pointermove', pointer)}
  onPointerDown={(pointer) => viewer.postPointer('pointerdown', pointer)}
  onPointerLeave={viewer.clearHover}
  onViewportPan={viewer.panViewport}
  onViewportResize={viewer.resizeViewport}
  onViewportZoom={viewer.zoomViewport}
/>
```

## 你现在就可以复用的稳定接口

- `useCanvasRuntime`：runtime 入口
- `useCanvasViewer`：纯展示入口（无 worker）
- `CanvasViewport`：交互与 viewport 容器
- `bindViewportGestures`：独立手势绑定能力（非 React 场景可用）
- `handleZoomWheel`：可复用 zoom 设备策略
- `CanvasRendererProps`：渲染器标准输入契约

## 建议的下一步

先在 `apps/mindmap-editor` 跑一个“只有 topic 节点”的最小链路：

- 能加载
- 能选中
- 能拖动
- 能撤销

这一步稳定后，再引入 edge、自动布局、折叠。
