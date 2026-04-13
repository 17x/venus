读取相关 skill、项目文档、现有代码与已有设计说明后，再开始工作。

# 目标

你要协助完成 `venus` 体系下核心矢量编辑器能力的建设，并保证以下目标同时成立：

- 分层职责清晰
- 模块边界稳定
- 产品逻辑与底层能力严格解耦
- 能持续扩展，不因短期实现破坏长期结构
- 能支撑商业产品演进，而不只是技术 demo
- 能支持后续 agent 和开发者持续接手

当前已知基础：

- `vector` 已有文档模型定义或至少已有产品对象语义基础
- 已有数据模板生成功能，但可能仍不足以覆盖性能测试、交互测试、回归测试
- 项目已经存在一定的分层雏形，但边界、接口、链路和文档可能仍不完整

你的任务不是凭空重建一套新架构，而是：

- 在尊重现有结构的前提下判断现状
- 识别缺口与冲突
- 补齐 `vector / runtime / engine` 的职责、模块、接口、链路与文档
- 优先打通核心可运行链路
- 让系统具备继续扩展为专业矢量编辑器的能力

---

# 1. 总体分层原则

整个系统至少划分为三层：

- `vector`
- `runtime`
- `engine`

三层关系应保持为：

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

# 2. 项目分层与职责

## 2.1 vector

`vector` 是矢量编辑器的应用层与产品层，定位类似 Adobe Illustrator / Figma Design 中最终面向用户的编辑器产品壳层。

它不是底层渲染引擎，也不是通用运行时能力容器，而是：

- 最终用户直接感知和操作的产品层
- 最终产品规则的决策层
- 产品级状态的承载层
- UI、交互、命令编排与文档级能力的组织层

换句话说：

- `engine` 负责“怎么高性能地渲染、命中、索引、框选”
- `runtime` 负责“提供稳定的通用编辑能力与抽象机制”
- `vector` 负责“最终产品在什么场景下允许什么行为、如何组织功能、如何呈现给用户”

目标：

- 提供完整、稳定、可扩展的专业矢量编辑体验
- 支撑商业级产品功能持续演进
- 对齐专业矢量编辑器核心交互模型
- 保证产品逻辑、运行时能力、底层渲染实现三者严格分层

### 2.1.1 产品定位

`vector` 应被视为真正可交付的矢量编辑产品，而不是图形 demo 或渲染能力示例。

它至少需要具备：

- 完整工具体系
- 完整对象编辑能力
- 完整文档级能力
- 可持续扩展的面板与菜单体系
- 统一快捷键、上下文菜单与命令入口
- 明确编辑态与选区语义
- 较完善的导入导出、复制粘贴、撤销重做体验
- 面向性能测试、交互测试、回归测试的产品级验证入口

产品目标不应只停留在“能画出来”，而应达到：

- 能编辑
- 能组织
- 能操作
- 能维护
- 能扩展
- 能测试
- 能持续演进成商业产品

### 2.1.2 vector 的职责边界

`vector` 负责：

#### 产品功能组织

- 工具栏、顶部栏、侧边栏、右键菜单、浮动工具条等功能入口组织
- 面板之间的联动规则
- 功能启用条件、禁用条件、入口可见性控制
- 不同编辑上下文下的功能切换与入口裁剪

#### 产品规则决策

- 决定用户当前操作应触发什么产品行为
- 基于不同工具态、编辑态、选区态，对同一运行时能力做不同裁决
- 管理“允许什么、不允许什么、优先触发什么”的产品规则

例如：

- 点击空白是否清空选区
- shift 点击是追加选择、切换选择还是局部选择
- 双击是进入文本编辑、路径编辑、编组内编辑还是隔离编辑
- 右键菜单针对哪个对象展开
- 锁定对象是否可 hover、可命中、可参与吸附
- 隐藏对象是否参与框选、对齐、智能参考线
- 模板层对象是否允许直接编辑
- 只读文档下哪些操作仍可执行

#### 产品级状态管理

- 当前工具状态
- 当前编辑态
- 当前选区语义
- 当前激活对象 / hover 对象 / context target
- 面板状态
- 文档级 UI 状态
- 用户偏好开关
- 产品配置项与实验开关

#### 产品级 command 编排

- 基于 runtime 标准 command 能力组合出最终产品动作
- 管理产品级宏操作、批处理动作与复合行为
- 统一 toolbar、menu、shortcut、context menu、panel action 的触发路径

#### 文档级产品能力

