# Engine 对接与交互需求拆解

## 目标

整理当前 Venus `engine / runtime / ui` 的真实分层、已实现能力和缺口，给后续新产品接入（例如 xmind 编辑器）提供可执行的实现拆解。

---

## 1. 当前结论

### 1.1 engine 是否有静态层和交互层概念

结论：有相关机制，没有正式分层 API。

- 已有机制：dirty-region、tile cache、`cacheStaticOnly`、`interactionPreview`、`modelCompleteComposite`
- 未形成公共抽象：`scene layer / overlay layer / preview layer / picking layer`
- 当前操作框、选中框、snap guides、path edit chrome 都不在 engine 内，而在 app 层 SVG overlay

这意味着当前架构更接近：

- engine 负责主 scene 合成
- runtime 负责 render policy 和增量更新策略
- ui/app 负责交互 overlay

### 1.2 engine 是否有 group 概念

结论：有，且是核心 scene 节点。

- engine scene 有 `EngineGroupNode`
- hit-test 会递归 group children
- group transform 会参与 world matrix 计算
- vector 侧已有 `shape.group` / `shape.ungroup` 命令和 parent-child 维护

### 1.3 overlay / preview / 操作框当前是否在 WebGL 合成

结论：不是。

- 主场景在 engine WebGL 中渲染
- runtime 的 `interactionPreview` 是 engine 内部的帧复用/仿射预览能力
- 但真正的选择框、handles、hover stroke、snap guides、path anchors、preview instructions 目前由 `InteractionOverlay` 在 SVG 层绘制

因此现在的合成关系是：

- WebGL: scene 主内容
- DOM/SVG absolute overlay: 交互 chrome

### 1.4 当前操作框是否可配置

结论：部分可配置，但仍是产品层配置，不是 engine-level schema。

- 颜色、线宽、handle 大小等来自 `CanvasPresentationConfig`
- 句柄几何由 selection handle 机制生成
- 不同元素显示不同 chrome 的逻辑仍散落在 vector app 中
- 还没有“按文档模型注册不同操作框样式”的通用 runtime 接口

---

## 2. 当前接入链路

## 2.1 初始化链路

1. UI 层创建 canvas 容器
2. app runtime 创建 `createEngine(...)`
3. runtime 将 `EditorDocument + SceneShapeSnapshot` 适配为 `EngineSceneSnapshot`
4. 首次 `engine.loadScene(...)`
5. render scheduler 调 `engine.renderFrame()`

## 2.2 CRUD 链路

1. UI 触发命令
2. runtime / worker 执行 `EditorRuntimeCommand`
3. 文档模型更新并生成新的 runtime snapshot
4. render prep 判断是 full 还是 incremental
5. 结构变化走 `engine.loadScene(...)`
6. 局部变化走 `engine.applyScenePatchBatch(...)`
7. 需要时调用 `engine.markDirtyBounds(...)`
8. scheduler 触发 `engine.renderFrame()`

## 2.3 命中与选择链路

1. pointer -> world point
2. tool / selection policy 决定命中模式
3. current vector 常用 app/runtime-local hit-test helper 判 top hit
4. engine 也具备 `hitTest` / `hitTestAll` 机制能力，但产品侧候选规则还没完全统一收拢
5. 最终再映射为 `selection.set` 的 `replace/add/remove/toggle`

---

## 3. layer 责任拆分

## 3.1 Engine 层

必须放在 engine 的内容：

- render backend 与 composite 机制
- scene store / patch / transaction
- spatial index / frame plan / hit plan
- group transform、clip、geometry bounds
- viewport math
- 通用 handles/snapping 等几何级算法

不要放在 engine 的内容：

- 单击/双击行为规则
- 选中优先级策略
- 文本编辑 DOM
- cursor 策略
- 业务命令语义
- product-specific mask/group/isolation 模式

## 3.2 Runtime 层

应放在 runtime 的内容：

