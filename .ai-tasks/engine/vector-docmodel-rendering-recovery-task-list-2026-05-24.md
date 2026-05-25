# Vector Document Model -> Engine Rendering Recovery Task List (2026-05-24)

## [SCOPE]

- Scope: 从 vector 文档模型出发，构建高覆盖 Mock 数据，打通 active layer 与 overlay 抽象，并形成 WebGPU/WebGL 渲染细节修复与优化链路澄清任务。
- Product boundary: 仅覆盖 runtime + engine 的数据建模、转换、渲染、调度与优化路径；不包含 UI 框架外观改动。
- Goal:
  - G1: 定义可验证的高覆盖文档模型假数据集（含多类型、多层级 group、多状态交互）。
  - G2: 将 hover/marquee/selected/handles/cursor 统一抽象到 active layer 与 overlay，并对接 engine composition 与优化模块。
  - G3: 修复 WebGPU/WebGL 在细节渲染层面的缺口，建立跨 backend 一致性验收。
  - G4: 明确并固化优化路径（store 同步 -> 增量/缓存 -> 调度 -> backend 提交/回显）的可观测基线。
  - G5: 评估并补齐模型压缩/解码策略能力闭环。

## [TYPE DEFINITION]

- Change type: 分析 + 任务分解文档。
- Runtime risk level: None (documentation only).
- Contract impact: 仅提出后续实现任务，不在此文档直接修改 API 签名。

## [CHANGE REQUEST]

Target:

- File / Module:
  - packages/engine/ai/vector-docmodel-rendering-recovery-task-list-2026-05-24.md

Goal:

- Problem being solved:
  - 当前 vector -> engine 的渲染链路虽然已具备 composition、overlay、scene sync、render planning 等抽象，但细节渲染在 WebGPU/WebGL 路径存在可见缺口；优化路径和压缩能力可观测性不足，难以做系统修复。

Change Type:

- Add

Impact:

- Affected modules (planned, follow-up implementation):
  - apps/vector-editor-web/src/runtime/model
  - apps/vector-editor-web/src/runtime/presets
  - apps/vector-editor-web/src/runtime/engine-bridge/internal/engineRenderer
  - packages/engine/src/kernel/core/composition
  - packages/engine/src/backend/adapters
  - packages/engine/src/orchestration
  - packages/engine/src/optimization

Cleanup:

- Old logic to remove (planned):
  - backend 中仅用于兼容的伪缓存/伪计数诊断路径与重复降级分支（在功能等价替换后移除）。

Tests:

- Tests to add/update (planned):
  - 文档模型到 scene 转换覆盖测试
  - overlay/active-layer 路由一致性测试
  - WebGPU/WebGL 渲染像素/几何一致性回归测试
  - 优化链路阶段指标完整性测试

## [TEST DESIGN]

- TD-001 (runtime replay gate strictness):
  - 验证 `--fail-on-status` 在门禁失败场景返回非零退出码。
  - 验证 strict 模式默认阈值下，健康样本链路可稳定通过。
- TD-002 (machine-readable gate failure taxonomy):
  - 验证 gate 产物 `failures` 与 `reasons` 一致映射。
  - 验证 latest/rolling 两类阈值均可输出稳定 `RP_GATE_*` 失败码。
- TD-003 (replay history rolling governance):
  - 验证窗口裁剪、重复快照替换、滚动统计聚合的确定性。
  - 验证 history/gate 文件落盘后可被下一次执行正确续接。
- TD-004 (next phase guardrail for T-006):
  - 预留 text/image/clip/shadow/gradient 的 backend capability gate 契约测试入口。
  - 要求每个特性至少覆盖 native/degrade 两条路径与 diagnostics 可观测断言。

## [EXECUTION PROGRESS]

- T-001 status: in-progress (baseline done)
  - done:
    - 新增 `test-feature-matrix` 预设与固定种子生成入口。
    - 新增深度 group + 多类型 + 渲染特性覆盖的 mock 生成逻辑。
    - 新增契约测试与覆盖报告脚本。
  - pending:
    - 扩展到“每个特性 >= 2 正样例 + 1 边界样例”的完整矩阵规模。

- T-002 status: in-progress (baseline done)
  - done:
    - 新增 interaction state matrix -> overlay instructions -> engine overlay nodes 映射模块。
    - 新增契约测试，覆盖 hover/marquee/selected/handles/cursor 的可断言输出。
  - pending:
    - 接入真实运行态（selector/path edit/isolation）的组合状态驱动回归集。

- T-003 status: started
  - done:
    - 新增 active layer + overlay unified routing contract 决策模块。
    - scene sync 路径已切换到统一 routing contract，避免 protected/active 规则分叉。
    - 新增 routing diagnostics 字段并接入 runtime diagnostics payload/events。
    - 新增 interaction phase 往返稳定性契约测试（settled <-> drag）。
    - 将 routing diagnostics 纳入调试面板可视化与阈值告警分组。
  - pending:
    - 无（T-003 基线完成，后续仅保留阈值调优）。

- T-004 status: in-progress (baseline done)
  - done:
    - 新增 render parity checklist 基线生成模块与报告脚本。
    - 输出按 feature 维度的 WebGL/WebGPU `pass/degraded/fail/unknown` 状态与证据信号字段。
    - 明确纳入“model-complete failure -> fallback path”显式分类行。
    - 新增契约测试，校验 checklist 结构与 summary 聚合稳定。
    - 新增 diagnostics 样本驱动的自动评估器（阈值可配置）与 sampled 报告脚本。
    - 新增 sampled 契约测试，覆盖 pass/degraded/fail/unknown 判定分支。
    - 新增 runtime diagnostics 导出 JSON -> sampled 输入转换模块与 CLI。
    - 打通 `runtime export -> sample conversion -> sampled checklist` 端到端执行链路。
    - 新增 runtime render diagnostics 在线 recorder（start/stop/clear/export）与环形缓冲策略。
    - 新增 recorder 契约测试，校验采样上限、导出 payload 与 reset 行为。
    - 新增 `report:render-parity-runtime-auto` 一键命令，串联 runtime diagnostics 导出输入、sample 生成、sampled checklist 评估与固定目录落盘。
  - pending:
    - 无（T-004 基线与自动化流水线完成，后续进入 T-005）。

- T-005 status: done
  - done:
    - 已完成 WebGPU/WebGL fallback 规则对齐、拒绝原因矩阵化、sampled summary/diff/trend 自动化。
    - 已完成 replay-batch + history-gate + strict fail-fast + machine-readable `RP_GATE_*` 失败码闭环。
    - 已完成 CI code-based routing：PR workflow 消费 gate artifact failures 并按 `RP_GATE_*` 分组输出告警。
    - 已完成 PR 固定 strict 门禁：workflow 固定执行 `report:render-parity-runtime-replay-batch-gate:strict`。
    - 已补齐 strict PR baseline 流程文档（workflow 路径、命令、产物、告警分组）。
  - pending:
    - 无

- T-006 status: done
  - done:
    - 已明确进入条件：T-005 报告链路与门禁链路均可稳定输出 pass/fail 与机器可读失败码。
    - 已完成 W-006-01：新增 shared capability gate 规则骨架，并接入 WebGL/WebGPU backend diagnostics 字段（feature capability reason）。
    - 已完成 W-006-02/W-006-03：WebGL/WebGPU capability reason 类型与 shared 规则模块对齐，移除 adapter 内部 reason union 漂移风险。
    - 已补齐 text capability taxonomy：新增 `text-style-unsupported`，用于 rich text-run 语义降级显式诊断。
    - 已新增 conformance 覆盖：image/clip/text/shadow/gradient capability gate reason 分类断言。
    - 已完成 W-006-04：feature capability reasons 已进入 sampled checklist/reason summary/diff/trend 链路，并补齐 legacy 产物兼容归一化。
    - 已完成 W-006-05：strict gate 增加 feature-capability unknown 阈值与 `RP_GATE_*` 失败码路由，历史/回放链路兼容旧 dashboard/history 产物。
    - 已新增 feature-level parity 断言与可回放样本集（known + unknown capability gate replay fixtures），形成 T-006 可验收回放资产。
  - pending:
    - 无

## 1. Current Evidence Snapshot

### 1.1 Document Model and Mock Baseline

- 文档模型类型覆盖较全，包含 frame/group/rectangle/ellipse/polygon/star/lineSegment/path/text/image，以及 gradient/shadow/cornerRadii/textRuns/clip 等字段。
- 已存在默认 mock 文档与模板生成器，且支持大规模 mixed/image/text 压测数据。
- 当前问题不是“有没有 mock”，而是缺少面向渲染缺陷定位的“特征矩阵型 mock 套件”：
  - 多重 group 深度 + mask + path + text run + transform 叠加组合不够系统化。
  - hover/marquee/selected/handles/cursor 的状态组合未形成标准化数据驱动回归集。

### 1.2 Active Layer and Overlay Existing Abstraction

- engine composition 已有 base/active/overlay 三平面与 hover/selection/guide/overlay 分层契约。
- vector runtime 已通过以下机制向 engine 侧注入互动层语义：
  - protected node ids
  - interaction active node ids
  - overlay draw nodes
- 现状说明抽象方向正确，但缺少“统一路由策略 + 压测标准 + 诊断可见性”三件套。

### 1.3 Conversion to Engine 3D Interface

- vector scene adapter 已完成 document+snapshot -> engine scene 转换，并注入 semantic3d 字段。
- scene sync 已支持 full load 与 incremental patch，且有 dirty region/invalidate 路径。
- 风险点在于转换链路虽完整，但 backend 细节渲染能力不足时，会造成“有数据但看不到细节”的错觉。

### 1.4 WebGPU/WebGL Detailed Rendering Gaps

- WebGL/WebGPU adapter 当前核心路径依赖离屏 2D 合成 + 纹理呈现，失败后回退到简化 packet/clear 路径。
- 已观测到以下高风险缺口：
  - 细节特性支持不全：gradient/shadow/text-run/image-clip/path-bezier 等在 backend 端并未等价表达。
  - WebGPU/WebGL 行为不一致：同类 shape/path 在两 backend 的 fallback 逻辑不完全对齐。
  - 大量缓存与预算指标来自 payload 规模估算，缺乏真实 tile/cache/backpressure 证据链。

### 1.5 Optimization Path Clarity and Compression Capability

- 已有模块：frame budget kernel、render strategy/frame controller、policy bootstrap、runtime resource compression metadata。
- 当前问题：
  - 缓存链路的真实执行与统计边界不清晰（L0/L1/L2 统计字段存在，但与真实缓存命中行为绑定弱）。
  - store 同步、增量 patch、调度决策、backend 提交之间缺少统一阶段追踪 ID。
  - compression policy 已有描述与状态机字段，但端到端 decode/transcode 实测与回归标准不足。