- 新建 / 打开 / 保存 / 另存为 / 导入 / 导出
- 文档元信息管理
- 画板 / 页面 / 视图组织
- 剪贴板跨文档行为
- 最近文档、模板入口、预设文档等产品能力

#### 产品扩展性组织

- 新工具接入
- 新对象类型接入
- 新面板接入
- 新快捷键接入
- 新菜单与右键动作接入
- 新 inspector schema 接入
- 新模板类型接入

### 2.1.3 vector 不负责的内容

以下内容不应放入 `vector`：

- 底层 WebGL 渲染实现细节
- GPU / CPU 批处理策略
- 空间索引内部实现
- 底层几何命中算法本身
- engine 内部渲染对象生命周期管理
- 低层缓存淘汰与显存管理
- 底层文字 atlas / glyph cache 实现
- engine 内部图元 / draw call 调度细节

约束：

- `vector` 不直接持有 engine 内部渲染对象引用
- `vector` 不应绕过 runtime 直接操作 engine，除非是极少数只读诊断接口
- `vector` 不应把运行时通用机制固化为产品私有实现
- `vector` 不应把框架 UI 细节下沉到 runtime

### 2.1.4 vector 负责的产品对象语义

`vector` 负责最终用户可感知的对象概念与对象语义，这些概念不等同于 engine 的底层渲染对象。

至少应覆盖：

- shape
- path
- compound path
- text
- image
- group
- boolean result
- mask / clip group（若已有或计划支持）
- guide / ruler / grid 辅助对象语义
- artboard / page / frame（若已有或后续计划支持）
- symbol / instance / component-like 复用对象（若后续计划支持）

说明：

- 产品对象是用户看到和操作的对象
- runtime / engine 内部可能将其拆成多个内部对象、渲染片段或辅助实体
- 用户语义必须在 `vector` 层保持稳定一致

### 2.1.5 vector 的核心产品能力范围

#### 基础编辑能力

- 基础图形创建
- 路径创建与编辑
- 文本创建与编辑
- 图片插入与替换
- 选择、移动、缩放、旋转
- 多选、框选、穿透选择
- 编组 / 解组
- 锁定 / 解锁
- 显示 / 隐藏
- 排列顺序调整
- 布尔运算
- 对齐与分布
- 吸附与智能参考线

#### 高级编辑能力预留

- 路径节点编辑
- 复合路径编辑
- 蒙版 / 裁剪
- 非破坏性布尔
- 样式复制粘贴
- 符号 / 实例
- 多画板 / 多页面编辑
- 组件化复用能力

#### 文档级能力

- 新建文档
- 模板创建与模板载入
- 保存 / 另存为
- 导入 / 导出
- 视图缩放与定位
- 多页面 / 多画板导航
- 文档 dirty 状态管理
- 撤销 / 重做入口管理

#### 产品级入口能力

- toolbar actions
- topbar actions
- context menu actions
- 快捷键 actions
- 面板 actions
- 拖拽投放行为
- 粘贴行为
- 导入资源行为

### 2.1.6 vector 的产品状态模型

必须区分不同层级的产品状态，避免所有状态混在一个 store 中。

建议至少拆分：

#### 工具状态（tool state）

例如：

- select
- direct-select
- pen
- shape
- text
- hand
- zoom
- eyedropper
- boolean-related tools（若未来支持）

#### 编辑态（editing mode）

例如：

- idle
- selecting
- marquee selecting
- dragging
- resizing
- rotating
- text editing
- path editing
- crop / mask editing
- isolated group editing
- boolean editing

#### 选区状态（selection state）

例如：

- 当前选中对象集合
- 主选中对象
- 选区来源
- 选区锚点信息
- 多选语义
- 编组内选中还是顶层选中

#### 交互上下文状态（interaction context）

例如：

- hover target
- pressed target
- context menu target
- drag origin
- 当前候选 snap 结果
- 当前命中候选列表

#### 面板状态（panel state）

例如：

- 图层面板展开折叠
- 属性面板激活项
- 对齐面板参数
- 文本面板参数
- 路径面板参数
- 资源面板状态

#### 视图状态（view state）

例如：

- 当前视口缩放
- 当前视口偏移
- 当前画板 / 页面
- 当前滚动位置
- 当前是否适配屏幕显示

#### 文档级产品状态（document ui state）

例如：

- 当前激活文档
- dirty 状态
- 最近保存时间
- 文档权限或只读状态
- 当前导出配置

#### 用户偏好与产品开关（preferences / feature flags）

例如：

- 是否开启智能参考线
- 是否吸附到网格
- 是否吸附到像素
- 是否显示边界框
- 是否显示标尺 / 参考线
- 是否开启实验能力

