# Engine 简约需求与能力对比 (2026-06-01)

## 0. 目标定义

目标：判断当前 engine 是否符合“全能多场景适配的 3D-based 渲染引擎”预期，并明确下一步。

核心前提：

- engine 必须 3D-first。
- 2D 必须显式 opt-in（不能成为默认路径）。
- engine 必须保持领域/产品语义中立。
- 一切能力以 API-first 暴露（不允许散落私有能力对外耦合）。

## 1. 简约需求基线（从现有 `.ai-tasks/engine` 提炼）

只保留最关键 6 条：

1. 架构边界稳定：五层边界固定，禁止跨层污染。
2. API 治理稳定：仅受治理的公开 API 对外，命名简洁一致。
3. 3D 默认路径稳定：默认 runtime 不依赖 2D 专属模块。
4. 2D 显式适配：vector 等 2D 场景只能通过 adapter + opt-in 接入。
5. 场景扩展可组合：S1-S13 都通过通用 primitive + 合同扩展，不引入产品语义。
6. 双语发布完整：EN/CN API 文档与契约测试一致。

## 2. 当前能力对比（结论先行）

总体结论：**方向正确，基础已达标，但“全能多场景”尚未达发布完成态**。

- 已达标（基础层）：
  - 架构与边界治理：达标（DEX-001~006 基本完成）
  - 3D-first + 2D opt-in：达标（有契约门禁）
  - API-first 与语义中立：达标（有导出边界与命名/语义约束）
  - Three.js parity 基线：达标（TP 全部完成）
- 未达标（场景完成层）：
  - DEX-010~017 仍有大量 TODO，尤其 S10(game) 与 S11(node headless) 尚未闭环
  - 因此“全能多场景适配”仍是 **P1 在建**，不是“发布完成”状态

## 3. 重点场景对齐

### 3.1 Vector-2D（主验证应用）

判定：**架构方向正确，适配链路可行，需要继续以契约收敛**。

- 正确点：
  - vector 通过 runtime/adaptor 把 2D 文档映射为 engine 可识别通用图元/资源。
  - engine 不承载 Illustrator/Figma 语义。
- 当前关键要求：
  - 2D profile 必须显式开启；默认 3D 路径不受影响。
  - adapter 输出必须坚持 generic graph/resources，不得反向污染 engine API 命名。

### 3.2 Playground Game 子页面（3D 全能力校验）

判定：**是正确的能力验证场，但当前深度不足，需要补 S10 专项能力链路**。

- 需要重点补强：
  - authoring graph ↔ runtime graph parity 合同
  - preview play/step/stop 确定性回放
  - runtime preview 一致性与延迟预算
  - 与 engine API 的边界校验（禁止私有耦合）

## 4. 能力差距矩阵（精简版）

| 维度 | 预期 | 当前状态 | 结论 |
| --- | --- | --- | --- |
| 3D-first 默认路径 | 必须稳定 | 已有契约门禁 | ✅ |
| 2D opt-in | 必须显式 | 已有契约门禁 | ✅ |
| 语义中立 | 禁止产品语义入侵 engine | 已有语义中立测试 | ✅ |
| API-first | 仅公开治理 API | 已有导出边界与基线测试 | ✅ |
| S10 Game 基础 | authoring/runtime 双图 + parity + preview | DEX-016 仍 TODO | ⚠️ |
| S11 Node Headless | 稳定 headless + 可复现实帧输出 | DEX-017 仍 TODO | ⚠️ |
| 多场景发布完成度 | S1-S13 foundation 完整 | DEX-010~017 未全闭环 | ❌ |

## 5. 建议执行顺序（按你目标重排）

1. **DEX-016（Game）前置**：直接服务 playground game 子页作为 3D 能力验证主场。
2. **DEX-017（Node）并行推进**：补全 headless 渲染与确定性输出，支撑“全场景引擎”可信度。
3. **DEX-010 收尾**：volume 合同与诊断补齐，保持科学/医疗场景基线。
4. **vector 适配门禁持续收紧**：所有 2D 语义留在 vector runtime，engine 只吃 generic API 数据。
5. **双语 API 文档补全到 DEX-016/017**：完成正式发布口径。

## 6. 发布判定（当前）

- engine 是否已满足“全能多场景适配 3D-based 引擎”最终预期：**尚未完全满足**。
- 原因不是架构错误，而是 **场景 foundation（DEX-010~017）尚未全部收口**。
- 若按你的业务目标，当前最有价值主线是：
  - `vector-2d` 做商用主应用验证；
  - `playground game` 做 3D 全能力验证；
  - `engine` 用 DEX-016/017 补足发布短板。

## 7. 2026-06-04 Vector2D 反向验证发现与修复

Vector2D 缩放场景发现了通用 Engine 可见性缺陷，已作为 Engine 能力修复，而非留在产品侧规避：

