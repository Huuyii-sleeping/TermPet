# PRD-07：Codex 实时接入

本变更用于把“仓库中的 Codex 事件映射能力”补齐为“可直接启动并接入真实 Codex 会话”的能力。

推荐入口：

```bash
pnpm codex:live
```

该命令会自动生成当前仓库会话所需的 hooks 配置，并在本次 Codex 启动中启用。
