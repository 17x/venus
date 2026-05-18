# Engine 生命周期链路、渲染优化审计与 3D 演进路线（2026-05-18）

## 1. 当前编辑器生命周期链路（从 UI 到引擎）

### 1.1 UI 启动与运行时装配

1. App 挂载编辑器页面：`App -> EditorFrame`。
2. `EditorFrameRuntime` 初始化本地布局状态、面板状态、交互上下文，并调用 `useEditorRuntime` 组装运行时。
3. Stage 层渲染 `StageCanvasLayer`，并由 runtime 提供画布事件（pointer、viewport pan/zoom/resize）。
4. 侧栏与工具栏通过同一 runtime 状态同步（不直接触达 engine）。

关键文件：

- apps/vector-editor-web/src/views/editorFrame/EditorFrame.tsx

### 1.2 Runtime 到 Engine Bridge

1. runtime 通过 `EngineRenderer` 组件进入 bridge 层。
2. `EngineRenderer` 内部拆分三条主线：
   - 生命周期：`useEngineRendererLifecycle`
   - 场景同步：`useEngineRendererSceneSync`
   - 视口提交：`useEngineRendererViewport`
3. `requestEngineRender` 统一走渲染调度器，按 `interactive | normal` 两种优先级入队。

关键文件：

- apps/vector-editor-web/src/runtime/engine-bridge/internal/engineRenderer/engineRenderer.tsx
- apps/vector-editor-web/src/runtime/engine-bridge/internal/engineRenderer/useEngineRendererLifecycle.ts
- apps/vector-editor-web/src/runtime/engine-bridge/internal/engineRenderer/useEngineRendererSceneSync.ts
- apps/vector-editor-web/src/runtime/engine-bridge/internal/engineRenderer/useEngineRendererViewport.ts

### 1.3 Engine 创建与帧循环

1. bridge 调用 `createEngine`，注入 canvas、settings、resource loader、debug onStats。
2. `createEngine` 启动时完成：
   - policy/bootstrap 解析
   - renderer backend 选择
   - scene store / visibility resolver / hit resolver 初始化
   - camera animation lifecycle 初始化
   - frame loop 初始化
3. loop 每帧执行：
   - `beforeRender`：camera animation tick
   - `resolveCreateEngineFrame`：策略、预算、QoS、shortlist、frame payload
   - `renderer.render`：提交后端绘制
   - `onStats`：回传诊断

关键文件：

- packages/engine/src/runtime/createEngine/createEngine.ts
- packages/engine/src/runtime/createEngineLoop/createEngineLoop.ts
- packages/engine/src/runtime/createEngine/createEngineFrameResolver.ts

### 1.4 Scene 同步与渲染触发

1. `prepareRenderFrame` 基于 revision、shape diff、camera dirty 计算 dirty state。
2. 命中 fast-path 时跳过 scene prep（viewport-only update）。
3. 结构变化走 `loadScene`，增量变化走 `applyScenePatchBatch`。
4. 结合 viewport 状态与策略决定是否立即 `scene-dirty` 渲染，或延后合并。

关键文件：

- apps/vector-editor-web/src/runtime/engine-bridge/internal/engineRenderer/useEngineRendererSceneSync.ts

### 1.5 Viewport 与 camera

1. pan/zoom/resize 在 bridge 侧按交互阶段选择直接提交或短动画提交。
2. engine 侧 `setViewport/panBy/zoomTo` 默认会终止当前动画并立即生效。
3. `start/update/stopCameraAnimation` 是独立路径，用于非连续输入或特定平滑过渡。

关键文件：

- packages/engine/src/runtime/createEngine/createEngineViewportFacade.ts
- apps/vector-editor-web/src/runtime/engine-bridge/internal/engineRenderer/useEngineRendererViewport.ts
- apps/vector-editor-web/src/runtime/engine-bridge/internal/engineRenderer/engineSceneProfile.ts

---

## 2. 渲染优化空间检查（当前代码基线）

