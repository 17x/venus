# @venus/engine 开发计划与任务管理

Status: Draft task plan
Date: 2026-05-19
Inputs: `ai/refactor.md`, `ai/draft.md`, `ai/AI_HIGHEST_STANDARD.md`, `.github/copilot-instructions.md`
Scope: `packages/engine`, with dependency-boundary impact on `packages/lib`, apps, and future runtime/platform packages.

## 1. Executive Summary

`@venus/engine` 的长期定位不应是 canvas editor renderer，也不应只是 2D/3D renderer。它应演进为 cross-platform graphics runtime，也就是面向大规模场景、低延迟交互、可观测调度、资源驻留、流式加载、多后端渲染、headless/worker 运行的 realtime runtime platform。

核心建议是把当前偏 `scene -> renderer -> backend` 的执行模型，逐步收敛为：

```txt
Document Runtime
↓
Compilation / Incremental Invalidation
↓
Runtime ECS / Simulation
↓
Visibility / Picking / Spatial
↓
Extraction
↓
Render Planning / Composition
↓
Render Execution / GPU Resource
↓
Backend / Presentation
```

近期不建议一次性按 `draft.md` 创建所有目录。正确做法是以当前代码基线为约束，按“契约先行、切分过载模块、替换真实路径、移除旧逻辑”的方式推进。每个 Epic 都必须包含 CHANGE REQUEST、类型契约、测试设计、实现、验证、清理检查。

## 2. Architecture Principles

### 2.1 Must Keep

- Engine 是 runtime kernel，不依赖 React、DOM、app、editor UI。
- Engine 只允许依赖 `@venus/lib`，不能反向依赖 app/editor-primitive。
- React/app 只订阅 runtime snapshot，通过 adapter/facade 调用 engine。
- Document State、Runtime State、Render State、GPU State 必须分离。
- Renderer backend 必须可替换，WebGPU/WebGL/Canvas2D/Headless 不泄漏到高层 API。
- Interaction、picking、visibility、render planning、resource residency 必须是独立 runtime concern。
- 所有新增/修改 TypeScript 契约必须先定义语义注释，函数参数必须有 JSDoc `@param`。

### 2.2 Must Avoid

- 不要把业务场景写进 engine，例如 `if (medical)`、`if (gis)`。
- 不要让 document node 直接 render。
- 不要让 pointer event 直接 mutate scene 后全量 redraw。
- 不要创建 `v2/new/temp/helpers/utils` 式并行实现。
- 不要一次性铺空目录或 placeholder 文件。
- 不要让 WebGPU 长期停留在“名义 WebGPU + WebGL 实际执行”的状态。

## 3. Target Layer Map

目标结构按责任拆分，而不是一次性目录迁移：

| Layer            | Responsibility                                      | Current Anchor                                | Target Action                                                       |
| ---------------- | --------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------- |
| API facade       | Public engine API and stable contracts              | `src/index.ts`, `src/runtime/createEngine`    | Freeze external facade before deeper refactors                      |
| Document         | Persistent graph, version, transaction, history     | mostly app-side / scene patch path            | Add explicit engine document contracts only when runtime needs them |
| Compiler         | Document/change-set to runtime representation       | scene sync and runtime resolver paths         | Introduce incremental compiler boundary                             |
| Runtime ECS      | Cache-local runtime state and systems               | `src/scene`, `src/runtime`, `src/types`       | Extract runtime-world contracts before broad ECS rewrite            |
| Spatial          | 2D/3D index, bounds, coarse queries                 | `src/spatial`, visibility/hit paths           | Finish 3D-first strategy and benchmark it                           |
| Visibility       | Visible sets, LOD, ROI, predictive visibility       | `src/visibility`, frame resolver              | Make visibility viewport-scoped and measurable                      |
| Picking          | Broad/narrow phase, penetration stack, GPU optional | hit resolver paths                            | Split from interaction and renderer semantics                       |
| Interaction      | input normalization, gesture arena, tool dispatch   | app bridge + `src/interaction`                | Keep DOM handling outside engine; define runtime contracts          |
| Extraction       | Runtime world to render world/packets               | renderer/frame resolver paths                 | Add explicit extraction output contracts                            |
| Composition      | Layer stack, surfaces, dirty regions, tile caches   | layered renderer concepts                     | Convert base/active/overlay into layer runtime                      |
| Render planning  | QoS, tile scheduling, partial redraw, LOD           | frame planner/budget paths                    | Move policy decisions out of renderer execution                     |
| Render execution | backend command submission and uploads              | `src/renderer`, `src/gpu`                     | Split WebGPU native path from WebGL fallback                        |
| Resources        | asset/resource handles, lifetime, residency         | `src/resource`, `src/assets`, `src/gpu`       | Add resource graph once upload/residency pressure requires it       |
| Observability    | trace, metrics, replay, diagnostics                 | `src/debug`, stats payloads                   | Promote diagnostics into runtime observability                      |
| Platform/runtime | clock, frame, worker, headless adapters             | `src/platform`, `src/worker`, `src/scheduler` | Keep platform abstraction graphics + input + worker ready           |

