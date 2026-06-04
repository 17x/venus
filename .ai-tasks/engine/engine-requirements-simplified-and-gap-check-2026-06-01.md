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