## 2. Development Objectives (Doc-Level)

- DO-1: 建立一套“用于渲染缺陷复现和回归”的标准化 mock 场景矩阵，而不是仅扩大随机样本数量。
- DO-2: 将 interaction 语义统一映射为 active layer 与 overlay routing contract，形成 engine/runtime 共用语义词典。
- DO-3: 将 WebGPU/WebGL 修复任务拆分为可验收特性项，按 feature parity 推进而非一次性重写。
- DO-4: 为优化链路增加阶段化可观测字段，确保每一帧都可回答：数据从哪来、走了哪条路径、为何降级。
- DO-5: 形成压缩能力验收表，覆盖 codec/policy/decode precision/checkpoint 与交互态切换。

## 3. Task List (Prioritized)

### P0: Data and Contract Baseline

- T-001 (P0): 建立 Vector Render Feature Matrix Mock 套件
  - 内容:
    - 新建固定种子 mock 套件，覆盖全部 shape 类型、text runs、bezier/path、mask/clip、gradient/shadow、flip/rotation。
    - 引入 1-8 层 group 深度样本，含跨层继承与父子 transform 组合。
  - 验收:
    - 每个特性至少 2 个正样例 + 1 个边界样例。
    - 可从单一入口加载并输出特性覆盖报告。

- T-002 (P0): 建立 Interaction State Matrix
  - 内容:
    - 对 hover/marquee/selected/handles/cursor 建立组合状态矩阵（单选、多选、隔离模式、路径编辑、拖拽预览）。
    - 将矩阵状态映射到 overlay instructions 与 engine overlay nodes。
  - 验收:
    - 每个状态组合可稳定复现，且 overlay node 数量与类型可断言。

- T-003 (P0): 定义 Active Layer + Overlay Unified Routing Contract
  - 内容:
    - 明确 base/active/overlay 三平面的路由规则、优先级、降级策略。
    - 把 protectedNodeIds 与 interactionActiveNodeIds 的生成规则文档化并测试化。
  - 验收:
    - interaction phase 切换时，active layer 路由稳定且无跳层闪烁。

### P1: Rendering Detail Recovery (WebGL/WebGPU)

- T-004 (P1): 细节渲染缺口盘点并建立 parity checklist
  - 内容:
    - 按 feature 维度列出 WebGL/WebGPU 当前支持、降级、缺失。
    - 将“模型完整渲染失败后 packet fallback”纳入显式错误分类。
  - 验收:
    - 形成逐项 checklist，所有特性都有状态（pass/fail/degraded + reason）。

- T-005 (P1): 修复 WebGPU/WebGL 路径不一致问题
  - 内容:
    - 对齐 line/path/polygon/bezier 的 fallback 规则。
    - 对齐 transform matrix 解释与坐标系转换。
  - 进展:
    - 已完成第一阶段：统一 backend diagnostics 缺省分流判定（空场景 WebGL 不再误报 packet；WebGPU native present 未完成时归类 hybrid fallback）。
    - 已新增 render-path 分类契约测试，覆盖空帧、present 未完成、backend diagnostics 优先级三类分支。
    - 已完成第二阶段首项：对齐 WebGPU/WebGL 在 `line` 节点缺失 points/bezier 数据时的回退规则（统一使用 width/height 线段兼容路径，避免 WebGPU 路径空绘制/异常分流）。
    - 已新增 engine webAdapter conformance 覆盖，验证 rich-node payload 下 line 兼容回退可稳定触发 native-model-complete 诊断。
    - 已补齐 WebGPU rect-batch 拒绝原因细分：当 payload 非空但仅包含非 rect 几何时，不再标记 `scene-empty`，改为 `non-rect-shape-unsupported`（与几何语义一致）。
    - 已新增 conformance 覆盖，验证非 rect payload 触发 `native-clear-only + non-rect-shape-unsupported` 组合诊断。
    - 已将拒绝原因判定从“首节点判断”升级为“全节点扫描 + 固定优先级”（group > non-shape > non-rect > transform > style），降低混合 payload 下诊断漂移。
    - 已新增 `group/non-shape/transform` 三类 conformance 覆盖，形成 WebGPU rect-batch 拒绝原因小矩阵。
    - 已补齐 `shape-style-unsupported` 专项 conformance 覆盖，完成拒绝原因矩阵的核心分支闭环。
    - 已将 WebGPU native-model-complete conformance 用例升级为 bezier/path payload，开始锁定 polygon/path/bezier 几何触发路径的一致性回归基线。
    - 已新增 shared `richPathDrawPlan` 并接入 WebGL/WebGPU adapter，统一 line/path/polygon/bezier 触发判定与闭合规则，避免双端条件漂移。
    - 已新增 shared `nativeRectBatchRejectionPlan` 并接入 WebGPU adapter，将 rect-batch 拒绝原因判定从 adapter 内联逻辑抽离为可复用规则模块。
    - 已将 `webgpuNativeRectBatchRejectedReason` 接入 sampled parity 报告结构化汇总，在几何/fallback 行输出 dominant reason 与已知/未知计数，形成“规则对齐 -> 采样报告可解释”闭环。
    - 已新增 sampled parity 契约覆盖，验证 native partial 路径可稳定反映 dominant reject reason（`non-rect-shape-unsupported`）。
    - 已新增跨 backend reason summary 模块（WebGL cache fallback + WebGPU rect-batch reject），并接入 `report:render-parity-runtime-auto` 输出 `.summary.json` 产物与 dominant reason 控制台摘要。
    - 已新增 sampled parity 契约覆盖，验证 WebGL/WebGPU dominant known reason 汇总稳定且可用于自动报告对比。
    - 已新增 `report:render-parity-summary-diff` 命令，支持 baseline/current `.summary.json` 对比并输出 `.diff.json`（dominant reason 变化、known/unknown delta、overallTrend）。
    - 已新增 summary-diff 契约测试，覆盖 `improved` 与 `regressed` 趋势判定分支。
    - 已完成 `report:render-parity-runtime-auto --baseline-summary ...` 单命令闭环：自动产出 `samples/report/summary/diff` 四类产物并输出 trend 信号，实现 `auto -> summary -> diff` 直通链路。
    - 已新增 `report:render-parity-summary-trend` 命令，支持 baseline 对目录内所有 `.summary.json` 批量对比并输出 trend ledger（排序行 + trendCounter 聚合）。
    - 已新增 summary-trend 契约测试，覆盖多样本排序与趋势计数聚合稳定性。
    - 已扩展 `report:render-parity-runtime-auto` 支持 `--trend-dir`：在 `--baseline-summary` 基础上同次执行自动产出 `trend.json` 并打印 trendCounter，实现 `auto -> summary -> diff -> trend` 一键链路。
    - 已扩展 `report:render-parity-runtime-auto` 支持 `--replay-baseline`：固定基线路径为 `<output-dir>/<label>.baseline.summary.json`，首跑自动基线引导，后续自动 diff+trend，并新增固定入口命令 `report:render-parity-runtime-replay` 用于连续回放时间序列积累。
    - 已新增批处理入口 `report:render-parity-runtime-replay-batch`：按输入目录逐文件执行 replay 基线模式，并产出单一 dashboard 汇总（per-input row + aggregate trendCounter），用于回放会话批量比对与趋势看板落盘。
    - 已新增 replay-batch 契约测试，覆盖空输入目录拒绝、非法 diagnostics JSON 拒绝、首轮 baseline bootstrap 触发 `unknown` 趋势计数三类关键分支。
    - 已新增 `report:render-parity-runtime-replay-history-gate` 与 `report:render-parity-runtime-replay-batch-gate`：将 batch dashboard 追加到 rolling history，并输出 latest-snapshot 阈值门禁结果（pass/fail + reasons）供 CI 直接消费。
    - 已新增 replay-history-gate 契约测试，覆盖 rolling 聚合、窗口裁剪、阈值失败分支与端到端落盘验证。
    - 已新增 `--fail-on-status` 与 rolling 阈值门禁（`--max-rolling-regressed|mixed|unknown`），并提供 strict 命令入口实现“门禁失败即非零退出”的 CI 快速失败策略。
    - 已新增门禁失败码体系（`RP_GATE_*`）并写入 gate 产物 `failures` 字段，实现错误分流机器可读化（同时保留 `reasons` 兼容展示）。
  - 验收:
    - 同一场景在 WebGPU/WebGL 下的几何边界与 draw count 偏差在阈值内。

- T-006 (P1): 完整接入 text/image/clip/shadow/gradient 的渲染语义
  - 内容:
    - 建立后端能力门控与特性降级矩阵，避免 silent drop。
    - 对不支持特性输出明确 diagnostics，不允许“无提示丢失细节”。
  - 验收:
    - 所有关键特性至少有 native 或明确 degrade 路径，且 diagnostics 可查询。

### P2: Optimization Path Clarification and Hardening

- T-007 (P2): 明确并落地阶段化优化链路
  - 内容:
    - 固化链路：store sync -> incremental compile/patch -> render planning -> scheduler -> backend present。
    - 引入 frame stage id，串联 diagnostics、events、backend telemetry。
  - 验收:
    - 任意一帧可追踪完整 stage timeline 与降级原因。

- T-008 (P2): 缓存路径真实性校准
  - 内容:
    - 区分估算计数与真实 cache 命中计数，补充真实 tile/cache 生命周期统计。
    - 明确 L0/L1/L2 缓存边界与失效策略。
  - 验收:
    - cache hit/miss 与实际缓存对象状态一致，可通过测试重放验证。

- T-009 (P2): Compression/Decode 能力闭环
  - 内容:
    - 覆盖 compression policy -> decode precision -> checkpoint -> resource residency 端到端。
    - 增加 interactionActive 与 zoom/LOD 条件下策略切换回归。
  - 验收:
    - 压缩资源在不同交互态下 decode 行为可重复、可诊断、可回放。

### P3: Governance and Regression Safety

- T-010 (P3): 建立跨 backend 回归门禁
  - 内容:
    - 添加 WebGPU/WebGL/canvas2d/headless 的关键场景契约测试。
    - 引入“细节渲染完整性”快照与像素/几何断言。
  - 验收:
    - PR 阶段自动报告 parity 差异与新增降级。

- T-011 (P3): 建立问题归因模板与排查手册
  - 内容:
    - 统一问题分类：数据缺失、转换缺失、路由缺失、backend 缺失、缓存错配、调度降级。
    - 提供最小复现场景与日志关键字段模板。
  - 验收:
    - 新问题可在 30 分钟内定位到责任层（runtime/engine/backend/optimization）。