## 4. Current Gap Assessment

当前 `packages/engine/src` 已有 `core`, `runtime`, `renderer`, `render`, `gpu`, `resource`, `scene`, `spatial`, `visibility`, `interaction`, `worker`, `platform` 等基础目录。它已经不是从零开始，主要问题是边界还没有完全按最终执行模型切开：

- `renderer/render/runtime` 之间仍可能混合 orchestration、planning、execution、fallback。
- 3D/WebGPU 已有迁移切口，但 WebGPU 原生主渲染路径尚未完全替代 hybrid fallback。
- Document/Compiler/Extraction/Composition 是下一代架构最关键的缺层。
- Interaction 与 app bridge 仍需明确 input collection、gesture、tool、command、transaction 的边界。
- Picking 需要从“命中工具函数”升级为 broad phase/narrow phase/penetration/gpu optional pipeline。
- Resource residency、upload pressure、tile cache、streaming priority 需要统一成 resource graph 或 resource runtime。

## 5. Execution Protocol for Every Task

每个具体代码任务必须按以下顺序执行，不能跳步：

1. Scope Definition: 说明目标模块、非目标模块、依赖边界。
2. Type Definition: 先定义/调整公开契约、内部数据结构和语义注释。
3. CHANGE REQUEST: 写入任务记录或 PR 描述。
4. Test Design: 明确 typecheck、unit、integration、snapshot/perf/diagnostic gate。
5. Implementation: 最小替换路径，删除被替代逻辑。
6. Validation: 执行相关检查，不把失败留给后续任务。
7. Cleanup Check: 删除死分支、收敛兼容开关、检查文件长度和职责。

CHANGE REQUEST 模板：

```txt
[CHANGE REQUEST]

Target:
- File / Module:

Goal:
- Problem being solved:

Change Type:
- Add / Modify / Remove

Impact:
- Affected modules:

Cleanup:
- Old logic to remove:

Tests:
- Tests to add/update:
```

## 6. Roadmap

### Phase 0: Governance and Baseline Lock

Goal: 防止架构迁移过程中继续积累混合职责。

Tasks:

- [ ] 生成 engine module ownership map，标记 `renderer/render/runtime/gpu/resource/visibility/spatial/interaction` 的责任边界。
- [ ] 建立 architecture decision log，记录 Document/Compiler/Extraction/Composition 是否进入 engine 主包、何时进入。
- [ ] 为 WebGPU native、3D spatial、picking、layer runtime 建立独立 regression checklist。
- [ ] 审查文件形态，列出接近 500 行且多责任的文件，按风险排序。
- [ ] 将现有 2D compatibility 开关分为 permanent compatibility、migration fallback、diagnostic-only 三类。

Acceptance:

- 每个后续 Epic 都能链接到一个明确 CHANGE REQUEST。
- 无新增 `v2/new/temp/helpers/utils` 文件。
- 无新增跨层反向依赖。

### Phase 1: Public Runtime Contract Stabilization

Goal: 先稳定外部 API 和 runtime facade，避免后续重构破坏 app。

Tasks:

- [ ] 明确 `createEngine` 的 backend、spatial、visibility、hit、diagnostics、resource loader 契约。
- [ ] 定义 backend selection 策略：`auto -> WebGPU native eligible -> WebGL -> Canvas2D/headless`。
- [ ] 将 WebGPU hybrid fallback 的诊断字段标准化：native eligibility、submit path、fallback reason、upload count。
- [ ] 明确 scene update API：full load、patch batch、transaction/change-set 的边界。
- [ ] 明确 engine stats snapshot 的稳定字段和 experimental 字段。

Acceptance:

- app 只依赖 public facade，不导入 engine private path。
- diagnostics 能区分 native WebGPU、hybrid fallback、WebGL、Canvas2D/headless。
- typecheck、engine tests、相关 app bridge tests 通过。

### Phase 2: Spatial, Visibility, and Picking Foundation

Goal: 让大场景渲染和交互不再依赖线性遍历或 2D-only 假设。

Tasks:

- [ ] 完成 2D/3D spatial strategy contract：AABB/OBB/ray/frustum/tile query。
- [ ] 将 visibility context 改为 viewport-scoped，支持 camera、overscan、LOD、visible set diagnostics。
- [ ] 建立 picking pipeline：BroadPhase -> CandidateSet -> NarrowPhase -> PriorityResolution -> HitStack。
- [ ] 支持 penetration hit test：top hit 与 all hits 都可由同一 pipeline 输出。
- [ ] 把 vector path hit testing 接入 flatten cache、zoom tolerance、stroke/fill priority。
- [ ] 为 3D mesh/instance ray hit 提供 native resolver contract，fallback 必须可观测。

Acceptance:

- 大量对象命中不走 full scene traversal。
- picking 与 visibility 共享 visible set/projected bounds/tile visibility 时不重复做全量索引遍历。
- 2D vector、3D ray、overlay handle 命中路径均有 unit/integration 覆盖。

### Phase 3: Extraction Boundary

Goal: renderer 不再直接遍历 runtime scene state，GPU execution 只消费 extracted render state。

Tasks:

- [ ] 定义 `ExtractionContext`, `ExtractedScene`, `ExtractedCamera`, `ExtractedMesh`, `ExtractedText`, `ExtractedOverlay`, `RenderWorld`。
- [ ] 从当前 frame resolver/renderer 中抽出 extraction 输入输出边界。
- [ ] 将 visibility result 转为 extraction candidate set。
- [ ] 将 material/geometry/text/overlay extraction 拆成独立小模块。
- [ ] 添加 extraction diagnostics：candidate count、packet count、batch count、skipped reason。

Acceptance:

- render execution 不读取 document node 或 app-side shape model。
- extraction output 可被 WebGL/WebGPU/headless backend 复用。
- extraction unit tests 验证 deterministic output。

### Phase 4: Composition and Layer Runtime

Goal: 把 base/active/overlay 升级为 layer runtime，而不是硬编码 draw order。

Tasks:

- [ ] 定义 `RenderLayer`, `LayerStack`, `LayerSurface`, `LayerInvalidation`, `LayerPolicy`, `LayerCompositor`。
- [ ] 建立默认 layer profile：Background, Document, Interaction, Selection, Overlay, Debug, Presentation。
- [ ] 每个 layer 独立拥有 dirty region、visibility state、cache state、redraw policy、upload policy。
- [ ] 将 interaction layer 与 document layer 的重绘预算分离。
- [ ] 支持 viewport-specific layer stack，用于 minimap/split view/XR stereo 的未来扩展。

Acceptance:

- 拖拽/hover/selection 不触发 stable document layer 全量重绘。
- overlay budget 不与主 document render pass 无控制竞争。
- layer invalidation 有诊断输出和 regression tests。

### Phase 5: WebGPU Native Render Path

Goal: WebGPU 从 probe/hybrid fallback 进化为原生主渲染路径。

Tasks:

- [ ] 完成 native WebGPU rect/vector batch pipeline：buffer upload、pipeline cache、bind group、draw indexed。
- [ ] 将 geometry/material/resource upload 从 WebGL fallback 中剥离。
- [ ] 引入 GPU resource lifetime：deferred destroy、transient buffers、persistent buffers、upload queue。
- [ ] 建立 WebGPU pass graph 最小闭环：clear、document pass、overlay pass、presentation。
- [ ] 灰度 backend auto 选择：只有 native path 通过 eligibility gate 才可默认选择 WebGPU。

Acceptance:

- WebGPU path 能独立绘制核心 2D/3D primitives，不依赖 WebGL 实际提交。
- fallback reason 可观测且有测试覆盖。
- 默认切 WebGPU 前必须有性能收益数据和稳定性报告。

### Phase 6: Incremental Document and Compiler Runtime

Goal: 建立 Document -> ChangeSet -> IncrementalCompiler -> RuntimeWorld 的明确链路。

Tasks:

- [ ] 定义 engine-level document contracts：DocumentId、DocumentNodeRef、DocumentVersion、DocumentRevision、ChangeSet、DeltaPatch。
- [ ] 区分 app authoring state 与 engine document/runtime state。
- [ ] 引入 transaction/change-set 到 scene patch 的桥接层。
- [ ] 定义 IncrementalCompiler：transform、geometry、material、visibility、picking、GPU upload invalidation。
- [ ] 为 undo/redo、replay、collab 预留 command buffer 数据边界，但不提前实现完整 CRDT。

Acceptance:

- document mutation 生成细粒度 invalidation，而不是 global rebuild。
- compiler output 可增量同步 runtime world。
- replay/deterministic tests 能重放同一 change-set 并产生一致 extraction output。

### Phase 7: Scheduler, Policy, Budget, and Pressure

Goal: 从 renderer-centric orchestration 转为 scheduler-centric runtime orchestration。

Tasks:

- [ ] 定义 frame phase：Input, Simulation, Extraction, Render Planning, GPU Execution, Presentation。
- [ ] 建立 budget domains：CPU, GPU, Upload, Streaming, Tile Build, Visibility, Interaction, Text Layout。
- [ ] 建立 policy graph：constraints、priorities、fallback、degradation、profile specialization。
- [ ] 将 interaction latency 策略独立于 visual completeness 策略。
- [ ] 引入 pressure signals：memory, GPU, upload, visibility, thermal, worker queue。

Acceptance:

- 高压力场景可通过 policy 降级，而不是散落 `if` 分支。
- 预算决策可在 diagnostics 中追踪。
- 交互阶段可延迟 expensive redraw/upload，并在 settle 后恢复质量。

### Phase 8: Resource Graph and Streaming

Goal: 把 asset/resource/upload/residency/eviction 统一成 runtime resource system。

Tasks:

- [ ] 定义 ResourceHandle、ResourceNode、ResourceEdge、ResidencyGraph、LifetimeGraph、UploadGraph。
- [ ] 建立 texture/geometry/tile/text glyph resource residency policy。
- [ ] 将 tile cache 与 streaming priority 接入 visibility prediction。
- [ ] 实现 upload throttling 和 deferred destruction。
- [ ] 建立 memory/upload pressure regression tests。

Acceptance:

- 大场景 pan/zoom 不产生不可控 upload bursts。
- tile/geometry/texture eviction 有可解释策略。
- streaming/refinement 可以在预算内渐进完成。

### Phase 9: Observability and Deterministic Replay

Goal: 让 runtime 内部执行链路可诊断、可回放、可压测。

Tasks:

- [ ] 把 diagnostics 升级为 observability contracts：Trace, Metric, Counter, TimelineEvent, FrameCapture, RuntimeReplay。
- [ ] 暴露 invalidation propagation、tile rebuild、visibility cost、extraction cost、GPU stalls、upload bursts。
- [ ] 建立 deterministic replay harness：input sequence + document changes + viewport path + expected diagnostics。
- [ ] 建立 scenario benchmark：vector massive scene、3D mesh scene、GIS tile scene、video composition mock。

Acceptance:

- 每次核心 runtime 改动都能通过 replay 定位行为差异。
- performance regression 有基线和阈值。
- debug data 不泄漏 app/private backend coupling。

## 7. Recommended Epic Backlog

### Epic A: Engine Boundary Audit

Priority: P0

Deliverables:

- `packages/engine` import boundary report。
- renderer/runtime/gpu/resource/spatial/visibility responsibility map。
- 文件拆分候选清单。

Validation:

- `pnpm --filter @venus/engine test`
- repo import governance check, if available

### Epic B: WebGPU Native Main Path

Priority: P0

Deliverables:

- Native WebGPU rendering path for core primitive batches。
- WebGL fallback isolated behind explicit fallback reason。
- Diagnostics and integration fake harness coverage。

Validation:

- Native path unit/integration tests。
- Fallback path tests。
- Performance comparison before backend default change。

### Epic C: Picking Runtime Split

Priority: P0

Deliverables:

- `picking` contracts for broad/narrow/penetration。
- 2D vector and 3D ray hit pipelines。
- Layer-specific picking contexts。

Validation:

- Dense overlap hit-stack tests。
- Zoom-aware path hit tests。
- 3D ray miss classification tests。

### Epic D: Layer Runtime and Partial Redraw

Priority: P1

Deliverables:

- Layer runtime contracts。
- Document/Interaction/Overlay independent invalidation。
- Dirty region and tile redraw diagnostics。

Validation:

- Drag/hover does not rebuild document layer。
- Pan/zoom overscan prevents blank edge regions。
- Overlay redraw remains budget-isolated。

### Epic E: Extraction Layer

Priority: P1

Deliverables:

- Extracted render world contracts。
- Render packets generated from runtime visible set。
- Backend-independent extraction tests。

Validation:

- Deterministic extraction snapshots。
- WebGL/WebGPU share extracted input。

### Epic F: Incremental Compiler and Document Runtime

Priority: P1

Deliverables:

- ChangeSet/DeltaPatch contracts。
- Document transaction to runtime invalidation bridge。
- Compiler cache and invalidation categories。

Validation:

- Small mutations avoid full scene rebuild。
- Replay test produces stable runtime state。

### Epic G: Resource Graph and Upload Pressure

Priority: P2

Deliverables:

- Resource graph contracts。
- Upload budget and deferred destruction。
- Residency metrics。

Validation:

- Upload burst regression tests。
- Memory pressure eviction tests。

### Epic H: Multi-Viewport Runtime

Priority: P2

Deliverables:

- Viewport owns Camera, VisibilityContext, PickingContext, InteractionContext, LayerStack, CompositionSurface。
- Shared resources remain separate from viewport-local interaction state。

Validation:

- Split viewport test。
- Minimap/offscreen rendering test。

## 8. Directory Evolution Strategy

Do not create all future directories immediately. Create a directory only when a real contract or implementation lands.

Recommended staged structure:

```txt
packages/engine/src/
├── api/                # public facade, when extracted from index/runtime
├── document/           # add after ChangeSet/DocumentVersion contract is needed
├── compiler/           # add with IncrementalCompiler boundary
├── extraction/         # add before renderer stops reading runtime scene directly
├── composition/        # add with layer runtime contracts
├── picking/            # add when broad/narrow/penetration split lands
├── render-planning/    # add when QoS/tile/LOD decisions leave renderer execution
├── render-execution/   # add when WebGPU/WebGL submission split is concrete
├── resource-graph/     # add when residency/upload graph is concrete
├── observability/      # add when diagnostics contracts expand beyond debug stats
└── view/               # add when viewport-local runtime state becomes explicit
```