要求：

- 各状态域职责明确
- 可持久化状态与临时交互态分离
- 文档状态与 UI 状态分离
- 产品态与 runtime 执行态分离

### 2.1.7 vector 模块划分建议

建议至少按以下模块组织：

#### app

负责应用启动、依赖装配、全局上下文挂载、多文档容器管理。

#### shell

负责整体编辑器外壳布局：

- topbar
- toolbar
- left panel
- right panel
- bottom bar
- canvas area
- floating overlays

#### tools

负责工具定义、工具元信息、工具切换逻辑、工具状态机。

建议包括：

- tool registry
- tool activation logic
- tool-specific cursor / affordance rules
- tool shortcut mapping

#### actions

负责 UI 直接触发的产品动作定义。

#### commands

负责产品级 command 编排。

注意：

- runtime 提供标准 command 能力
- `vector` 负责组合这些能力形成最终产品动作
- 产品层可以有 command macro、workflow command、UI-facing command

#### selection

负责产品级选区语义、主选中对象规则、组内外选择规则、隔离编辑下的选择规则。

#### editing

负责编辑态切换、编辑态约束、进入与退出规则。

#### panels

负责各类面板定义、状态同步、与选区 / 文档 / 工具联动。

#### shortcuts

负责快捷键注册、冲突解决、上下文生效条件。

#### menus

负责主菜单、右键菜单、溢出菜单等菜单系统。

#### clipboard

负责复制 / 剪切 / 粘贴 / 跨文档粘贴 / 样式粘贴等产品逻辑。

#### import-export

负责导入导出流程、格式适配、导入后落位、导出选项组织。

#### document

负责文档级生命周期入口与文档容器管理。

#### resources

负责图片、字体、外部资源、嵌入资源在产品层的组织入口。

#### inspectors

负责属性 schema、属性编辑 UI 与对象属性映射。

#### presence / collaboration（若未来支持）

负责远端光标、远端选区、冲突提示、协作状态提示。

#### testing-fixtures

负责产品级测试入口、测试模板挂载、回归场景组织。

### 2.1.8 vector 与 runtime 的协作边界

原则：

- `runtime` 提供稳定能力接口与通用编辑机制
- `vector` 不重复实现这些机制，而是负责组合与裁决
- `runtime` 给出命中结果、snap 候选、command 能力、交互事件抽象
- `vector` 结合工具态、编辑态、选区态和产品规则，决定最终行为

原则总结：

- runtime 提供“能力”
- vector 提供“产品语义与规则决策”

### 2.1.9 vector 与 engine 的协作边界

应避免：

- 在 `vector` 中直接操作 engine 内部对象
- 在 `vector` 中依赖 engine 内部缓存或 draw call 结构
- 在 `vector` 中编写只适用于某个渲染实现的产品逻辑

正式产品链路应保持：

`vector -> runtime -> engine`

### 2.1.10 vector 的扩展机制要求

至少预留：

- 新工具注册机制
- 新对象类型注册机制
- 新属性面板 schema 注册机制
- 新 command 宏注册机制
- 新菜单 / 快捷键 / action 注册机制
- 新导入导出格式扩展点
- 新模板类型扩展点

扩展要求：

- 接入新能力时不应要求修改大量核心流程代码
- 新能力优先通过 registry、schema、capability map、handler map 接入
- 能通过配置解决的入口组织，不要写死在页面组件里

### 2.1.11 vector 的产品测试与验收范围

重点测试至少包括：

- 工具切换正确性
- 选区行为正确性
- 双击 / 右击 / 拖拽规则正确性
- 快捷键触发正确性
- 面板与选区联动正确性
- 文本编辑与普通选择切换正确性
- 编组 / 解组 / 隔离编辑正确性
- 粘贴、导入、插入图片后的默认行为正确性
- command 宏操作的撤销重做正确性
- 大数据模板下的基本交互可用性

验收不应只看“能运行”，还应看：

- 产品语义是否一致
- 功能入口是否统一
- 状态切换是否清晰
- 交互是否可预测
- 扩展新能力时是否容易接入

### 2.1.12 对后续 agent 的明确要求

处理 `vector` 相关工作时必须遵守：

- 不要把产品逻辑错误地下沉到 engine
- 不要把产品 UI 细节错误地下沉到 runtime
- 不要把 runtime 已有能力在 `vector` 中重复实现一遍
- 不要把 `vector` 写成只堆页面组件的 UI 层
- 必须把 `vector` 视为产品规则、产品状态、产品入口、产品编排的主承载层

