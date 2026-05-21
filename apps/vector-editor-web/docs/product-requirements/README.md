# Vector Product Requirements 文档索引

本目录用于沉淀 vector-editor-web 的产品需求文档（PRD）。
目标是基于现有 product 模块实现状态，形成可执行、可验收、可排期的产品规格，逐步对齐 Adobe Illustrator / Figma 级 2D 矢量编辑体验。

## 文档结构

1. prd-overview.md

- 产品目标、用户、范围、现状能力盘点、核心缺口与原则。

2. module-01-editor-core-interaction.md

- 选择、命中、手势、快捷键、状态机与高频交互规范。

3. module-02-shape-path-transform.md

- 形状创建、路径编辑、变换、吸附、对齐/分布能力需求。

4. module-03-style-text-image.md

- 样式系统、文字系统、图片处理、属性面板联动需求。

5. module-04-layer-group-mask-boolean.md

- 图层结构、编组、蒙版、布尔运算与层级交互需求。

6. module-05-runtime-bridge-performance.md

- Product 与 Runtime/Engine 的边界、命令桥、性能与稳定性需求。

7. module-06-components-collaboration-extensibility.md

- 组件系统、资产库、协作能力、插件扩展等战略能力需求。

8. nfr-and-acceptance.md

- 非功能需求（性能/可靠性/可观测性）与统一验收标准。

9. release-plan.md

- 版本里程碑、优先级、依赖关系与交付节奏建议。

10. m1-execution-backlog.md

- M1 立即开工任务清单（按优先级、依赖、验收、责任边界拆分）。

11. m1-target-expectations.md

- M1 类型继承、行为一致性、测试与验收的目标定义。

12. m2-execution-backlog.md

- M2 开工任务清单（路径/样式文字/结构增强与退出评审）。

13. m2-target-expectations.md

- M2 可验收目标定义（能力、NFR、当前状态）。

## 使用方式

1. 需求评审前先阅读 prd-overview.md。
2. 按模块文档拆任务，做到“需求条目 -> 验收条目 -> 测试条目”一一对应。
3. 每次迭代完成后回写 nfr-and-acceptance.md 与 release-plan.md 的状态。
4. 进入 M2 后，按 m2-execution-backlog.md -> m2-target-expectations.md 对齐执行与验收。

## 立即开工顺序（推荐）

1. 先阅读 prd-overview.md 的架构决策（不合并 Product/Runtime）。
2. 按 m1-execution-backlog.md 创建任务并分配 owner。
3. 每完成一个任务，回写 nfr-and-acceptance.md 的验收状态。

## 术语约定

- Product：高频交互与产品语义层（当前主要位于 src/product）。
- Runtime：运行态控制层（命中、变换会话、叠加层、桥接）。
- Engine：底层渲染与运行态能力层。
- AI：Adobe Illustrator。
