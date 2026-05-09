# packages

`packages/` 存放跨应用共享的基础能力。

当前包含：

- `protocol/`：统一事件协议、共享类型和事件归一化逻辑。
- `plugin-sdk/`：插件接口、插件上下文和动作请求/结果类型。
- `live2d-runtime/`：角色状态到动作表现的运行时封装。

目录边界：

- 这里放“被多个模块依赖的共享能力”。
- 不直接承载具体工具适配逻辑。
- 不直接承载桌面端业务页面。

推荐阅读顺序：

1. `protocol/README.md`
2. `plugin-sdk/README.md`
3. `live2d-runtime/README.md`