---

## 2.2 runtime

`runtime` 是 `vector` 与 `engine` 之间的通用编辑运行时层。

它不直接承担具体产品 UI 展示，也不应深度绑定具体前端框架；它负责把“产品层需要的通用编辑能力”稳定地组织成可复用、可测试、可扩展的机制与接口。

换句话说：

- `vector` 偏产品决策
- `runtime` 偏编辑机制与运行时抽象
- `engine` 偏渲染执行与底层查询能力

目标：

- 为上层产品提供稳定、统一、可组合的编辑能力
- 屏蔽 engine 的内部复杂性与底层差异
- 为命令系统、交互系统、吸附系统、命中系统提供统一运行时抽象
- 保持与具体 UI 框架解耦
- 保持与具体产品策略适度解耦

### 2.2.1 runtime 的定位

`runtime` 不是：

- UI 组件层
- 纯工具函数集合
- 产品规则集中营
- engine 的直接转发层

`runtime` 应该是：

- 文档与渲染之间的桥梁
- 交互事件与编辑行为之间的桥梁
- 产品层与底层能力之间的桥梁
- 通用编辑机制的承载层

### 2.2.2 runtime 的核心职责

#### 文档模型运行时抽象

- 定义文档模型的运行时读写接口
- 管理对象查找、层级关系、局部变更与基础校验
- 保证上层产品逻辑与下层渲染之间的数据语义稳定

#### 数据到渲染的桥接

- 将产品对象语义映射到 engine 可理解的数据
- 建立对象 id 与渲染对象 / 命中对象之间的映射关系
- 负责脏数据更新、局部刷新请求与同步调度

#### 命中测试桥接

- 调用 engine 的底层 hittest
- 将 engine 返回的底层结果提升为产品可消费的命中候选
- 处理锁定态、隐藏态、穿透态、隔离态等通用命中规则

#### 交互与手势系统

- 定义统一 pointer / keyboard / wheel / gesture 抽象
- 管理 pan / zoom / scroll / drag 等通用画布交互能力
- 提供工具可消费的统一交互上下文

#### Command 系统

- 提供标准 command 定义、执行、撤销、重做、事务、组合、日志等机制
- 为上层产品提供稳定 command 能力
- 允许产品层基于标准 command 再做编排

#### Snapping 通用运行时支持

- 建立 snap 查询入口
- 组织 snap 候选收集、过滤、评分与结果输出
- 提供智能参考线与对齐提示所需的通用信息结构

#### Overlay / Dynamic Layer 支持

- 管理选择框、控制手柄、辅助线、拖拽预览、hover 高亮等运行时可视反馈层
- 这些层不属于产品 UI 面板，也不属于 engine 主场景对象
- 应被视为 runtime 管理的交互渲染层

#### 视口控制

- 统一封装 zoom、pan、fit-to-screen、focus-to-selection、scroll-to-node 等能力
- 使上层产品无需直接依赖 engine 的视口实现细节

### 2.2.3 runtime 不负责的内容

以下内容不应由 runtime 负责：

- 顶部栏、工具栏、属性面板等具体 UI 组件实现
- 最终产品规则裁决
- 复杂商业产品策略本身
- 底层 GPU 优化细节
- engine 内部渲染对象生命周期
- 底层纹理缓存、文字 atlas、空间索引算法本身

### 2.2.4 runtime 的模块划分建议

建议至少包含以下模块：

#### document-model

负责运行时文档读写抽象、对象访问、关系解析、局部变更、基础约束。

建议能力：

- node lookup
- parent / child traversal
- layer traversal
- mutation helpers
- validation hooks
- change set generation

#### scene-bridge

负责将文档对象映射到 engine 场景数据。

建议能力：

- object-to-render mapping
- diff-to-render patch
- id mapping
- render invalidation scheduling

#### interaction

负责统一 pointer、keyboard、wheel、touch、gesture 事件抽象。

建议能力：

- pointer session
- drag lifecycle
- keyboard modifier context
- gesture dispatcher

#### gestures

负责更高阶的交互模式，例如：

- pan gesture
- zoom gesture
- marquee gesture
- transform gesture
- rotate gesture

#### viewport-controller

负责视口控制能力：

- set zoom
- zoom by point
- pan by delta
- fit to screen
- focus selection
- reset viewport

#### hittest-adapter

负责 engine hittest 结果提升。

建议能力：

- multi-hit query
- result ranking normalization
- lock / hide / isolate filtering
- hit context tagging

#### selection-bridge

