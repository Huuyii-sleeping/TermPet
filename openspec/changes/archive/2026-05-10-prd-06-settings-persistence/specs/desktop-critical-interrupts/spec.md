## MODIFIED Requirements

### Requirement: 桌面端必须根据 interruptLevel 渲染最小提醒层级

桌面端 SHALL 根据活跃会话最近关键事件的 `interruptLevel` 渲染 `silent`、`bubble`、`toast`、`modal` 四类最小提醒表现，并受到本地提醒偏好设置控制。

#### Scenario: 事件为轻量气泡提醒

- **WHEN** 活跃会话最近事件的 `interruptLevel` 为 `bubble`
- **THEN** 桌宠必须显示非阻塞的状态气泡，不覆盖主视图

#### Scenario: 用户关闭成功提醒

- **WHEN** 用户关闭成功提醒开关且收到 `success` 事件
- **THEN** 桌面端不得显示对应 `toast`
