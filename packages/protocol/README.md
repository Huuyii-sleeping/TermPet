# protocol

`packages/protocol` 定义桌宠命令行助手的统一事件协议。

## 作用

- 约束桌面端、桥接服务和适配器之间共享的数据结构。
- 提供标准状态、动作、事件和会话类型。
- 统一协议版本和默认归一化行为。

## 当前导出

当前主要导出位于 `src/index.ts`，包括：

- `TermPetState`
- `InterruptLevel`
- `SourceKind`
- `TermPetAction`
- `TermPetEvent`
- `TermPetSession`
- `defaultInterruptLevelByState`
- `normalizeEvent`

## 设计原则

- 所有事件都必须带 `protocolVersion` 和 `sessionId`。
- 摘要字段优先服务桌宠气泡和通知展示，不承载大段原始内容。
- 桌面端只消费标准协议，不直接理解具体工具原始载荷。

## 后续待补

- 更严格的运行时校验。
- 协议升级策略和版本兼容说明。
- 更完整的动作来源、审计和风险等级约束。