- runtime world 的 coarse 2D bounds 曾无条件使用按节点索引生成的 legacy 假网格，导致 visible-set 与真实 scene bounds 脱离。
- staged visibility 曾把 viewport `offsetX/offsetY` 直接当作 world 起点；在 `screen = world * scale + offset` 契约下，正确 world 起点应为 `-offset / scale`。
- 已修复 semantic bounds 投影、隐藏节点过滤、inverse viewport culling 与 picking center。
- 已新增 Engine 定向契约，证明缩放/平移后真实高可见元素仍进入 visible set 与 picking。
- Vector2D 浏览器 smoke 已加入连续五次真实 `Ctrl+Wheel` 缩放门禁，禁止 populated scene 进入 zero visibility。

同时补充通用 Engine 渲染能力：

- WebGL/WebGPU composition 支持通用 `handle` overlay primitive，并保留 point radius，供任意 authoring 场景使用。
- 2D ellipse arc 角度契约统一为屏幕/world 2D 坐标：`0deg` 向右，`+90deg` 向下；该约定覆盖 render、geometry outline、hit test 与 adapter handler。
- 以上 API/primitive 均保持通用语义，不向 Engine 引入 Vector2D 产品命名。

## 8. 2026-06-04 通用 Constraint 决策

Constraint 应作为 Engine 通用能力建设，但必须与 motion/driver 分离：

- Constraint 负责判断候选状态是否合法，并将候选 pose/标量投影或修正到可行域。
- Motion/driver 负责根据输入或时间产生候选状态；路径跟随不等同于约束求解。
- Engine 仅提供 3D-first、语义中立的 primitive、组合求解、诊断与 replay。
- Vector2D 特殊 handler 由 adapter 把产品含义编译为平面、圆、标量区间等通用约束。
- Game 路径 driver 产生期望 pose，再由路径/走廊约束与 collision 修正。
- 现有 `EngineRuntimeNavigationPathConstraints` 是窄路径驱动参数，不能扩张成通用 Constraint API。

完整 API 草案、架构位置、确定性规则与原子任务见：

- `.ai-tasks/engine/engine-generic-constraint-system-design-2026-06-04.md`

首批跨场景验证已完成：

- Vector2D 圆角与椭圆角度 handler 已通过 adapter 使用 generic Constraint API。
- Game navigation driver 产生候选位置后，通过 generic active-segment Constraint 修正路径漂移。
- Constraint 与 motion/collision 保持分离，且没有向 Engine 引入 Vector2D/Game 产品命名。

## 9. 2026-06-04 通用 Clip 与几何一致性补强

Vector2D 图片裁剪、拖拽后命中滞后和椭圆扇区不一致暴露了 Engine 通用能力缺口，现按通用 API 修复：

- 通用 scene node 使用 `clipPathId` / `clipRule` 引用其他通用几何节点；WebGL/WebGPU model-complete composition 实际执行 clip，不引入图片裁剪等产品语义。
- clip-bound 节点命中由 Engine 先验证 clip source，再验证目标几何；产品层仅决定最终外层 selection presentation。
- 椭圆扇区统一使用屏幕/world 2D 角度契约和正向 wrapped sweep；render、outline、fill/stroke hit-test 共用相同缺口边界语义。
- live geometry query 允许调用方传入尚未提交的通用节点快照，避免渲染 preview 与 hit-test snapshot 分叉。

后续 Engine 原子项：

- 将 clip path 构造抽成 backend 共享模块，并覆盖旋转/翻转 clip source。
- 为通用 scene clip API 补充双语 API 文档与更完整的 WebGPU clip composition conformance。

## 10. 2026-06-05 Vector2D 反向验证出的 Engine 通用补强

Vector2D 商用编辑链路继续暴露了 render、operation、hit-test 三者对齐所需的通用 Engine 能力。已按通用能力修复，不引入 Vector2D 产品语义：

- 通用 scene transform matrix 统一为 Canvas/SVG affine 顺序 `[a,b,c,d,e,f]`；WebGL/WebGPU backend 不再使用值启发式推断 legacy matrix order。
- WebGL/WebGPU model-complete composition 开始消费通用 `shadow` payload，并映射到 `shadowColor`、`shadowOffsetX`、`shadowOffsetY`、`shadowBlur`。
- Vector adapter 与 Engine backend 的 shadow 支持仍保持 generic rich-node effect，不使用 Vector2D inspector 或产品命名。
- Vector2D worker spatial broadphase 改为使用 runtime bounds resolver；这属于应用 runtime 修复，但验证了 Engine/API 层需要保持 geometry bounds 与 hit payload 可解释。
- 后续应将 matrix、clip、shadow、rounded-rect、ellipse-sector、path、text-run composition helper 抽成 backend 共享模块，减少 WebGL/WebGPU 行为漂移。

