# 时间线与回放基线

状态：Release contract draft。
范围：ENG-006。

Timeline 与 replay API 是通用确定性原语，不拥有 video、game、driving、editor 等产品语义。

## 必须支持的概念

- Track：按顺序组织的 generic events 或 keyframes。
- Clip：带有时间边界的资源引用或状态 delta。
- Replay：对 graph、input、timing records 执行确定性回放。
- Capture：用于跨环境比较 runtime 行为的诊断 artifact。

## 确定性规则

Replay 必须由 graph revision、event order、timestamps、backend profile、scheduler policy 决定。Browser 与 headless 的差异必须记录为 diagnostics。

## App 归属

Video timelines、game runtime previews、driving twins、editor history 都由 app 转换到通用 timeline/replay contract。
