读取相关 skill、项目文档、现有代码、已有架构说明与本轮执行结果后，再开始工作。

# 目标

你要协助完成 `venus` 体系下下一阶段核心矢量编辑器能力建设，并保证以下目标同时成立：

- 分层职责清晰
- 模块边界稳定
- 产品逻辑与底层能力严格解耦
- 能持续扩展，不因短期实现破坏长期结构
- 能支撑商业产品演进，而不只是技术 demo
- 能支持后续 agent 和开发者持续接手
- 新增功能都能纳入统一历史记录与回归验证体系

---

# 1. 当前执行结果总结

## 1.1 已确认的优势

当前系统已有较好的基础，说明项目不是从零开始。

已经确认具备基础或雏形的能力包括：

- 现有 layered architecture 总体方向正确
- `vector -> runtime -> engine` 主链路已经存在
- selection 已有基础能力
- transform 已有基础能力
- marquee 已有基础能力
- snapping 已有基础能力
- viewport 已有基础能力
- rendering 已有基础能力
- template generation 已存在

这意味着下一阶段工作的重点不是推倒重来，而是：

- 拆分单体模块
- 补齐产品层能力
- 补齐运行时机制
- 扩展 engine 查询能力
- 将“能工作”提升为“像真正产品一样工作”

## 1.2 已确认的关键缺口

本轮已确认的关键问题如下：

1. `useEditorRuntime.ts` 约 1400 行，是明显的 runtime monolith，必须拆分
2. engine 当前只返回单一 hittest 结果，不足以支撑重叠对象、右键菜单、穿透选择、节点编辑等复杂场景
3. 工具系统没有 handler lifecycle，工具当前只是字符串，不足以支撑复杂工具行为
4. 没有显式 editing mode state machine，不足以管理文本编辑、节点编辑、拖拽、缩放、旋转、隔离编辑等模式
5. 没有正式 command registry 与 undo contract，历史记录体系边界不完整

## 1.3 验证结果

`pnpm typecheck` 已通过。  
当前存在的 type 错误来自已有问题，不是本轮工作引入：

- `modal.tsx`
- `TemplatePresetPicker.tsx`

后续工作不得引入新的额外类型错误。

---

# 2. 下一阶段总体目标

下一阶段目标是：

- 从“已有编辑基础”升级到“具备专业矢量编辑器雏形”
- 明确 `vector / runtime / engine` 的职责归属
- 补齐工具系统、编辑模式、命令体系、组选中逻辑、path 节点编辑基础
- 让顶部快捷操作、左侧工具栏、右键菜单、历史记录彼此一致
- 让新增功能都能进入统一撤销重做体系
- 为后续更复杂的 path 编辑、布尔、mask、文本与对象样式系统打基础

---

# 3. 总体分层原则

整个系统至少划分为三层：

- `vector`
- `runtime`
- `engine`

三层关系保持为：

`vector -> runtime -> engine`

原则如下：

- `vector` 是最终产品层，负责产品语义、产品状态、产品规则、产品入口与产品级 command 编排
- `runtime` 是通用编辑运行时层，负责稳定抽象、机制封装、交互桥接、命令系统、产品无关的编辑能力组织
- `engine` 是底层高性能渲染与查询能力层，负责渲染、命中测试、空间索引、区域选择、性能优化等底层能力

必须避免：

- 把产品规则下沉到 `engine`
- 把具体框架 UI 细节下沉到 `runtime`
- 把 `runtime` 已有通用能力重复在 `vector` 再实现一遍
- 把 `vector` 写成只有页面组件的 UI 壳
- 让 `vector` 直接依赖 `engine` 内部对象与内部结构
- 让 `runtime` 承担过多具体产品策略，导致其变成半个产品层

---

# 4. vector 项目需求

## 4.1 产品目标

`vector` 是最终用户可见的编辑器产品层。  
下一阶段必须从“已有界面和基础编辑能力”推进到“真正可用的产品层”。

重点包括：

- 左侧工具栏完整化
- 顶部快捷操作区完整化
- 快捷键体系对齐 Adobe Illustrator 的基础习惯
- 工具与编辑状态解耦
- 不同对象类型对应的高频操作入口清晰
- 所有新产品能力都能进入统一历史记录与回归体系

## 4.2 左侧工具栏完整实现

本轮必须覆盖并接入以下工具：

