# Scene 与 Visibility

## 1. Scene 域目标

scene 域负责 render-facing 状态维护与候选集提取的确定性。

## 2. 核心子模块

1. `scene/types`

- 可渲染节点与场景快照契约。

2. `scene/store`

- 场景存储、事务更新与 revision 生命周期。

3. `scene/patch`

- 高频场景增量更新。

4. `scene/indexing` 与 `scene/spatial`

- 粗粒度空间索引与候选查询加速。

5. `scene/worldBounds` 与 `scene/geometry`

- world bounds 计算与几何支撑。

6. `scene/framePlan` 与 `scene/hitPlan`

- 渲染帧与命中候选计划。

7. `scene/hit` 与 `scene/hitTest`

- 基于候选集的精确命中求解。

8. `scene/visibility` 与顶层 `visibility`

- 可见性过滤（含 2D/3D/frustum/occlusion 扩展点）。

## 3. 数据流

1. 场景装载或 patch。
2. 更新受影响索引区域。
3. 查询 viewport/hit 候选。
4. 经过 visibility 与 LOD 筛选得到最终集合。
5. 向 renderer/interaction 输出。

## 4. 限制与风险

1. 粗索引候选不能等价为最终可见结果。
2. 候选裁剪需保持 group 祖先/子树一致性。
3. 非空场景出现零候选时，runtime/renderer 必须触发安全回退校验。

## 5. 集成规则

1. runtime 消费 scene 计划，不直接操纵索引内部状态。
2. renderer 消费 scene 计划，不定义 scene 所有权策略。
3. interaction 负责命中 refine，不承载产品选中语义。