- `EditorRuntimeCommand` 协议
- selection input policy
- top-hit / all-hits 到产品语义的 adapter
- editing mode controller
- transform session / snapping session
- preview instruction 数据结构
- 产品无关的 overlay contract

## 3.3 UI 层

应放在 UI/app 的内容：

- toolbar / panel / layer tree
- SVG/DOM overlay renderer
- text editor host
- cursor 样式输出
- tool-specific pointer routing
- 不同产品模型的操作框视觉系统

---

## 4. 交互逻辑与操作逻辑

下面按“当前状态 / 目标规则 / 建议落层”拆开。

## 4.1 普通单选、多选增减、stroke/fill area

### 当前状态

- `selection.set` 已支持 `replace/add/remove/toggle/clear`
- 默认策略：
  - 单击 `replace`
  - `shift` `add`
  - `meta/cmd` 或 `ctrl` `toggle`
  - `alt` 当前默认 `ignore`
- app hit-test 已支持 `strictStrokeHitTest`
- clip-bound image 会经过 clip shape 命中约束

### 目标规则

- 普通点击：选 top eligible hit
- `shift`: add
- `cmd/ctrl`: toggle
- `shift + cmd/ctrl`: remove 或 toggle-remove，需产品定案
- stroke/fill area 必须区分：
  - 开放 path / line 默认 stroke hit
  - 闭合 path / rect / ellipse / polygon 支持 fill 与 stroke 双通道命中
  - direct-select 可要求 stroke 优先

### 建议命令

- 继续使用 `selection.set`
- 新增 runtime hit options：
  - `hitMode: fill | stroke | fill-or-stroke | bbox-first`
  - `selectionIntent: object | deep | edit-anchor`

### 建议落层

- engine: 几何命中
- runtime: modifiers -> selection mode
- ui: 触发与反馈

## 4.2 group 选择逻辑与渲染逻辑（无限嵌套）

### 当前状态

- group 可嵌套
- 当前已有 `preferGroupSelection` 与 preserve-group-drag-selection 逻辑
- resize 时 group 会展开到 leaf descendants 作为 transform targets
- overlay 对 group 本身不绘制专用 path，仅绘制选择框/句柄

### 目标规则

- 单击 group child：
  - selector 默认选最上层可选 group
  - dselector 默认选 leaf
- 双击 group：进入 `group-isolation`
- isolation 内命中和框选只作用于隔离子树
- 无限嵌套 group 的 transform 需遵守：
  - parent transform 影响 children world transform
  - child 局部 transform 保持局部坐标含义
  - 组缩放时 children 可选“只改 parent matrix”或“烘焙到 child local transform”，需统一策略

### 建议命令

- 已有：`shape.group`、`shape.ungroup`
- 建议新增：
  - `group.enter-isolation`
  - `group.exit-isolation`
  - `group.set-transform-policy`

### 建议落层

- engine: group traversal / matrix / bounds
- runtime: isolation policy / group preference / transform policy
- ui: breadcrumb、isolation header、dim-out 非隔离内容

## 4.3 mask 后的选中逻辑，什么元素可以 mask

### 当前状态

- 当前产品逻辑只允许 image 与 closed shape 参与 masking
- group 和 frame 不能直接作为 mask 发起者
- 当前结果是 `shape.set-clip(shapeId, clipPathId)`，没有 mask group 节点
- overlay 对 masked image 会抑制宿主 bounds box，优先显示 clip-shape chrome

### 目标规则

- 可作为 mask source 的对象：
  - rectangle
  - ellipse
  - polygon
  - star
  - closed path
  - 未来可选 group / compound path
- 可被 mask 的对象：
  - image
  - text
  - shape
  - group（未来）
- 选中优先级：
  - 点击 mask 可选中 mask source
  - 点击内容可选中被 mask host
  - 提供“选 mask / 选内容”的循环选择

### 建议命令

