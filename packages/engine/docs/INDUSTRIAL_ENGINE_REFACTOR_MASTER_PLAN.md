# Venus Engine 工业级重构总规划（Serialized Master Plan）

状态：Draft-Ready
版本：v1.0
日期：2026-05-16
适用范围：packages/engine（含与 app/runtime 的契约边界）

---

## 0. 文档目标

本计划用于将 engine 演进为工业级渲染引擎，统一支持以下目标场景：

- 编辑器渲染（300k+ 节点，强调交互跟手与可编辑语义正确性）
- 游戏渲染（强调帧稳定、实时性、动态效果）
- 动画渲染（强调时间一致性、插值精度、回放稳定）
- 医疗 3D 展示（强调画面一致性、细节完整、可追溯）
- 超大量数据展示（300k+，强调渐进式可见性、稳定吞吐）

本计划遵循以下架构理念：

- User Settings -> Quality Preset -> Runtime Policy -> Runtime Budget -> Render Strategy -> GPU Backend
- 渲染系统是运行时预算系统，而非静态流水线。
- 通过显式策略状态机（interactive / settling / static / camera）平衡“跟手流畅”与“画质完整”。

---

## 1. 全局成功标准（Program SLO）

### 1.1 跨场景统一 SLO

- Input-to-Photon（交互输入到可见响应）p95 <= 32ms，p99 <= 50ms（编辑器/游戏模式）
- 交互帧稳定性：interactive FPS p95 >= 55（60Hz 屏）
- 细节恢复时延：settle-to-sharp p95 <= 220ms，p99 <= 350ms
- 完整性：关键语义层 missing ratio = 0（选中态、编辑锚点、医疗关键层）
- 一致性：同输入数据 + 同策略配置下，渲染结果可重复（deterministic snapshot）

### 1.2 场景差异化 SLO

- 编辑器 300k+：拖拽、框选、缩放连续操作无明显阻滞，交互期间允许非关键视觉降级，停手后快速清晰恢复
- 游戏：长时间运行帧间抖动可控，特效预算受压时策略性降级，不出现主要物体丢失
- 动画：时间轴推进稳定，不因预算切换造成关键帧跳变、抖动
- 医疗 3D：关键组织/标注层绝不降级；任一帧可输出策略与预算决策证据
- 超大量数据：支持流式加载、渐进显示、可视区域优先，避免“空白区停留”

---

## 2. 约束与执行协议

### 2.1 强制协议

每个非平凡改动必须按顺序执行：

1. Scope Definition
2. Type Definition
3. CHANGE REQUEST
4. Test Design
5. Implementation
6. Validation
7. Cleanup Check

### 2.2 CHANGE REQUEST 规范

每个任务开始实施前必须落地对应 CHANGE REQUEST，至少包含：

- Target
- Goal
- Change Type
- Impact
- Cleanup
- Tests

### 2.3 边界约束

- 依赖关系：app -> engine/lib；engine -> lib；禁止反向依赖
- settings/policy 面向抽象策略，不直接暴露底层 GPU 细节给用户
- 所有临时兼容分支必须使用 AI-TEMP 标记并定义移除条件

---

## 3. 目标架构（To-Be）

### 3.1 目录蓝图（engine 内部）

- settings/
  - graphics/
  - performance/
  - runtime/
  - presets/
  - scaling/
  - budget/
  - device/
  - diagnostics/
  - debug/
- runtime/policy/
- runtime/strategy/
- runtime/budget/
- renderer/pipeline/
- renderer/cache/
- renderer/streaming/
- diagnostics/
- testing/perf/

### 3.2 核心运行链路

- Frame Diagnostics
- Runtime Pressure Analysis
- Budget Evaluation
- Scaling Decision
- Runtime Policy Adjustment
- Render Strategy Update
- Renderer Execution

### 3.3 模式与策略

- profile：editor / game / animation / medical / massive-data / hybrid
- phase：interactive / settling / static / camera
- degradation ladder：非关键视觉 -> 非关键细节 -> 远距细节，禁止影响关键语义层

---

## 4. 任务序列化总览

说明：

- 任务编号严格串行：T0001 -> T0160
- 可以并行开发，但验收与合并顺序按编号推进
- 每条任务包含：主目标、子任务、交付物、验收标准、测试细节、依赖

---

## 5. 序列化任务清单（T0001-T0160）

## 阶段 A：治理与基线（T0001-T0012）

### T0001

主目标：冻结当前引擎能力基线，建立重构前证据面板。

子任务：

- 采集当前 interactive/static/camera 三类帧统计
- 建立 baseline 报告模板（fps、latency、cache hit、fallback reason）
- 固化最小可复现场景集（editor/game/animation/medical/massive-data）

交付物：

- baseline 指标文档
- 场景复现脚本清单

验收标准：

- 任一场景可在本地一键复现并输出同结构统计
- baseline 报告字段覆盖后续 SLO 所需指标

测试细节：

- 回归测试：重复运行 10 次，指标波动区间可量化
- 稳定性测试：30 分钟持续渲染，报告无字段缺失

依赖：无

### T0002

主目标：定义跨场景统一术语与策略字典。

子任务：

- 定义 profile/phase/pressure/budget/fallback 的统一枚举
- 对齐 settings.md 概念到 engine runtime 名称
- 输出术语映射表（旧名 -> 新名）

交付物：

- 术语与契约字典文档

验收标准：

- 无歧义术语（同一概念仅一个主名）
- 关键模块引用字典后能完成类型约束

测试细节：

- 类型测试：枚举覆盖检查
- 文档一致性测试：术语 lint（静态扫描）

依赖：T0001

### T0003

主目标：建立 Program 级 CHANGE REQUEST 模板与流水线门禁。

子任务：

- 统一 CHANGE REQUEST 文件模板
- CI 增加“无 CR 不允许合并”校验
- 任务与 CR 编号互链

交付物：

- CR 模板文件
- CI 校验规则

验收标准：

- 非 trivial 改动若缺失 CR，CI 必然失败

测试细节：

- CI 契约测试：构造缺失 CR 的变更样例，验证阻断

依赖：T0002

### T0004

主目标：定义“关键语义层不可降级”机制总契约。

子任务：

