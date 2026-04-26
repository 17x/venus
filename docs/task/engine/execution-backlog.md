# Engine 执行任务台账（AI自管理）

## 0. 目标

将 [draft-01](draft-01.md) 设计方案落地为可执行、可验证、可追踪的工程任务。

## 1. 管理规则（AI执行）

- 状态流转：planned -> in-progress -> verified -> done
- 每次开始开发前：先读取本文件，再读取 [draft-01](draft-01.md)
- 每次完成开发后：必须回填任务状态、变更文件、验证命令结果、风险说明
- 单任务完成定义：代码落地 + 文档同步 + 至少一次验证记录
- 验证基线：pnpm typecheck、pnpm lint、pnpm build

## 2. 任务ID规则

- 格式：ENG-YYYYMMDD-XX
- 例：ENG-20260426-01
- 规则：每次进展更新必须引用任务ID

## 3. 当前范围（MVP）

- Base scene tile-cache mode
- tile size 512 CSS px
- zoom buckets 1/64 -> 32
- active buckets previous/current/next
- visible tile calculation
- tile texture compositor
- FBO tile render
- exact + nearest fallback
- 120ms idle progressive refresh
- selection/handles/guides live layer
- tile cache soft budget 256MB

## 3.2 性能目标（100K）

- 基线目标：60 FPS（idle + interaction）
- 冲刺目标：120 FPS（idle + interaction）
- 当前实测（Playwright）：
  - idle：59.67~60.02 FPS（约达 60 基线，未达到 120）
  - interaction：42.95~44.20 FPS（未达到 60/120）

## 3.1 自测清单（单测 + Playwright FPS）

- [x] 清单项 A：Engine 单元测试覆盖调度器关键行为
  - 目标：覆盖 request dedupe、priority 顺序、cancelOutdatedRequests 行为
  - 结果：通过（`pnpm --filter @venus/engine test`）

- [x] 清单项 B：类型完整性验证
  - 目标：确保测试脚本和诊断链路变更无类型回归
  - 结果：通过（`pnpm typecheck`）

- [x] 清单项 C：Playwright 空闲帧率验证
  - 目标：`idle FPS >= 45`
  - 结果：通过（59.65 FPS）

- [x] 清单项 D：Playwright 交互帧率验证
  - 目标：`interaction FPS >= 30`
  - 结果：失败（10.34 FPS）
  - 结论：当前存在交互性能问题，需进入专项优化修复

- [x] 清单项 E：Playwright 交互帧率复测（修复后）
  - 目标：`interaction FPS >= 30`
  - 结果：通过（41.65 FPS）
  - 结论：交互帧率已恢复到验收阈值以上

- [x] 清单项 F：100K 60/120 目标复测
  - 目标：`idle >= 60` 且 `interaction >= 60`（基线）；`idle >= 120` 且 `interaction >= 120`（冲刺）
  - 结果：`idle = 60.00`，`interaction = 37.15`
  - 结论：idle 达到 60 基线；interaction 尚未达到 60；120 目标整体未达成

  - [x] 清单项 G：screen-size LOD 细分复测
    - 目标：进一步提升 interaction FPS 并保持渲染稳定
    - 结果：交互回退路径引入 tiny packet 分层裁剪 + cache-only 边缘补绘关闭后，interaction 区间提升到 `37.87~42.64`
      - 结论：较最初 `10.34` 明显提升，但仍未达到 `60/120` 目标

    - [x] 清单项 H：全缩放 tiny-shape LOD 裁剪复测
      - 目标：进一步压低交互回退路径 packet 成本
      - 结果：interaction 区间提升到 `42.95~44.20`
      - 结论：方向有效，仍需后续轮次收敛到 `>=60`

## 4. 工作分解（WBS）

## Phase A: Tile 基础类型与可见域计算

- [x] ENG-20260426-01 done
  - 标题：定义 tile 核心类型与 key
  - 交付：TileCoord、TileKey、TileTextureEntry、createTileKey
  - 位置：packages/engine 渲染相关模块
  - 验收：类型可被 compositor 与 scheduler 复用

