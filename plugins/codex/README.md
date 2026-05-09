# codex

`plugins/codex` 是第一版内置的代码代理工具适配器。

## 作用

- 接收 Codex 钩子事件。
- 将原始载荷映射为桌宠命令行助手的标准事件协议。
- 为后续权限确认、工具调用和多会话展示提供统一输入。

## 当前实现

当前入口文件为 `src/index.ts`，主要包含：

- `codexPlugin`：插件定义对象。
- `mapCodexHookToEvent(input)`：将 Codex 载荷转换为 `TermPetEvent`。

当前已处理的典型事件包括：

- `SessionStart`
- `UserPromptSubmit`
- `PreToolUse`
- `PostToolUse`
- `PermissionRequest`
- `Stop`

## 当前限制

- 现在是静态映射，事件覆盖范围还不完整。
- 尚未实现动作回传。
- 尚未处理更细粒度的错误、拒绝和重跑语义。

## 后续待补

- 扩展更多 Codex hook 事件。
- 区分成功停止、失败停止和人工中断。
- 为权限确认生成更完整的动作信息和风险说明。
