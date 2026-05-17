# Engine 模块文档入口说明

`outline.md` 已从“单文件长文档”重构为导航入口。

请改用新的双语分层文档：

1. 总入口：`packages/engine/docs/index.md`
2. 中文入口：`packages/engine/docs/cn/index.md`
3. 英文入口：`packages/engine/docs/en/index.md`

重构后的文档结构特点：

1. `index.md` 作为起点，分层阅读。
2. 按模块边界拆分文件，覆盖 `src` 顶层所有模块域。
3. 每个模块文档包含职责、限制、依赖关系与治理校验点。

这次重构仅调整文档组织，不改变 engine 运行时代码行为。