- `selector`
- `dselector`
- `rectangle`
- `text`
- `ellipse`
- `panning`
- `lineSegment`
- `polygon`
- `star`
- `path`
- `pencil`
- `zoomIn`
- `zoomOut`

要求：

- 左侧工具栏不只是 UI 列表，而是完整工具系统的产品入口
- 支持 active / hover / disabled / submenu / tooltip 等产品态
- 支持一级工具与二级工具分组
- 支持快捷键切换
- 支持后续扩展更多工具

## 4.3 工具归属建议

### 放在 vector 的内容

以下应属于 `vector`：

- 左侧工具栏 UI
- 工具分组与展示
- 当前激活工具的产品状态
- 二级菜单展开逻辑
- 工具提示文案
- 工具快捷键映射
- 工具栏 hover / active / disabled 呈现
- 顶层产品规则，例如空格临时切换 panning、缩放工具二级菜单等

### 放在 runtime 的内容

以下应属于 `runtime`：

- 工具 handler 生命周期
- 工具对应的 pointer / drag / keyboard 行为
- 工具切换时的进入 / 离开行为
- 工具操作过程中的 overlay、hit test、snap、selection 协同
- 工具与 editing mode 的联动执行

即：

- `vector` 负责“工具作为产品入口怎么呈现”
- `runtime` 负责“工具激活后怎么工作”

## 4.4 快捷键对齐 Adobe Illustrator

工具快捷键应尽量对齐 Adobe Illustrator 的基础习惯，至少明确以下策略：

- `V`：selector
- `A`：dselector
- `M`：rectangle
- `T`：text
- `L`：ellipse
- `H`：panning / hand
- 线段工具使用与现有系统兼容的快捷键
- `P`：path / pen 类
- `N`：pencil
- `Z`：zoom
- 空格按住：临时切换 panning
- 缩放工具支持二级菜单或模式切换
- direct selector 的快捷键与 selector 必须清晰区分

注意：

- 快捷键属于 `vector` 的产品映射
- 快捷键触发后的行为执行属于 `runtime`

## 4.5 Direct Selector（dselector）需求

`dselector` 不应只是“另一个选择工具”，它必须成为 path 编辑的入口工具。

至少要支持：

- 对 path 节点直接选中
- 对曲线段直接选中
- 对直线段直接选中
- 对节点、线段、曲线段显示不同命中反馈
- 支持后续扩展到贝塞尔控制柄编辑

## 4.6 Anchor Points 概念必须引入

没有 `anchor points` 概念，就无法做真正的节点编辑体系。

必须补齐：

- 文档模型中的 path 节点表达
- 线段与曲线段的段信息表达
- 节点类型表达
- 控制柄表达（即便本轮不完整实现，也要预留）
- 节点命中、段命中、控制柄命中的基础类型系统
- 节点选中态与对象选中态并存的状态模型

建议至少定义：

- `anchorPoint`
- `segment`
- `segmentType`
- `inHandle`
- `outHandle`
- `pathSubSelection`

## 4.7 菜单栏下方快捷 icon 操作区补齐

顶部快捷 icon 区必须按对象类型动态切换，而不是固定按钮集合。

### 对 shape / path / line 类对象

至少支持：

- stroke color
- fill color
- stroke weight
- stroke cap
- stroke corner / join
- opacity
- arrange
- convert to path（适用时）

### 对 text 对象

至少支持：

- text color
- font size
- font family
- font weight
- line height
- alignment

### 对 image / masked image 对象

至少支持：

- replace image
- crop / mask 相关 action
- flip
- opacity
- arrange

归属建议：

- `vector`：负责 UI、不同对象类型下的动作组织、显示规则
- `runtime`：负责这些动作背后的 command 与执行逻辑
- `engine`：不参与产品入口层设计

---

# 5. runtime 项目需求

## 5.1 useEditorRuntime.ts 拆分

这是本轮最明确的结构性任务，必须优先做。

现状问题：

- 单文件过大
- 职责混杂
- 不利于工具系统、状态机、command registry 继续接入
- 后续新增 group、path 节点、多 hit、snapping 优化都会继续把这个文件拖垮

建议拆分方向至少包括：

- `runtime/tools/*`
- `runtime/interaction/*`
- `runtime/editing-modes/*`
- `runtime/commands/*`
- `runtime/history/*`
- `runtime/hittest/*`
- `runtime/snapping/*`
- `runtime/selection/*`
- `runtime/viewport/*`
- `runtime/overlays/*`
- `runtime/scene-bridge/*`