- 定义关键层分类（编辑锚点、医学关键结构、诊断标注）
- 定义降级豁免规则
- 定义策略冲突时的优先级

交付物：

- critical-layer contract

验收标准：

- 任一降级策略都无法影响关键层可见性与清晰性

测试细节：

- 单测：critical layer 被标记后任何 degradation pass 均跳过
- 集成：高压场景下关键层保持完整

依赖：T0002

### T0005

主目标：建立五类场景标准数据集和压力分档。

子任务：

- 编辑器 300k+ 节点场景
- 游戏动态对象与粒子场景
- 动画长序列与多轨插值场景
- 医疗 3D 多层体数据场景
- massive-data 300k+ 点线面混合场景

交付物：

- 场景资产规范和生成器

验收标准：

- 每类场景可生成 low/medium/high/extreme 四档

测试细节：

- 数据一致性测试：同 seed 输出一致
- 资源装载测试：场景加载无 schema 错误

依赖：T0001

### T0006

主目标：建立性能与画质双通道指标采集框架。

子任务：

- 帧时、延迟、掉帧、coalesced request 采集
- 画质完整性（missing content / fallback ratio）采集
- 关键语义完整性采集

交付物：

- metrics SDK 与报告格式

验收标准：

- 每帧可产出 diagnostics snapshot

测试细节：

- 单测：指标字段存在性
- 压测：高频输入下采集系统不引入明显额外抖动

依赖：T0001, T0004

### T0007

主目标：定义 Engine Capability Profile（设备能力分层）。

子任务：

- GPU tier、内存 tier、线程能力探测
- WebGL/WebGPU 能力探测
- 输出 capability profile 类型契约

交付物：

- capability detector

验收标准：

- 设备能力输出可驱动 preset 默认选择

测试细节：

- mock 能力注入测试
- 跨平台兼容测试（mac/win/linux）

依赖：T0002

### T0008

主目标：定义 Program 风险台账（性能、画质、医疗合规、回归风险）。

子任务：

- 风险等级与触发阈值
- 回滚开关策略
- 风险升级流程

交付物：

- 风险台账文档

验收标准：

- 所有高风险任务有回滚路径

测试细节：

- 演练测试：模拟高风险触发并完成回滚

依赖：T0003

### T0009

主目标：定义统一发布策略（实验开关 -> 灰度 -> 默认）。

子任务：

- feature flag 规范
- profile 级灰度策略
- 失败回退策略

交付物：

- rollout playbook

验收标准：

- 任一新策略可按 profile 灰度启停

测试细节：

- 开关测试：热切换前后状态一致性

依赖：T0008

### T0010

主目标：建立重构任务追踪仪表（任务状态、指标趋势、阻塞项）。

子任务：

- 任务状态机（not-started/in-progress/blocked/done）
- 指标趋势图接入
- 阻塞项报警

交付物：

- program dashboard

验收标准：

- 每个任务状态和指标可追踪

测试细节：

- 数据完整性测试
- 权限与读取压力测试

依赖：T0006

### T0011

主目标：明确包边界改造原则与责任图（engine 与 app/runtime）。

子任务：

- 划分 policy/budget/strategy 所属层
- 规定允许依赖方向
- 输出边界禁令清单

交付物：

- boundary charter

验收标准：

- 静态分析可检测非法依赖

测试细节：

- import graph 检查测试

依赖：T0002

### T0012

主目标：阶段 A 验收收口。

子任务：

- 汇总 A 阶段成果
- baseline 与新治理链路校准
- Go/No-Go 评审

交付物：

- 阶段验收报告

验收标准：

- A 阶段所有硬门禁可运行

测试细节：

- 全链路 smoke：从 CR 到 CI gate 到指标输出

依赖：T0001-T0011

---

## 阶段 B：Settings/Policy 体系落地（T0013-T0030）

### T0013

主目标：创建 settings 根结构与模块壳层。

子任务：

- 建立 graphics/performance/runtime/presets/scaling/budget/device/diagnostics/debug
- 定义模块入口与 barrel
- 建立最小默认配置

交付物：

- settings 目录结构与初始契约

验收标准：

- 构建通过且无循环依赖

测试细节：

- 类型测试：导出一致性
- 结构测试：目录约束检查

依赖：T0011

### T0014

主目标：定义 GraphicsSettings 抽象（用户可理解，不暴露底层细节）。

子任务：

- 设计 renderScale/maxFPS/AA 等抽象字段
- 定义默认值与取值范围
- 产出 schema 校验

交付物：

- GraphicsSettings 契约与校验器

验收标准：

- 非法配置可被拒绝并提示

测试细节：

- schema 单测
- 边界值测试

依赖：T0013

### T0015

主目标：定义 PerformanceSettings 与预算字段映射。

子任务：

- frameTimeBudget/uploadBudget/workerBudget 等字段定义
- 统一单位（ms/bytes/count）
- 运行时映射器

交付物：

- PerformanceSettings + mapper

验收标准：

- 可映射到 runtime budget，不丢字段语义

测试细节：

- 单测：字段映射准确性

依赖：T0013

### T0016

主目标：定义 RuntimeSettings（架构行为开关）。

子任务：

- retainedRendering/partialRedraw/progressiveRendering 等
- 兼容旧开关迁移规则
- 过期字段告警

交付物：

- RuntimeSettings 契约

验收标准：

- 旧配置导入后行为一致或可解释偏差

测试细节：

- 迁移回归测试

依赖：T0013

### T0017

主目标：定义 QualityPreset 与 PresetRegistry。

子任务：

- Low/Medium/High/Ultra/Balanced/BatterySaver
- editor/game/animation/medical/massive-data profile 默认 preset
- preset 合并策略

交付物：

- PresetRegistry

验收标准：

- profile + capability 可确定唯一默认 preset

测试细节：

- 组合测试：profile x capability

依赖：T0014, T0015, T0016, T0007

### T0018

主目标：定义 RuntimePolicy（从 settings/preset 归一化到内部策略）。

子任务：

- 统一策略字段
- phase-aware 参数覆写规则
- critical-layer 保护映射

交付物：

- RuntimePolicy 类型与生成器

验收标准：

- 任意 preset 在运行时可生成完整 policy

