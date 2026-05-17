# 架构与依赖图

## 1. 引擎定位

`@venus/engine` 是渲染、几何、查询与调度原语的机制层。

它不负责：

- 产品命令语义。
- 历史与协作策略。
- UI 状态机。
- 工具行为编排。

## 2. 责任域

顶层模块按职责可分为：

1. 基础层：`math`、`time`、`utils`、`types`、`geometry`、`transform`、`resource`、`platform`、`camera`、`material`、`lighting`、`assets`。
2. 场景层：`scene`、`spatial`、`visibility`。
3. 交互层：`interaction`。
4. 渲染层：`renderer`、`gpu`、`render`、`scheduler`。
5. 运行时编排层：`runtime`、`settings`、`debug`、`bench`、`worker`、`index`、`tests`。

## 3. 单向依赖规则

权威依赖流向：

1. `math|time|utils|core` 不可反向依赖 renderer/runtime/worker。
2. `scene` 只能依赖基础层。
3. `interaction` 依赖 scene + 基础层。
4. `renderer` 依赖 interaction + scene + 基础层。
5. `runtime` 依赖 renderer + interaction + scene + 基础层。
6. `worker` 依赖 runtime + renderer + interaction + scene + 基础层。

除非显式标记临时兼容，否则禁止反向依赖。

## 4. Runtime 到帧输出链路

1. `runtime/createEngine` 解析配置、策略与编排句柄。
2. Scene 更新经 store/patch 进入。
3. strategy 解析阶段（static/pan/zoom/settling）与预算压力。
4. planning 构建候选计划与 shortlist。
5. visibility + LOD 过滤最终可绘制集合。
6. renderer 选择 packet/tile/composite/preview 路径。
7. diagnostics 与 fallback taxonomy 回传 runtime。

## 5. 对外契约面

公共导出入口：

- `packages/engine/src/index.ts`
- `packages/engine/src/index/index.ts`

主要契约类别：

1. 引擎生命周期与 viewport 控制。
2. settings/profile/policy 接口。
3. runtime 策略与预算契约。
4. renderer 回退分类与兼容诊断。
5. release/readiness 验收契约。

## 6. 集成原则

1. app/runtime 负责产品语义和用户意图。
2. engine 负责几何正确性、渲染执行与机制诊断。
