## Why

虽然 `PRD-01` 到 `PRD-05` 已经补齐了主流程，但当前应用还缺少长期使用所需的设置、持久化和可观测性收口。`PRD-06` 需要把窗口位置、提醒偏好、有限历史和动作审计补齐，让第一版达到可持续使用状态。

## What Changes

- 为桌面端增加本地提醒偏好设置，并持久化到本地存储。
- 为 Electron 主进程增加窗口位置持久化与恢复。
- 为桥接服务增加最近事件、最近会话和动作审计的本地有限持久化。
- 增加审计查询接口和桌面端的基础审计展示。
- 补充桥接断线和模型占位模式的降级说明。

## Capabilities

### New Capabilities

- `desktop-settings-persistence`: 定义桌面端设置、窗口位置和降级反馈的持久化行为。
- `bridge-local-audit`: 定义桥接服务历史持久化与动作审计查询行为。

### Modified Capabilities

- `bridge-action-routing`: 增加动作审计记录要求。
- `desktop-critical-interrupts`: 增加提醒偏好对提醒展示的影响。
- `desktop-session-panel`: 增加设置入口和审计展示的基础内容。

## Impact

- `apps/desktop/src/main/index.ts`
- `apps/desktop/src/renderer/*`
- `apps/bridge/src/index.ts`
- `packages/protocol/src/index.ts`