## 4. Milestone Plan

- M1 (Week 1): 完成 T-001 ~ T-003，拿到高覆盖 mock 与路由契约。
- M2 (Week 2-3): 完成 T-004 ~ T-006，优先修复“细节不可见”问题与 backend 不一致。
- M3 (Week 4): 完成 T-007 ~ T-009，打通优化与压缩可观测闭环。
- M4 (Week 5): 完成 T-010 ~ T-011，建立长期回归与排查标准。

## 5. Delivery Artifacts

- A-001: Feature Matrix Mock 数据集 + 生成脚本 + 覆盖报告。
- A-002: Active Layer/Overlay 路由契约文档 + 合约测试。
- A-003: WebGPU/WebGL parity checklist + 修复记录。
- A-004: 优化链路阶段追踪仪表（事件/诊断字段）。
- A-005: Compression/Decode 回归测试报告。

## 6. Risk Notes

- R-1: backend 适配层若继续承担“渲染语义解释”而非执行，复杂特性会持续劣化。
- R-2: 若不区分真实缓存与估算缓存指标，优化方向会被错误数据误导。
- R-3: 若缺少统一 stage id，跨层排障成本会持续高于修复成本。

## 7. Definition of Done

- DoD-1: Mock 套件可覆盖全部核心渲染特性与交互状态矩阵。
- DoD-2: active layer 与 overlay 路由规则稳定、可测、可观测。
- DoD-3: WebGPU/WebGL 在关键特性上达到可接受 parity，无 silent detail loss。
- DoD-4: 优化链路与压缩链路具备端到端阶段追踪与回归门禁。

## 8. Next Execution Block (T-006 Ordered Protocol)

### 8.1 Scope Definition

- Scope:
  - 聚焦 text/image/clip/shadow/gradient 五类特性在 WebGPU/WebGL 的 capability gate 与 degrade 策略统一。
- Out of scope:
  - 不改 UI 展示层结构；不引入新的渲染后端。

### 8.2 Type Definition

- Change type:
  - Modify（runtime parity contracts + backend capability diagnostics + scripts/report contracts）。
- Runtime risk:
  - Medium（涉及 backend 语义门控与降级路径）。
- Contract impact:
  - 会新增/扩展 diagnostics reason taxonomy 与 sampled/report summary 字段。

### 8.3 CHANGE REQUEST (T-006)

Target:

- File / Module (planned):
  - packages/engine/src/backend/adapters
  - packages/engine/src/testing/webAdapter.conformance.test.ts
  - apps/vector-editor-web/src/runtime/engine-bridge/renderParityChecklist.ts
  - apps/vector-editor-web/src/runtime/engine-bridge/renderParityReasonSummary.ts
  - apps/vector-editor-web/src/testing/product-specs/rendering

Goal:

- Problem being solved:
  - text/image/clip/shadow/gradient 在 backend 间语义支持不一致，导致降级不可解释或 silent detail loss。

Change Type:

- Modify / Add

Impact:

- Affected modules:
  - backend adapter capability gate
  - parity sampled/report/reason summary
  - replay strict gate diagnostics routing

Cleanup:

- Old logic to remove:
  - 各 adapter 中重复且不一致的特性降级原因分支（迁移到共享规则后删除内联重复逻辑）。

Tests:

- Tests to add/update:
  - text/image/clip/shadow/gradient capability gate conformance
  - sampled parity verdict/reason contracts for new reason taxonomy
  - strict gate fail-fast contracts on newly introduced failure codes (if threshold-relevant)

### 8.4 Test Design

- TD-006-1:
  - 为每个特性建立 native 与 degrade 两类样本，断言 diagnostics reason 不为 unknown。
- TD-006-2:
  - 验证 WebGL/WebGPU 在同一特性输入下 reason taxonomy 一致（允许 backend label 差异，不允许语义漂移）。
- TD-006-3:
  - 验证 sampled summary/diff/trend 对新增 reason 统计稳定，且 dominant reason 可解释。

### 8.5 Implementation Sequence

- Step A:
  - 抽取共享 capability gate 规则模块（优先 text/image/clip，再扩展 shadow/gradient）。
- Step B:
  - 接入 WebGL/WebGPU adapter，替换重复分支并保留兼容 diagnostics 字段。
- Step C:
  - 更新 parity checklist/reason summary，使新增 reason 可进入 summary/diff/trend。
- Step D:
  - 更新脚本输出与 README，保证报告字段与门禁字段一致。

### 8.6 Validation

- 必跑验证:
  - engine adapter conformance 套件
  - vector parity sampled/diff/trend/replay batch/history-gate 套件
  - strict batch-gate 命令（pass）与 fail-on-status 强制失败命令（exit=1）
- 产物验证:
  - dashboard/history/gate 中 reasons 与 failures code 一致映射。

### 8.7 Cleanup Check

- 检查项:
  - 无重复降级分支残留。
  - 无未消费 diagnostics 字段。
  - 无临时兼容逻辑遗留；若必须保留，需添加 AI-TEMP 注释并标注移除条件。

## 9. T-006 Sprint Execution Board (Actionable)

### 9.1 Atomic Work Items

- W-006-01 (shared capability gate skeleton)
  - 目标:
    - 建立 text/image/clip/shadow/gradient 的统一 capability gate 判定入口与 reason taxonomy 基线。
  - 输出:
    - shared 规则模块 + adapter 接入点占位 + conformance fixture。
  - 完成定义:
    - 五类特性均可返回 deterministic reason（禁止 unknown 默认吞并）。

- W-006-02 (WebGL adapter alignment)
  - 目标:
    - 将 WebGL 特性降级分支迁移到 shared capability gate。
  - 输出:
    - WebGL adapter 分支裁剪 + conformance 更新。
  - 完成定义:
    - 同输入下 reason taxonomy 与 shared 规则一致。

- W-006-03 (WebGPU adapter alignment)
  - 目标:
    - 将 WebGPU 特性降级分支迁移到 shared capability gate。
  - 输出:
    - WebGPU adapter 分支裁剪 + conformance 更新。
  - 完成定义:
    - 同输入下 reason taxonomy 与 shared 规则一致。

- W-006-04 (parity summary propagation)
  - 目标:
    - 将新增 reason 进入 sampled checklist/reason summary/diff/trend 统计。
  - 输出:
    - parity runtime bridge 契约更新 + sampled tests。
  - 完成定义:
    - dominant reason 与 known/unknown 计数可解释且可回放。

- W-006-05 (strict gate compatibility)
  - 目标:
    - 确保新增 reason 与 `RP_GATE_*` 失败码消费链路兼容。
  - 输出:
    - strict gate 产物验证 + 失败码映射补充。
  - 完成定义:
    - pass/fail 与 failures code 在 batch/history/gate 三产物一致。

### 9.2 Command Checklist (Per-Change)

- C-006-01 (unit + contract):
  - `pnpm dlx tsx --test ./src/testing/product-specs/rendering/render-parity-checklist-sampled.contract.test.ts ./src/testing/product-specs/rendering/render-parity-summary-diff.contract.test.ts ./src/testing/product-specs/rendering/render-parity-summary-trend.contract.test.ts ./src/testing/product-specs/rendering/render-parity-runtime-replay-batch.contract.test.ts ./src/testing/product-specs/rendering/render-parity-runtime-replay-history-gate.contract.test.ts`
- C-006-02 (adapter conformance):
  - `pnpm dlx tsx --test ./src/testing/webAdapter.conformance.test.ts` (from `packages/engine`)
- C-006-03 (end-to-end strict gate):
  - `pnpm run report:render-parity-runtime-replay-batch-gate:strict` (from `apps/vector-editor-web`)
- C-006-04 (forced fail-fast probe):
  - `pnpm dlx tsx ./scripts/render-parity-runtime-replay-history-gate.ts --dashboard ./docs/product-requirements/render-parity-reports/runtime-replay.batch.dashboard.json --history-file ./docs/product-requirements/render-parity-reports/runtime-replay.batch.history.json --gate-output ./docs/product-requirements/render-parity-reports/runtime-replay.batch.gate.json --min-processed 99 --fail-on-status`

### 9.3 Evidence Template (Per Work Item)

- Item:
  - W-006-XX
- Files changed:
  - <list>
- Reason taxonomy delta:
  - added: <reasons>
  - removed: <reasons>
- Validation result:
  - C-006-01: pass/fail
  - C-006-02: pass/fail
  - C-006-03: pass/fail
  - C-006-04: exit code
- Artifacts:
  - dashboard path
  - history path
  - gate path

### 9.4 Blocker Protocol

- B-006-01 (taxonomy conflict):
  - 现象:
    - 同输入在 WebGL/WebGPU 返回语义冲突 reason。
  - 处理:
    - 先冻结 adapter 层改动，回滚到 shared rule 基线并补冲突 fixture。

- B-006-02 (strict gate noisy fail):
  - 现象:
    - 新增 reason 导致 strict gate 非预期 fail。
  - 处理:
    - 先补 failure code 映射与门槛说明，再调整阈值；禁止静默放宽。

- B-006-03 (report drift):
  - 现象:
    - sampled summary 与 gate artifact 对同一 reason 统计不一致。
  - 处理:
    - 以 summary 统计为 source-of-truth，修正 gate 消费链路并补端到端断言。

### 9.5 Evidence Log (Latest)

- Item:
  - W-006-05
- Files changed:
  - apps/vector-editor-web/scripts/render-parity-runtime-auto-report.ts
  - apps/vector-editor-web/scripts/render-parity-runtime-replay-batch.ts
  - apps/vector-editor-web/scripts/render-parity-runtime-replay-history-gate.ts
  - apps/vector-editor-web/src/testing/product-specs/rendering/render-parity-runtime-replay-batch.contract.test.ts
  - apps/vector-editor-web/src/testing/product-specs/rendering/render-parity-runtime-replay-history-gate.contract.test.ts
  - apps/vector-editor-web/docs/product-requirements/render-parity-reports/README.md
- Reason taxonomy delta:
  - added: none (W-006-05 consumed existing taxonomy into gate code routing)
  - removed: none
- Validation result:
  - C-006-01: pass
  - C-006-02: pass (unchanged adapter conformance baseline)
  - C-006-03: pass
  - C-006-04: pass (forced fail-fast probe exit code = 1 as expected)
- Artifacts:
  - dashboard path: unchanged (existing replay output retained)
  - history path: unchanged (existing replay output retained)
  - gate path: unchanged (existing replay output retained)

- Item:
  - W-006-05 (final stabilization for T-006 closure)
