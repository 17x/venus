# 资源与资产接入 API

状态：Release contract draft。
范围：ENG-004。

Engine 的资源接入必须保持通用。App adapter 在提交前把领域文件转换成 engine resources。

## 通用资源族

- Geometry resources：mesh、primitive、polyline、point cloud、volume slice payload。
- Material resources：color、texture reference、transparency、render flags。
- Texture resources：image source、decode state、compression state、residency state。
- Animation resources：keyframe tracks、deterministic revision ids、playback ranges。
- Volume resources：scalar fields、slice descriptors、transfer function handles。

## 必须提供的诊断

Resource API 必须报告 decode failure、fallback backend、compression support、residency pressure、upload budget decisions，并且不能使用行业专有名称。

## 场景覆盖目标

该 API family 必须通过 app-owned adapters 支撑 playground S1、S3、S4、S5、S7、S8、S9、S10、S11。