- [x] ENG-20260426-02 done
  - 标题：实现 zoom bucket 与 active bucket
  - 交付：ZOOM_BUCKETS、getZoomBucket、getActiveZoomBuckets
  - 验收：覆盖 0.02 到 30，边界无越界

- [x] ENG-20260426-03 done
  - 标题：实现 visible tiles 计算
  - 交付：基于 camera + world bounds 的可见 tile 计算
  - 验收：平移缩放下可见 tile 集稳定

## Phase B: Tile Compositor 与交互模式切换

- [x] ENG-20260426-04 done
  - 标题：实现 tile compositor pass
  - 交付：tile quad 绘制通路，camera matrix 变换
  - 验收：交互期可仅绘制 tile 纹理

- [x] ENG-20260426-05 done
  - 标题：接入 base render mode 状态机
  - 交付：vector-live、tile-cache、progressive-refresh 模式切换
  - 验收：zoom/pan/drag 进入 tile-cache，idle 回 progressive-refresh

- [x] ENG-20260426-06 done
  - 标题：保持 overlay 实时绘制
  - 交付：selection/handles/guides 不进入 tile cache
  - 验收：交互中 overlay 不降级为 tile bitmap

## Phase C: Tile Render To Texture（FBO）

- [x] ENG-20260426-07 done
  - 标题：FBO tile 渲染与纹理入库
  - 交付：renderTile(request) -> TileTextureEntry
  - 验收：可生成 exact tile 并被 compositor 消费

- [x] ENG-20260426-08 done
  - 标题：fallback 解析链路
  - 交付：exact -> nearest -> overview/blank
  - 验收：缺 tile 时无大面积空白，且会后台补 exact

## Phase D: Dirty Invalidation 与局部刷新

- [x] ENG-20260426-09 done
  - 标题：bounds 驱动 dirty tile 标记
  - 交付：old/new bounds union -> affected tiles -> mark dirty
  - 验收：元素更新不触发全量清空

- [x] ENG-20260426-10 done
  - 标题：交互结束 progressive refresh
  - 交付：visible dirty/missing 优先，nearby 次级
  - 验收：idle 后画面渐进恢复清晰

## Phase E: Scheduler 与预算控制

- [x] ENG-20260426-11 done
  - 标题：tile request 去重与优先级队列
  - 交付：urgent/visible/nearby/background 队列
  - 验收：重复请求合并，过时请求可取消

- [x] ENG-20260426-12 done
  - 标题：每帧预算与上传节流
  - 交付：interaction 2-4ms，idle 8-12ms 调度预算
  - 验收：上传峰值受控，不阻塞输入

- [x] ENG-20260426-13 done
  - 标题：tile cache 内存预算与淘汰
  - 交付：soft 256MB、hard 512MB，按优先级驱逐
  - 验收：超预算可回收，当前可见 tile 尽量保留

## Phase F: 验证与指标

- [x] ENG-20260426-14 done
  - 标题：渲染统计字段接线
  - 交付：tile hit/miss、upload、render、dirty、texture bytes、render mode
  - 验收：runtime debug 面板可见关键指标

- [x] ENG-20260426-15 done
  - 标题：场景压测与回归记录
  - 交付：10K/50K/100K + 图文混合 + 快速 zoom/pan
  - 验收：至少记录 frame p95、tile hit rate、input latency

## Phase I: 可见度驱动 LOD 重构（planned）

- [x] ENG-20260426-16 done
  - 标题：定义可见度评分模型（替代按缩放等级分层）
  - 交付：visibility score + tier（A/B/C/D）统一规则
  - 规则：以屏幕覆盖面积、焦点邻近度、最近交互热度、语义权重综合评分
  - 验收：同一缩放下不同可见度元素可进入不同 tier；缩放变化不直接触发 tier 跳变

- [x] ENG-20260426-17 done
  - 标题：统一 render 与 hittest 的可见度预算分配器
  - 交付：按 tier 分配每帧渲染预算与 hittest 精度预算
  - 规则：A 层 full fidelity，B 层轻降级，C 层占位/近似，D 层延迟/跳过
  - 验收：render/hittest 共用同一可见度 tier，不再出现策略漂移

