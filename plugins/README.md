# plugins

`plugins/` 存放具体命令行工具的适配器实现。

当前包含：

- `codex/`：第一版内置的代码代理工具适配器。

目录边界：

- 这里放“具体工具接入逻辑”。
- 插件应负责把工具侧事件转换为统一协议事件。
- 插件不应直接控制桌面端界面，也不应定义共享协议。

推荐阅读顺序：

1. `codex/README.md`
2. `packages/plugin-sdk/README.md`
3. `packages/protocol/README.md`

