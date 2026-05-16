# Engine 渲染优化任务追踪

> 目标：对标游戏渲染器、动画渲染器、医疗3D展示、超大数据可视化等工业级最佳实践，优化 engine 渲染链路，确保动画/交互期间画质与响应性无损。

## CHANGE REQUEST（2026-05-16 / LOD-Tile Budget Adaptive）

[CHANGE REQUEST]

Target:

- File / Module: runtime/createEngine/frameBudgetBroker, runtime/createEngine/createEngine

Goal:

- Problem being solved: 交互期预算收缩过猛导致tile预取不足，出现边缘空白与恢复抖动。

Change Type:

- Modify

Impact:

- Affected modules: frame budget broker, predictor-to-budget wiring, strategy diagnostics.

Cleanup:

- Old logic to remove: 无需删除模块，收敛为自适应预算规则并保留兼容接口。

Tests:

- Tests to add/update: frameBudgetBroker.test 增加交互期最小预取保障与高置信预测加速断言。

## CHANGE REQUEST（2026-05-16 / Interactive Critical Upload Lane）

[CHANGE REQUEST]

Target:

- File / Module: renderer/webgl/webgl, renderer/webgl/runtime/textures, runtime/createEngine/frameBudgetBroker

Goal:

- Problem being solved: 交互期纹理上传全冻结导致关键文本/图标可读性下降。

Change Type:

- Modify

Impact:

- Affected modules: WebGL packet loop, image texture resolver, frame budget broker.

Cleanup:

- Old logic to remove: 交互期文本无条件fallback分支；改为仅非关键包fallback。

Tests:

- Tests to add/update: frameBudgetBroker.test 更新交互期微预算断言；保持类型检查与预测策略测试通过。

## 分阶段重设计任务列表（对标工业级最佳实践）

### 1. 需求与场景调研

- [ ] 汇总图标渲染器、游戏引擎、动画渲染器、医疗3D、大数据可视化等典型场景的渲染需求与性能瓶颈
- [ ] 梳理各场景下的交互模式、画质要求、响应时延、数据量级、平台兼容性等核心指标

### 2. 架构与模块重构

- [ ] 设计分层渲染架构（UI/图标层、主场景层、特效/动画层、诊断/辅助层等）
- [ ] 明确渲染主循环与任务调度机制，支持多源输入、优先级、帧同步
- [ ] 抽象渲染后端接口，兼容WebGL2/WebGPU/CPU fallback

### 3. 画质与性能策略

- [x] 动画期间强制 full-quality 渲染实验开关（已完成，详见 strategy.ts forceFullQualityDuringCameraAnimation）
- [~] LOD/Tile/分块/多级缓存策略工业级优化（进行中，已落地交互期最小预取保障 + 高置信高速预取增强）
- [ ] 支持动态分辨率、抗锯齿、区域优先渲染、GPU Instancing
- [ ] 实现渐进式/分阶段渲染，支持大数据量/超大场景的流式加载与可视化

#### 已落地（2026-05-16）

- 在 frame budget broker 中加入 predictor 信号（confidence/speed）参与预算决策。
- 交互期（pan/zoom/camera）在中高压下保留最小 tile preload 上传槽，降低边缘空白概率。
- 高置信高速移动时提升 tile preload 预算与上传数量，提升大场景连续移动稳定性。
- Pan 预测队列从固定 overscan/固定预测窗口升级为 predictor 驱动的动态策略（前向优先、窗口自适应）。
- 交互期新增关键纹理上传通道：关键文本/图标可在微预算下上传，其余包继续走fallback以保障帧率。
- 新增 ROI（中心视区）优先锐化预取：预取队列按视区中心距离排序，预算受限时优先锐化中心区域。

### 4. 动画与交互体验

- [ ] 支持骨骼动画、插值、帧缓存等动画渲染器常用技术
- [ ] 优化输入事件到渲染帧的响应链路，确保“所见即所得”
- [ ] 实现高并发交互下的帧丢弃/降级/恢复机制，保障主体验流畅

### 5. 诊断与可观测性

- [ ] 内置帧率、延迟、内存、带宽等多维度诊断面板
- [ ] 支持渲染链路trace、慢帧/丢帧/降级自动标记与回溯
- [ ] 提供可插拔的性能/画质/交互体验A/B测试与对比工具

### 6. 文档与最佳实践沉淀

- [ ] 补充详细注释与设计文档，明确各类工业级渲染场景的关键技术点与取舍
- [ ] 持续跟踪业界新技术，定期review与演进架构

---

## 参考方向

- 游戏引擎（Unity/Unreal）实时渲染、分层/分区/分块、帧同步、抗锯齿、动态 LOD
- 动画渲染器（Spine/DragonBones）插值、骨骼动画、帧缓存
- 医疗3D（VTK/OsiriX）多分辨率、GPU/CPU 混合渲染、区域优先
- 大数据可视化（deck.gl/Kepler.gl）分块加载、渐进渲染、GPU Instancing

---

> 任务推进请同步更新本文件。
