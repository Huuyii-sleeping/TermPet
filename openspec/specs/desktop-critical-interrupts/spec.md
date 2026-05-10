# desktop-critical-interrupts 规格

## Purpose

定义桌面端如何根据事件的 `interruptLevel` 渲染关键提醒，并在等待确认、失败、完成等关键状态下给出清晰、克制且可操作的提醒信息。
## Requirements
### Requirement: 桌面端必须根据 interruptLevel 渲染最小提醒层级

桌面端 SHALL 根据活跃会话最近关键事件的 `interruptLevel` 渲染 `silent`、`bubble`、`toast`、`modal` 四类最小提醒表现。

#### Scenario: 事件为轻量气泡提醒

- **WHEN** 活跃会话最近事件的 `interruptLevel` 为 `bubble`
- **THEN** 桌宠必须显示非阻塞的状态气泡，不覆盖主视图

#### Scenario: 事件为强提醒

- **WHEN** 活跃会话最近事件的 `interruptLevel` 为 `modal`
- **THEN** 桌面端必须显示强提醒卡片，并保留主状态上下文

### Requirement: 等待确认和失败事件必须展示明确风险信息

桌面端 SHALL 在 `waiting_approval` 和 `error` 事件触发时，明确展示来源工具、工作目录、动作摘要和详情入口；当用户触发动作但当前版本无法直接回传时，系统 MUST 返回明确的终端回退结果提示。

#### Scenario: 权限确认到达

- **WHEN** 活跃会话收到 `waiting_approval` 事件
- **THEN** 桌面端必须显示强提醒，并提示当前版本需要回到终端确认

#### Scenario: 错误事件到达

- **WHEN** 活跃会话收到 `error` 事件
- **THEN** 桌面端必须显示失败提醒，并让用户能快速查看摘要详情

#### Scenario: 用户触发回退动作

- **WHEN** 用户在提醒层触发当前版本无法直接回传的动作
- **THEN** 桌面端必须显示明确的终端回退结果提示

### Requirement: 成功事件必须显示轻量完成提示

桌面端 SHALL 在活跃会话收到 `success` 事件时显示自动消退的轻提醒，不得长期阻塞桌面视图。

#### Scenario: 完成事件到达

- **WHEN** 活跃会话收到 `success` 事件
- **THEN** 桌面端必须显示轻量完成提示，并在短时间后自动消退