- Files changed:
  - apps/vector-editor-web/scripts/runtime-diagnostics-replay-inputs/sample-a.runtime-diagnostics.json
  - apps/vector-editor-web/scripts/runtime-diagnostics-replay-inputs/sample-b.runtime-diagnostics.json
  - apps/vector-editor-web/scripts/runtime-diagnostics-feature-replay-inputs/sample-feature-text.runtime-diagnostics.json
  - apps/vector-editor-web/scripts/runtime-diagnostics-feature-replay-inputs/sample-feature-unknown.runtime-diagnostics.json
  - apps/vector-editor-web/scripts/runtime-diagnostics-replay-inputs/sample-feature-text.runtime-diagnostics.json (deleted)
  - apps/vector-editor-web/scripts/runtime-diagnostics-replay-inputs/sample-feature-unknown.runtime-diagnostics.json (deleted)
  - apps/vector-editor-web/docs/product-requirements/render-parity-reports/README.md
- Reason taxonomy delta:
  - added: none (stabilization-only; taxonomy unchanged)
  - removed: none
- Validation result:
  - C-006-01: pass (`pnpm dlx tsx --test` targeted rendering contracts, 19/19)
  - C-006-03: pass (`pnpm run report:render-parity-runtime-replay-batch-gate:strict`, refreshed history window)
  - Feature replay dataset smoke run: pass (`pnpm dlx tsx ./scripts/render-parity-runtime-replay-batch.ts --input-dir ./scripts/runtime-diagnostics-feature-replay-inputs ...`, processedCount=2)
- Artifacts:
  - default dashboard path: docs/product-requirements/render-parity-reports/runtime-replay.batch.dashboard.json
  - default history path: docs/product-requirements/render-parity-reports/runtime-replay.batch.history.json
  - default gate path: docs/product-requirements/render-parity-reports/runtime-replay.batch.gate.json
  - feature dashboard path: docs/product-requirements/render-parity-reports/runtime-replay-feature.batch.dashboard.json

## 10. T-007 Kickoff Note (2026-05-25)

### 10.1 Scope Definition

- Scope:
  - 在 runtime diagnostics 发布链路中引入 frame stage correlation id，贯穿 render request -> payload build -> runtime events snapshot。
- Out of scope:
  - 不新增后端渲染逻辑，不调整 parity 门禁阈值，不改已有报告判定算法。

### 10.2 Type Definition

- Change type:
  - Modify（runtime diagnostics contract + payload build + engine renderer request attribution）。
- Runtime risk:
  - Low（新增可观测字段，不改变渲染输出语义）。
- Contract impact:
  - `RuntimeRenderDiagnostics` 与 sectioned stats 增加 stage correlation 字段。

### 10.3 CHANGE REQUEST

Target:

- File / Module:
  - apps/vector-editor-web/src/runtime/engine-bridge/internal/engineRenderer/engineRenderer.tsx
  - apps/vector-editor-web/src/runtime/engine-bridge/internal/engineRenderer/createEngineStatsHandler.ts
  - apps/vector-editor-web/src/runtime/engine-bridge/runtimeDiagnosticsPayload.ts
  - apps/vector-editor-web/src/runtime/events/index/index/index.runtimeEvents.types.ts
  - apps/vector-editor-web/src/runtime/events/index/index/index.runtimeEvents.defaults.ts
  - apps/vector-editor-web/src/runtime/events/index/index/index.runtimeEvents.stats.ts

Goal:

- Problem being solved:
  - 当前分阶段耗时字段可见，但缺少同一帧在调度/发布链路的统一关联 id，导致跨模块排障时无法稳定串联同一 render stage。

Change Type:

- Modify

Impact:

- Affected modules:
  - engine renderer request attribution
  - runtime diagnostics payload build
  - runtime event snapshot contracts/default projection

Cleanup:

- Old logic to remove:
  - 无（本次为字段补强，不引入并行实现）。

Tests:

- Tests to add/update:
  - `apps/vector-editor-web/src/runtime/events/index/index.test.ts`（覆盖 stage 字段发布和快照一致性）。

### 10.4 Test Design

- TD-007-1:
  - 发布自定义 diagnostics（含 stage id/sequence），断言 get snapshot 与 sectioned stats 同步。
- TD-007-2:
  - reset 后 stage 字段恢复默认值，确保 recorder/export 兼容。

### 10.5 Execution Evidence (W-007-01)

- Item:
  - W-007-01 (frame stage correlation id baseline)
- Files changed:
  - apps/vector-editor-web/src/runtime/engine-bridge/internal/engineRenderer/engineRenderer.tsx
  - apps/vector-editor-web/src/runtime/engine-bridge/internal/engineRenderer/createEngineStatsHandler.ts
  - apps/vector-editor-web/src/runtime/engine-bridge/runtimeDiagnosticsPayload.ts
  - apps/vector-editor-web/src/runtime/events/index/index/index.runtimeEvents.types.ts
  - apps/vector-editor-web/src/runtime/events/index/index/index.runtimeEvents.defaults.ts
  - apps/vector-editor-web/src/runtime/events/index/index/index.runtimeEvents.stats.ts
  - apps/vector-editor-web/src/runtime/events/index/index.test.ts
- Contract delta:
  - added flat fields: `frameStageId`, `frameStageSequence`, `frameStageIssuedAtMs`
  - added sectioned timing fields: `performance.timing.frameStageId|frameStageSequence|frameStageIssuedAtMs`
  - extended stage semantics: `frameStageSchedulerMode` + `frameStageSceneApplyMode` (flat + sectioned timing)
- Validation result:
  - runtime events contract: pass (`pnpm dlx tsx --test ./src/runtime/events/index/index.test.ts`, 9/9)
  - parity extraction/checklist compatibility: pass (`pnpm dlx tsx --test ./src/testing/product-specs/rendering/render-parity-runtime-diagnostics-extraction.contract.test.ts ./src/testing/product-specs/rendering/render-parity-checklist-sampled.contract.test.ts`, 8/8)

### 10.6 Execution Evidence (W-007-02)

- Item:
  - W-007-02 (runtime debug panel stage trace visualization)
- Files changed:
  - apps/vector-editor-web/src/views/shell/RuntimeDebugPanel/RuntimeDebugPanel.tsx
  - apps/vector-editor-web/src/views/shell/RuntimeDebugPanel/RuntimeDebugPanel.sections.tsx
- Contract delta:
  - runtime debug panel `engineConfig` data source now mirrors stage trace fields:
    - `frameStageId`
    - `frameStageSequence`
    - `frameStageIssuedAtMs`
    - `frameStageSchedulerMode`
    - `frameStageSceneApplyMode`
  - compact + verbose engine-config sections now render all stage trace fields。
- Validation result:
  - runtime events contract: pass (`pnpm dlx tsx --test ./src/runtime/events/index/index.test.ts`, 9/9)

### 10.7 Execution Evidence (W-007-03)

- Item:
  - W-007-03 (replay dashboard stage distribution counters)
- Files changed:
  - apps/vector-editor-web/scripts/render-parity-runtime-replay-batch.ts
  - apps/vector-editor-web/src/testing/product-specs/rendering/render-parity-runtime-replay-batch.contract.test.ts
  - apps/vector-editor-web/docs/product-requirements/render-parity-reports/README.md
- Contract delta:
  - replay batch row 新增：
    - `frameStageSchedulerModeCounter` (`interactive|normal|unknown`)
    - `frameStageSceneApplyModeCounter` (`none|fullLoad|previewLoad|incrementalPatch|unknown`)
  - replay batch dashboard 新增 aggregate counters：
    - `frameStageSchedulerModeCounter`
    - `frameStageSceneApplyModeCounter`
  - 对缺失 stage 字段的 legacy diagnostics，统一归入 `unknown`，保证向后兼容。
- Validation result:
  - replay-batch contract: pass (`pnpm dlx tsx --test ./src/testing/product-specs/rendering/render-parity-runtime-replay-batch.contract.test.ts`, 5/5)
  - replay-batch CLI smoke run: pass (`pnpm dlx tsx ./scripts/render-parity-runtime-replay-batch.ts --input-dir ./scripts/runtime-diagnostics-replay-inputs ...`, processedCount=2)

### 10.8 Execution Evidence (W-007-04)

- Item:
  - W-007-04 (history/gate rolling stage distribution propagation)
- Files changed:
  - apps/vector-editor-web/scripts/render-parity-runtime-replay-history-gate.ts
  - apps/vector-editor-web/src/testing/product-specs/rendering/render-parity-runtime-replay-history-gate.contract.test.ts
  - apps/vector-editor-web/docs/product-requirements/render-parity-reports/README.md
- Contract delta:
  - replay dashboard artifact consumption新增：
    - `frameStageSchedulerModeCounter`
    - `frameStageSceneApplyModeCounter`
  - replay history snapshot与rolling aggregate新增：
    - `frameStageSchedulerModeCounter`
    - `frameStageSceneApplyModeCounter`
  - replay gate artifact新增 rolling stage counters 回传字段：
    - `rollingFrameStageSchedulerModeCounter`
    - `rollingFrameStageSceneApplyModeCounter`
  - 对 legacy history/dashboard 缺失 stage 字段统一 fallback 为 0 计数，保持旧产物兼容。
- Validation result:
  - replay-history-gate contract: pass (`pnpm dlx tsx --test ./src/testing/product-specs/rendering/render-parity-runtime-replay-history-gate.contract.test.ts`, 7/7)

### 10.9 Execution Evidence (W-007-05)

- Item:
  - W-007-05 (stage unknown threshold gate + failure taxonomy)
- Files changed:
  - apps/vector-editor-web/scripts/render-parity-runtime-replay-history-gate.ts
  - apps/vector-editor-web/src/testing/product-specs/rendering/render-parity-runtime-replay-history-gate.contract.test.ts
  - apps/vector-editor-web/docs/product-requirements/render-parity-reports/README.md
- Contract delta:
  - gate threshold options 新增：
    - `maxStageSchedulerUnknown`
    - `maxStageSceneApplyUnknown`
    - `maxRollingStageSchedulerUnknown`
    - `maxRollingStageSceneApplyUnknown`
  - CLI flag 新增：
    - `--max-stage-scheduler-unknown`
    - `--max-stage-scene-apply-unknown`
    - `--max-rolling-stage-scheduler-unknown`
    - `--max-rolling-stage-scene-apply-unknown`
  - failure code 新增：
    - `RP_GATE_LATEST_STAGE_SCHEDULER_UNKNOWN`
    - `RP_GATE_LATEST_STAGE_SCENE_APPLY_UNKNOWN`
    - `RP_GATE_ROLLING_STAGE_SCHEDULER_UNKNOWN`
    - `RP_GATE_ROLLING_STAGE_SCENE_APPLY_UNKNOWN`
  - 默认行为保持兼容：未传新阈值时不触发 stage unknown 门禁。