对接文档：

- `.ai-tasks/vector-editor/vector2d-render-operation-hittest-consistency-contract-2026-06-06.md`

## 11. 2026-06-06 Engine Rich-Node Composition 共享化 Phase 1

Vector2D 的 render/operation/hit-test 一致性回归验证要求 WebGL/WebGPU 对 rich-node payload 保持一致解释。M3 第一阶段已完成通用 helper 抽取：

- 新增 `packages/engine/src/backend/adapters/richNodeComposition.ts`。
- WebGL/WebGPU 共享 Canvas/SVG affine matrix 解析，继续使用 `[a,b,c,d,e,f]`，不回退到 legacy 推断。
- WebGL/WebGPU 共享 generic shadow payload 解析与 Canvas 2D shadow 应用。
- 新增 `richNodeComposition.contract.test.ts` 覆盖 matrix 顺序、shadow 解析/应用、disabled/zero-effect shadow suppression。

后续 Engine 原子项：

- 继续抽取 clip path construction，优先覆盖 polygon/ellipse/rect clip source。
- 继续抽取 rounded rectangle、ellipse sector、point/path/bezier、text-run layout fallback。
- 保持 helper API generic，不出现 Vector2D、inspector、mask product 等产品语义。

## 12. 2026-06-06 Engine Rich-Node Composition 共享化 Phase 2

M3 第二阶段已继续收敛 WebGL/WebGPU 的 rich-node composition 行为：

- `richNodeComposition.ts` 新增 `applyRichNodeCanvasClip`。
- WebGL/WebGPU 共享通用 `clipPathId` / `clipId` / `clipRule` 解释逻辑。
- clip source 支持 polygon points、ellipse、rect fallback，保持 Canvas/SVG 2D path 语义，但不引入 Vector2D 产品语义。
- 新增 helper contract tests 覆盖 polygon、ellipse、rect clip source，以及 missing clip source 不污染 context。

后续 Engine 原子项：

- 继续抽取 rounded rectangle path construction。
- 继续抽取 ellipse sector construction，保证 arc render 与 hit/outline 角度契约一致。
- 继续抽取 point/path/bezier construction 与 text-run layout fallback。
- 为通用 scene clip API 补充双语 API 文档，并加入旋转/翻转 clip source 的 conformance 覆盖。

## 13. 2026-06-06 Engine Rich-Node Composition 共享化 Phase 3

M3 第三阶段完成 rounded-rect、ellipse-sector、point/path/bezier 与 text-run layout fallback 的共享化：

- `richNodeComposition.ts` 新增 `buildRichNodeRoundedRectPath`。
- WebGL/WebGPU 默认 rect composition 共享 uniform `cornerRadius` 与 per-corner `cornerRadii` 路径构造。
- 圆角半径统一 clamp 到 `min(width, height) / 2`，避免极端半径导致 path 自交或 backend 行为漂移。
- 新增 helper contract tests 覆盖 per-corner radii path 顺序、超大半径 clamp，以及无圆角时不污染 context。
- `richNodeComposition.ts` 新增 `buildRichNodeEllipsePath`。
- WebGL/WebGPU ellipse composition 共享 full ellipse 与 sector path 构造。
- ellipse sector 继续使用 `0deg` 向右、正向 sweep、`end < start` 时 wrap through 360deg 的通用契约。
- 非整圆 sector 始终通过 center close path，使 fill、stroke、outline/hit-test 的 radial gap-edge 语义保持一致。
- 新增 helper contract tests 覆盖 full ellipse、wrapped sector，以及无效 bounds 不污染 context。
- `richNodeComposition.ts` 新增 `buildRichNodePath`。
- WebGL/WebGPU point path、bezier path、fallback line composition 共享路径构造逻辑。
- helper 复用 `richPathDrawPlan`，继续尊重 explicit `closed`，并保留 line nodes 通过 width/height 编码 segment delta 的兼容路径。
- 新增 helper contract tests 覆盖 explicit open point path、default closed bezier path、fallback line，以及 unsupported empty path 不污染 context。
- `richNodeComposition.ts` 新增 `resolveRichNodeTextFragments`。
- WebGL/WebGPU text composition 共享 single-style multiline、multi-run cursor advance、line-height fallback 与 run newline reset 逻辑。
- helper 只返回 generic draw fragments；backend 仍负责 Canvas font/fillText 执行与 texture/present 细节。
- 新增 helper contract tests 覆盖 single-style multiline text、multi-run measurement font、cursor advance 与 line advance。

后续 Engine 原子项：

- 为 rich-node composition helper 补充双语 API/行为说明，明确其是 backend composition utility，不是 Vector2D 产品 API。
- 继续补 projection/composition diagnostics，使 render/operation/hit-test 漂移在产品可见之前被检测到。
