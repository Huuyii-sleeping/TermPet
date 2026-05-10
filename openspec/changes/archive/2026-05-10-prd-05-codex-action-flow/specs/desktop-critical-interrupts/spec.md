## MODIFIED Requirements

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
