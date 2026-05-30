# 空间查询基线

状态：Release contract draft。
范围：ENG-005。

空间 API 是通用查询原语，必须支持 picking、raycast-like selection、frustum filtering、measurement、clearance、constraint checks，且不能携带 app domain 词汇。

## 必须支持的查询族

- 对 2D 或 3D 投影实体执行 point pick。
- 对 scene bounds 执行 region 或 frustum query。
- 在通用实体或点之间执行 measurement。
- 为 constraint system 执行 clearance 与 overlap checks。
- 在 dense scene 下提供确定性排序和查询诊断。

## 确定性规则

相同 graph revision、view state、query options、backend profile 下，查询结果必须稳定。任何近似或压力降级都必须进入 diagnostics。

## Adapter 规则

Vector 与 playground adapter 只能调用 public query APIs，不能导入 engine 私有 spatial index modules。
