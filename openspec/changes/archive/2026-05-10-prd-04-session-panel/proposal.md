## Why

当前桌宠只能展示最近活跃会话的主状态，用户看不到更完整的上下文，也无法查看其他会话的摘要和最近活动。`PRD-04` 需要补齐点击面板和多会话查看入口，把桌宠从“只看状态”推进到“可看上下文”。

## What Changes

- 为桌宠增加点击打开/关闭的紧凑面板。
- 在面板中展示当前活跃会话摘要、最近事件摘要和最近会话列表。
- 支持在面板内切换查看某个会话的详情，但不改变主桌宠仍跟随最近活跃会话的规则。
- 增加设置入口占位，为 `PRD-06` 的设置持久化预留界面位置。

## Capabilities

### New Capabilities

- `desktop-session-panel`: 定义桌宠点击面板、多会话列表和会话详情查看行为。

### Modified Capabilities

- `desktop-live-sync`: 增加面板对会话详情和最近活动摘要的消费要求。

## Impact

- `apps/desktop/src/renderer/*`
- `openspec/specs/desktop-live-sync/spec.md`
- 新增桌面端会话面板规格