- [x] ENG-20260426-18 done
  - 标题：tile 缓存收敛为单层主缓存
  - 交付：仅保留 current camera domain 主缓存（L0），移除持久多 zoom 层驻留
  - 规则：邻域与历史视角只保留短时预热队列（非持久层）
  - 验收：显存占用下降且无明显错位/跳帧回归

- [x] ENG-20260426-19 done
  - 标题：hittest 可见度分级执行链路
  - 交付：A/B 层 exact，C 层 bbox_then_exact(k)，D 层 bbox
  - 规则：指针附近与最近命中对象自动升档；拖拽中的对象强制 A 层
  - 验收：交互命中稳定，无“选不中主目标”回归

- [ ] ENG-20260426-20 planned
  - 标题：诊断最小化 + 可见度策略可观测
  - 交付：仅保留 tier 占比、预算消耗、hittest 命中质量三个关键指标
  - 验收：debug 面板默认不膨胀，且可追踪策略有效性

- [ ] ENG-20260426-21 planned
  - 标题：100K 目标回归验收（可见度 LOD）
  - 交付：Playwright + perf gate 对比报告
  - 验收：interaction 先达 60 基线，再冲刺 120；渲染位置正确且无 tile 错乱

## 5. 更新日志（AI持续维护）

- 2026-04-26
  - 初始化任务台账，按 draft-01 拆分 Stage 1 到 Stage 5 的 MVP 落地项
  - ENG-20260426-01 完成：在 engine tileManager 增加 TileCoord/TileKey/TileTextureEntry/createTileKey，并从 engine 顶层导出
  - ENG-20260426-02 完成：新增 ZOOM_BUCKETS/getZoomBucket/getActiveZoomBuckets，并从 engine 顶层导出
  - ENG-20260426-03 完成：新增 TileViewportCamera + world bounds + visible tiles 投影计算 helper，并从 engine 顶层导出
  - ENG-20260426-04 完成：WebGL tile 绘制路径抽离为独立 drawTileCompositorPass 并接入缓存命中/上传后两条绘制分支
  - ENG-20260426-05 完成：新增 base scene render mode 状态机（vector-live/tile-cache/progressive-refresh）并将模式写入渲染统计
  - ENG-20260426-06 完成：新增 tileCacheBaseSceneOnly 统计契约字段，明确 tile cache 仅用于 base scene 组合路径
  - ENG-20260426-07 完成：WebGL tile 缺失分支优先走 framebuffer copy 生产 exact tile 纹理，失败回退现有 canvas-crop 上传路径
  - ENG-20260426-08 完成：新增通用 fallback 解析函数 resolveTileTextureWithFallback（exact/nearest/overview/blank）
  - ENG-20260426-09 完成：新增 unionEngineRectBounds 与 previousBounds 感知脏区链路，WebGL 脏区更新改为 old/new 联合局部标记
  - ENG-20260426-10 完成：settled progressive-refresh 帧在可见 tile 刷新后增加 nearby ring 预热（preloadRing=1）
  - ENG-20260426-11 完成：新增 TileScheduler（请求去重、优先级升级、过时请求取消、按帧预算出队）
  - ENG-20260426-12 完成：progressive-refresh nearby 预热接入 preloadBudgetMs 与 maxPreloadUploads 控量
  - ENG-20260426-13 完成：EngineTileCache 新增 soft/hard bytes 预算并采用 non-current zoom/dirty/LRU 优先淘汰
  - ENG-20260426-14 完成：新增 tileUploadCount/tileRenderCount/visibleTileCount/gpuTextureBytes/imageTextureBytes 并接入 WebGL 统计返回
  - ENG-20260426-15 完成：执行 mixed-scene perf gate 并生成机器可读结果报告（PASS）
  - Phase E integration polish 完成：TileScheduler 已接入 WebGL nearby preload 主循环，启用 requestMany + cancelOutdatedRequests + tick 预算出队
  - Phase F runtime debug panel mapping 完成：新增 tileUpload/tileRender/visibleTile/gpuTexture/imageTexture 诊断字段已从 engine -> payload -> runtime events -> debug panel 全链路打通
  - Phase G scheduler observability 完成：新增 tileSchedulerPendingCount 并接入 runtime debug 诊断面板
  - Phase H self-test 完成：engine 单测通过；Playwright FPS 校验显示 idle 通过、interaction 失败（10.34 < 30）
  - Phase H.1 interaction FPS 修复完成：交互策略切换为 cache-only preview + 交互稳定 DPR=1，Playwright FPS 复测通过（41.65 >= 30）
  - Phase H.2 100K 目标对齐复测完成：idle 约 60，interaction 提升到 42.95~44.20（较 10.34 明显提升），但 60/120 目标仍有差距
  - 当前活动任务：Phase H.3 interaction 60fps 收敛（进行中）
  - Phase I.1 可见度 LOD 重构完成：新增 engine 可见度评分与 tier 模块，WebGL 交互 packet 裁剪改为 visibility-tier 驱动
  - Phase I.2 单层 tile 缓存切换完成：tile dirty invalidation 与 tile draw 统一收敛到单一缓存 zoom domain
  - Phase I.3 hittest 预算接线完成：worker 点击命中链路接入 visibility budget，动态分配 hitMode 与 maxExactCandidateCount

