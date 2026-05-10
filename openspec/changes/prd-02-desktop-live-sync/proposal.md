## Why

当前桌面端虽然已经接入桥接服务的初始状态和 WebSocket 消息，但 `PRD-02` 的目标还没有完全收口，桌宠实时状态链路仍缺少可验证的增量开发记录。现在补齐 OpenSpec change，可以把后续开发范围、非目标和验收标准固定下来，避免继续偏离 `PRD-02`。

## What Changes

- 收口桌面端“初始查询 + 增量订阅 + 断线重连”的完整状态同步链路。
- 移除对演示态的依赖，统一由桥接服务状态驱动桌宠文案、动作和表情。
- 补齐针对主会话切换、桥接断开恢复和渲染降级状态的实现与验证。

## Capabilities

### New Capabilities

- `desktop-live-sync`: 定义桌面端如何消费桥接状态、处理实时事件并在断线恢复后继续驱动桌宠。

### Modified Capabilities

- 无

## Impact

- `apps/desktop/src/renderer/bridge-client.ts`
- `apps/desktop/src/renderer/pet-shell.tsx`
- 桌面端渲染状态容器与桥接连接逻辑
- `docs/prd/02-桌宠状态渲染与实时同步.md` 对应的开发与验收流程
