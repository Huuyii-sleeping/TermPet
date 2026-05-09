# plugin-sdk

`packages/plugin-sdk` 定义插件和适配器的开发接口。

## 作用

- 约束插件如何接收原始输入并输出标准事件。
- 为插件提供统一的上下文能力。
- 为后续动作执行、设置读取和日志记录提供稳定接口。

## 当前导出

当前主要导出位于 `src/index.ts`，包括：

- `PluginContext`
- `TermPetActionRequest`
- `TermPetActionResult`
- `TermPetPlugin`

## 插件类型

当前接口预留了三类插件：

- `hook`：优先用于支持钩子的命令行工具。
- `wrapper`：用于 `termpet run <command>` 这类包装器模式。
- `parser`：用于后续可能存在的日志解析场景。

## 后续待补

- 插件发现和注册机制。
- 设置结构约定。
- 生命周期和错误恢复约定。
- 动作处理的审计接口约束。