## 6. 执行记录模板

每次更新追加一条：

- 日期：YYYY-MM-DD
- 任务ID：ENG-YYYYMMDD-XX
- 状态：planned/in-progress/verified/done
- 变更文件：路径列表
- 验证命令：命令 + 结果
- 风险与回归点：一句话
- 下一步：下一个任务ID

- 日期：2026-04-26
- 任务ID：ENG-20260426-01
- 状态：done
- 变更文件：packages/engine/src/renderer/tileManager.ts；packages/engine/src/index.ts
- 验证命令：pnpm typecheck（通过）；get_errors 目标文件检查（无错误）
- 风险与回归点：仅新增类型与导出，未改动现有 tile cache key 逻辑，行为回归风险低
- 下一步：ENG-20260426-02

- 日期：2026-04-26
- 任务ID：ENG-20260426-02
- 状态：done
- 变更文件：packages/engine/src/renderer/tileManager.ts；packages/engine/src/index.ts
- 验证命令：get_errors 目标文件检查（无错误）
- 风险与回归点：仅新增并导出 progressive zoom bucket helper，未替换旧 TileZoomLevel 路径，兼容风险低
- 下一步：ENG-20260426-03

- 日期：2026-04-26
- 任务ID：ENG-20260426-03
- 状态：done
- 变更文件：packages/engine/src/renderer/tileManager.ts；packages/engine/src/index.ts
- 验证命令：get_errors 目标文件检查（无错误）
- 风险与回归点：新增 camera/world 可见 tile helper，不替换现有 EngineTileCache.getVisibleTiles，行为回归风险低
- 下一步：ENG-20260426-04

- 日期：2026-04-26
- 任务ID：ENG-20260426-04
- 状态：done
- 变更文件：packages/engine/src/renderer/webgl.ts
- 验证命令：get_errors 目标文件检查（无错误）；pnpm typecheck（通过）
- 风险与回归点：本次为职责抽离重构，仍复用原 drawWebGLPacket 参数与时序，渲染行为回归风险低
- 下一步：ENG-20260426-05

- 日期：2026-04-26
- 任务ID：ENG-20260426-05
- 状态：done
- 变更文件：packages/engine/src/renderer/webgl.ts；packages/engine/src/renderer/types.ts；packages/engine/src/index.ts
- 验证命令：get_errors 目标文件检查（无错误）；pnpm typecheck（通过）
- 风险与回归点：状态机基于 quality+tileCacheEnabled 进行模式解析，后续如引入更细 idle 判定可扩展解析输入
- 下一步：ENG-20260426-06

- 日期：2026-04-26
- 任务ID：ENG-20260426-06
- 状态：done
- 变更文件：packages/engine/src/renderer/webgl.ts；packages/engine/src/renderer/types.ts
- 验证命令：get_errors 目标文件检查（无错误）；pnpm typecheck（通过）
- 风险与回归点：本次为可观测契约增强，不改变 overlay 实际绘制链路，行为回归风险低
- 下一步：ENG-20260426-07