## 2.1 已有优化能力

- 分层策略与相位：`pan/zoom/camera/settling/static`。
- 帧预算 broker：draw/upload/tile preload/overlay 分域预算。
- shortlist 候选裁剪、predictor 预取、settle sharpness 恢复。
- scene diff + 增量 patch + dirty bounds 局部无效化。

## 2.2 主要可优化点（按优先级）

P0：

1. 3D 可见性仍以 2D bounds 主路径驱动，frustum/occlusion 未在 createEngine 默认注入。
2. 2D 空间索引（RBush）仍是核心路径，3D 索引缺位。
3. WebGPU 执行栈仍是 hybrid（底层渲染复用 WebGL），无法释放 WebGPU 真收益。

P1：4. camera/interaction 预算是启发式阈值，缺少 GPU 时间闭环反馈。5. scene adapter 仍偏 2D affine/shape 语义，3D 数据通道薄弱。6. frame planner 对高速 3D 相机移动的动态遮挡与深度切片策略不足。

P2：7. profile 策略虽有 game/medical，但缺乏面向场景 SLA 的自动调优回路。8. overlay 与主 pass 在高压力场景仍有竞争关系，可继续隔离时序与预算。

---

## 3. 默认改为 WebGPU 是否可行、收益评估

结论：**当前不建议直接改默认 WebGPU**。

理由：

1. backend 默认值仍是 webgl。
2. `createWebGPUEngineRenderer` 当前为“WebGPU 初始化探测 + 共享 WebGL 实际渲染”模式，并非原生 WebGPU 渲染管线。
3. 在此实现下，默认切 WebGPU 的收益接近 0，甚至可能有轻微冷启动额外成本。

可行性与收益预估（以当前实现）：

- 可行性：中（功能上可切，但不是完整替代）。
- 性能收益：低（0% 到 5%，多数场景接近 0）。
- 稳定性风险：中（多一层 capability/probe 差异）。
- 维护成本：中高（双栈语义但单栈执行，易产生认知偏差）。

建议：

- 先完成 WebGPU 原生渲染主路径（几何上传、pass 编排、材质/灯光、资源生命周期、调试指标）后，再按设备能力灰度切默认。

---

## 4. 场景特性提炼（10+3D 场景 + 2D 编辑器 + 视频编辑器）

## 4.1 3D 应用场景（10）

1. 医疗影像三维重建与切片（CT/MRI）
2. 医疗术前规划与器械路径模拟
3. BIM/建筑三维协同审阅
4. 工业 CAD 装配与约束检查
5. GIS 地图 2D/3D 一体化浏览
6. 自动驾驶数字孪生回放
7. 城市级数字孪生监控大屏
8. 电商 3D 商品展示与变体切换
9. 教育/科研分子结构与体渲染
10. 游戏关卡编辑器与运行时同构预览

补充场景：11. 2D 矢量编辑器（当前主场景）12. 视频编辑器（时间轴 + 监看器 + 特效叠加）

## 4.2 从场景到能力抽象

通用特性：

- 高吞吐场景流式加载（geometry/texture/tile）
- 多维可见性裁剪（frustum + occlusion + LOD）
- 低延迟交互（相机、选取、拖拽、编辑）
- 稳定画质恢复（interaction -> settle）
- 预算驱动 QoS（帧时间、上传带宽、缓存）
- 可诊断性（可观测指标、回放、压测）

差异特性：

- 医疗：精度优先、切片/体绘制、测量与标注严谨性
- 地图：尺度跨越大、2D/3D 平滑切换、瓦片与矢量混合
- 游戏：高速移动、遮挡复杂、动画与粒子压力高
- 2D 编辑器：增量 patch、局部重绘、精准命中
- 视频编辑器：时间轴驱动、帧精确同步、多轨合成

---

## 5. Engine 需要改进的方面（基于场景抽象）