要求：

- 保持对外 API 尽量稳定
- 优先内部拆分，不要一开始就大范围改调用层
- 每个子模块的职责必须清晰
- 拆分完成后要补文档，说明模块边界与数据流

## 5.2 editing mode 状态机

必须建立显式 `editing mode` 状态机。

至少应区分：

- `idle`
- `selecting`
- `marqueeSelecting`
- `dragging`
- `resizing`
- `rotating`
- `textEditing`
- `pathEditing`
- `directSelecting`
- `panning`
- `zooming`
- `isolatedGroupEditing`（可先预留）
- `insertingShape`
- `drawingPath`
- `drawingPencil`

要求：

- tool 是“当前工具类型”
- editing mode 是“当前交互状态”
- 两者联动但不是同一个概念
- 状态切换必须可追踪、可调试、可约束
- 工具切换、双击、拖拽、键盘修饰键都要能驱动 mode 变化

## 5.3 工具 handler 生命周期

必须建立明确的工具 handler 机制，不能继续把工具只当成字符串。

至少需要以下生命周期：

- `onEnter`
- `onExit`
- `onPointerDown`
- `onPointerMove`
- `onPointerUp`
- `onDoubleClick`
- `onKeyDown`
- `onKeyUp`
- `onCancel`
- `getCursor`
- `getOverlayData`
- `getStatusHints`

要求：

- 工具切换时可以清理临时状态
- 工具可以声明自己依赖的 editing mode
- 工具可以决定是否消费事件
- 工具可以声明与 snapping / selection / hittest 的协作方式

## 5.4 command registry 与 undo contract

必须建立正式 command registry，不再依赖零散回调或局部命令调用。

每个 command 至少定义：

- `command id`
- 输入参数
- 前置条件
- `execute`
- `undo`
- `redo`（可由 execute/undo 推导时也要说明）
- 是否可 merge
- 是否进入历史记录
- 是否影响选区
- 是否影响 viewport
- 失败回滚策略

要求：

- 新功能都要通过 command 进入历史系统
- 不能出现“某些 UI 直接改状态，绕过历史记录”的情况

---

# 6. engine 项目需求

## 6.1 Multi-hit hittest

engine 当前只返回单一 hittest 结果，这是明确缺口，必须升级为 multi-hit。

原因：

- 重叠对象场景需要候选列表
- 右键菜单需要基于多个候选决定上下文对象
- group 内穿透选择需要底层返回更多命中信息
- dselector 节点 / 曲线 / 线段操作需要更细粒度候选
- overlay 命中与对象命中也可能需要并列候选

要求：

- engine 返回多个命中结果，而不是单一结果
- 结果中至少包含排序依据
- 结果需区分对象本体、segment、anchor point、handle、overlay 等不同命中类型
- runtime 负责把底层结果提升为产品可消费结果

## 6.2 multi-hit 结果结构建议

至少考虑包含：

- `renderEntityId`
- `sourceObjectId`
- `sourceNodeId`
- `hitType`
- `hitPoint`
- `distance / score`
- `zOrder`
- `segmentInfo`
- `anchorInfo`
- `handleInfo`
- `boundsInfo`

---

# 7. Group 产品逻辑需求

这部分是 runtime 的重点任务，且需要尽量对齐 Adobe Illustrator 的基础体验。

## 7.1 group / ungroup 基础能力

必须支持：

- group
- ungroup
- group 后作为单一对象参与常规选择
- ungroup 后恢复子对象结构
- 支持历史记录

## 7.2 点选逻辑

需要明确：

- 正常 selector 点选 group 时，优先选中 group 整体
- group 子元素不应在默认 selector 下直接成为主命中对象
- direct selector 或带修饰键时，可以进入子元素命中逻辑

## 7.3 框选逻辑

需要明确：

- 默认框选 group 时，按产品规则决定是选 group 整体还是选子元素
- 一般产品层应优先保持 group 整体语义
- direct selector 或特定模式下可对 group 内部元素框选

## 7.4 Cmd 穿透选中逻辑

必须支持：

- group 子元素可以通过 `cmd` 键穿透选中
- 穿透逻辑只改变命中解释，不改变 group 结构
- 穿透后选中的是子元素语义对象，不是强制 ungroup
- 穿透选择必须进入统一选区更新逻辑

