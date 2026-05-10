# OpenSpec 使用说明

本目录用于管理 TermPet 的增量开发变更记录。后续每次开发都应先创建 OpenSpec change，再进入实现。

如果本机尚未安装 OpenSpec，可先执行 `npm install -g @fission-ai/openspec@latest`。

## 基本流程

1. 先阅读 `docs/prd/` 下对应阶段文档，确认本次开发属于哪个 PRD。
2. 创建 change，命名建议使用 `prd-编号-目标`，例如 `prd-02-desktop-live-sync`。
3. 在 `openspec/changes/<change-name>/` 中补齐 proposal、tasks，以及需要时的 spec delta。
4. 按 change 中的任务实施开发，并在完成后同步更新任务状态。
5. 开发完成后执行 `openspec.cmd validate` 校验变更结构是否有效。
6. 变更确认完成后执行归档，让历史变更进入 `openspec/changes/archive/`。

## 常用命令

- `pnpm spec:list`：查看当前 change 或 spec 列表。
- `pnpm spec:new -- <change-name>`：创建新的 change。
- `pnpm spec:status -- --change <change-name>`：查看某个 change 的完成状态。
- `pnpm spec:validate -- <change-name>`：校验某个 change。
- `pnpm spec:archive -- <change-name>`：归档已经完成的 change。

## Windows 注意事项

- 在 PowerShell 下优先使用 `openspec.cmd`。
- 不要直接使用 `openspec.ps1`，否则可能因为执行策略报错。
