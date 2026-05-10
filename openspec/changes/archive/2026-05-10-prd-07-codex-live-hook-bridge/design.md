## 总体设计

本次不改桌面端和 bridge 协议，而是在 `plugins/codex` 补齐最后一层执行链路。

方案拆成两个角色：

1. `hook-cli.js forward`
   - 作为 Codex hook 进程被调用
   - 从标准输入读取单次 hook 负载
   - 归一化字段后映射为 `TermPetEvent`
   - 转发到本地 bridge 的 `/events`

2. `hook-cli.js run`
   - 作为用户入口启动 `codex.cmd`
   - 在仓库 `.termpet/` 下生成当前会话使用的 `codex-hooks.json`
   - 通过 `-c hooks=...` 和 `-c features.codex_hooks=true` 把 hook 配置注入当前会话

## 为什么使用包装器

当前目标不是去附着一个已经运行中的任意 Codex 进程，而是提供一个稳定、可复现、仓库内即可使用的启动路径。

这样做的好处：

- 不依赖用户手动编辑全局 `~/.codex/config.toml`
- 不把当前机器的绝对路径提交进仓库
- 可以把 hook 配置和 bridge 地址固化到当前仓库会话里
- 符合第一版“优先使用钩子型适配器，必要时提供包装器”的架构边界

## 失败策略

- bridge 不可用时，前向器默认静默失败，不阻断 Codex 会话
- 调试时可通过 `TERM_PET_HOOK_DEBUG=1` 输出错误
- 如果希望把 hook 失败视为错误，可设置 `TERM_PET_HOOK_STRICT=1`