1. 空间索引体系从单一 2D R-tree 升级为 2D/3D 分层索引策略（3D 默认 BVH/八叉树）。
2. 可见性从 fallback-frustum-coarse 进化到 frustum + occlusion 真执行链。
3. 渲染后端：完成 WebGPU 原生主通路，剥离“WebGPU 名义 + WebGL 实际执行”的过渡形态。
4. 相机系统：补齐 3D 相机控制器（轨道/飞行/第一人称）与惯性策略模板。
5. 命中系统：2D 点选与 3D 射线命中统一抽象，支持体素/网格/实例级命中。
6. 预算系统：引入 GPU 时间与队列拥塞反馈，替代纯阈值启发式。
7. 资源系统：纹理/几何/中间缓冲统一 VRAM 预算管理与淘汰策略。
8. 场景适配：补齐 scene adapter 的 3D 数据语义（mesh/material/light/instance/animation）。
9. 跨场景 profile：医疗/地图/游戏/编辑器/视频编辑器建立 SLA 目标与策略模板。
10. 质量恢复：交互后锐化恢复路径与缓存一致性进一步收敛。
11. 工程治理：按文件职责拆分高复杂度模块，降低回归风险。
12. 验证体系：按场景建立基准集（相机轨迹、加载压力、命中正确率、视觉回归）。

---

## 6. 完整任务列表（可管理迭代）

执行状态图例：

- `[x]` 已完成
- `[-]` 进行中
- `[ ]` 未开始

当前进度快照（2026-05-18）：

- `[x]` 3D 索引库接入：`rbush-3d` 已替换 `rbush`
- `[x]` 空间索引契约升级：`EngineSpatialBounds` 支持 `minZ/maxZ`
- `[x]` createEngine 3D 可见性注入点：支持 `visibility.queryFrustum3D/queryFrustum3DOcclusion`
- `[x]` 3D 默认可见性主路径切换（默认注入 frustum coarse resolver，不再走 `fallback-frustum-coarse`）
- `[-]` scene store 空间维度分流：已支持 `spatial.dimension` 且默认 3D
- `[x]` 空间索引适配稳态化：`rbush-3d` API/类型对齐并通过 typecheck + engine tests
- `[-]` renderer 2D fallback 退耦：vector app 已关闭 model-complete canvas2d composite 路径
- `[x]` vector runtime 显式 3D 空间模式：`spatial.dimension = '3d'`
- `[x]` vector runtime 显式后端开关：profile 已支持 `webgl/webgpu`
- `[x]` scene/store 维度可观测化：diagnostics 已暴露 `scene.spatialDimension`（默认 3D，可显式 2D）
- `[x]` 命中链路可观测化：`hitPlan.resolutionPath` 已覆盖 point/ray-native/ray-fallback
- `[x]` createEngine 原生 3D 命中注入点：`hit.resolveRay3D` 已接入并完成诊断覆盖
- `[x]` runtime 命中策略可观测化：diagnostics 已暴露 `hit3dPolicy.hasRayResolver`
- `[x]` renderer 主链路 2D 兼容复合默认关闭：`modelCompleteComposite` 已改为显式 opt-in
- `[x]` A5 治理清单：见 `ai/operations/engine-epic-a-legacy-toggle-governance-2026-05-18.md`
- `[-]` B4 命中预算与 miss 分类：`hitPlan` 已暴露 ray 预算与 `rayMissClass`
- `[-]` B2/B6 可观测增强：`visibleSet` 已暴露 frustum 候选数与 occlusion 裁剪数
- `[-]` B3/B6 WebGPU 执行增强：已接入每帧原生 submit 尝试与累计诊断计数
- `[-]` B3/B6 WebGPU 测试底座增强：integration helper 已注入 fake `navigator.gpu` 与 fake `webgpu` context（用于稳定 native 路径回归）
- `[-]` B3 WebGPU 原生路径切口：空场景帧已支持 `native-clear-only` 通路（失败自动回退 hybrid）
- `[-]` B3 WebGPU rect-batch 迁移门禁：已暴露每帧 `rect-batch` 资格计数与拒绝原因
- `[-]` B3 WebGPU rect-batch 执行切口：rect 全量可用且 submit 成功时诊断路径标记为 `native-rect-batch`（当前仍保留 WebGL 呈现兜底）
- `[-]` B3 WebGPU native 初始化稳态化：新增 context-level adapter 回退与 render 时 lazy init，避免宿主跳过 init 导致 native 路径失效
- `[-]` B3 WebGPU rect-batch pass 执行：新增 dedicated native rect pass submit 分支（clearValue 可从首个 rect fill 解析）
- `[-]` B3 回归可验证性增强：integration fake WebGPU 已记录 pass/submit 命令摘要，并对 `native-rect-batch` 与 `native-clear-only` clearValue 做强断言
- `[-]` B3 staged native draw 执行：`native-rect-batch` 已追加 draw 调用骨架（按 rect 数推导 vertexCount），integration 断言已覆盖 draw 次数与顶点数
- `[-]` B3 staged native 绑定执行：rect 路径已补最小 pipeline/buffer/setPipeline/setVertexBuffer 调用并有独立 integration 测试断言
- `[-]` B3 模块治理：`renderer/webgpu/webgpu.ts` 已拆分为入口 + `webgpuNativeRuntime.ts`，规避超大文件持续膨胀
- `[-]` B3 staged indexed-draw：rect 路径已从 `draw` 迁移为 `setIndexBuffer + drawIndexed`（保留兼容 draw 回退），fake harness 断言已覆盖 indexed 调用/索引计数
- `[-]` B3 测试文件治理：`createEngine.integration.test.ts` 中 WebGPU 专项用例已收敛到 `webgpuNativePipeline.integration.test.ts`，避免主集成文件再次越过 500 行
- `[-]` B3 staged pipeline 复用：新增 format 维度 pipeline cache（`webgpuStagedRectPipeline.ts`），连续帧测试已验证首帧创建/次帧复用
- `[-]` B3 staged descriptor 强化：pipeline descriptor 已扩展到 `layout/vertex/fragment/primitive` 结构，cache key 增加 vertex-layout 维度，harness 与集成测试已新增 descriptor 级断言
- `[-]` B6 应用层诊断透传：runtime diagnostics payload 已补齐 WebGPU 原生 submit 与 rect-batch 字段
- `[ ]` WebGPU 原生主渲染路径
- `[ ]` 3D 命中/资源/诊断完备化