负责运行时层面的选区计算支持。

例如：

- box selection query
- selectable filtering
- selection anchor computation
- top-level vs nested selection interpretation

#### snapping

负责 snap 候选计算与结果输出。

建议能力：

- candidate collection
- geometric query
- guide / grid / ruler snaps
- scoring / threshold / hysteresis
- visual guide data output

#### overlays

负责交互 overlay 数据模型与渲染协调。

例如：

- selection box
- handles
- hover highlight
- snap guides
- drag preview
- measurement hint

#### commands

负责标准 command 体系。

建议子模块：

- command registry
- command executor
- command transaction
- undo / redo stack
- serialization / audit log
- macro composition primitives

#### history

负责 command 与文档变更的历史记录、事务边界与撤销重做状态。

#### scheduler

负责运行时调度，例如：

- render scheduling
- deferred sync
- throttled update
- idle precompute
- interaction-time degradation hooks

#### diagnostics

负责调试与诊断信息输出。

例如：

- hittest timing
- render invalidation count
- snap candidate count
- selection query timing
- overlay update timing

### 2.2.5 runtime 的数据职责

runtime 必须明确区分以下数据：

- 文档源数据
- 运行时索引数据
- 交互临时态
- overlay 数据
- command 执行上下文
- engine 映射缓存
- 诊断数据

要求：

- 不要把短期交互态直接污染文档源数据
- 不要把 engine 内部对象直接暴露给产品层
- 需要清晰区分“持久化数据”“运行时缓存”“临时计算结果”

### 2.2.6 runtime 的 hittest 设计要求

runtime 持有面向产品的 hittest 逻辑封装。

底层 engine 可以提供 hittest，但 engine 返回的是渲染对象级别或底层命中级别的结果。runtime 必须把它提升为产品可用结果。

runtime hittest 至少要支持：

- 点选命中
- 右键命中
- hover 命中
- 拖拽起点命中
- 多候选命中
- 可过滤命中
- 命中上下文分类

至少要考虑：

- 锁定对象处理
- 隐藏对象处理
- 穿透选择
- 隔离编辑上下文
- 编组内外对象选择优先级
- 文本对象与路径对象的命中差异
- 控制手柄与对象本体命中优先级
- overlay 命中与场景命中优先级

hittest 结果建议包含：

- object id
- source node id
- render entity id
- hit type
- hit point
- distance / score
- z-order info
- area / segment / handle info
- product eligibility flags

### 2.2.7 runtime 的 snapping 设计要求

snapping 属于运行时通用编辑能力，不应直接塞到产品 UI 层，也不应只做成 engine 的几何查询函数。

应至少支持：

- 点对点吸附
- 点对边吸附
- 边对边吸附
- 中心点吸附
- 边界框角点 / 中点吸附
- guide / ruler / grid 吸附
- alignment guides
- smart guides
- drag / resize / rotate 场景下不同 snap 策略
- 吸附优先级、阈值、去抖动、滞回策略

snapping 输出不应只是一个坐标，而应包含：

- snap target
- snap type
- input position
- output position
- delta
- confidence / score
- guide lines data
- rejection reason（如有）

### 2.2.8 runtime 的 command 系统要求

command 系统必须设计为强大、完整、可扩展。

至少需要支持：

- 标准 command 接口
- 参数标准化
- 执行
- 撤销
- 重做
- 事务
- 组合
- 批处理
- 可记录性
- 可序列化或至少可审计
- 与选区、吸附、编辑态配合
- 复杂操作拆分与事务化处理

建议 command 分类：

- document mutation commands
- selection commands
- transform commands
- grouping commands
- ordering commands
- clipboard commands
- import / export commands
- view commands
- macro / workflow commands

command 需要明确：

- 输入参数
- 前置条件
- 执行结果
- 副作用
- 可撤销边界
- 失败行为
- 日志记录策略

### 2.2.9 runtime 的 overlay 设计要求

overlay 是关键能力，不能被随意混入普通 UI 层或 engine 主场景层。

overlay 至少包括：

- selection box
- resize handles
- rotate handles
- path points / control points
- hover outline
- snap guide lines
- measurement hints
- drag preview
- marquee rectangle

要求：

- overlay 与主场景对象解耦
- overlay 的更新频率与主场景渲染可分离
- overlay 可以独立降级
- overlay 可在高频交互期间优先更新
- overlay 数据应由 runtime 组织，而不是由 UI 组件临时拼接

### 2.2.10 runtime 与 vector 的边界原则

