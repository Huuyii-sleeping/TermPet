# PRD 目录

本目录用于存放 TermPet 的产品需求文档。

当前采用两层结构：

- `termpet-mvp.md`：第一版总 PRD，用于描述整体目标、范围和验收标准。
- `prd-01` 到 `prd-06`：从总 PRD 拆分出的可顺序执行子 PRD，用于指导具体开发。

## 推荐执行顺序

1. [PRD-01 桥接服务与会话状态基线](prd-01-bridge-session-baseline.md)
2. [PRD-02 桌宠状态渲染与实时同步](prd-02-desktop-state-sync.md)
3. [PRD-03 关键状态打断与确认提醒](prd-03-interrupt-and-approval.md)
4. [PRD-04 点击面板与多会话展示](prd-04-panel-and-multi-session.md)
5. [PRD-05 Codex 适配器增强与动作链路](prd-05-codex-adapter-and-actions.md)
6. [PRD-06 设置、持久化与可观测性收口](prd-06-settings-persistence-and-audit.md)

## 拆分原则

- 每个子 PRD 只覆盖一条清晰的交付链路。
- 前置能力必须先落地，再开发依赖它的交互。
- 第一版只做代码代理可视化，不把范围扩大到所有命令行工具。
- 可以为后续插件化、更多工具适配和角色系统预留接口，但不作为当前交付标准。

## 当前里程碑定义

当 `prd-01` 到 `prd-06` 全部完成后，第一版应至少满足：

- 桌宠窗口能稳定展示代码代理状态。
- 关键状态具备明确打断提醒。
- 用户能查看当前会话、最近活动和必要详情。
- 桥接服务具备最小可用的会话管理、动作审计和历史保留能力。
- Codex 事件链路能够稳定驱动桌宠行为。