## 6.1 Epic A（必须）完全清除 2D 残留，向 3D 演变

A1. 建立 2D/3D 索引抽象层（SpatialIndexStrategy）

- 输出：统一索引接口 + 双实现桥接
- 验收：不改上层调用即可切换索引策略
- 状态：`[x]`（已完成契约层与适配层改造）

A2. 3D 树索引落地并替换 2D 库主路径

- 输出：3D 树索引实现（当前基线：`rbush-3d` R-tree），替代 2D 索引主路径
- 验收：3D 场景默认不再依赖 2D 索引库
- 状态：`[x]`（3D 主链路已切换 `rbush-3d`；BVH/八叉树下沉为后续性能增强项）

A3. 清理 2D 专用可见性默认分支

- 输出：createEngine 默认注入 frustum resolver
- 验收：3D 模式不再走 fallback-frustum-coarse
- 状态：`[x]`（已注入默认 frustum resolver，诊断 executionMode 已切换到 `frustum-only`）

A4. 分离 2D fallback 到兼容层

- 输出：2D 编辑器兼容包与 3D 主包职责拆分
- 验收：主引擎路径不被 2D fallback 反向污染
- 状态：`[x]`（主链路已默认关闭 2D model-complete 兼容复合，compat 路径改为显式 opt-in）

A5. 删除/降级 2D 历史兼容开关

