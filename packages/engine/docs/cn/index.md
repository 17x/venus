# Engine 文档索引（中文）

本索引是当前 engine 架构与模块逻辑的中文入口。

## 阅读顺序

1. [架构与依赖图](01-architecture-and-dependency-graph.md)
2. [基础模块](02-foundation-modules.md)
3. [Scene 与 Visibility](03-scene-and-visibility.md)
4. [交互与命中测试](04-interaction-and-hit-testing.md)
5. [Renderer 与 GPU 渲染管线](05-renderer-and-gpu-pipeline.md)
6. [Runtime 策略、预算与发布契约](06-runtime-strategy-budget-and-release.md)
7. [约束、校验与小范围重构清单](07-constraints-validation-and-refactor-checklist.md)

## 设计目标摘要

engine 是机制层，不承载产品语义。它的核心目标是：

1. 维护 render-facing 场景状态。
2. 通过策略驱动的渲染编排产出稳定帧。
3. 对外提供查询与命中原语。
4. 提供诊断与发布验收契约用于治理。

## 覆盖范围

本文档覆盖 `packages/engine/src` 下全部顶层域：

- animation, assets, bench, camera, core, debug, geometry, gpu, index
- interaction, lighting, material, math, platform, render, renderer
- resource, runtime, scene, scheduler, settings, spatial, tests
- time, transform, types, utils, visibility, worker