测试细节：

- policy completeness 测试

依赖：T0017, T0004

### T0019

主目标：接入 DeviceCapability 到 policy 生成路径。

子任务：

- 设备分层修正 preset
- 低端设备防崩溃保护参数
- 高端设备上限放宽参数

交付物：

- capability-aware policy resolver

验收标准：

- 相同 preset 在不同 capability 上得到合理差异化 policy

测试细节：

- 设备矩阵测试

依赖：T0018, T0007

### T0020

主目标：定义 RuntimeBudget 契约与预算快照。

子任务：

- draw/upload/cache/tile/worker/frame 预算结构
- 动态预算调整入口
- budget trace 字段

交付物：

- RuntimeBudget 类型与构造器

验收标准：

- 每帧预算可被记录并回放

测试细节：

- snapshot 一致性测试

依赖：T0018

### T0021

主目标：定义 PressureMonitor 契约（CPU/GPU/memory/visibility/streaming）。

子任务：

- 采集输入定义
- pressure 分级规则
- 去噪与滞回规则

交付物：

- pressure monitor contract

验收标准：

- 压力等级不会抖动翻转

测试细节：

- 波形注入测试（锯齿输入）

依赖：T0020, T0006

### T0022

主目标：落地 AutoQualityScaler v1。

子任务：

- 根据 pressure 调整 renderScale/lod/cache scale
- 定义最小步进与冷却时间
- 输出 scaler 决策日志

交付物：

- auto quality scaler

验收标准：

- 压力升高时策略可收缩，恢复时可回升

测试细节：

- 闭环测试：压力注入 -> 策略变化 -> 指标改善

依赖：T0021

### T0023

主目标：定义 DiagnosticsSettings 与采样预算。

子任务：

- 采样频率
- 低开销采集策略
- debug/release 差异

交付物：

- diagnostics setting contract

验收标准：

- 诊断开销在限定范围

测试细节：

- 采集开销 A/B 测试

依赖：T0006

### T0024

主目标：定义 DebugSettings（仅内部）与发布隔离。

子任务：

- debug overlays 开关
- 发布构建剥离策略
- 内部渠道可见性约束

交付物：

- debug settings + build guard

验收标准：

- release 构建不暴露 debug 入口

测试细节：

- 构建产物扫描测试

依赖：T0023

### T0025

主目标：建立 settings 迁移器（旧配置 -> 新配置）。

子任务：

- 字段映射
- 废弃字段告警
- 默认回填

交付物：

- config migrator

验收标准：

- 历史配置迁移成功率 >= 99%

测试细节：

- 真实历史配置回放测试

依赖：T0014-T0019

### T0026

主目标：建立 settings/policy 文档与示例矩阵。

子任务：

- profile 示例
- capability 示例
- fallback 示例

交付物：

- settings guide

验收标准：

- 文档可指导业务方独立配置

测试细节：

- 文档示例自动校验

依赖：T0025

### T0027

主目标：将 policy 注入 createEngine 主循环。

子任务：

- resolveFrame 前注入 policy snapshot
- renderer context 与 budget 对齐
- diagnostics 回传

交付物：

- policy runtime wiring

验收标准：

- 每帧策略与预算可追踪

测试细节：

- 集成测试：policy 变化引发 strategy 变化

依赖：T0020, T0018

### T0028

主目标：建立 policy 决策回放工具。

子任务：

- 记录 frame diagnostics + pressure + budget + strategy
- 生成可重放文件
- 回放并比对关键字段

交付物：

- policy replay tool

验收标准：

- 重放后关键决策序列一致

测试细节：

- determinism 回放测试

依赖：T0027

### T0029

主目标：阶段 B 收口与性能基准对齐。

子任务：

- 对比 baseline
- 修正高回归点
- 冻结 B 阶段 API

交付物：

- B 阶段验收报告

验收标准：

- 无关键回归；policy 系统可稳定运行

测试细节：

- 全场景 smoke + 回放一致性

依赖：T0013-T0028

### T0030

主目标：B 阶段 Go/No-Go 评审。

子任务：

- 风险评估
- 发布策略确认
- 进入 C 阶段决策

交付物：

- 评审记录

验收标准：

- 评审通过且遗留项有明确 owner 与时限

测试细节：

- 无新增测试，执行审计

依赖：T0029

---

## 阶段 C：策略状态机与 QoS 核心（T0031-T0050）

### T0031

主目标：重构 strategy 输入契约，标准化 phase 决策输入。

子任务：

- 合并 interaction/camera/predictor/budget 输入
- 定义 phase 转移条件
- 保留兼容层

交付物：

- strategy input v2

验收标准：

- phase 决策仅依赖标准输入，不读隐式全局状态

测试细节：

- 单测：转移表覆盖

依赖：T0027

### T0032

主目标：引入 degradation ladder（分级降级梯度）。

子任务：

- L1 非关键特效降级
- L2 非关键细节降级
- L3 远场细节降级
- critical-layer 豁免注入

交付物：

- degradation ladder module

验收标准：

- 降级顺序可解释且关键层不受影响

测试细节：

- 断言测试：关键层永不降级

依赖：T0031, T0004

### T0033

主目标：建立 phase 滞回与最短停留机制。

子任务：

- phase entry/exit hysteresis
- min dwell time
- jitter 抑制

交付物：

- phase stability guard

验收标准：

- 高频噪声输入下 phase 不抖动

测试细节：

- 波形仿真测试

依赖：T0031

### T0034

主目标：定义 interactive 预算模板（编辑器/游戏优先跟手）。

子任务：

- draw/upload/tile 最低保障
- 关键纹理上传微预算
- 交互期 cache reuse 策略

交付物：

- interactive budget profile

验收标准：

- 输入高频下响应不阻塞

测试细节：

- 交互压力测试：连续 3 分钟操作

依赖：T0032

### T0035

主目标：定义 settling 预算模板（快速恢复清晰）。

子任务：

- settle deadline
- 锐化优先区域
- fallback 回收策略

交付物：

- settling budget profile

验收标准：

- 停手后在 SLO 内恢复清晰

测试细节：

- settle-to-sharp 统计测试

依赖：T0034

### T0036

