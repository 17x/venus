# Vector 测试策略与关键词映射（2026-05-23）

## 1. 目标

基于关键词集合建立分门别类测试体系，并优先覆盖当前风险最高链路：

1. 文档模型与结构一致性
2. group 与 history 行为
3. 视口行为（pan/zoom/fit-view）
4. runtime-engine 契约
5. 选择状态与交互状态

## 2. 测试目录分层

建议目录：src/testing/product-specs

1. interaction
2. viewport
3. history
4. document-structure
5. integration-contract
6. performance（后续）
7. collaboration（后续）

## 3. 关键词映射（首批）

### 3.1 已在本轮优先覆盖

1. Tool Behavior Test
2. Interaction Flow Test
3. Editor State Test
4. Command System Test
5. Undo Redo Test
6. Selection State Test
7. Hover State Test
8. Viewport Behavior Test
9. Pan Zoom Test
10. Fit View Test
11. Grouping Test
12. Layer Management Test
13. Scene Snapshot Test
14. Scene Serialization Test
15. Transform Workflow Test
16. Multi Select Test
17. History Stack Test
18. Transaction Test
19. Integration Contract Test
20. Engine Adapter Test
21. Scene Sync Test
22. State Synchronization Test
23. Deterministic Workflow Test

### 3.2 下一批扩展覆盖

1. Scroll Behavior Test
2. Minimap Test
3. Shortcut Test
4. Clipboard / Copy Paste Test
5. Duplicate / Delete Test
6. Alignment / Smart Guide Test
7. Render Invalidation Test
8. Benchmark / Large Scene Benchmark
9. Memory Leak Test
10. E2E Workflow Test
11. Collaborative Editing / Conflict Resolution / Offline Recovery

## 4. 执行策略

1. 先补纯函数和契约测试，保证快速稳定
2. 再补回放与场景回归测试
3. 再补性能和跨平台行为测试
4. 每个测试文件在命名层表达能力边界

## 5. 质量门禁建议

1. PR 必跑：history + document-structure + integration-contract
2. 每日构建：viewport + interaction + replay regression
3. 周期构建：performance + large document + stress

## 6. 验收原则

1. 每个关键词映射到至少一个测试文件
2. 每条测试用例可追溯到需求条目
3. 失败输出包含诊断上下文，便于定位