- runtime 提供通用能力，不做最终产品裁决
- runtime 可返回多个候选结果，不替产品层拍板
- runtime 可提供 transform / selection / snapping / history 机制，不决定产品入口组织
- runtime 不应依赖具体 toolbar、panel、menu 组件

### 2.2.11 runtime 与 engine 的边界原则

- runtime 可以依赖 engine 稳定 API，但不应依赖 engine 内部实现细节
- runtime 负责桥接与提升，不负责底层算法本身
- runtime 负责请求渲染 / 查询，但不替 engine 做底层性能策略实现

### 2.2.12 runtime 的可测试性要求

至少要能单独验证：

- 文档变更桥接正确性
- hittest 结果提升正确性
- snapping 候选计算正确性
- command 执行与撤销重做正确性
- overlay 数据输出正确性
- viewport 控制正确性
- selection query 正确性
- interaction 到 command 的链路正确性

---

## 2.3 engine

`engine` 是底层渲染与高性能查询能力层。

目标：

- 使用 WebGL 作为核心渲染方案
- 在少量特殊场景下可使用 OffscreenCanvas 或其他辅助技术优化
- 提供高性能渲染、命中测试、空间索引、区域选择、局部更新等底层能力
- 不直接承载最终商业产品逻辑
- 能支撑 50k+ 元素场景，并为 100k 级压力场景预留能力边界

### 2.3.1 engine 的定位

`engine` 是：

- 渲染执行层
- 底层查询层
- 性能优化承载层
- 场景表示与底层交互对象承载层

`engine` 不是：

- 产品规则层
- 具体 UI 层
- 商业逻辑层
- 上下文菜单和快捷键层
- 最终对象语义裁决层

### 2.3.2 engine 的核心职责

#### 渲染

- 基于 WebGL 渲染场景
- 管理底层渲染对象
- 管理主绘制流程、分层渲染、局部刷新、缓存复用
- 为 runtime / vector 提供必要控制 API

#### HitTest

- 提供底层图形命中测试能力
- 支持单点命中、多结果命中、命中排序
- 返回渲染对象级结果，而不是最终产品语义结果

#### Spatial Index

- 提供空间索引能力
- 服务于 hittest、视区查询、框选、局部更新、snap 候选收集

#### 区域选择 / 查询

- 提供矩形查询、相交查询、包含查询
- 支持按层级、按类型、按可见性过滤候选

#### 视图与相机控制基础能力

- 提供视图矩阵、坐标转换、世界坐标与屏幕坐标转换等底层能力

#### 底层缓存与资源管理

- 纹理缓存
- 图片缩略图层级
- 文字相关缓存
- 路径几何缓存
- 对象缓存 / 组缓存

#### 性能诊断

- 渲染耗时
- hittest 耗时
- 查询候选数
- draw call 数
- 缓存命中情况
- 纹理占用与资源压力

### 2.3.3 engine 不负责的内容

以下内容不应放在 `engine`：

- 最终产品规则裁决
- 面板联动
- 快捷键映射
- 顶部栏 / 工具栏 / 右键菜单入口组织
- 文档级产品策略
- 复杂商业工作流本身
- UI 框架组件实现
- 产品语义级对象行为判定

### 2.3.4 engine 的模块划分建议

建议至少按以下模块组织：

#### renderer

负责主渲染管线、提交绘制、状态切换、分层绘制、局部刷新。

#### scene-graph / render-tree

负责底层场景对象组织、父子关系、渲染顺序、可见性、缓存状态。

#### geometry

负责路径几何、边界框、曲线细分、几何预处理、简化等。

#### hittest

负责点命中、路径命中、边界命中、控制点命中等底层算法。

#### spatial-index

负责空间索引。

可选实现方向：

- R-Tree
- Quadtree
- BVH
- 分块网格索引
- 混合索引

#### selection-query

负责区域框选、相交查询、包含查询。

#### text-subsystem

负责文字布局结果缓存、glyph atlas、文字位图缓存、分层渲染策略。

#### image-subsystem

负责图片纹理解码、缩略图层级、裁剪、滤镜相关底层支持。

#### resource-cache

负责纹理缓存、对象缓存、组缓存、淘汰策略。

#### viewport / camera

负责矩阵、坐标系转换、相机状态、投影控制。

#### overlay-render-path

负责 overlay 独立渲染通道支持。

#### diagnostics

负责底层性能统计与调试输出。

### 2.3.5 engine 的渲染职责

rendering 至少应考虑：

- 主场景渲染
- overlay 支持
- 分层渲染
- 静动态分离
- 批量提交绘制
- 视区裁剪
- 局部更新
- 对象级缓存
- 组级缓存
- 高频交互期间的降级渲染