主目标：定义 static 预算模板（完整性优先）。

子任务：

- 全质量路径
- 完整性保护策略
- 空闲资源用于预取/缓存整顿

交付物：

- static budget profile

验收标准：

- static 下 detail completeness 达到目标

测试细节：

- 长稳测试：60 分钟渲染一致性

依赖：T0035

### T0037

主目标：定义 camera phase 预算模板（动画插值连续）。

子任务：

- camera 动画 active 时的策略
- preview-only / full-quality 双路径
- 动画结束切换到 settling

交付物：

- camera budget profile

验收标准：

- camera 动画不出现首帧后停滞

测试细节：

- camera 连续动画测试

依赖：T0031

### T0038

主目标：建立 QoS 控制器（实时选择预算模板）。

子任务：

- 输入：profile + phase + pressure + capability
- 输出：runtime budget + strategy flags
- 决策 trace

交付物：

- qos controller

验收标准：

- 任一帧 budget 来源可解释

测试细节：

- 决策正确性测试（case table）

依赖：T0034-T0037

### T0039

主目标：建立 QoS 安全护栏（hard guard）。

子任务：

- 关键层不可降级硬护栏
- medical profile 完整性优先硬护栏
- debug override 护栏

交付物：

- qos hard guard

验收标准：

- 任何策略组合均不能突破硬护栏

测试细节：

- 组合爆炸测试（随机策略注入）

依赖：T0038

### T0040

主目标：接入 QoS 到 renderer context。

子任务：

- 渲染前注入预算
- cache/tile/upload 子系统预算分发
- stats 回传

交付物：

- qos-renderer wiring

验收标准：

- 子系统实际行为匹配 budget

测试细节：

- 子系统一致性测试

依赖：T0038

### T0041

主目标：构建 QoS 观察面板。

子任务：

- 展示 phase/pressure/budget/degradation
- 展示 fallback reason
- 关键层保护命中显示

交付物：

- qos diagnostics panel

验收标准：

- 每次降级均可追踪原因

测试细节：

- 面板字段完整性测试

依赖：T0040

### T0042

主目标：完成 editor profile 策略特化。

子任务：

- pointer/drag/zoom 优先预算
- 选中/编辑关键层保护
- 停手锐化优化

交付物：

- editor profile policy pack

验收标准：

- editor 300k+ 交互体验满足 SLO

测试细节：

- editor 场景压力测试

依赖：T0040

### T0043

主目标：完成 game profile 策略特化。

子任务：

- 连续动态对象预算
- 特效降级梯度
- 帧稳定优先

交付物：

- game profile policy pack

验收标准：

- 动态场景帧抖动受控

测试细节：

- 高动态场景 perf 测试

依赖：T0040

### T0044

主目标：完成 animation profile 策略特化。

子任务：

- timeline 稳定推进
- 插值一致性保护
- 关键帧附近预算保护

交付物：

- animation profile policy pack

验收标准：

- 动画回放无关键帧闪烁/跳变

测试细节：

- 时间轴一致性测试

依赖：T0040

### T0045

主目标：完成 medical profile 策略特化。

子任务：

- 关键组织层强保护
- 细节完整性优先
- 决策证据链导出

交付物：

- medical profile policy pack

验收标准：

- 医疗关键层完整性 100%

测试细节：

- 医疗数据一致性回归

依赖：T0039, T0040

### T0046

主目标：完成 massive-data profile 策略特化。

子任务：

- 渐进显示策略
- 可视区优先预取
- 空白区停留抑制

交付物：

- massive-data policy pack

验收标准：

- 大场景移动时空白区域恢复符合阈值

测试细节：

- 300k+ 数据漫游测试

依赖：T0040

### T0047

主目标：定义 hybrid profile 自动切换策略。

子任务：

- 基于交互模式自动切换 profile 倾向
- 切换滞回与冷却
- 策略切换日志

交付物：

- hybrid auto policy

验收标准：

- 切换不抖动且收益可量化

测试细节：

- 混合工作流回放测试

依赖：T0042-T0046

### T0048

主目标：QoS 端到端回放验收。

子任务：

- 五类场景跑全链路
- 输出 phase 与 budget 决策序列
- 对比 baseline

交付物：

- qos e2e report

验收标准：

- SLO 达标或有清晰风险解释与缓解项

测试细节：

- e2e 自动化回放 + 统计

依赖：T0047

### T0049

主目标：收敛临时兼容路径，减少策略分叉。

子任务：

- 删除旧 strategy 冗余分支
- 统一 diagnostics 字段
- 清理 AI-TEMP 到期项

交付物：

- 策略收敛补丁

验收标准：

- 无双轨逻辑残留

测试细节：

- 静态扫描 + 回归测试

依赖：T0048

### T0050

主目标：阶段 C 验收。

子任务：

- 审查 QoS 控制器与 profile pack
- 评估风险与发布计划

交付物：

- C 阶段验收报告

验收标准：

- C 阶段目标达成并可灰度发布

测试细节：

- 全场景签收测试

依赖：T0031-T0049

---

## 阶段 D：渲染管线与缓存系统工业化（T0051-T0074）

### T0051

主目标：统一 Render Pipeline Contract（backend-agnostic）。

子任务：

- pipeline stage 接口统一
- command packet 契约统一
- backend 能力声明

交付物：

- render pipeline contract v2

验收标准：

- WebGL/WebGPU/CPU fallback 接口一致

测试细节：

- 合约一致性测试

依赖：T0050

### T0052

主目标：重构 draw packet 构建链，支持 phase-aware 裁剪。

子任务：

- packet builder 拆层
- 关键层优先保留
- 非关键层按 budget 裁剪

交付物：

- phase-aware packet builder

验收标准：

- packet 构建耗时可控，关键层不丢

测试细节：

- packet snapshot 测试

依赖：T0051, T0039

### T0053

主目标：重构 geometry cache（容量、失效、命中策略）。

子任务：

- cache key 标准化
- 失效事件统一
- 压力下退化策略

交付物：

- geometry cache v2

验收标准：

- 命中率提升且失效可解释

测试细节：

- cache 命中/失效回归测试

依赖：T0052

### T0054

主目标：重构 texture cache（关键纹理优先）。

