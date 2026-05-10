## 1. Hook 接线能力

- [x] 1.1 抽离 Codex hook 事件归一化与统一协议映射逻辑
- [x] 1.2 实现从 `stdin` 读取 hook JSON 并转发到 bridge 的前向器
- [x] 1.3 实现仓库级 hooks 文件生成与 `codex.cmd` 启动包装

## 2. 使用方式与文档

- [x] 2.1 更新 `plugins/codex/README.md`，说明 `pnpm codex:live` 的推荐用法
- [x] 2.2 补充 OpenSpec 设计与能力说明，明确当前限制与失败策略

## 3. 验证与归档

- [x] 3.1 执行 smoke test，确认 bridge 能收到前向事件
- [x] 3.2 执行 `pnpm typecheck` 与 `pnpm build`
- [x] 3.3 执行 OpenSpec 校验、归档、提交与推送
