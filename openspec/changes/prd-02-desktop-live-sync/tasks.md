## 1. 状态同步收口

- [ ] 1.1 梳理 `apps/desktop/src/renderer/bridge-client.ts`，确保初始化拉取、`snapshot`、`event` 和错误状态都输出统一的数据结构。
- [ ] 1.2 调整桌面端渲染状态容器，移除对演示态的依赖，统一由桥接服务状态驱动当前主会话展示。

## 2. 桌宠实时渲染

- [ ] 2.1 修改 `apps/desktop/src/renderer/pet-shell.tsx`，让文案、动作和表情都从真实桥接状态映射得到。
- [ ] 2.2 补齐活跃会话切换后的主视图更新和桥接断开时的轻量降级显示。

## 3. 连接恢复与验证

- [ ] 3.1 为桥接连接补齐基本重连行为，并明确连接中、已连接、已断开三类状态。
- [ ] 3.2 通过本地运行或模拟事件验证 `thinking`、`working`、`waiting_approval`、`success`、`error` 的状态切换。
- [ ] 3.3 完成开发后更新任务状态，执行 `openspec.cmd validate prd-02-desktop-live-sync`，再进入提交与归档流程。