- Validation result:
  - replay-history-gate contract: pass (`pnpm dlx tsx --test ./src/testing/product-specs/rendering/render-parity-runtime-replay-history-gate.contract.test.ts`, including stage-threshold assertions)

### 10.10 Execution Evidence (W-007-06)

- Item:
  - W-007-06 (stage-strict preset command + baseline sample readiness)
- Files changed:
  - apps/vector-editor-web/package.json
  - apps/vector-editor-web/scripts/runtime-diagnostics-replay-inputs/sample-a.runtime-diagnostics.json
  - apps/vector-editor-web/scripts/runtime-diagnostics-replay-inputs/sample-b.runtime-diagnostics.json
  - apps/vector-editor-web/src/testing/product-specs/rendering/render-parity-runtime-replay-history-gate.contract.test.ts
  - apps/vector-editor-web/docs/product-requirements/render-parity-reports/README.md
- Contract delta:
  - scripts 新增 stage-strict 快捷入口：
    - `report:render-parity-runtime-replay-history-gate:strict:stage`
    - `report:render-parity-runtime-replay-batch-gate:strict:stage`
  - stage-strict 命令使用独立 history/gate 产物路径，避免被默认 strict 历史窗口中的 legacy unknown 快照污染。
  - 默认 replay 输入样本 `sample-a/b` 已补齐 `frameStageSchedulerMode` 与 `frameStageSceneApplyMode`，可用于 stage-strict 零 unknown 阈值验证。
  - 新增端到端合同：history-gate 在 stage-strict 阈值开启时（unknown=0）可稳定 pass。
- Validation result:
  - replay-history-gate contract: pass（含 stage-strict run 场景）
  - stage-strict 首次接入时发现默认 history 滚动污染导致 fail（`RP_GATE_ROLLING_STAGE_*_UNKNOWN`）；已通过独立 history/gate 产物路径修复。
  - 修复后 stage-strict one-shot gate command: pass

### 10.11 Execution Evidence (W-007-07)

- Item:
  - W-007-07 (stage-strict artifact path regression guard)
- Files changed:
  - apps/vector-editor-web/src/testing/product-specs/rendering/render-parity-runtime-replay-history-gate.contract.test.ts
  - packages/engine/ai/vector-docmodel-rendering-recovery-task-list-2026-05-24.md
- Contract delta:
  - 新增合同断言：`package.json` 中 `report:render-parity-runtime-replay-history-gate:strict:stage` 必须绑定
    - `runtime-replay.stage.batch.history.json`
    - `runtime-replay.stage.batch.gate.json`
  - 并断言该脚本不得回退引用默认 strict 产物（`runtime-replay.batch.history.json/gate.json`）。
- Validation result:
  - replay-history-gate contract: pass（含 stage-strict 路径防回归断言）

### 11.5 Execution Evidence (W-008-01)

- Item:
  - W-008-01 (stage unknown rate governance thresholds)
- Files changed:
  - apps/vector-editor-web/scripts/render-parity-runtime-replay-history-gate.ts
  - apps/vector-editor-web/src/testing/product-specs/rendering/render-parity-runtime-replay-history-gate.contract.test.ts
  - apps/vector-editor-web/package.json
  - apps/vector-editor-web/docs/product-requirements/render-parity-reports/README.md
- Contract delta:
  - gate threshold options 新增（rate 维度）：
    - `maxStageSchedulerUnknownRatePercent`
    - `maxStageSceneApplyUnknownRatePercent`
    - `maxRollingStageSchedulerUnknownRatePercent`
    - `maxRollingStageSceneApplyUnknownRatePercent`
  - CLI flag 新增：
    - `--max-stage-scheduler-unknown-rate-percent`
    - `--max-stage-scene-apply-unknown-rate-percent`
    - `--max-rolling-stage-scheduler-unknown-rate-percent`
    - `--max-rolling-stage-scene-apply-unknown-rate-percent`
  - failure code 新增：
    - `RP_GATE_LATEST_STAGE_SCHEDULER_UNKNOWN_RATE`
    - `RP_GATE_LATEST_STAGE_SCENE_APPLY_UNKNOWN_RATE`
    - `RP_GATE_ROLLING_STAGE_SCHEDULER_UNKNOWN_RATE`
    - `RP_GATE_ROLLING_STAGE_SCENE_APPLY_UNKNOWN_RATE`
  - stage-strict preset 扩展为 count+rate 双维度 unknown=0 门禁。
- Validation result:
  - replay-history-gate contract: pass（含 stage unknown rate threshold 断言）
  - stage-strict one-shot gate command: pass

### 11.6 Execution Evidence (W-008-02)

- Item:
  - W-008-02 (stage unknown rate structured artifact observability)
- Files changed:
  - apps/vector-editor-web/scripts/render-parity-runtime-replay-history-gate.ts
  - apps/vector-editor-web/src/testing/product-specs/rendering/render-parity-runtime-replay-history-gate.contract.test.ts
  - apps/vector-editor-web/docs/product-requirements/render-parity-reports/README.md
- Contract delta:
  - gate artifact 新增结构化字段 `stageUnknownRatePercentSummary`，覆盖：
    - latest scheduler unknown rate
    - latest scene-apply unknown rate
    - rolling scheduler unknown rate
    - rolling scene-apply unknown rate
  - rate 阈值判定统一改为消费该结构化字段，避免重复计算与 message-only 可观测。
  - 新增合同断言：stage unknown rate 失败场景下结构化百分比值稳定输出。
- Validation result:
  - replay-history-gate contract: pass（含结构化 rate 字段断言）
  - stage-strict one-shot gate command: pass

### 11.7 Execution Evidence (W-008-03)

- Item:
  - W-008-03 (optional rate branch compatibility guard)
- Files changed:
  - apps/vector-editor-web/src/testing/product-specs/rendering/render-parity-runtime-replay-history-gate.contract.test.ts
  - packages/engine/ai/vector-docmodel-rendering-recovery-task-list-2026-05-24.md
- Contract delta:
  - 新增兼容性断言：未传 rate 阈值时，即便 stage unknown rate=100%，也不得触发 `RP_GATE_*_UNKNOWN_RATE` 失败码。
  - 同时断言 `stageUnknownRatePercentSummary` 在兼容场景依然稳定输出，供后续观察与报警系统消费。
- Validation result:
  - replay-history-gate contract: pass（含 optional rate branch compatibility 断言）

### 11.8 Execution Evidence (W-008-04)

- Item:
  - W-008-04 (rolling stage unknown-rate fluctuation replay coverage)
- Files changed:
  - apps/vector-editor-web/src/testing/product-specs/rendering/render-parity-runtime-replay-history-gate.contract.test.ts
  - packages/engine/ai/vector-docmodel-rendering-recovery-task-list-2026-05-24.md
- Contract delta:
  - 新增端到端合同：同一 history 窗口内执行两次 replay（先低 unknown 后高 unknown），当 rolling scheduler unknown rate 跨过阈值时必须输出
    `RP_GATE_ROLLING_STAGE_SCHEDULER_UNKNOWN_RATE`。
  - 断言 gate artifact 结构化字段 `stageUnknownRatePercentSummary.rollingStageSchedulerUnknownRatePercent` 与失败码一致（50% 场景）。
- Validation result:
  - replay-history-gate contract: pass（含 rolling rate fluctuation 场景）

### 11.9 Execution Evidence (W-008-05)

- Item:
  - W-008-05 (rolling stage scene-apply unknown-rate fluctuation replay coverage)
- Files changed:
  - apps/vector-editor-web/src/testing/product-specs/rendering/render-parity-runtime-replay-history-gate.contract.test.ts
  - packages/engine/ai/vector-docmodel-rendering-recovery-task-list-2026-05-24.md
- Contract delta:
  - 新增端到端合同：history 窗口两次 replay（scene-apply 从 known 切到 unknown）后，rolling scene-apply unknown rate 跨阈值时必须输出
    `RP_GATE_ROLLING_STAGE_SCENE_APPLY_UNKNOWN_RATE`。
  - 断言 gate artifact 结构化字段 `stageUnknownRatePercentSummary.rollingStageSceneApplyUnknownRatePercent` 与失败码一致（50% 场景）。
- Validation result:
  - replay-history-gate contract: pass（含 scene-apply rolling rate fluctuation 场景）

### 11.10 Execution Evidence (W-008-06)

- Item:
  - W-008-06 (stage-strict rate flag regression guard)
- Files changed:
  - apps/vector-editor-web/src/testing/product-specs/rendering/render-parity-runtime-replay-history-gate.contract.test.ts
  - packages/engine/ai/vector-docmodel-rendering-recovery-task-list-2026-05-24.md
- Contract delta:
  - 扩展 package script 防回归断言：`report:render-parity-runtime-replay-history-gate:strict:stage` 必须持续包含以下 rate 门禁参数：
    - `--max-stage-scheduler-unknown-rate-percent 0`
    - `--max-stage-scene-apply-unknown-rate-percent 0`
    - `--max-rolling-stage-scheduler-unknown-rate-percent 0`
    - `--max-rolling-stage-scene-apply-unknown-rate-percent 0`
- Validation result:
  - replay-history-gate contract: pass（含 stage-strict rate flag 路径断言）

### 11.11 Execution Evidence (W-008-07)

- Item:
  - W-008-07 (latest stage scene-apply unknown-rate replay coverage + docs scenario)
- Files changed:
  - apps/vector-editor-web/src/testing/product-specs/rendering/render-parity-runtime-replay-history-gate.contract.test.ts
  - apps/vector-editor-web/docs/product-requirements/render-parity-reports/README.md
  - packages/engine/ai/vector-docmodel-rendering-recovery-task-list-2026-05-24.md
- Contract delta:
  - 新增端到端合同：latest snapshot scene-apply unknown rate 超阈值时，必须输出
    `RP_GATE_LATEST_STAGE_SCENE_APPLY_UNKNOWN_RATE`，并断言
    `stageUnknownRatePercentSummary.latestStageSceneApplyUnknownRatePercent=100`。
  - README 新增“Rate Fluctuation Replay Scenarios”小节，明确 latest/rolling 两类 rate 失败的夹具轮廓、阈值与预期 failure code。
- Validation result:
  - replay-history-gate contract: pass（含 latest scene-apply unknown-rate 场景）

### 11.12 Execution Evidence (W-008-08)

- Item:
  - W-008-08 (latest stage scheduler unknown-rate replay coverage)
