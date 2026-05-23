# 分层边界契约

## 目的

本文档用于冻结五层引擎架构的依赖与职责边界：

- backend
- kernel
- optimization
- orchestration
- platform

所有新增变更必须遵守本契约。

## 核心规则

- 默认运行时保持 3D-first。
- 2D 能力必须是显式 opt-in 模块，不可成为核心强依赖。
- engine 分层中禁止内置行业产品语义或商业逻辑。
- 能力必须通过受治理 API 面暴露。

## 允许的分层依赖

- backend -> platform
- kernel -> backend
- kernel -> platform
- optimization -> kernel
- optimization -> backend
- optimization -> platform
- orchestration -> kernel
- orchestration -> optimization
- orchestration -> backend
- orchestration -> platform

## 禁止的分层依赖

- platform -> backend
- platform -> kernel
- platform -> optimization
- platform -> orchestration
- backend -> kernel
- backend -> optimization
- backend -> orchestration
- kernel -> optimization
- kernel -> orchestration
- optimization -> orchestration

## API 暴露契约

- 对外能力入口必须通过 engine API 契约路由。
- 禁止将深层内部 helper 作为顶层对外 API 暴露。
- API 命名必须简洁、稳定、语义中立。

## 场景语义中立契约

- 场景支持由通用原语组合而成。
- 禁止在 engine 契约中出现产品级语义命名和业务流程动词。
- 命名应以 capability 与 runtime 为中心。

## 3D 与 2D 契约

- 3D 路径是默认运行时基线。
- 2D 模块仅在以下条件全部满足时允许引入：
  - 场景明确声明需要 2D
  - 已记录可衡量收益
  - 通过 API 显式 opt-in 激活
  - 不对默认运行时路径产生强耦合

## 执行检查清单

每个实现切片都需要检查：

- 依赖方向检查
- API 暴露面检查
- 语义中立检查
- 3D-first 与 2D opt-in 合规检查
- 若导入或导出变更，需同步更新边界测试