还需要补齐：

- 命中优先级
- 选区展示
- 属性面板联动
- 顶部快捷操作联动
- 右键菜单上下文联动

## 7.5 隔离编辑预留

即便本轮不完整实现，也建议预留：

- `enterIsolatedGroupEdit`
- `exitIsolatedGroupEdit`
- 隔离状态下命中、框选、对齐、吸附范围变化

---

# 8. 基础图形转 Path

这是明确产品功能，必须进入 runtime command 体系，并在菜单入口中体现。

## 8.1 功能要求

支持将基础图形转换为 path，例如：

- rectangle -> path
- ellipse -> path
- polygon -> path
- star -> path
- lineSegment -> path（按产品规则）

## 8.2 入口要求

至少出现在：

- 右键菜单
- 顶部菜单
- 顶部快捷区（在适用对象选中时）

## 8.3 数据要求

转换后应：

- 保持对象空间位置一致
- 尽量保持视觉结果一致
- 补齐 path 的 anchor point 数据
- 支持后续 dselector 编辑
- 进入历史记录

---

# 9. 文本需求

## 9.1 本轮最低要求

- text 工具可创建文本对象
- 文本对象可选中
- 文本对象具备基础样式属性
- 顶部快捷区可对文本色等高频属性进行操作
- 文本对象参与 group、align、arrange、history
- 文本对象命中与普通 shape 区分处理

## 9.2 后续预留

- `textEditing` mode
- 双击进入文本编辑
- 文本框与点文字区分
- 更细粒度的文字属性系统

---

# 10. 对齐功能需求

多选时必须提供对齐功能。

## 10.1 至少支持

- 左对齐
- 水平居中对齐
- 右对齐
- 顶对齐
- 垂直居中对齐
- 底对齐

## 10.2 最低行为要求

- 基于当前选区执行
- 明确对齐基准
  - 选区整体边界
  - 主选中对象
  - 后续可扩展到画板
- 对齐后进入历史记录
- 顶部快捷区 / 菜单 / 右键菜单共享同一 command

---

# 11. Stroke 模型补齐

这部分必须进入文档模型，不要只做 UI 参数。

## 11.1 至少补齐字段

- `weight`
- `cap`
- `corner`（必要时区分 join / corner style）

## 11.2 要求

- 文档模型可持久化
- runtime 可读写
- 顶部快捷区可修改
- 属性面板可修改
- 历史记录可追踪
- 不同对象类型的适用范围明确

---

# 12. Snapping 改造需求

## 12.1 当前问题

目前全屏幕 x/y 虚线太丑，而且不符合 Adobe Illustrator 的主流视觉体验。

## 12.2 新要求

snapping 视觉反馈应改为：

- 连接匹配 snapping 的元素
- 尽量呈现“当前对象与目标对象之间”的关系
- 避免无意义全屏延展线
- 在复杂场景下更清晰表达当前吸附依据

## 12.3 同时吸附两个方向

一个元素最多同时 snap 两个元素：

- x 方向一个
- y 方向一个

这意味着 snapping 结果模型要支持：

- 横向吸附目标
- 纵向吸附目标
- 双轴同时存在
- 各自的 guide / connector 数据
- 各自的 score 与阈值判断

---

# 13. Mask 场景下的变换一致性

## 13.1 需求

图片被 mask 时，翻转外部元素时，内部图片也应跟随。  
旋转等操作也要对应上。

## 13.2 实质要求

这说明 mask / clip group 不能只做视觉裁剪关系，还要明确：

- 外层容器变换
- 内部图片变换继承关系
- 翻转时内部内容的对应矩阵变化
- 旋转时内部内容的对应矩阵变化
- 历史记录中的可逆性

## 13.3 需要检查

- 当前 mask 数据结构
- 当前 transform command 是否只作用于外层对象
- 当前 render 映射是否支持内部内容同步变换
- 当前 selection / bbox 是否与真实视觉结果一致

---

# 14. 所有新功能接入历史记录

这是硬性要求。

新增功能全部都要纳入历史记录模块，包括但不限于：

- 工具切换触发的创建行为
- group / ungroup
- group 内穿透选中导致的选区变化（至少要有统一策略）
- 基础图形转 path
- stroke 属性修改
- 对齐
- 文本属性修改
- mask 相关变换
- path 节点编辑
- snapping 驱动下的最终对象位置变化