子任务：

- texture 分级（critical/high/normal/background）
- 上传队列优先级
- 过载淘汰策略

交付物：

- texture cache v2

验收标准：

- 关键纹理在高压下优先可见

测试细节：

- 纹理上传优先级测试

依赖：T0052

### T0055

主目标：重构 tile cache 与 tile scheduler。

子任务：

- tile 粒度策略
- 可视区 + 预测区优先
- 过期请求取消与饥饿避免

交付物：

- tile cache/scheduler v2

验收标准：

- 漫游时空白区停留显著下降

测试细节：

- tile queue 压测
- starvation 测试

依赖：T0052

### T0056

主目标：实现 ROI（视区中心）优先锐化策略。

子任务：

- ROI 距离函数
- 锐化上传预算绑定
- profile 可配置权重

交付物：

- roi sharpen policy

验收标准：

- 预算受限时中心视区优先清晰

测试细节：

- 视觉优先级测试

依赖：T0055

### T0057

主目标：实现 progressive rendering 合同化。

子任务：

- preview pass / resolve pass 明确分工
- pass 切换条件
- 统计字段

交付物：

- progressive rendering contract

验收标准：

- preview 与 resolve 行为稳定，停手后完整恢复

测试细节：

- progressive 序列回放测试

依赖：T0052

### T0058

主目标：实现 partial redraw 与 dirty region 策略整合。

子任务：

- dirty region 生命周期
- phase-aware dirty 合并
- 退化到 full redraw 条件

交付物：

- partial redraw v2

验收标准：

- 小范围变化时 draw 开销下降

测试细节：

- dirty 区域正确性测试

依赖：T0057

### T0059

主目标：引入 GPU upload broker（统一上传预算仲裁）。

子任务：

- image/text/geometry 上传预算仲裁
- critical lane 保底
- 压力下退避

交付物：

- gpu upload broker

验收标准：

- 上传峰值不突破预算且关键资产优先上传

测试细节：

- upload 峰值压力测试

依赖：T0054, T0057

### T0060

主目标：引入 Worker budget broker（异步任务节流）。

子任务：

- worker 队列预算
- 任务优先级
- 过载保护

交付物：

- worker budget broker

验收标准：

- worker 队列无长期堆积

测试细节：

- worker soak 测试

依赖：T0020

### T0061

主目标：统一 scheduler 策略（single-flight + interactive throttle）。

子任务：

- 调度模式归一化
- coalesce 指标回传
- in-flight 重入保护

交付物：

- scheduler policy v2

验收标准：

- 高频请求下无 render storm

测试细节：

- 调度压力测试

依赖：T0057

### T0062

主目标：实现 render queue reason taxonomy 标准化。

子任务：

- request reason 枚举统一
- 统计结构统一
- 诊断面板接入

交付物：

- render request taxonomy

验收标准：

- 任意渲染请求来源可追踪

测试细节：

- reason 覆盖测试

依赖：T0061

### T0063

主目标：构建 cache fallback 原因分级体系。

子任务：

- fallback reason 枚举
- 触发条件与恢复条件
- 统计与告警

交付物：

- fallback reason model

验收标准：

- fallback 可解释且可复现

测试细节：

- fallback 触发回放测试

依赖：T0053-T0055

### T0064

主目标：实现 cache consistency guard（避免跨 phase 错配）。

子任务：

- cache key 中加入 phase 相关因子
- 低 DPR/高 DPR 隔离策略
- invalidation 对齐

交付物：

- cache consistency guard

验收标准：

- phase 切换后不出现错误复用

测试细节：

- cache key 回归测试

依赖：T0063

### T0065

主目标：实现 streaming pressure-aware 策略。

子任务：

- streaming 压力采集
- 降载策略
- 关键资源白名单

交付物：

- streaming pressure policy

验收标准：

- streaming 高压时仍保持关键资源可见

测试细节：

- 网络抖动模拟测试

依赖：T0021, T0054

### T0066

主目标：实现 massive-data 增量索引与可视窗口优先。

子任务：

- 增量空间索引更新
- 可视窗口优先查询
- 非可视任务延迟处理

交付物：

- incremental visibility index

验收标准：

- 300k+ 数据移动中查询延迟受控

测试细节：

- 查询吞吐压测

依赖：T0055

### T0067

主目标：实现 animation cache（关键帧与插值缓存）。

子任务：

- 关键帧缓存
- 插值段缓存
- timeline seek 优化

交付物：

- animation cache subsystem

验收标准：

- seek 与回放稳定无明显卡顿

测试细节：

- timeline 压测

依赖：T0053

### T0068

主目标：实现 camera runtime policy（平滑、惯性、预测）标准化。

子任务：

- camera smoothing 参数抽象
- inertia/prediction 策略
- profile 差异映射

交付物：

- camera runtime policy

验收标准：

- 各 profile 下 camera 行为可预测

测试细节：

- camera 行为回放测试

依赖：T0037, T0018

### T0069

主目标：接入医疗场景多分辨率与区域优先机制。

子任务：

- 关键区域优先层级
- 多分辨率纹理策略
- 可追溯渲染证据导出

交付物：

- medical multi-resolution policy

验收标准：

- 关键区域完整性与稳定性达标

测试细节：

- 医疗关键区域专项测试

依赖：T0045, T0054

### T0070

主目标：实现 backend capability fallback 矩阵（WebGL2/WebGPU/CPU）。

子任务：

- backend 选择器
- fallback 路由
- 功能降级清单

交付物：

- backend fallback matrix

验收标准：

- backend 切换可稳定运行

测试细节：

- backend 矩阵测试

依赖：T0051, T0007

### T0071

主目标：实现 pipeline trace（stage 级耗时与决策链）。

子任务：

- stage timing
- decision trace id
- 慢帧自动标注

交付物：

- pipeline tracing

验收标准：

- 慢帧可定位到 stage 与策略原因

测试细节：

- trace 完整性测试

依赖：T0062

### T0072

主目标：构建渲染回归快照系统（视觉 + 指标双快照）。

子任务：

- snapshot capture
- 可容忍差异阈值
- 指标绑定

交付物：

- render regression harness

验收标准：

- 回归变更可被自动发现

