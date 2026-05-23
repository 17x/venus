# Vector 旧产品逻辑基线（2026-05-23）

## 1. 文档目的

本文件用于冻结当前 vector-editor-web 的既有产品逻辑，作为新一轮需求升级的回归基准与行为对照。

适用范围：

1. Product 语义层
2. Runtime 运行机制层
3. Runtime <-> Engine 桥接层（仅契约，不变更 engine 实现）

## 2. 当前能力快照

### 2.1 编辑主链路（已具备）

1. 选择、框选、多选、直接选择
2. 移动、缩放、旋转、吸附
3. 路径锚点和控制柄编辑
4. 编组/解组、蒙版、基础布尔
5. 填充/描边/阴影/文字基础样式
6. 图层面板、属性面板、历史面板
7. 快捷键、撤销/重做

### 2.2 架构分层（已固化）

1. Product：产品语义、交互策略、状态编排
2. Runtime：命中、会话、预览态、命令分发
3. Engine：渲染与底层能力

决策约束：Product 与 Runtime 暂不合并，采用命令契约协作。

## 3. 关键数据模型基线

### 3.1 DocumentNode / EditorDocument

1. 基础 shape 类型已覆盖 frame/group/rectangle/ellipse/polygon/star/lineSegment/path/text/image
2. 节点结构包含 parentId 和 group.childIds 双表达
3. 样式层支持 fill/stroke/shadow/textRuns
4. schema 字段已承载源节点类型、蒙版组关系等兼容信息

### 3.2 Normalized Runtime Document

1. 通过 normalized 投影统一 parent 与 children 双向关系
2. 支持 group bounds 递归推导
3. 支持 set-shape-parent / set-group-children 双写一致性校验
4. 保留旧场景 childIds 缺失的兼容回填路径

## 4. Group 逻辑基线

1. Group patch 计划已支持：
   - common parent sibling order 保序
   - insert-shape + set-group-children + set-shape-parent 组合补丁
2. Ungroup patch 计划已支持：
   - 父组 children 替换
   - 子节点回挂父层
   - 删除 group 本身
3. 现状短板：
   - 非破坏式布尔链可视化仍不足
   - 深层隔离编辑状态提示不够强

## 5. History 逻辑基线

1. HistoryPatch 词汇已覆盖移动、缩放、旋转、样式、层级、插入/删除、重排等核心动作
2. 本地历史与远程历史分离：
   - local 参与 undo/redo
   - remote 进入历史摘要但不被本地撤销
3. 现状短板：
   - 事务级合并策略仍偏弱
   - 批量命令语义化标签不足
   - 历史压缩与场景快照联动未体系化

## 6. 视口与交互基线

1. viewport 已具备 pan / zoom / fit-view 基础能力
2. zoom 已具备输入源识别（mouse/trackpad）和 source lock
3. wheel 锚点已做视口边界约束与异常回退
4. 现状短板：
   - 最小化跳变策略在极端 burst 手势下仍有优化空间
   - minimap 与主视口的一致性策略未产品化封装

## 7. Runtime-Engine 桥接基线

1. 已存在稳定桥接接口：
   - engineExports.contract
   - engine facade（geometry payload、adaptive hit tolerance、transform）
   - engine scene adapter（runtime snapshot -> render nodes）
2. 现状短板：
   - scene invalidation 语义粒度需提升
   - adapter 可观测字段还未形成统一诊断协议

## 8. 现有测试基线

已覆盖重点：

1. runtime 交互策略（命中、选择过滤、提交策略、吸附策略）
2. normalized document runtime 与 normalized history patches
3. worker scope 的 normalized apply 与 dual-write parity
4. engine scene adapter 文本样式投影

缺口方向：

1. 视口行为（pan/zoom/fit-view）系统化用例
2. history 栈行为（local/remote）契约化用例
3. grouping + 文档一致性更高层场景回归
4. 集成契约测试目录尚未分门别类

## 9. 升级约束

1. 本轮仅增强 vector runtime/product，不触碰 engine 实现
2. 允许新增 engine API 需求文档，形成跨层契约候选
3. 新需求必须映射到可执行测试条目
4. 所有新增能力按 Product/Runtime/Engine 边界拆分验收
