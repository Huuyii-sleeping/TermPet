# codex-live-hook-bridge Specification

## Purpose
定义 Codex CLI 实时 hook 前向与仓库级启动包装能力，让桌宠命令行助手可以消费真实 Codex 会话事件，而不是只依赖模拟输入。
## Requirements
### Requirement: Codex 会话启动器必须自动注入当前仓库的 hook 配置

系统 SHALL 提供一个仓库级启动入口，在启动 Codex CLI 时自动生成 hooks 配置文件，并将该配置注入当前会话，而不是依赖用户手工编辑全局配置。

#### Scenario: 用户从仓库中启动 Codex

- **WHEN** 用户执行 `pnpm codex:live`
- **THEN** 系统必须生成当前仓库使用的 hooks 文件
- **AND** 必须通过 `codex.cmd -c hooks=... -c features.codex_hooks=true` 启动当前会话

### Requirement: Hook 前向器必须把 Codex 标准输入负载转成统一事件协议

系统 SHALL 提供一个可执行 hook 前向器，从标准输入读取 Codex hook JSON，归一化字段并转换成 `TermPetEvent` 后发送给本地 bridge。

#### Scenario: 收到 SessionStart 事件

- **WHEN** Codex hook 进程通过标准输入收到 `SessionStart` 负载
- **THEN** 系统必须把该负载映射为统一协议事件
- **AND** 必须发送到本地 bridge 的 `/events`

### Requirement: Hook 前向失败默认不能中断 Codex 会话

系统 SHALL 在 bridge 不可用或转发失败时默认静默降级，避免影响 Codex 原始会话；仅在显式开启严格模式时才返回失败。

#### Scenario: bridge 未启动

- **WHEN** hook 前向器无法连接到本地 bridge
- **THEN** 默认必须保持 Codex 会话继续运行
- **AND** 在 `TERM_PET_HOOK_STRICT=1` 时才允许将 hook 失败暴露为进程失败