测试细节：

- snapshot diff 测试

依赖：T0071

### T0073

主目标：阶段 D 收口清理。

子任务：

- 清理冗余路径
- 更新文档与契约
- 消除高风险 AI-TEMP

交付物：

- D 阶段清理补丁

验收标准：

- 无长期双轨逻辑

测试细节：

- 静态分析 + 回归

依赖：T0051-T0072

### T0074

主目标：阶段 D 验收。

子任务：

- 五场景专项评审
- 指标对齐与缺口确认

交付物：

- D 阶段验收报告

验收标准：

- 关键能力达成，缺口有明确下一步任务

测试细节：

- 全场景综合测试

依赖：T0073

---

## 阶段 E：场景专项工业化（T0075-T0102）

### T0075

主目标：编辑器 300k+ 专项优化 v1。

子任务：

- 大规模节点选择与变换链路压测
- hover/guide 降级策略细化
- 停手锐化策略调优

交付物：

- editor 300k+ tuning pack v1

验收标准：

- editor SLO 基本达标

测试细节：

- 编辑器专项 perf + 回归

依赖：T0074

### T0076

主目标：编辑器 300k+ 专项优化 v2（交互一致性）。

子任务：

- 高频 pointer/wheel 跟手增强
- 交互后状态一致性校验
- 关键编辑语义校验

交付物：

- editor consistency pack

验收标准：

- 交互过程中无关键语义错误

测试细节：

- 编辑语义回归测试

依赖：T0075

### T0077

主目标：游戏场景实时渲染专项 v1。

子任务：

- 动态对象批处理策略
- 特效预算收缩规则
- 帧 pacing 修复

交付物：

- game realtime pack v1

验收标准：

- 游戏场景帧稳定明显提升

测试细节：

- 动态场景实时测试

依赖：T0074

### T0078

主目标：游戏场景专项 v2（长时间运行稳定）。

子任务：

- 内存与缓存长期稳定性
- 温控/功耗策略验证
- 背景负载下稳定性

交付物：

- game long-run stability pack

验收标准：

- 长跑测试无明显退化

测试细节：

- 2 小时 soak test

依赖：T0077

### T0079

主目标：动画场景专项 v1（插值和回放）。

子任务：

- 插值路径优化
- 时间轴同步
- seek 行为优化

交付物：

- animation playback pack v1

验收标准：

- 插值与回放稳定

测试细节：

- 动画序列一致性测试

依赖：T0074

### T0080

主目标：动画场景专项 v2（复杂轨道与大资源）。

子任务：

- 多轨道同步与预算优先级
- 大资源缓存策略
- 关键帧精度保障

交付物：

- animation complex-track pack

验收标准：

- 复杂序列不出现关键帧错位

测试细节：

- 多轨场景回归测试

依赖：T0079

### T0081

主目标：医疗 3D 专项 v1（关键层保护）。

子任务：

- 关键层渲染优先级闭环
- 关键层禁降级硬验证
- 证据链导出

交付物：

- medical critical-layer pack

验收标准：

- 关键层完整性 100%

测试细节：

- 医疗关键层专项测试

依赖：T0074

### T0082

主目标：医疗 3D 专项 v2（多分辨率/区域优先）。

子任务：

- ROI 与多分辨率协同
- 细节恢复路径优化
- 结果可追溯增强

交付物：

- medical ROI pack

验收标准：

- 关键区域细节与一致性达标

测试细节：

- 医疗场景一致性回放

依赖：T0081

### T0083

主目标：massive-data 专项 v1（渐进可视化）。

子任务：

- 分块加载策略
- 可视窗口优先
- 遥远数据延迟处理

交付物：

- massive progressive pack v1

验收标准：

- 300k+ 漫游时首屏可见性提升

测试细节：

- massive 首屏/漫游性能测试

依赖：T0074

### T0084

主目标：massive-data 专项 v2（稳定吞吐）。

子任务：

- 索引增量更新优化
- 查询与渲染协同节流
- 关键视区稳定输出

交付物：

- massive throughput pack

验收标准：

- 长时漫游吞吐稳定

测试细节：

- 1 小时 massive soak test

依赖：T0083

### T0085

主目标：构建 profile 间一致性校验工具。

子任务：

- 同场景切 profile 对比
- 关键层一致性对比
- 性能与画质差异报告

交付物：

- profile consistency checker

验收标准：

- profile 差异可解释

测试细节：

- 对比回归测试

依赖：T0075-T0084

### T0086

主目标：建立跨 profile 自动调优建议系统（规则驱动）。

子任务：

- 收集典型瓶颈模式
- 规则化建议
- 建议模拟评估

交付物：

- tuning advisor v1

验收标准：

- 对典型瓶颈可输出可执行建议

测试细节：

- 建议正确性测试

依赖：T0085

### T0087

主目标：构建“不可接受回归”红线规则。

子任务：

- 定义红线指标
- CI 红线阻断
- 人工豁免流程

交付物：

- regression redline policy

验收标准：

- 红线超标自动阻断

测试细节：

- 阻断规则测试

依赖：T0085

### T0088

主目标：构建跨设备性能分层报告。

子任务：

- low/mid/high tier 报告模板
- profile x device 矩阵跑批
- 结果归档

交付物：

- device-tier performance report

验收标准：

- 每个 tier 有明确推荐 profile/preset

测试细节：

- 设备矩阵批量测试

依赖：T0070, T0085

### T0089

主目标：构建功耗与热约束策略实验。

子任务：

- thermal/battery 指标采集
- thermal-aware policy
- battery-saver profile 校准

交付物：

- thermal-aware policy experiment

验收标准：

- 温控约束下仍保持可用体验

测试细节：

- 热约束模拟测试

依赖：T0017, T0088

### T0090

主目标：场景专项统一收口（第一轮）。

子任务：

- 汇总各专项指标
- 修复跨专项冲突
- 更新策略默认值

交付物：

- scenario-specialization round1 report

验收标准：

- 五场景核心指标达到预设阈值或有 remediation 计划

测试细节：

- 全场景综合回归

依赖：T0075-T0089

### T0091

主目标：构建可重复 benchmark 套件（CI 可跑）。

子任务：

