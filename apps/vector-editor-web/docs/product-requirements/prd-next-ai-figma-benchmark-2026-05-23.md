# Vector 新一代 PRD（对标 Adobe Illustrator / Figma）

## 1. 产品愿景

Vector 定位为专业级 2D 编辑器：

1. 交互流畅度对标 Figma
2. 图形编辑深度对标 Adobe Illustrator
3. 文档、历史、桥接契约具备工程级可演进能力

## 2. 目标与非目标

### 2.1 目标（12 个月）

1. 建成稳定主链路：创建 -> 选择 -> 变换 -> 样式 -> 历史 -> 导出
2. 建成可规模化文档模型：支持大文档、可回放、可迁移
3. 建成高可预测编辑体验：复杂场景下减少误操作与状态漂移
4. 建成 runtime-engine 契约体系：支持增量升级和跨渲染后端

### 2.2 非目标（本轮）

1. 不在本 session 内改造 engine 内核实现
2. 不交付多人实时协作实现，只交付需求与契约

## 3. 产品信息架构

1. Document Domain：文档、页面、节点、样式、资源
2. Interaction Domain：工具、状态机、命令系统、事件回放
3. Viewport Domain：缩放、平移、适配、minimap、多视图
4. Editing Domain：路径、变换、对齐、吸附、文本排版
5. Structure Domain：图层、组、蒙版、布尔、约束
6. Persistence Domain：序列化、导入导出、恢复与容灾
7. Integration Domain：runtime-engine adapter、扩展与插件 API

## 4. 分类完善后的需求矩阵

### 4.1 Tool Behavior / Interaction Flow

1. 每个工具必须定义 Enter / Move / Commit / Cancel 四阶段
2. 指针与键盘冲突时以工具状态机为唯一裁决源
3. 同一动作从菜单、快捷键、上下文菜单触发结果一致

验收：

1. 工具切换无悬挂态
2. 交互流中断后可以恢复到可继续编辑状态

### 4.2 Editor State / Selection / Hover / Focus

1. Selection 状态分层：document selection、isolation selection、sub-selection
2. Hover 仅用于预览，不可直接污染 selection
3. Focus 必须显式区分文本输入焦点与画布焦点
4. Selection 和 Layer 面板是双向一致镜像

验收：

1. 任意时刻状态可解释（可调试）
2. 画布与图层面板状态一致率 100%

### 4.3 Viewport Behavior（Pan/Zoom/FitView/Scroll/Minimap）

1. Zoom anchor 必须受视口边界约束
2. Pan 与 Zoom 的合成变换需要保持 deterministic
3. Fit View 需支持页面、选择集、当前组三级适配
4. Scroll 行为在轨迹板和滚轮场景保持一致语义
5. Minimap 需提供视窗框、跳转、缩放联动

验收：

1. 高速手势下无白屏、无突然跳变
2. Fit View 在旋转对象集合下仍可预期

### 4.4 Shortcut / Clipboard / CopyPaste / Duplicate / Delete

1. 快捷键路由需具备上下文优先级（文本编辑优先于画布命令）
2. Clipboard 结构包含样式、层级、资源引用
3. Paste 需支持原位粘贴与偏移粘贴策略
4. Duplicate/Delete 对历史系统必须可逆

验收：

1. 跨文档复制粘贴结构不损坏
2. 删除后撤销能完整恢复结构与样式

### 4.5 Grouping / Layer Management

1. Group 必须保证 sibling order 可追踪
2. Ungroup 必须恢复父级层级和可见顺序
3. Layer 重排支持同级重排与跨组重排
4. 隔离编辑需明确 breadcrumb 与退出策略

验收：

1. 深层组嵌套不出现 child orphan
2. Layer/Canvas 双端一致

### 4.6 Document Model / Serialization / Lifecycle

1. 文档模型需要 canonical parent-child 双向一致性约束
2. 序列化应保留 schema 版本与迁移策略
3. Document lifecycle：new/open/dirty/save/restore/close 状态机可观测
4. Scene snapshot 应用于回放、回归、崩溃恢复

验收：

1. 序列化反序列化后结构等价
2. 自动保存和崩溃恢复具备可验证回放

### 4.7 Transform / Resize / Rotate / MultiSelect / Snapping / Alignment

1. Transform 全流程：preview -> commit -> history patch
2. 多选变换需要 pivot 与包围盒策略可配置
3. 吸附优先级：画板网格 > 智能参考线 > 邻近节点
4. 对齐与分布命令要支持 group 内和全局范围切换

验收：

1. 变换连续操作无累积漂移
2. 吸附与智能参考线结果可解释

### 4.8 History / Command / Transaction

1. 命令需要具备 command id、source、transaction id
2. 历史支持 command merge、batch command、transaction rollback
3. remote history 与 local undo 语义严格隔离
4. 重放系统需支持 deterministic replay

验收：

1. 同一输入事件重放结果一致
2. 合并策略不会吞掉关键步骤

### 4.9 Integration Contract / Engine Adapter / State Sync

1. runtime-engine adapter 必须版本化
2. scene sync 需要增量 invalidation 语义
3. render invalidation 需携带原因码与边界信息
4. state synchronization 包含 selection、viewport、document revision

验收：

1. 版本不匹配可降级并报错
2. adapter 契约可通过独立契约测试

### 4.10 扩展与生态（Plugin / Extension / Schema Extension）

1. 插件生命周期：install/activate/suspend/uninstall
2. extension API 只暴露语义命令，不暴露 engine 内部细节
3. schema extension 需要命名空间隔离和迁移策略

验收：

1. 插件异常不会污染主文档状态
2. 扩展 schema 可向后兼容

### 4.11 性能与稳定性（Benchmark / Stress / Memory Leak）

1. Large Scene Benchmark：10k 节点编辑可用
2. Interaction FPS：常见编辑链路保持稳定帧率
3. Pan/Zoom/Drag 性能独立建基线
4. 内存泄漏检测纳入 CI 计划

验收：

1. 性能预算有门禁
2. 压测后功能正确性不退化

### 4.12 回归与确定性（Scene Regression / Replay Regression / Golden Scene）

1. 建立 Golden Scene 集合
2. 关键链路接入 deterministic workflow regression
3. Visual regression 与 scene snapshot regression 并行

验收：

1. 引擎升级或 adapter 改动时可快速识别行为漂移

## 5. 里程碑建议

1. M3（模型强化）：文档模型、group、history、序列化
2. M4（交互强化）：viewport、transform、snapping、alignment
3. M5（契约强化）：runtime-engine API、state sync、回放体系
4. M6（性能强化）：benchmark、大文档、内存与稳定性

## 6. 发布门禁

1. 必须通过核心回归清单
2. 必须通过大场景性能门禁
3. 必须通过 deterministic replay 检查
4. 文档与测试映射关系完整