必须平衡：

- 性能
- 可维护性
- 可诊断性
- API 稳定性

### 2.3.6 engine 的 hittest 设计要求

hittest 必须支持返回多个结果，而不是只返回单一结果。

原因：

- 产品层可能需要展示命中候选
- context menu 场景可能需要选择当前光标下具体对象
- 重叠对象、多层对象、锁定态 / 穿透态需要更丰富命中信息

建议命中结果至少包含：

- render entity id
- source object id
- source node id
- hit type
- local hit point
- world hit point
- hit area info
- z-order / render order info
- score / distance / confidence
- bounds info（必要时）

### 2.3.7 engine 的 spatial index 设计要求

spatial index 至少要服务于：

- hittest 候选缩小
- 视区查询
- 框选候选缩小
- 局部更新区域关联对象查询
- snapping 候选收集
- 大场景分块管理

要求：

- 更新成本可控
- 支持局部失效与增量更新
- 不要把所有场景查询都退化成全量扫描
- 必须能支撑 50k+ 场景

### 2.3.8 engine 的区域框选要求

区域框选必须与 spatial index 协同。

至少支持：

- 相交选中
- 包含选中
- 严格包含
- 可见对象查询
- 仅顶层对象查询
- 指定上下文层级查询

返回结果需为底层候选，最终产品语义由 runtime / vector 再提升。

### 2.3.9 engine 的图片与文本要求

#### 文本

至少考虑：

- glyph cache / atlas
- 文本位图化策略
- 缩放级别下的缓存复用
- 高频拖拽期间的降级渲染
- 文本边界与命中辅助

#### 图片

至少考虑：

- 分辨率分级
- 缩略图层级
- 解码策略
- 延迟加载
- clip / filter 支持基础
- 大图内存占用控制

### 2.3.10 engine 的性能目标

engine 必须支撑 50k+ 元素场景，并针对不同缩放级别、拖拽状态、文本图片混合内容优化。

至少需要覆盖：

#### 必须优先落地

- 视区裁剪（viewport culling）
- spatial index
- hittest 候选缩小
- 区域框选优化
- LOD（通过 engine API 可配置）
- panning 下 overscan
- zooming 下层级缓存
- 静动态分离
- overlay 独立渲染
- 脏区更新 / partial redraw
- 图片基础缓存
- 文本基础缓存

#### 中期演进

- batching 深化
- GPU / CPU 职责细化
- 组级缓存
- 路径简化与几何降采样
- 临时质量降级
- 异步预处理
- 增量加载
- 大图延迟加载与更细粒度资源管理

#### 预留接口但可暂不实现

- 超大场景分块流式加载
- 更复杂的 tile-based scene management
- 更深层的异步命中查询
- 更复杂的多级缓存诊断与自动调优
- 可替换渲染后端的能力边界

### 2.3.11 engine 的 API 边界要求

engine 暴露的 API 应偏能力型，而不是产品型。

应优先暴露：

- render / update / invalidate
- set viewport / convert coordinates
- hittest / query rect / query visible
- get diagnostics
- preload / release resources
- configure lod / quality mode
- read-only debug info

不应直接暴露：

- “进入文本编辑”
- “右键菜单命中对象”
- “产品级框选语义”
- “商业级布尔工作流”

### 2.3.12 engine 的可测试性要求

至少要能独立验证：

- 大场景渲染稳定性
- hittest 正确性
- spatial index 查询正确性
- 框选正确性
- viewport 变换正确性
- 纹理 / 缓存复用正确性
- 文本 / 图片降级策略正确性
- 诊断指标输出正确性

---

# 3. 核心链路要求

## 3.1 数据到渲染打通

必须打通：

- 文档模型 -> runtime 文档抽象
- runtime 文档抽象 -> scene bridge
- scene bridge -> engine scene data
- engine scene data -> render output

要求：

- 对象 id 一致
- 对象类型语义稳定
- 几何数据、层级数据、可见性数据一致
- 局部变更可被准确映射为局部刷新

## 3.2 交互到产品逻辑打通

必须打通：

- 用户输入 -> runtime interaction / gestures
- gestures -> runtime command / query / snapping / hittest
- runtime 结果 -> vector 产品裁决
- vector 产品裁决 -> runtime command 执行
- runtime command -> 文档更新 + engine 更新

## 3.3 视图到反馈打通

必须打通：

