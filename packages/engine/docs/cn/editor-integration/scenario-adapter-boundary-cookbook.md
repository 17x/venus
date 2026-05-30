# 场景 Adapter 边界手册

状态：Release contract draft。
范围：ENG-008。

Scenario adapter 位于 engine 之外。它们把领域数据转换成通用 engine graph、resources、events、queries。

## Adapter 模式

1. 解析 app-owned source data。
2. 归一化 units、ids、revisions、asset references。
3. 输出通用 engine graph nodes 与 resource descriptors。
4. 通过 public engine APIs 提交。
5. 把 engine diagnostics 翻译回 app language。

## 禁止泄漏

不要把 DICOM、IFC、3D Tiles、OpenSCENARIO、SVG、glTF、USD、medical、BIM、GIS、CAD、game、video、commerce 等领域词汇加入 core engine API 名称。

## Cookbook 目标

Playground scenarios 可以在 app docs 与 adapters 中使用这些 domain labels，但 engine 只接收 generic graph/resource/query/replay data。
