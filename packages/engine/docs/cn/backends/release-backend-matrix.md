# 发布后端矩阵

状态：Release contract draft。
范围：ENG-007。

Engine backend 文档必须描述能力与 fallback 行为，同时不能强制 browser-only runtime。

## Backend 级别

- WebGL：第一个商用发布的主要浏览器渲染 backend。
- WebGPU：可用环境下的 experimental backend。
- Canvas2D：显式 fallback 或 2D opt-in path，不是默认产品语义。
- Headless：用于 CI 和类服务端 workflow 的确定性验证与 capture path。

## 必须提供的诊断

Backend 必须暴露 selected backend、fallback reason、unsupported features、capture/readback availability、resource pressure、frame failure details。

## Headless 规则

Headless 示例不能依赖 DOM-only 假设。任何 browser-only feature 都必须有 diagnostic downgrade path。