- 已有：`shape.set-clip`
- 建议新增：
  - `mask.create`
  - `mask.release`
  - `mask.select-host`
  - `mask.select-source`
  - `mask.convert-to-group`

### 结论建议

mask 后应形成特殊 group，不应只是一条 host -> clipPathId 引用关系。

建议增加 `mask-group` 产品语义层：

- host content
- mask source
- isolation / selection / reorder 语义更清晰
- engine 仍然只认 clip，不认产品 mask-group

## 4.4 操作框、preview、overlay 是否进 WebGL

### 当前状态

- 否，当前不进 WebGL
- preview 里只有 engine 自己的 interaction preview 是 WebGL 内部能力
- 交互框和句柄是 SVG overlay

### 建议方向

- 短期：保持 overlay 在 SVG/DOM
- 中期：runtime 定义统一 `OverlayInstruction` / `PreviewInstruction`
- 长期：允许 engine 消费 overlay pass，但不要让 engine 决定产品规则

## 4.5 不同元素显示什么样的操作框

### 当前状态

- 通用 selection handles 已有
- masked image 会抑制宿主框
- path 有独立 path chrome
- group 没有专门 group chrome schema

### 建议统一 schema

- rectangle / ellipse / polygon / star:
  - 外接框
  - 8 resize handles
  - 1 rotate handle
- line / open path:
  - 端点 handles
  - segment hover highlight
  - rotate handle 可选
- closed path:
  - path anchors
  - in/out bezier handles
  - 外接框按模式可隐藏
- text:
  - 文字框
  - 基线/文本编辑 caret 层由 DOM text layer 提供
- image:
  - bounds box
  - 裁切态增加 clip source chrome
- group:
  - group bounds
  - 进入 isolation 前显示 group-level handles
  - 进入 isolation 后显示 child handles
- mask-group:
  - host bounds + source outline 二选一或双层视觉

### 建议能力

需要支持“按文档模型配置操作框样式”：

- `selectionChromeRegistry`
- `nodeType -> chrome schema`
- `editingMode -> chrome variant`

建议落在 runtime contract，视觉实现留给 ui。

## 4.6 cursor 分类

### 当前状态

- tool registry 已支持静态 cursor / 动态 `getCursor`
- 还没有统一 cursor resolver 管线

### 建议分类

- Tool cursor
  - default select
  - direct select
  - pen
  - pencil
  - text
  - shape insert
  - hand
  - zoom
- Hover target cursor
  - move
  - pointer
  - text caret
  - path anchor
  - bezier in-handle
  - bezier out-handle
  - segment insert
- Transform cursor
  - resize-n
  - resize-s
  - resize-e
  - resize-w
  - resize-ne
  - resize-nw
  - resize-se
  - resize-sw
  - rotate
- Rotation-aware transform cursor
  - 根据元素当前旋转角把 handle 方向映射到屏幕方向
- Active mode cursor
  - dragging
  - rotating-live
  - panning-grabbing
  - text-editing

### 明确要求

- 旋转 handle 的 cursor 必须实时变化
- cursor resolver 必须消费：
  - tool
  - hit target
  - handle kind
  - element rotation
  - editing mode

## 4.7 操作模式 / 双击进入独立操作状态

### 当前状态

- 当前已有 `text-editing`、`path-editing`、`group-isolation` 等模式雏形
- 但双击规则、特殊 path 类型转换、图片双击行为没有统一规范

### 目标规则

- 双击 path:
  - 进入 `path-editing`
  - 支持 `alt` / `shift` 子模式
  - 例如：对称贝塞尔、断开手柄、直线转曲线
- 双击 text:
  - 进入 DOM text edit host
  - scene 中文本 chrome 退化为选区容器
  - caret/selection/highlight 由文本层渲染
- 双击 rectangle / ellipse / star / polygon:
  - 转为 path-editing
  - 同时触发 `shape.convert-to-path`