- Files changed:
  - apps/vector-editor-web/src/testing/product-specs/rendering/render-parity-runtime-replay-history-gate.contract.test.ts
  - apps/vector-editor-web/docs/product-requirements/render-parity-reports/README.md
  - packages/engine/ai/vector-docmodel-rendering-recovery-task-list-2026-05-24.md
- Contract delta:
  - 新增端到端合同：latest snapshot scheduler unknown rate 超阈值时，必须输出
    `RP_GATE_LATEST_STAGE_SCHEDULER_UNKNOWN_RATE`，并断言
    `stageUnknownRatePercentSummary.latestStageSchedulerUnknownRatePercent=100`。
  - README 的 rate 回放场景补齐 latest scheduler 对称案例，确保 latest/rolling、scheduler/scene-apply 四象限可复现。
- Validation result:
  - replay-history-gate contract: pass（含 latest scheduler unknown-rate 场景）

### 11.13 Execution Evidence (W-008-09)

- Item:
  - W-008-09 (stage unknown-rate violation summary contract)
- Files changed:
  - apps/vector-editor-web/scripts/render-parity-runtime-replay-history-gate.ts
  - apps/vector-editor-web/src/testing/product-specs/rendering/render-parity-runtime-replay-history-gate.contract.test.ts
  - apps/vector-editor-web/docs/product-requirements/render-parity-reports/README.md
  - packages/engine/ai/vector-docmodel-rendering-recovery-task-list-2026-05-24.md
- Contract delta:
  - gate artifact 新增结构化字段 `stageUnknownRateViolationSummary`，按 latest/rolling + scheduler/scene-apply 输出 rate 阈值评估条目：
    - `actualRatePercent`
    - `thresholdRatePercent`（未配置阈值时为 `null`）
    - `exceeded`
    - `exceededCount`
  - rate failure 判定逻辑统一改为消费 violation summary，避免阈值比较分支重复散落。
  - 合同新增断言：
    - rate 超阈值场景下 `exceededCount` 与阈值值稳定输出。
    - rate 阈值未配置场景下 `thresholdRatePercent=null` 且 `exceededCount=0`。
- Validation result:
  - replay-history-gate contract: pass（含 violation summary 断言）
  - stage-strict one-shot gate command: pass

### 11.14 Execution Evidence (W-008-10)

- Item:
  - W-008-10 (stage unknown-rate violation CLI summary logs)
- Files changed:
  - apps/vector-editor-web/scripts/render-parity-runtime-replay-history-gate.ts
  - apps/vector-editor-web/src/testing/product-specs/rendering/render-parity-runtime-replay-history-gate.contract.test.ts
  - apps/vector-editor-web/docs/product-requirements/render-parity-reports/README.md
  - packages/engine/ai/vector-docmodel-rendering-recovery-task-list-2026-05-24.md
- Contract delta:
  - 新增 `createStageUnknownRateViolationSummaryLogLines`：仅为 exceeded 维度生成稳定日志行。
  - CLI 在 gate fail 且存在 rate 违规时新增摘要输出：
    - `stage-rate-exceeded: <count>`
    - `stage-rate: <failureCode>: actual=<value> threshold=<value>`
  - 新增合同断言：exceeded 场景下 violation log lines 数量与 failure code 顺序稳定。
- Validation result:
  - replay-history-gate contract: pass（含 stage-rate violation logs 断言）
  - stage-strict one-shot gate command: pass

### 11.15 Execution Evidence (W-008-11)

- Item:
  - W-008-11 (stage unknown-rate exceededCount/failure-row consistency guard)
- Files changed:
  - apps/vector-editor-web/src/testing/product-specs/rendering/render-parity-runtime-replay-history-gate.contract.test.ts
  - packages/engine/ai/vector-docmodel-rendering-recovery-task-list-2026-05-24.md
- Contract delta:
  - 新增一致性断言：`stageUnknownRateViolationSummary.exceededCount` 必须与 gate `failures` 中 `*_UNKNOWN_RATE` 条目数一致。
  - 覆盖 fail + pass 两种门禁状态，防止后续重构出现摘要计数与失败码漂移。
- Validation result:
  - replay-history-gate contract: pass（含 exceededCount/failure-row consistency 断言）

### 11.16 Current Slice Closure (W-008-01..11)

- Scope closed:
  - 当前 T-008 rate governance 子轨（W-008-01..11）已完成并通过合同与 stage-strict 回归验证。
- Remaining blockers in this slice:
  - 无。

### 11.17 Execution Evidence (T-005 CI Closure)

- Item:
  - T-005 (CI code-based routing + PR strict baseline gate)
- Files changed:
  - .github/workflows/render-parity-strict-gate.yml
  - apps/vector-editor-web/src/testing/product-specs/rendering/render-parity-runtime-replay-history-gate.contract.test.ts
  - apps/vector-editor-web/docs/product-requirements/render-parity-reports/README.md
  - packages/engine/ai/vector-docmodel-rendering-recovery-task-list-2026-05-24.md
- Contract delta:
  - 新增 PR workflow：固定执行 strict gate 命令并消费 gate artifact。
  - CI 报警分组：按 `RP_GATE_*` failure code 输出 `RenderParityGate` 分组告警。
  - 新增防回归合同：workflow 必须保留 strict 命令、gate artifact 路径与 code-routing 关键字。
  - README 新增 CI baseline gate flow 说明（命令/产物/分组/失败策略）。
- Validation result:
  - replay-history-gate contract: pass（含 workflow strict/code-routing 断言）
  - stage-strict one-shot gate command: pass

## 11. T-008 Kickoff Note (2026-05-25)

### 11.1 Scope Definition

- Scope:
  - 在 replay history-gate 中新增 stage unknown rate（latest + rolling）治理阈值与机器可读失败码，形成“计数 + 比率”双维度门禁。
- Out of scope:
  - 不修改渲染引擎行为；不调整现有默认 strict 脚本阈值。

### 11.2 Type Definition

- Change type:
  - Modify（history-gate contract + CLI flags + gate taxonomy + contract tests）。
- Runtime risk:
  - Low（仅门禁治理信号增强，默认行为保持兼容）。
- Contract impact:
  - `RenderParityReplayGateThresholds`、`RenderParityReplayGateFailureCode` 扩展 rate 阈值与失败码。

### 11.3 CHANGE REQUEST

Target:

- File / Module:
  - apps/vector-editor-web/scripts/render-parity-runtime-replay-history-gate.ts
  - apps/vector-editor-web/src/testing/product-specs/rendering/render-parity-runtime-replay-history-gate.contract.test.ts
  - apps/vector-editor-web/docs/product-requirements/render-parity-reports/README.md

Goal:

- Problem being solved:
  - 现有 stage 门禁仅基于 unknown 绝对计数，缺少比率维度，在 sample 总量变化时治理敏感度不稳定。

Change Type:

- Modify

Impact:

- Affected modules:
  - replay history/gate threshold parsing
  - replay gate failure taxonomy
  - replay reports docs

Cleanup:

- Old logic to remove:
  - 无（新增可选阈值，不替换旧阈值逻辑）。

Tests:

- Tests to add/update:
  - replay-history-gate contract 新增 stage unknown rate 阈值失败断言。

### 11.4 Test Design

- TD-008-1:
  - latest stage unknown rate 超阈值时输出 `RP_GATE_LATEST_STAGE_*_UNKNOWN_RATE`。
- TD-008-2:
  - rolling stage unknown rate 超阈值时输出 `RP_GATE_ROLLING_STAGE_*_UNKNOWN_RATE`。
- TD-008-3:
  - 不传 rate 阈值时保持兼容，不触发新门禁分支。

## 12. T-009 Kickoff Note (2026-05-25)

### 12.1 Scope Definition

- Scope:
  - 在 replay batch dashboard 中补齐 compression/decode 可观测计数字段，形成 T-009 端到端闭环的基础输入面。
- Out of scope:
  - 不在本批次引入新的 gate 阈值失败判定；先确保批处理看板稳定输出、可回放、可聚合。

### 12.2 Type Definition

- Change type:
  - Modify（replay batch dashboard contract + parser + contract tests + docs）。
- Runtime risk:
  - Low（仅新增统计字段，历史输入缺失字段时归入 `unknown` 保持兼容）。
- Contract impact:
  - `RenderParityRuntimeReplayBatchRow` 与 dashboard aggregate 新增 runtime resource decode/compression 计数。

### 12.3 CHANGE REQUEST

Target:

- File / Module:
  - apps/vector-editor-web/scripts/render-parity-runtime-replay-batch.ts
  - apps/vector-editor-web/scripts/render-parity-runtime-replay-batch-resource-counters.ts
  - apps/vector-editor-web/src/testing/product-specs/rendering/render-parity-runtime-replay-batch.contract.test.ts
  - apps/vector-editor-web/docs/product-requirements/render-parity-reports/README.md

Goal:

- Problem being solved:
  - 现有 replay batch 仅覆盖 feature/stage 统计，无法直接观察 compression/decode 与 resource residency 相关输入分布。

Change Type:

- Modify

Impact:

- Affected modules:
  - replay batch diagnostics record parser
  - replay batch dashboard row + aggregate schema
  - replay reports docs

Cleanup:

- Old logic to remove:
  - 无（增量扩展字段，保持原有字段兼容）。

Tests:

- Tests to add/update:
  - replay-batch contract 扩展断言：默认样本缺失 compression/decode 字段时稳定归入 `unknown`。

### 12.4 Test Design

- TD-009-1:
  - batch dashboard aggregate 输出 runtime resource decode-status 维度（queued/decoding/ready/failed/unknown）。
- TD-009-2:
  - batch dashboard aggregate 输出 runtime resource compression-codec 维度（none/brotli/gzip/zstd/lz4/unknown）。
- TD-009-3:
  - 历史样本缺失相关字段时，不抛错且全部计入 `unknown`。

### 12.5 Execution Evidence (W-009-01)

- Item:
  - W-009-01 (replay batch compression/decode observability baseline)
- Files changed:
  - apps/vector-editor-web/scripts/render-parity-runtime-replay-batch.ts
  - apps/vector-editor-web/scripts/render-parity-runtime-replay-batch-frame-stage-counters.ts
  - apps/vector-editor-web/scripts/render-parity-runtime-replay-batch-resource-counters.ts
  - apps/vector-editor-web/src/testing/product-specs/rendering/render-parity-runtime-replay-batch.contract.test.ts
  - apps/vector-editor-web/docs/product-requirements/render-parity-reports/README.md
  - packages/engine/ai/vector-docmodel-rendering-recovery-task-list-2026-05-24.md
