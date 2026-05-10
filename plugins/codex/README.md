# Codex 适配器

`plugins/codex` 负责把 Codex CLI 的 hook 事件接入桌宠命令行助手。

## 当前能力

- 复用统一事件映射，将 Codex hook 负载转换成 `TermPetEvent`
- 提供可执行的 hook 前向器，从 `stdin` 读取 JSON 并转发到本地 bridge
- 提供仓库级启动包装器，启动带 hook 配置的 `codex.cmd`

## 推荐用法

先启动桌宠和桥接服务：

```bash
pnpm dev
```

然后在同一个仓库里启动带接入配置的 Codex：

```bash
pnpm codex:live
```

如果需要把参数继续传给 Codex，可以这样使用：

```bash
pnpm codex:live -- resume --last
pnpm codex:live -- exec "帮我检查当前仓库"
```

## 实现方式

`pnpm codex:live` 会先编译 `@termpet/plugin-codex`，然后执行 `dist/hook-cli.js run`：

1. 在仓库根目录生成 `.termpet/codex-hooks.json`
2. 自动把该 hooks 文件通过 `codex.cmd -c hooks=...` 注入当前会话
3. 强制打开 `features.codex_hooks=true`
4. 当 Codex 触发 `SessionStart`、`UserPromptSubmit`、`PreToolUse`、`PostToolUse`、`PermissionRequest`、`Stop` 时，hook 会调用当前包的前向器
5. 前向器把原始 hook 负载映射为统一协议，再 `POST` 到 `http://127.0.0.1:47631/events`

## 可用脚本

- `pnpm --filter @termpet/plugin-codex codex:live`
- `pnpm --filter @termpet/plugin-codex codex:hooks`
- `pnpm --filter @termpet/plugin-codex codex:hook`

## 当前限制

- 现在不能附着到“已经运行中的裸 `codex` 进程”，需要通过 `pnpm codex:live` 启动当前会话
- 桌宠内的审批动作仍然是终端回退，不会直接代替 Codex 终端里的确认
- 如果 bridge 没启动，hook 默认静默失败，不阻断 Codex 会话；调试时可设置 `TERM_PET_HOOK_DEBUG=1`
