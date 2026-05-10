## Why

当前桌宠虽然已经能实时展示状态，但还没有把等待确认、失败、完成这些关键时刻从普通状态切换里区分出来。`PRD-03` 需要补上最小可用的打断提醒层，避免用户错过权限确认和失败信息。

## What Changes

- 为桌面端增加 `silent` / `bubble` / `toast` / `modal` 四种最小提醒表现。
- 为 `waiting_approval` 和 `error` 增加强提醒卡片，明确展示来源工具、工作目录、动作摘要和详情入口。
- 为 `success` 增加自动消退的轻提醒。
- 为无法直接回传的确认事件增加终端回退提示。
- 为 Codex 适配器补齐关键状态需要的提醒元数据。

## Capabilities

### New Capabilities

- `desktop-critical-interrupts`: 定义桌面端如何根据事件的 `interruptLevel` 渲染关键提醒，并在无法直接执行动作时给出终端回退提示。

### Modified Capabilities

- `desktop-live-sync`: 在已有实时同步能力上增加关键提醒依赖的事件消费约束。

## Impact

- `apps/desktop/src/renderer/*`
- `plugins/codex/src/index.ts`
- `openspec/specs/desktop-live-sync/spec.md`
- 新增桌面端关键提醒规格