- Contract delta:
  - replay batch row 与 aggregate 新增 runtime resource decode-status 与 compression-codec 计数。
  - frame-stage 计数逻辑拆分到独立模块，保持主 batch 文件职责收敛与文件形态约束。
  - 新增 `render-parity-runtime-replay-batch-resource-counters.ts` 模块，统一负责 token 归一化与聚合。
  - 兼容策略：输入缺失字段或未知 token 一律计入 `unknown`，防止历史资产回放崩溃。
- Validation result:
  - replay-batch + replay-history-gate contracts: pass
  - strict one-shot gate command: pass
  - stage-strict one-shot gate command: pass

### 12.6 Execution Evidence (W-009-02)

- Item:
  - W-009-02 (replay history/gate runtime resource observability propagation)
- Files changed:
  - apps/vector-editor-web/scripts/render-parity-runtime-replay-history-gate.ts
  - apps/vector-editor-web/src/testing/product-specs/rendering/render-parity-runtime-replay-history-gate.contract.test.ts
  - apps/vector-editor-web/docs/product-requirements/render-parity-reports/README.md
  - packages/engine/ai/vector-docmodel-rendering-recovery-task-list-2026-05-24.md
- Contract delta:
  - replay history artifact 新增 rolling runtime resource decode-status 与 compression-codec 计数。
  - replay gate artifact 同步暴露 rolling runtime resource decode/compression 结构化计数，供 CI/排查链路消费。
  - 新增历史兼容回退：旧快照缺失 runtime resource 计数字段时回退为零计数，不影响 history/gate 运行。
  - 合同新增断言：rolling runtime resource 计数聚合稳定，且 e2e run 输出包含对应 rolling 字段。
- Validation result:
  - replay-batch + replay-history-gate contracts: pass
  - strict one-shot gate command: pass
  - stage-strict one-shot gate command: pass

### 12.7 Scope Definition (W-009-03)

- Scope:
  - 在 replay history-gate 中新增 runtime resource unknown 维度门禁阈值（latest + rolling），覆盖 decode-status unknown 与 compression-codec unknown 两个治理面。
- Out of scope:
  - 本轮不新增 rate(%) 门禁；仅引入 count 阈值与 machine-readable failure code，保持最小安全增量。

### 12.8 Type Definition (W-009-03)

- Change type:
  - Modify（history-gate thresholds + CLI flags + failure taxonomy + contract tests + docs）。
- Runtime risk:
  - Low（新增阈值均为可选，默认不改变现有 strict/stage-strict 行为）。
- Contract impact:
  - `RenderParityReplayGateThresholds` 扩展 4 个 resource unknown 阈值字段。
  - `RenderParityReplayGateFailureCode` 扩展 4 个 `RP_GATE_*RESOURCE*UNKNOWN` 失败码。

### 12.9 CHANGE REQUEST (W-009-03)

Target:

- File / Module:
  - apps/vector-editor-web/scripts/render-parity-runtime-replay-history-gate.ts
  - apps/vector-editor-web/src/testing/product-specs/rendering/render-parity-runtime-replay-history-gate.contract.test.ts
  - apps/vector-editor-web/docs/product-requirements/render-parity-reports/README.md

Goal:

- Problem being solved:
  - 当前 replay gate 虽已输出 resource rolling 计数，但无法通过阈值门禁对 decode/compression unknown 漂移进行阻断。

Change Type:

- Modify

Impact:

- Affected modules:
  - replay history-gate threshold parsing
  - replay gate failure taxonomy
  - replay reports docs

Cleanup:

- Old logic to remove:
  - 无（增量扩展，不移除现有 stage/feature/trend 门禁逻辑）。

Tests:

- Tests to add/update:
  - replay-history-gate contract 新增 latest + rolling resource unknown 阈值失败断言。

### 12.10 Test Design (W-009-03)

- TD-009-4:
  - latest `runtimeResourceDecodeStatusCounter.unknown` 超阈值时输出 `RP_GATE_LATEST_RESOURCE_DECODE_UNKNOWN`。
- TD-009-5:
  - latest `runtimeResourceCompressionCodecCounter.unknown` 超阈值时输出 `RP_GATE_LATEST_RESOURCE_COMPRESSION_UNKNOWN`。
- TD-009-6:
  - rolling resource unknown 维度超阈值时输出 `RP_GATE_ROLLING_RESOURCE_*_UNKNOWN`。
- TD-009-7:
  - 阈值未配置时保持兼容，不触发 resource unknown 门禁分支。

### 12.11 Execution Evidence (W-009-03)

- Item:
  - W-009-03 (runtime resource unknown threshold gate + failure-code routing)
- Files changed:
  - apps/vector-editor-web/scripts/render-parity-runtime-replay-history-gate.ts
  - apps/vector-editor-web/src/testing/product-specs/rendering/render-parity-runtime-replay-history-gate.contract.test.ts
  - apps/vector-editor-web/docs/product-requirements/render-parity-reports/README.md
  - packages/engine/ai/vector-docmodel-rendering-recovery-task-list-2026-05-24.md
- Contract delta:
  - `RenderParityReplayGateThresholds` 新增 4 个可选 resource unknown 阈值：latest/rolling + decode/compression。
  - `RenderParityReplayGateFailureCode` 新增 4 个 machine-readable 失败码：
    - `RP_GATE_LATEST_RESOURCE_DECODE_UNKNOWN`
    - `RP_GATE_LATEST_RESOURCE_COMPRESSION_UNKNOWN`
    - `RP_GATE_ROLLING_RESOURCE_DECODE_UNKNOWN`
    - `RP_GATE_ROLLING_RESOURCE_COMPRESSION_UNKNOWN`
  - CLI 新增 4 个可选参数：
    - `--max-resource-decode-unknown`
    - `--max-resource-compression-unknown`
    - `--max-rolling-resource-decode-unknown`
    - `--max-rolling-resource-compression-unknown`
  - 合同新增断言：resource unknown 阈值超限触发对应失败码；阈值未配置时保持兼容不触发 resource 分支。
- Validation result:
  - replay-batch + replay-history-gate contracts: pass
  - strict one-shot gate command: pass
  - stage-strict one-shot gate command: pass

### 12.12 Scope Definition (W-009-04)

- Scope:
  - 在 replay history-gate 中新增 runtime resource unknown rate（latest + rolling，decode + compression）门禁与 machine-readable 失败码。
- Out of scope:
  - 本轮不改动 strict/stage-strict 默认阈值配置，保持现有流水线默认行为稳定。

### 12.13 Type Definition (W-009-04)

- Change type:
  - Modify（history-gate contract + CLI flags + failure taxonomy + contract tests + docs）。
- Runtime risk:
  - Low（新增 rate 阈值均为可选，不传参时保持兼容）。
- Contract impact:
  - `RenderParityReplayGateThresholds` 扩展 4 个 resource rate 阈值字段。
  - `RenderParityReplayGateFailureCode` 扩展 4 个 `RP_GATE_*RESOURCE*UNKNOWN_RATE` 失败码。
  - gate artifact 新增 `resourceUnknownRatePercentSummary` 与 `resourceUnknownRateViolationSummary`。

### 12.14 CHANGE REQUEST (W-009-04)

Target:

- File / Module:
  - apps/vector-editor-web/scripts/render-parity-runtime-replay-history-gate.ts
  - apps/vector-editor-web/src/testing/product-specs/rendering/render-parity-runtime-replay-history-gate.contract.test.ts
  - apps/vector-editor-web/docs/product-requirements/render-parity-reports/README.md

Goal:

- Problem being solved:
  - 当前 resource 仅有 unknown count 门禁，缺少 rate 维度，无法在样本规模波动时保持稳定治理敏感度。

Change Type:

- Modify

Impact:

- Affected modules:
  - replay history-gate rate summary/violation
  - replay gate failure taxonomy
  - replay reports docs

Cleanup:

- Old logic to remove:
  - 无（增量扩展，不移除已有 count 门禁分支）。

Tests:

- Tests to add/update:
  - replay-history-gate contract 新增 resource unknown-rate 失败断言与可选阈值兼容断言。

### 12.15 Test Design (W-009-04)

- TD-009-8:
  - latest resource decode/compression unknown-rate 超阈值时输出 `RP_GATE_LATEST_RESOURCE_*_UNKNOWN_RATE`。
- TD-009-9:
  - rolling resource decode/compression unknown-rate 超阈值时输出 `RP_GATE_ROLLING_RESOURCE_*_UNKNOWN_RATE`。
- TD-009-10:
  - 未配置 resource rate 阈值时，resource rate 分支保持 disabled，且 violation summary 的阈值字段为 `null`。

### 12.16 Execution Evidence (W-009-04)

- Item:
  - W-009-04 (runtime resource unknown-rate gate + structured rate summary)
- Files changed:
  - apps/vector-editor-web/scripts/render-parity-runtime-replay-history-gate.ts
  - apps/vector-editor-web/src/testing/product-specs/rendering/render-parity-runtime-replay-history-gate.contract.test.ts
  - apps/vector-editor-web/docs/product-requirements/render-parity-reports/README.md
  - packages/engine/ai/vector-docmodel-rendering-recovery-task-list-2026-05-24.md
- Contract delta:
  - 新增 resource unknown-rate percent summary 与 violation summary（latest + rolling，decode + compression）。
  - 新增 4 个 resource rate CLI 参数：
    - `--max-resource-decode-unknown-rate-percent`
    - `--max-resource-compression-unknown-rate-percent`
    - `--max-rolling-resource-decode-unknown-rate-percent`
    - `--max-rolling-resource-compression-unknown-rate-percent`
  - 新增 4 个 resource rate machine-readable failure code：
    - `RP_GATE_LATEST_RESOURCE_DECODE_UNKNOWN_RATE`
    - `RP_GATE_LATEST_RESOURCE_COMPRESSION_UNKNOWN_RATE`
    - `RP_GATE_ROLLING_RESOURCE_DECODE_UNKNOWN_RATE`
    - `RP_GATE_ROLLING_RESOURCE_COMPRESSION_UNKNOWN_RATE`
  - 合同新增断言：resource rate 超阈值失败与未配置阈值兼容两类关键分支。
- Validation result:
  - replay-batch + replay-history-gate contracts: pass
  - strict one-shot gate command: pass
  - stage-strict one-shot gate command: pass

### 12.17 Scope Definition (W-009-05)

- Scope:
  - 将 runtime resource unknown-rate 违规摘要接入 history-gate CLI fail 输出，并补齐计数一致性契约约束。
- Out of scope:
  - 不新增新的门禁阈值维度；仅增强可观测日志与一致性防回归保障。

### 12.18 Type Definition (W-009-05)