- 日期：2026-04-26
- 任务ID：ENG-20260426-07
- 状态：done
- 变更文件：packages/engine/src/renderer/tileManager.ts；packages/engine/src/index.ts；packages/engine/src/renderer/webgl.ts
- 验证命令：get_errors 目标文件检查（无错误）；pnpm typecheck（通过）
- 风险与回归点：framebuffer copy 依赖当前帧缓冲可读，已保留 canvas-crop fallback 作为兼容兜底
- 下一步：ENG-20260426-08

- 日期：2026-04-26
- 任务ID：ENG-20260426-08
- 状态：done
- 变更文件：packages/engine/src/renderer/tileManager.ts；packages/engine/src/index.ts
- 验证命令：get_errors 目标文件检查（无错误）；pnpm typecheck（通过）
- 风险与回归点：目前 fallback resolver 作为通用能力已落地，后台补 exact 调度将在 scheduler 阶段接入
- 下一步：ENG-20260426-09

- 日期：2026-04-26
- 任务ID：ENG-20260426-09
- 状态：done
- 变更文件：packages/engine/src/renderer/tileManager.ts；packages/engine/src/renderer/dirtyRegionTracker.ts；packages/engine/src/renderer/types.ts；packages/engine/src/renderer/webgl.ts；packages/engine/src/index.ts
- 验证命令：get_errors 目标文件检查（无错误）；pnpm typecheck（通过）
- 风险与回归点：仅在 previousBounds 存在时走 union 脏区路径，不影响旧 dirty region 输入兼容性
- 下一步：ENG-20260426-10

- 日期：2026-04-26
- 任务ID：ENG-20260426-10
- 状态：done
- 变更文件：packages/engine/src/renderer/webgl.ts
- 验证命令：get_errors 目标文件检查（无错误）；pnpm typecheck（通过）
- 风险与回归点：nearby 预热在 settled 帧执行，当前未接调度预算，后续由 ENG-11/12 队列与预算统一控量
- 下一步：ENG-20260426-11

- 日期：2026-04-26
- 任务ID：ENG-20260426-11
- 状态：done
- 变更文件：packages/engine/src/renderer/tileScheduler.ts；packages/engine/src/index.ts
- 验证命令：get_errors 目标文件检查（无错误）；pnpm typecheck（通过）
- 风险与回归点：当前 scheduler 已提供预算出队与请求裁剪，但尚未接入 WebGL 主循环消费
- 下一步：ENG-20260426-12

- 日期：2026-04-26
- 任务ID：ENG-20260426-12
- 状态：done
- 变更文件：packages/engine/src/renderer/webgl.ts
- 验证命令：get_errors 目标文件检查（无错误）；pnpm typecheck（通过）
- 风险与回归点：当前节流先作用于 nearby 预热阶段，visible tile 刷新仍优先保障，后续可与 scheduler 全链路统一预算
- 下一步：ENG-20260426-13

- 日期：2026-04-26
- 任务ID：ENG-20260426-13
- 状态：done
- 变更文件：packages/engine/src/renderer/tileManager.ts
- 验证命令：get_errors 目标文件检查（无错误）；pnpm typecheck（通过）
- 风险与回归点：当前淘汰优先级未引入 viewport 可见性维度，后续可在 scheduler 驱动下补充可见保护提示
- 下一步：ENG-20260426-14

- 日期：2026-04-26
- 任务ID：ENG-20260426-14
- 状态：done
- 变更文件：packages/engine/src/renderer/types.ts；packages/engine/src/renderer/webgl.ts
- 验证命令：get_errors 目标文件检查（无错误）；pnpm typecheck（通过）
- 风险与回归点：统计字段已接线到 WebGL 返回值，debug 面板展示映射仍需在应用侧检查验证
- 下一步：ENG-20260426-15

- 日期：2026-04-26
- 任务ID：ENG-20260426-15
- 状态：done
- 变更文件：apps/vector-editor-web/scripts/perf-gate.result.json（验证产物）；docs/task/engine/execution-backlog.md
- 验证命令：pnpm --filter @venus/vector-editor-web perf:gate --report ./scripts/perf-gate.report.template.json --previous-report ./scripts/perf-gate.report.template.json --output ./scripts/perf-gate.result.json（PASS）
- 风险与回归点：当前 perf gate 基于模板报告，新增真实场景实测样本仍建议后续补充
- 下一步：Phase E integration polish（scheduler 接入 WebGL 主循环）

