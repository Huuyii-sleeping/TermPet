## 1. 事件提醒元数据

- [x] 1.1 调整 `plugins/codex/src/index.ts`，为等待确认、成功、失败等关键状态补齐 `interruptLevel`、`detail` 和终端回退动作描述。
- [x] 1.2 在桌面端状态层梳理活跃事件消费方式，确保提醒层可以读取当前关键事件及其动作信息。

## 2. 桌面端提醒 UI

- [x] 2.1 在 `apps/desktop/src/renderer/` 中实现 `silent` / `bubble` / `toast` / `modal` 的最小提醒表现。
- [x] 2.2 为 `waiting_approval` 和 `error` 增加强提醒内容，明确展示来源工具、工作目录、动作摘要、详情入口和终端回退提示。
- [x] 2.3 为 `success` 增加自动消退的轻提醒，不长期阻塞桌面。

## 3. 验证与归档

- [x] 3.1 通过类型检查、构建和本地模拟验证关键状态提醒是否符合 `PRD-03`。
- [x] 3.2 更新 OpenSpec 任务状态，执行 `openspec.cmd validate prd-03-critical-interrupts`，完成提交前准备。