- 双击 image:
  - 建议进入 crop / mask edit / image reposition mode 三者之一，需产品定案

### 建议命令

- 已有：`shape.convert-to-path`
- 建议新增：
  - `text.enter-edit`
  - `text.exit-edit`
  - `path.enter-edit`
  - `path.exit-edit`
  - `path.point.move`
  - `path.point.insert`
  - `path.point.remove`
  - `path.handle.set-mode`
  - `image.enter-crop`
  - `image.exit-crop`

## 4.8 锁定比例 feature

### 需求结论

- 文档模型需要显式 `preserveAspectRatio` 或同等字段
- 当元素锁定比例后，缩放时不再响应普通辅助键改变比例策略
- 用户按住“锁定比例辅助键”时，对已锁定比例元素不应产生反向覆盖

### 建议命令

- `shape.patch` 扩展：`preserveAspectRatio?: boolean`
- transform session 读取该字段，覆盖交互级 modifier 规则

## 4.9 group transform 与 children transform 互相影响

### 规范建议

- 持久层统一 local transform 语义
- world transform 始终为父链矩阵乘积
- group resize / rotate 有两种模式，只能二选一：
  - parent-only matrix mode
  - bake-to-children mode

当前更适合先坚持 `parent-only matrix mode`，避免命令和撤销爆炸。

## 4.10 layers 面板小尺寸 path 采样 icon 是否可复用

结论：可以，且建议复用。

- path/polygon/star/line 的 geometry sampling 应抽成 engine 或 runtime 的纯几何 helper
- layers 面板图标不应重复写一套 path 采样逻辑
- 文本与图片可走专门缩略图路径

建议：

- engine 提供 geometry sampling / simplified contour helper
- runtime 负责把文档节点映射为 preview polyline
- ui 负责真正画 icon

---

## 5. 命令现状

### 已有命令

- `selection.set`
- `selection.delete`
- `shape.rename`
- `shape.move`
- `shape.resize`
- `shape.rotate`
- `shape.rotate.batch`
- `shape.transform.batch`
- `shape.patch`
- `shape.set-clip`
- `shape.reorder`
- `shape.insert`
- `shape.insert.batch`
- `shape.remove`
- `shape.group`
- `shape.ungroup`
- `shape.convert-to-path`
- `shape.boolean`
- `shape.align`
- `shape.distribute`

### 缺失但建议补齐

- `text.enter-edit`
- `text.exit-edit`
- `path.enter-edit`
- `path.exit-edit`
- `path.point.move`
- `path.point.insert`
- `path.point.remove`
- `path.handle.set-mode`
- `image.enter-crop`
- `image.exit-crop`

以下命令已在 2026-04-25 落地为 first-pass runtime-local 版本：

- `group.enter-isolation`
- `group.exit-isolation`
- `mask.create`
- `mask.release`
- `mask.select-host`
- `mask.select-source`
- `selection.cycle-hit-target`

实现说明：

- 这些能力当前都落在 vector app runtime-local 层，而不是 engine 公共 API
- `group-isolation` 目前是运行时局部状态，隔离通过 preview / interaction
  scene 过滤实现，不持久化进 document 或 worker 协议状态机
- `mask.*` 当前仍然由 runtime/product 层驱动，但现在已经补上 first-pass
  `mask-group` 持久语义：host/source 会通过 `maskGroupId` / `maskRole` 元数据
  跟随 `shape.set-clip(...)`、worker history、以及文件 save/load 流程持久化；
  engine 仍然只认 clip，不直接认产品 `mask-group`
- 当前 runtime 交互也已经开始消费这层语义：selection drag、transform
  preview、selection bounds 会把同一 `mask-group` 的 host/source 视作联动对象，
  不再只依赖 image `clipPathId` 的单点判断