- 固化场景与脚本
- 基准统计格式
- CI 报告上传

交付物：

- benchmark suite

验收标准：

- CI 可稳定输出 benchmark 结果

测试细节：

- CI benchmark smoke

依赖：T0090

### T0092

主目标：实现性能回归趋势分析。

子任务：

- 指标历史存储
- 趋势告警
- 责任归因链路

交付物：

- perf trend analyzer

验收标准：

- 可自动识别持续回退趋势

测试细节：

- 趋势检测测试

依赖：T0091

### T0093

主目标：完善可视化诊断层（开发者工作台）。

子任务：

- phase/budget/pressure 可视化
- cache/tile/upload 可视化
- profile 切换对比

交付物：

- runtime inspector v2

验收标准：

- 诊断问题定位效率提升

测试细节：

- 诊断可用性测试

依赖：T0041, T0092

### T0094

主目标：增强 deterministic snapshot 保障。

子任务：

- 固化随机源
- 排序稳定化
- 浮点容忍策略

交付物：

- deterministic guard v2

验收标准：

- 同输入重复渲染差异在阈值内

测试细节：

- 重复渲染一致性测试

依赖：T0072

### T0095

主目标：建立“复杂输入风暴”专项测试。

子任务：

- 高频 wheel/pointer/keyboard 混合输入
- 输入合并与节流验证
- 交互结束恢复验证

交付物：

- input-storm test suite

验收标准：

- 风暴输入下系统不失稳

测试细节：

- storm soak test（10 分钟）

依赖：T0061

### T0096

主目标：构建“空白帧与黑帧”专项治理测试。

子任务：

- 空白帧检测
- 黑帧检测
- 自动关联 fallback reason

交付物：

- blank-frame guard suite

验收标准：

- 关键场景下空白帧率低于阈值

测试细节：

- blank-frame regression

依赖：T0063, T0071

### T0097

主目标：构建“交互停手锐化 SLA”门禁。

子任务：

- settle-to-sharp SLA 定义
- 统计采集与判定
- CI 门禁

交付物：

- sharpen SLA gate

验收标准：

- 超过阈值自动阻断

测试细节：

- SLA 门禁测试

依赖：T0035, T0091

### T0098

主目标：构建“关键语义层完整性”门禁。

子任务：

- 关键层可见性检测
- 关键层清晰性检测
- 医疗关键层专项规则

交付物：

- critical-layer integrity gate

验收标准：

- 关键层完整性不达标直接阻断

测试细节：

- 关键层门禁测试

依赖：T0004, T0081

### T0099

主目标：构建“内存与缓存压力”门禁。

子任务：

- cache size 上限
- 内存压力阈值
- 清退效率阈值

交付物：

- memory-cache gate

验收标准：

- 压力超限触发保护策略且可恢复

测试细节：

- 内存压力模拟测试

依赖：T0053-T0055

### T0100

主目标：构建“后端兼容性”门禁。

子任务：

- WebGL2/WebGPU/CPU fallback 覆盖
- 能力缺失路径验证
- 输出兼容性报告

交付物：

- backend compatibility gate

验收标准：

- 关键功能在支持矩阵内可运行

测试细节：

- backend matrix test

依赖：T0070

### T0101

主目标：场景专项统一收口（第二轮）。

子任务：

- 复核所有门禁结果
- 修正剩余红线
- 冻结默认 profile 策略

交付物：

- scenario-specialization round2 report

验收标准：

- 关键门禁全部通过

测试细节：

- 全门禁回归

依赖：T0091-T0100

### T0102

主目标：阶段 E 验收。

子任务：

- 架构委员会评审
- 发布前审计

交付物：

- E 阶段验收报告

验收标准：

- 满足发布候选条件

测试细节：

- 审计执行

依赖：T0101

---

## 阶段 F：发布、迁移与长期演进（T0103-T0120）

### T0103

主目标：定义 v1 发布清单与迁移指南。

子任务：

- 旧 API -> 新 API 映射
- 迁移脚本
- 常见问题清单

交付物：

- migration guide v1

验收标准：

- 业务方可按指南完成迁移

测试细节：

- 迁移演练测试

依赖：T0102

### T0104

主目标：灰度发布计划（按 profile 与设备分层）。

子任务：

- 灰度批次定义
- 监控阈值
- 自动回滚条件

交付物：

- rollout plan v1

验收标准：

- 灰度过程可控且可回滚

测试细节：

- 灰度演练

依赖：T0103

### T0105

主目标：上线后监控看板与告警策略。

子任务：

- SLO 告警
- 回归趋势告警
- 关键层完整性告警

交付物：

- production dashboard

验收标准：

- 告警可及时触发并可追溯

测试细节：

- 告警链路测试

依赖：T0104

### T0106

主目标：构建线上问题定位 Runbook。

子任务：

- 常见问题诊断树
- 快速回退步骤
- 日志与 trace 查询模板

交付物：

- incident runbook

验收标准：

- on-call 可按 runbook 独立定位问题

测试细节：

- 演练测试

依赖：T0105

### T0107

主目标：建立 profile 默认策略长期维护机制。

子任务：

- 默认值变更评审流程
- 回归影响评估模板
- 版本化策略记录

交付物：

- profile governance policy

验收标准：

- 默认策略变更有审计记录

测试细节：

- 流程演练

依赖：T0103

### T0108

主目标：建立质量-性能 A/B 平台。

子任务：

- A/B 配置注入
- 指标对比报告
- 显著性判断

交付物：

- runtime AB framework

验收标准：

- 能稳定比较策略版本收益

测试细节：

- AB 试验测试

依赖：T0105

### T0109

主目标：建立 AI-assisted runtime tuning 预研轨道。

子任务：

- 可解释规则优先
- 离线建议，不直接在线闭环
- 安全阈值约束

交付物：

- ai tuning proposal v1

验收标准：

- 建议结果可解释、可审计

测试细节：

- 离线回放评估

依赖：T0108

### T0110

主目标：建立云渲染与边缘渲染 profile 扩展点。

子任务：

- profile 扩展契约
- 远端能力探测接口
- 带宽压力策略

交付物：

- cloud/edge profile extension

验收标准：

- 扩展点不破坏现有 profile

测试细节：