Existing directories should be migrated by responsibility, not renamed wholesale.

## 9. Testing and Validation Matrix

| Area        | Required Tests                                 | Notes                                        |
| ----------- | ---------------------------------------------- | -------------------------------------------- |
| Public API  | Type-level and facade integration tests        | Prevent app/private coupling                 |
| Spatial     | 2D/3D query correctness, bounds edge cases     | Include huge coordinates and z ranges        |
| Visibility  | viewport-scoped visible set, LOD, overscan     | Prevent blank panning/zooming                |
| Picking     | broad/narrow, penetration, miss classification | Include overlapping shapes and 3D ray        |
| Extraction  | deterministic render packet snapshots          | Same input must produce same output          |
| Composition | layer invalidation and dirty region tests      | Interaction must not rebuild document layer  |
| WebGPU      | native path, fallback path, upload path        | Do not default WebGPU before native evidence |
| Scheduler   | budget arbitration, pressure fallback          | Verify degradation reason                    |
| Resource    | upload throttling, eviction, deferred destroy  | Protect large scene stability                |
| Replay      | input + document + viewport sequence           | Required for long-term regression control    |

Recommended commands per engine task:

```txt
pnpm --filter @venus/engine test
pnpm --filter @venus/engine cr:check
pnpm --filter @venus/engine debug:guard
pnpm typecheck
pnpm lint
```

Use the narrowest relevant command first, then broader gates before handoff.

## 10. Risk Register

| Risk                                    | Impact                             | Mitigation                                                   |
| --------------------------------------- | ---------------------------------- | ------------------------------------------------------------ |
| Big-bang architecture rewrite           | High regression risk               | Contract-first staged migration                              |
| WebGPU default too early                | Low benefit, medium stability risk | Native eligibility gate and perf report                      |
| Renderer god object grows               | Hard-to-debug runtime coupling     | Split planning/extraction/execution by real responsibilities |
| Document/runtime state coupling         | Undo/replay/collab instability     | ChangeSet and compiler boundary                              |
| Picking duplicates visibility traversal | Latency collapse at scale          | Shared visible/projected bounds contracts                    |
| Layer invalidation storms               | Blank regions or frame spikes      | Dirty region diagnostics and tile scheduling                 |
| Resource lifetime leaks                 | Memory/GPU pressure                | Resource graph, deferred destruction, pressure tests         |
| Policy explosion                        | Scenario-specific branches         | Policy graph and profile constraints                         |

## 11. Near-Term Recommendation

Recommended next 5 tasks:

1. Finish WebGPU native main path until it can render core primitives without WebGL execution。
2. Split picking into explicit broad/narrow/penetration pipeline, because it is shared by interaction, selection, snapping, and 3D ray picking。
3. Add extraction contracts before more renderer features land, to stop renderer/runtime coupling from hardening。
4. Convert current base/active/overlay model into minimal layer runtime with dirty regions and independent budgets。
5. Create a scenario replay harness for vector massive scene + 3D camera path + WebGPU fallback diagnostics。

Defer for later:

- Full CRDT/document collaboration implementation。
- Full physics/volume/GIS/video modules inside engine。
- Complete resource graph until upload/residency pressure has measurable baseline。
- Default WebGPU auto selection until native path has stable coverage and performance data。

## 12. Working Definition of Done

An engine architecture task is complete only when:

- Contract is documented before implementation。
- CHANGE REQUEST is present。
- Old replaced logic is removed or explicitly governed with `AI-TEMP:` removal condition。
- Tests cover both new path and fallback path。
- Diagnostics expose path selection and failure reason。
- Typecheck/lint/relevant tests pass。
- File responsibility and length constraints are still satisfied。
- No dependency boundary violation is introduced。