- Change type:
  - Modify（history-gate CLI logs + contract tests + docs）。
- Runtime risk:
  - Low（仅 fail 时附加日志输出，不影响 gate 判定逻辑）。
- Contract impact:
  - 新增 runtime resource unknown-rate violation log line contract。

### 12.19 CHANGE REQUEST (W-009-05)

Target:

- File / Module:
  - apps/vector-editor-web/scripts/render-parity-runtime-replay-history-gate.ts
  - apps/vector-editor-web/src/testing/product-specs/rendering/render-parity-runtime-replay-history-gate.contract.test.ts
  - apps/vector-editor-web/docs/product-requirements/render-parity-reports/README.md

Goal:

- Problem being solved:
  - 当前 CLI 仅输出 stage unknown-rate 摘要，resource unknown-rate 虽有结构化结果但缺少 fail-time 终端摘要，不利于 CI 快速定位。

Change Type:

- Modify

Impact:

- Affected modules:
  - replay history-gate CLI fail summary
  - replay-history-gate contract consistency guards
  - replay reports docs

Cleanup:

- Old logic to remove:
  - 无（增量补充日志与断言）。

Tests:

- Tests to add/update:
  - 新增 resource unknown-rate violation log format 断言。
  - 新增 resource unknown-rate exceededCount 与 failure rows 一致性断言。

### 12.20 Test Design (W-009-05)

- TD-009-11:
  - resource unknown-rate 超阈值时，violation log lines 顺序与 failure code 稳定。
- TD-009-12:
  - `resourceUnknownRateViolationSummary.exceededCount` 必须与 `*_RESOURCE_*_UNKNOWN_RATE` failure rows 数量一致（fail/pass 双分支）。

### 12.21 Execution Evidence (W-009-05)

- Item:
  - W-009-05 (resource unknown-rate CLI summary + exceededCount consistency guard)
- Files changed:
  - apps/vector-editor-web/scripts/render-parity-runtime-replay-history-gate.ts
  - apps/vector-editor-web/src/testing/product-specs/rendering/render-parity-runtime-replay-history-gate.contract.test.ts
  - apps/vector-editor-web/docs/product-requirements/render-parity-reports/README.md
  - packages/engine/ai/vector-docmodel-rendering-recovery-task-list-2026-05-24.md
- Contract delta:
  - 新增 `createResourceUnknownRateViolationSummaryLogLines`，仅输出 exceeded 维度并保持 failure-code 顺序稳定。
  - CLI 在 gate fail 且存在 resource rate 违规时新增摘要输出：
    - `resource-rate-exceeded: <count>`
    - `resource-rate: <failureCode>: actual=<value> threshold=<value>`
  - 新增合同断言：resource unknown-rate violation log lines 稳定、`exceededCount` 与 `*_RESOURCE_*_UNKNOWN_RATE` failure rows 保持一致。
- Validation result:
  - replay-batch + replay-history-gate contracts: pass
  - strict one-shot gate command: pass
  - stage-strict one-shot gate command: pass

### 12.22 Scope Definition (W-009-06)

- Scope:
  - 统一 history-gate 的 unknown-rate CLI 摘要输出协议，收敛 stage/resource 两类 rate 维度打印逻辑。
- Out of scope:
  - 不新增或修改任何门禁阈值；仅整理摘要输出路径与断言覆盖。

### 12.23 Type Definition (W-009-06)

- Change type:
  - Modify（history-gate CLI summary helper + contract tests + docs）。
- Runtime risk:
  - Low（仅 fail 日志输出路径重构，gate 判定逻辑不变）。
- Contract impact:
  - 新增统一 unknown-rate CLI summary helper contract（resource + stage 组合输出）。

### 12.24 CHANGE REQUEST (W-009-06)

Target:

- File / Module:
  - apps/vector-editor-web/scripts/render-parity-runtime-replay-history-gate.ts
  - apps/vector-editor-web/src/testing/product-specs/rendering/render-parity-runtime-replay-history-gate.contract.test.ts
  - apps/vector-editor-web/docs/product-requirements/render-parity-reports/README.md

Goal:

- Problem being solved:
  - 目前 stage/resource rate 摘要打印逻辑分散在 CLI main 中，缺少统一输出协议函数，后续扩展风险高且难以统一测试。

Change Type:

- Modify

Impact:

- Affected modules:
  - replay history-gate CLI summary composition
  - replay-history-gate summary output contracts
  - replay reports docs

Cleanup:

- Old logic to remove:
  - 删除 main 中 stage/resource rate 摘要分散输出分支，统一通过单一 helper 生成。

Tests:

- Tests to add/update:
  - 新增统一 helper 的组合输出断言（resource + stage 同时超阈值场景）。

### 12.25 Test Design (W-009-06)

- TD-009-13:
  - stage + resource rate 同时超阈值时，CLI 摘要输出必须包含两类 `*-rate-exceeded` 与对应明细行。
- TD-009-14:
  - 输出顺序固定：先 resource-rate 段，再 stage-rate 段，确保 CI 日志可预测。

### 12.26 Execution Evidence (W-009-06)

- Item:
  - W-009-06 (unified unknown-rate CLI summary protocol + e2e summary assertion)
- Files changed:
  - apps/vector-editor-web/scripts/render-parity-runtime-replay-history-gate.ts
  - apps/vector-editor-web/src/testing/product-specs/rendering/render-parity-runtime-replay-history-gate.contract.test.ts
  - packages/engine/ai/vector-docmodel-rendering-recovery-task-list-2026-05-24.md
- Contract delta:
  - 新增 `createUnknownRateCliSummaryLogLines`：统一汇总 resource/stage unknown-rate CLI 摘要输出。
  - main CLI 移除分散打印分支，改为统一 helper 输出，确保顺序稳定（resource 段 -> stage 段）。
  - 合同新增组合断言：resource + stage 同时超阈值时，摘要头与明细行均完整输出且顺序固定。
- Validation result:
  - replay-batch + replay-history-gate contracts: pass
  - strict one-shot gate command: pass
  - stage-strict one-shot gate command: pass

### 12.27 Execution Evidence (W-009-07)

- Item:
  - W-009-07 (resource-rate strict command path closure + deterministic replay fixture readiness)
- Files changed:
  - apps/vector-editor-web/package.json
  - apps/vector-editor-web/scripts/runtime-diagnostics-replay-inputs/sample-a.runtime-diagnostics.json
  - apps/vector-editor-web/scripts/runtime-diagnostics-replay-inputs/sample-b.runtime-diagnostics.json
  - apps/vector-editor-web/src/testing/product-specs/rendering/render-parity-runtime-replay-history-gate.contract.test.ts
  - apps/vector-editor-web/docs/product-requirements/render-parity-reports/README.md
  - packages/engine/ai/vector-docmodel-rendering-recovery-task-list-2026-05-24.md
- Contract delta:
  - scripts 新增 resource-rate strict 入口并补齐防回归断言：
    - `report:render-parity-runtime-replay-history-gate:strict:resource-rate`
    - `report:render-parity-runtime-replay-batch-gate:strict:resource-rate`
  - resource-rate strict 历史门禁脚本增加专用产物清理前置（删除 `runtime-replay.resource-rate.batch.history.json` 与 `.gate.json`），避免历史残留快照污染 rolling 结果。
  - 默认 replay 输入样本 `sample-a/b` 补齐 `runtimeResourceDecodeStatus` 与 `runtimeResourceCompressionCodec` 字段，保证 resource-rate strict 零阈值验证可通过。
  - README 命令文档新增 resource-rate strict history/batch 两个入口与专用产物路径说明。
- Validation result:
  - replay-batch + replay-history-gate contracts: pass (`pnpm dlx tsx --test ...render-parity-runtime-replay-history-gate.contract.test.ts ...render-parity-runtime-replay-batch.contract.test.ts`, 33/33)
  - strict one-shot gate command: pass (`pnpm run report:render-parity-runtime-replay-batch-gate:strict`)
  - stage-strict one-shot gate command: pass (`pnpm run report:render-parity-runtime-replay-batch-gate:strict:stage`)
  - resource-rate strict one-shot gate command: pass (`pnpm run report:render-parity-runtime-replay-batch-gate:strict:resource-rate`)

### 12.28 Execution Evidence (W-009-08)

- Item:
  - W-009-08 (resource-rate strict artifact cleanup regression guard)
- Files changed:
  - apps/vector-editor-web/src/testing/product-specs/rendering/render-parity-runtime-replay-history-gate.contract.test.ts
  - apps/vector-editor-web/docs/product-requirements/render-parity-reports/README.md
  - packages/engine/ai/vector-docmodel-rendering-recovery-task-list-2026-05-24.md
- Contract delta:
  - 新增 package script 防回归断言：`report:render-parity-runtime-replay-history-gate:strict:resource-rate` 必须以 dedicated 产物 `rm -f` 预清理开头，并在同一命令中继续执行 history-gate CLI。
  - 断言预清理只针对 resource-rate 专用 history/gate 产物，禁止误清理默认 strict 产物路径。
  - README 补充 resource-rate strict 命令行为说明：执行前先清理 dedicated artifacts，避免 rolling 历史污染造成假失败。
- Validation result:
  - replay-history-gate contract: pass（含 resource-rate cleanup 脚本防回归断言）
  - resource-rate strict one-shot gate command: pass (`pnpm run report:render-parity-runtime-replay-batch-gate:strict:resource-rate`)

### 12.29 Execution Evidence (W-009-09)

- Item:
  - W-009-09 (stage-strict artifact cleanup symmetry hardening)
- Files changed:
  - apps/vector-editor-web/package.json
  - apps/vector-editor-web/src/testing/product-specs/rendering/render-parity-runtime-replay-history-gate.contract.test.ts
  - apps/vector-editor-web/docs/product-requirements/render-parity-reports/README.md
  - packages/engine/ai/vector-docmodel-rendering-recovery-task-list-2026-05-24.md
- Contract delta:
  - `report:render-parity-runtime-replay-history-gate:strict:stage` 脚本增加 dedicated stage history/gate 产物预清理，保证 strict one-shot 行为不受历史快照污染。
  - 新增 stage-strict cleanup 防回归断言：脚本必须以 dedicated `rm -f` 起始并继续执行 history-gate CLI，且不得误清理默认 strict 产物路径。
  - README 补充 stage-strict 预清理行为说明，明确该命令为确定性 strict 预设入口。
- Validation result:
  - replay-history-gate contract: pass（含 stage-strict cleanup 脚本防回归断言）
  - stage-strict one-shot gate command: pass (`pnpm run report:render-parity-runtime-replay-batch-gate:strict:stage`)
