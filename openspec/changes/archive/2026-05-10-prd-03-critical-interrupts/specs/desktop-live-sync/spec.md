## MODIFIED Requirements

### Requirement: 桌面端必须实时响应桥接事件和主会话切换

桌面端 SHALL 在收到 `snapshot` 或 `event` 消息时，立即更新当前主会话对应的桌宠文案、动作、表情和关键提醒；当活跃会话发生变化时，主视图 MUST 切换到最新活跃会话，并重算其对应提醒。

#### Scenario: 收到新的活跃会话快照

- **WHEN** 桥接服务推送包含新 `activeSessionId` 的 `snapshot`
- **THEN** 桌宠主视图必须切换到该会话的最新状态

#### Scenario: 收到状态事件

- **WHEN** 桥接服务收到 `thinking`、`working`、`waiting_approval`、`success` 或 `error` 事件并广播给桌面端
- **THEN** 桌宠必须立即更新对应的文案、动作、表情和提醒层状态