要求：

- 明确哪些进入历史
- 明确哪些只更新临时交互态，不进入历史
- 明确哪些命令可 merge
- 明确拖拽结束时如何形成单条历史记录

---

# 15. UI 体系要求

## 15.1 packages/ui 使用 shadcn

实施要求如下：

- `packages/ui` 使用 shadcn 进行界面创作和优化
- 可根据需要自行安装 shadcn 推荐相关包
- 新增界面尽量复用统一 UI 基础组件
- 避免在 `vector` 中零散堆自定义样式组件而失控

## 15.2 优先覆盖范围

优先覆盖：

- menu
- dropdown menu
- context menu
- toolbar button
- segmented control
- popover
- dialog
- tooltip
- input / number input
- select
- tabs

---

# 16. 建议的实际拆活顺序

## 第一阶段：运行时结构化

- 拆分 `useEditorRuntime.ts`
- 建立 tool handler 生命周期
- 建立 editing mode 状态机
- 建立 command registry
- 建立 undo contract

## 第二阶段：底层能力补齐

- engine multi-hit
- runtime hittest adapter 升级
- selection / group / 穿透选择规则补齐
- snapping 结果模型升级为双轴
- anchor points / path sub-selection 类型引入

## 第三阶段：产品功能补齐

- 左侧工具栏全接入
- Adobe AI 风格快捷键映射
- 空格临时 panning
- dselector 节点 / 曲线 / 线段基础编辑
- 基础图形转 path
- 多选对齐
- stroke 模型补齐
- 顶部快捷 icon 区动态化
- 文本高频属性入口补齐

## 第四阶段：正确性与体验修正

- mask 内图片随外层翻转 / 旋转
- snapping 视觉重做
- group 相关体验细化
- 历史记录一致性检查
- 模板回归测试补齐

---

# 17. 本轮交付物要求

后续 agent 至少应交付：

## 文档

- 新版分层说明
- 工具系统设计说明
- editing mode 状态机说明
- command registry 与 undo contract 说明
- group 产品逻辑说明
- anchor points / path 编辑数据结构说明
- snapping 双轴模型与视觉方案说明
- 顶部快捷 icon 区对象类型映射说明
- mask 变换一致性说明
- 历史记录接入策略说明

## 代码

- runtime 拆分后的基础结构
- tool handler 基础设施
- editing mode 基础设施
- command registry 基础设施
- multi-hit 基础改造
- 至少一批核心功能落地

## 验证

- typecheck 继续通过
- 新功能有基础回归验证
- 不引入新的架构越界
- 不把产品逻辑塞进 engine
- 不把 UI 细节塞进 runtime

---

# 18. 验收标准

以下条件满足后，才算本轮工作达到可接受交付标准。

## 18.1 架构验收

- `useEditorRuntime.ts` 已不再承担单体核心职责
- 工具系统已不再只是字符串切换
- editing mode 已显式化
- command registry 与 undo contract 已建立
- multi-hit hittest 已打通到 runtime 层

## 18.2 产品验收

- 左侧工具栏核心工具可切换并工作
- 快捷键基础行为符合预期
- 空格临时 panning 可用
- dselector 能命中 path 节点 / 曲线 / 线段
- 顶部快捷区可随对象类型变化
- group / ungroup / 穿透选中可用
- 基础图形转 path 可用
- 多选对齐可用
- stroke 基础属性可编辑
- snapping 新视觉方案可用
- mask 场景下翻转 / 旋转行为正确

## 18.3 历史记录验收

- 所有新增核心功能都已接入历史记录
- 拖拽类操作不会产生异常碎片历史
- undo / redo 不会破坏选区与对象一致性

## 18.4 工程验收

- typecheck 不新增问题
- 关键功能有基础测试或回归验证
- 文档能支撑后续 agent 继续接手

---

# 19. 最后的分层裁决原则

后续凡是拿不准放哪一层，统一按下面判断：

- 这是产品入口、产品展示、产品快捷键、产品菜单、产品状态吗？放 `vector`
- 这是通用编辑机制、命令执行、命中提升、snapping 组织、interaction 生命周期吗？放 `runtime`
- 这是渲染、空间索引、底层命中、查询、缓存、性能优化吗？放 `engine`

如发现现有设计与目标冲突，请直接指出冲突点，并给出可执行的折中方案或迁移方案。