- 输出：过渡开关治理清单与移除计划
- 验收：关键路径无 AI-TEMP 长驻兼容逻辑
- 状态：`[x]`（已产出治理清单与移除条件，并将关键兼容开关降级为默认关闭）

## 6.2 Epic B（必须）开发 3D 完备所有基础

B1. Camera 3D 完备化

- 轨道/飞行/FPS 控制器
- 透视/正交切换与动画过渡
- 相机状态快照与回放
- 状态：`[ ]`

B2. Visibility 3D 完备化

- frustum 粗裁剪
- 层级遮挡裁剪
- 动态 LOD 分层阈值
- 状态：`[-]`（frustum + occlusion 诊断计数已落地；层级遮挡策略与动态 LOD 阈值仍待补齐）

B3. Rendering 3D 完备化

- WebGPU 原生 pass 管线
- 材质/灯光基础模型（unlit/lit PBR-lite）
- 实例化渲染与批处理
- 状态：`[-]`（WebGPU 已具备每帧原生 submit 轻量通路与诊断计数，主渲染 pass 仍待替换）

B4. HitTest 3D 完备化

- raycast 到 mesh/instance
- 深度优先命中与选择优先级策略
- 高频交互下命中预算回退机制
- 状态：`[-]`（已完成 ray 命中预算与 miss 分类诊断；mesh/instance 与深度优先策略待补齐）

B5. Asset/Streaming 完备化

- mesh/texture 流式加载
- 资源优先级与取消策略
- 缓存与显存预算联动
- 状态：`[ ]`

B6. Diagnostics 完备化

- GPU 时间统计
- 各 pass 成本与预算命中率
- 场景级性能画像
- 状态：`[-]`（已补充命中与可见性关键计数观测；GPU 时间与场景画像仍待补齐）

## 6.3 Epic C WebGPU 默认切换准备

C1. WebGPU 原生执行覆盖率 >= 80%
C2. 与 WebGL 输出一致性回归（图像 diff）
C3. 设备分层灰度策略
C4. 默认切换开关与回滚机制

## 6.4 Epic D 场景化策略包

D1. 医疗 profile（精度优先）
D2. 地图 profile（尺度跨越 + 瓦片优先）
D3. 游戏 profile（高速交互 + 遮挡压力）
D4. 2D 编辑器 profile（增量编辑优先）
D5. 视频编辑器 profile（时间轴与监看器同步优先）

## 6.5 Epic E 工程治理与验证

E1. 基准与压测矩阵（12 场景）
E2. 可重复回放脚本（相机/输入/场景）
E3. 关键指标门禁（FPS、帧抖动、上传峰值、命中正确率）
E4. 文件形态治理（大文件拆分）

---

## 7. 迭代建议（6 个里程碑）

M1（2 周）：A1/A2 设计与最小实现，3D 索引在实验路径跑通
M2（2 周）：A3/A4，3D 默认可见性主链路切换
M3（3 周）：B1/B2，3D 相机 + 可见性闭环
M4（3 周）：B3/B4，WebGPU 主路径与 3D 命中闭环
M5（2 周）：B5/B6 + C1，资源/诊断完善
M6（2 周）：C2/C3/C4 + D/E，灰度切换与场景门禁

里程碑退出标准：

- 功能通过：契约测试 + 集成测试 + 压测
- 质量通过：渲染一致性 + 指标门禁
- 治理通过：无新增硬性文件形态违规

---

## 8. 风险与依赖

主要风险：

1. 2D 与 3D 并行期的回归面过大
2. WebGPU 原生路径开发与调试成本高
3. 场景策略收敛慢导致参数爆炸

关键依赖：

1. 统一 3D 测试场景与数据集
2. GPU 时间与内存观测能力接入
3. profile 策略 owner 明确

---

## 9. 本轮决策建议

1. 立即启动 Epic A + Epic B 的 P0 子任务。
2. 在 C1 达标前，不建议把默认 backend 改为 WebGPU。
3. 以 12 场景基准矩阵驱动后续每个里程碑验收。