- 兼容性测试

依赖：T0107

### T0111

主目标：沉淀工业级最佳实践白皮书（内部）。

子任务：

- 五场景策略总结
- 关键 trade-off 记录
- 反模式清单

交付物：

- internal whitepaper

验收标准：

- 新成员可据此快速上手

测试细节：

- 文档评审

依赖：T0102

### T0112

主目标：构建长期技术债台账（每季度清理）。

子任务：

- AI-TEMP 收口列表
- 冗余路径清单
- 清理排期

交付物：

- tech-debt ledger

验收标准：

- 每季度有可执行清理计划

测试细节：

- 台账审计

依赖：T0111

### T0113

主目标：建立季度性能审计制度。

子任务：

- 固定 benchmark 批次
- 趋势对比
- 审计结论与行动项

交付物：

- quarterly perf audit template

验收标准：

- 审计流程可重复执行

测试细节：

- 审计流程演练

依赖：T0092

### T0114

主目标：建立季度画质一致性审计制度。

子任务：

- 视觉回归采样策略
- 关键层专项审计
- 结果归档

交付物：

- quarterly visual audit template

验收标准：

- 画质一致性问题可早期发现

测试细节：

- 审计流程演练

依赖：T0072, T0098

### T0115

主目标：建立季度稳定性审计制度（崩溃、泄漏、长跑）。

子任务：

- 长跑样本库
- 泄漏检测策略
- 稳定性评分

交付物：

- quarterly stability audit template

验收标准：

- 稳定性趋势可追踪

测试细节：

- 长跑审计测试

依赖：T0078, T0084

### T0116

主目标：定义 v2 路线图（WebGPU 深化、更多 3D 能力）。

子任务：

- 能力缺口清单
- v2 目标拆解
- 风险与投入评估

交付物：

- v2 roadmap draft

验收标准：

- 路线图具备可执行性

测试细节：

- 无直接测试，评审为主

依赖：T0113-T0115

### T0117

主目标：发布候选版本 RC1 验证。

子任务：

- 全门禁全场景跑批
- 缺陷清单归档
- RC1 签收

交付物：

- RC1 report

验收标准：

- 无阻断级缺陷

测试细节：

- 全量回归测试

依赖：T0106, T0116

### T0118

主目标：发布候选版本 RC2 验证（修复后复验）。

子任务：

- RC1 缺陷修复验证
- 指标再对齐
- 发布建议

交付物：

- RC2 report

验收标准：

- 发布门槛全部满足

测试细节：

- 全量复验

依赖：T0117

### T0119

主目标：GA 发布准备。

子任务：

- 文档冻结
- 变更日志
- 运维交接

交付物：

- GA readiness checklist

验收标准：

- 发布资产完整

测试细节：

- 发布流程演练

依赖：T0118

### T0120

主目标：GA 发布与复盘。

子任务：

- 正式发布
- 首周监控复盘
- 后续迭代 backlog 确认

交付物：

- GA postmortem

验收标准：

- 首周运行稳定且无重大事故

测试细节：

- 首周在线观测

依赖：T0119

### 阶段 G-H 扩展说明（T0121-T0160）

主目标：完成 GA 后稳定性治理、2D/3D 扩展治理与项目收口就绪控制。

交付物：

- 阶段 G 任务文档：`packages/engine/docs/industrial-refactor/phase-g/`
- 阶段 H 任务文档：`packages/engine/docs/industrial-refactor/phase-h/`
- 批次变更请求：`packages/engine/docs/industrial-refactor/change-requests/CR-T0121-T0140-implementation.md`
- 批次变更请求：`packages/engine/docs/industrial-refactor/change-requests/CR-T0141-T0160-implementation.md`

验收标准：

- T0121-T0160 对应契约、导出、测试与门禁校验完成。
- 仪表盘任务状态与批次交付物保持一致。

---

## 6. 测试体系总设计（跨任务统一）

### 6.1 测试层次

- L1 单元测试：策略函数、预算计算、类型契约
- L2 组件测试：cache/scheduler/scaler 等模块协同
- L3 集成测试：createEngine 主循环与 renderer wiring
- L4 场景测试：五场景专项数据集
- L5 回归测试：视觉快照 + 指标快照
- L6 压力与长跑：输入风暴、内存压力、长时 soak

### 6.2 必测指标

- latency：input-to-photon、queue wait
- frame：fps、jank、missed frame
- quality：missing ratio、fallback ratio、critical layer integrity
- cache：hit rate、eviction rate、stale reuse rate
- upload：bytes/frame、critical upload latency
- stability：crash、leak、long-run drift

### 6.3 门禁规则

- 任一红线触发直接阻断
- 非红线回归需给出风险说明和补救计划
- 医疗 profile 的关键层完整性问题一律阻断

---

## 7. 里程碑计划（建议）

- M1（治理与 policy 基线）：完成阶段 A-B
- M2（QoS 与策略状态机）：完成阶段 C
- M3（管线与缓存工业化）：完成阶段 D
- M4（五场景专项达标）：完成阶段 E
- M5（发布与长期治理）：完成阶段 F
- M6（GA 后治理与收口）：完成阶段 G-H

---

## 8. 风险与缓解

- 风险：策略过度复杂导致维护成本上升
  - 缓解：统一策略字典 + 回放工具 + 决策可解释性
- 风险：交互与完整性目标冲突
  - 缓解：phase 分离 + settle SLA + critical-layer hard guard
- 风险：多后端行为不一致
  - 缓解：backend contract + matrix gate
- 风险：大规模场景回归难定位
  - 缓解：trace id + reason taxonomy + regression harness

---

## 9. 执行说明

- 每个任务实施前必须先落地对应 CHANGE REQUEST。
- 每个任务完成后必须更新任务状态、验收证据与测试报告。
- 所有策略相关改动必须提供可回放决策日志。
- 若任务涉及临时兼容逻辑，必须标注 AI-TEMP 并登记移除条件。

---

## 10. 建议的首批启动任务（Next 10）

- T0001
- T0002
- T0003
- T0004
- T0005
- T0006
- T0013
- T0014
- T0017
- T0018

以上 10 项完成后，即可进入 policy-驱动引擎重构主线。
