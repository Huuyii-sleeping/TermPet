## Why

当前 Codex 事件映射仍然偏粗，尤其是工具执行结果、停止原因和权限确认动作链路还不够完整。`PRD-05` 需要把适配器补成第一版可用状态，并让桥接服务具备最小动作路由接口。

## What Changes

- 细化 Codex 生命周期事件到标准状态的映射，区分成功停止、失败停止和人工中断。
- 为等待确认等关键事件生成标准动作列表与风险信息。
- 在桥接服务中增加最小动作请求接口与动作结果模型。
- 让桌面端提醒层能够触发动作请求，并在无法真实回传时显示终端回退结果。

## Capabilities

### New Capabilities

- `bridge-action-routing`: 定义桥接服务如何接收、校验并返回最小动作请求结果。

### Modified Capabilities

- `desktop-critical-interrupts`: 增加动作触发与结果提示行为。
- `desktop-live-sync`: 增加动作结果相关的上下文消费。

## Impact

- `plugins/codex/src/index.ts`
- `apps/bridge/src/index.ts`
- `apps/desktop/src/renderer/*`
- `packages/protocol/src/index.ts`
- `packages/plugin-sdk/src/index.ts`