- hover -> hittest -> overlay highlight
- drag -> snapping -> guides overlay
- selection -> handles overlay
- marquee -> query -> selection result
- zoom / pan -> viewport controller -> engine

## 3.4 历史记录打通

必须打通：

- command 执行
- transaction 合并
- undo / redo
- dirty 状态联动
- 文档保存点标记

---

# 4. 模板数据与测试场景要求

## 4.1 目标

检查已有模板生成功能是否足以覆盖：

- 性能测试
- 交互测试
- 回归测试
- 命中测试
- 吸附测试
- 框选测试
- 文档导入导出测试

若不足，必须补充模板设计。

## 4.2 模板建议覆盖范围

至少包括：

- 简单图形模板
- 混合图形模板
- 文本密集模板
- 图片密集模板
- 多层级编组模板
- 布尔运算结果模板
- guide / grid / ruler 测试模板
- clip / mask 测试模板（如支持）
- 多画板 / 多页面模板（如支持）
- 10k / 50k / 100k 不同规模模板
- 1k 图片、10k 图片混合模板
- 随机尺寸、随机位置、随机层级、随机旋转压力模板
- 大量重叠对象模板
- 大量细小对象模板
- 稀疏大场景模板
- 高密度文本混合图片模板

## 4.3 模板元数据要求

模板最好不仅是数据，还应包含：

- 模板名称
- 模板目标
- 规模标签
- 关注能力标签
- 预期交互场景
- 预期性能观察点
- 是否用于回归测试
- 是否用于基准测试

---

# 5. 你的具体工作内容

你需要完成的不是单点代码修改，而是一整套可落地方案推进。请按以下顺序工作：

## 5.1 先理解现状

- 阅读相关 skill、现有代码与文档
- 识别当前项目实际分层、模块边界与缺口
- 识别现有设计与目标之间的冲突点
- 不要脱离现有架构凭空重建一套体系

## 5.2 再做设计与实现

- 明确 `vector / runtime / engine` 的职责边界
- 补齐缺失的数据流、命令流、交互流设计
- 优先完成核心链路打通
- 对关键能力给出实现方案，必要时直接落地代码

## 5.3 再做结构修正

- 对混乱模块提出重构建议
- 对命名不清晰模块提出命名修正建议
- 对边界错误模块提出迁移建议
- 尽量采用可渐进迁移方案，而不是一次性推倒重来

## 5.4 输出高质量文档

你产出的内容至少应包括：

- 架构说明
- 模块职责说明
- vector 产品描述与模块划分说明
- runtime 模块划分与运行时职责说明
- engine 模块划分与底层能力边界说明
- 数据流与交互流说明
- command 系统设计说明
- snapping 设计说明
- hittest 设计说明
- overlay 设计说明
- viewport 控制说明
- 50k+ 性能优化方案
- 模板生成策略说明
- 已完成项 / 待完成项 / 风险项

文档要求：

- 结构清晰
- 明确边界
- 能直接给后续 agent 或开发者继续接手
- 不写空话
- 尽量落到模块、接口、数据结构、执行顺序与迁移策略

---

# 6. 最终交付要求

完成需求后，请继续做以下收尾工作：

## 6.1 略微精简 `agent.md`

目标：

- 减少重复表述
- 保留关键约束
- 让后续 agent 更容易快速进入工作状态

注意：

- 只做略微精简，不要删掉关键原则
- 不要把原本清晰约束压缩成模糊描述

## 6.2 沉淀文档到知识库

将本次梳理出的关键结论沉淀到知识库，至少包括：

- 分层职责
- 核心链路
- 关键设计约束
- 性能策略
- 模板策略
- 模块划分
- 后续开发注意事项

---

# 7. 工作原则

- 优先尊重现有项目结构与约束
- 能复用已有设计时，不要重复造轮子
- 底层能力与产品逻辑要严格分层
- 避免把商业产品逻辑塞进 engine
- 避免把具体框架 UI 细节塞进 runtime
- 文档与实现都要面向长期演进
- 所有设计尽量考虑撤销重做、性能、可扩展性、可测试性
- 对不确定事项请明确标注假设，不要伪造结论
- 优先采用渐进修正方案，不要轻易推翻既有系统

---

# 8. 执行偏好

在推进时，优先输出以下内容：

1. 现状判断
2. 缺口清单
3. 分层边界修正建议
4. 模块拆分建议
5. 核心链路实现方案
6. 性能优化优先级
7. 模板策略
8. 文档沉淀结果
9. 风险项与迁移建议

如发现现有设计与目标冲突，请直接指出冲突点，并给出可执行的折中方案或迁移方案。