- worker 命令侧的 first-pass 语义也已补上：`selection.delete`、`shape.remove`、
  `shape.reorder` 会扩展到同组 mask 成员，避免只删 host/source 之一，或只移动
  其中一个导致层级被拆开
- `shape.group` 现在也会先扩展到同组 mask 成员，再执行 parent/group child
  更新，避免把 masked image 与它的 source mask 编进不同 group 容器
- UI 侧的 groupable 判定也已对齐：分组按钮/菜单在计算可编组对象时会先扩展
  到同组 mask 成员，不再出现“UI 提示不能分组，但 worker 实际会把整组带走”
  的不一致
- `shape.convert-to-path` 与 `shape.boolean` 目前采取 first-pass 安全策略：只要
  命中 `mask-group` 成员，就在 UI 和 worker 两侧直接拒绝执行，先避免节点替换类
  操作把 host/source 关系静默打散，后续再定义更完整的自动解链或整体替换语义
- `shape.align` 与 `shape.distribute` 现在也会先扩展到同组 mask 成员，再生成
  move patches，避免布局命令只移动 host/source 之一，造成遮罩关系在空间上被拉开
- copy / cut / duplicate 现在也会在导出选中元素时先扩展到同组 mask 成员，避免
  剪贴板或复制副本只带走 host/source 的一半，生成不完整的 masked pair
- paste / duplicate 生成的新副本现在会重写内部 `clipPathId` 与 `maskGroupId`，
  让复制出来的 host/source pair 彼此重新成组，而不是继续指向原始对象
- generic `selection.set` 现在也会扩展到同组 mask 成员，因此 click / marquee /
  selection-all / 常规选择修改会把 host/source 作为一个选择单元；但 `mask.select-host`
  与 `mask.select-source` 仍通过精确选择旁路保留单点检查能力
- selection move / 键盘微移 现在也会扩展到同组 mask 成员，避免在选择已经原子化后，
  轻量位移命令仍只移动 host/source 的一半
- `selection.cycle-hit-target` 已基于 app 侧命中候选序列实现前后轮换，但没有把候选栈
  提升为统一的 engine/runtime 公共 read model

---

## 6. 拆任务建议

## Phase A: engine README 与接入抽象

- 产出一个稳定的 engine 对接 README
- 把 vector 当前接入链路固定为参考模板
- 明确 WebGL 主后端、overlay 不在 engine 的事实

## Phase B: runtime 统一交互 contract

- 收拢 hit-test adapter
- 收拢 editing mode controller
- 定义 overlay / preview / cursor contract
- 定义 selection chrome registry

当前状态（2026-04-25）：

- `cursor contract` 已有 first pass
- `selection chrome registry` 已有 first pass
- `hit-test adapter` 已补到 app 侧 ordered hit candidates，但还没有统一为跨 runtime/worker 的公共候选模型
- overlay / preview contract 仍以 vector 当前的 instruction builder 为主，尚未抽成更通用的产品无关 schema

## Phase C: 产品交互能力补齐

- group isolation
- mask-group 语义
- path edit 命令集
- text edit host
- image crop mode
- 锁定比例

当前状态（2026-04-25）：

- `group isolation` 已有 runtime-local first pass
- `group isolation` UI 现在已有 breadcrumb + 显式退出入口 + dimmed 非隔离上下文轮廓
- `mask-group` 现在已有 first-pass persisted semantic，但更深的 reorder / nested mask 规则仍是后续主缺口
- `path edit` 命令集仍未进入这轮实现范围

## Phase D: UI 与图层可视化提升

- 不同元素的 chrome schema
- rotation-aware cursor
- layers icon 采样复用
- 文档模型级操作框主题配置

---

## 7. 推荐落点

本需求文档放在 `docs/task/engine-integration-interaction-requirements.md`。

原因：

- 它是跨 `engine / runtime / ui` 的执行型拆解，不是单包 README
- 它比架构总览更接近后续实施任务
- 它适合作为下一轮实现与评审的输入文档
