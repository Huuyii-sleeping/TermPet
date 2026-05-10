## ADDED Requirements

### Requirement: 桥接服务必须提供最小动作请求接口

桥接服务 SHALL 提供统一动作请求入口，用于接收桌面端发起的动作请求并返回标准动作结果。

#### Scenario: 动作请求到达

- **WHEN** 桌面端向桥接服务提交动作请求
- **THEN** 桥接服务必须校验动作与事件关系，并返回标准结果

### Requirement: 当前版本不支持真实回传时必须明确终端回退

桥接服务 SHALL 在当前版本无法真实回传动作时返回 `requiresTerminalFallback` 结果，并给出清晰提示。

#### Scenario: 请求审批动作

- **WHEN** 用户请求 `approve` 或 `deny` 动作且当前版本不支持真实回传
- **THEN** 桥接服务必须返回要求用户回终端处理的结果
