## Why

当前仓库已经具备 Codex 事件协议映射、bridge 状态管理和桌面可视化能力，但还缺少“把用户实际启动的 Codex 会话接进来”的最后一段执行链路。没有这层接线，桌宠只能消费模拟事件，不能稳定跟随真实会话。

另外，Windows 环境下直接依赖全局 `~/.codex/hooks.json` 与手工配置的方式不够稳妥，也不利于仓库内复现。因此需要提供一个仓库级、可重复执行的启动方案。

## What Changes

- 在 `plugins/codex` 增加可执行 hook 前向器，从 `stdin` 读取 Codex hook JSON 并转发到 bridge
- 增加 Codex 启动包装器，自动生成当前仓库使用的 hooks 配置并注入本次 Codex 会话
- 统一整理 Codex hook 负载的字段归一化与事件映射逻辑
- 更新插件文档，说明推荐启动方式、限制与调试方法

## Capabilities

### New Capabilities

- `codex-live-hook-bridge`: 定义 Codex 实时 hook 前向与仓库级启动包装能力

## Impact

- `plugins/codex/src/*`
- `plugins/codex/README.md`
- `package.json`
- `.gitignore`