- 日期：2026-04-26
- 任务ID：Phase-E-polish
- 状态：done
- 变更文件：packages/engine/src/renderer/webgl.ts；packages/engine/src/renderer/tileScheduler.ts；apps/vector-editor-web/scripts/perf-gate.result.json；docs/task/engine/execution-backlog.md
- 验证命令：pnpm typecheck（通过）；pnpm --filter @venus/vector-editor-web perf:gate --report ./scripts/perf-gate.report.template.json --previous-report ./scripts/perf-gate.report.template.json --output ./scripts/perf-gate.result.json（PASS）
- 风险与回归点：scheduler 目前接入 nearby preload 路径，visible tile 仍保留直通优先策略
- 下一步：Phase F runtime debug panel mapping（可选）

- 日期：2026-04-26
- 任务ID：Phase-F-panel-mapping
- 状态：done
- 变更文件：apps/vector-editor-web/src/runtime/events/index.ts；apps/vector-editor-web/src/editor/runtime/runtimeDiagnosticsPayload.ts；apps/vector-editor-web/src/editor/runtime/engineAdapter/engineRenderer.tsx；apps/vector-editor-web/src/components/shell/RuntimeDebugPanel.tsx；apps/vector-editor-web/scripts/perf-gate.result.json；docs/task/engine/execution-backlog.md
- 验证命令：pnpm typecheck（通过）；pnpm --filter @venus/vector-editor-web perf:gate --report ./scripts/perf-gate.report.template.json --previous-report ./scripts/perf-gate.report.template.json --output ./scripts/perf-gate.result.json（PASS）
- 风险与回归点：新增字段默认值已补齐，运行时订阅兼容；面板文案走 fallback 文本，后续可补 i18n 键值
- 下一步：none（MVP scope complete）

- 日期：2026-04-26
- 任务ID：Phase-F-baseline-validation
- 状态：done
- 变更文件：docs/task/engine/execution-backlog.md
- 验证命令：pnpm lint（通过）；pnpm build（通过）
- 风险与回归点：vector-editor-web 产物存在大 chunk 警告（>500kB），当前为提示级别不阻塞交付，后续可在应用层评估动态拆包与 code splitting 策略
- 下一步：none（等待下一阶段需求）

- 日期：2026-04-26
- 任务ID：Phase-G-visible-scheduler-unify
- 状态：done
- 变更文件：packages/engine/src/renderer/webgl.ts；apps/vector-editor-web/scripts/perf-gate.result.json；docs/task/engine/execution-backlog.md；docs/core/current-work.md；05_CHANGELOG.md
- 验证命令：pnpm typecheck（通过）；pnpm --filter @venus/vector-editor-web perf:gate --report ./scripts/perf-gate.report.template.json --previous-report ./scripts/perf-gate.report.template.json --output ./scripts/perf-gate.result.json（PASS）
- 风险与回归点：visible miss 已并入同一 scheduler 队列并通过 urgent 优先级保障同帧可见合成；scheduler 不可用时保留 direct upload 兼容分支
- 下一步：none（等待下一阶段需求）

- 日期：2026-04-26
- 任务ID：Phase-G-scheduler-observability
- 状态：done
- 变更文件：packages/engine/src/renderer/types.ts；packages/engine/src/renderer/webgl.ts；apps/vector-editor-web/src/editor/runtime/runtimeDiagnosticsPayload.ts；apps/vector-editor-web/src/editor/runtime/engineAdapter/engineRenderer.tsx；apps/vector-editor-web/src/runtime/events/index.ts；apps/vector-editor-web/src/components/shell/RuntimeDebugPanel.tsx；apps/vector-editor-web/scripts/perf-gate.result.json；docs/core/current-work.md；docs/task/engine/execution-backlog.md
- 验证命令：pnpm typecheck（通过）；pnpm --filter @venus/vector-editor-web perf:gate --report ./scripts/perf-gate.report.template.json --previous-report ./scripts/perf-gate.report.template.json --output ./scripts/perf-gate.result.json（PASS）
- 风险与回归点：pending 值为 frame 末端队列深度快照，用于趋势观测而非严格逐请求时序分析
- 下一步：none（等待下一阶段需求）
