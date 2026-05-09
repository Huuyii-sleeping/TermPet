# 插件系统

## 目的

插件系统让桌宠命令行助手可以支持不同命令行工具，而不需要修改桌面端。每个插件负责把一个外部工具或一类命令转换成统一桌宠协议。

第一版只需要代码代理插件，但插件边界应该从一开始存在。

## 插件类型

### 钩子型插件

适合已经暴露生命周期钩子或结构化事件的工具。

例子：

- 代码代理工具钩子。
- 未来提供事件回调的代理命令行工具。
- 用户自己开发并暴露钩子的命令行工具。

优点：

- 准确。
- 解析风险低。
- 不需要处理大量终端输出。

缺点：

- 依赖工具自身提供钩子能力。

### 包装器插件

通过桌宠命令行助手运行命令：

```bash
termpet run npm test
termpet run git push
termpet run python script.py
```

优点：

- 能支持很多命令行工具。
- 可以捕获开始、标准输出、错误输出、退出码和耗时。
- 比自动识别终端内容更容易稳定支持。

缺点：

- 用户需要主动通过桌宠命令启动任务。

### 解析器插件

解析终端输出、日志文件或 Shell 集成数据。

优点：

- 使用体验更自动。

缺点：

- 容易受工具、Shell、操作系统、语言影响。
- 隐私风险更高。
- 不建议放进第一版。

## 规划目录

```text
plugins/
  codex/
    plugin.json
    adapter.ts
    README.md
  generic-cli/
    plugin.json
    adapter.ts
    README.md
```

## 插件清单

```json
{
  "id": "codex",
  "name": "代码代理适配器",
  "version": "0.1.0",
  "type": "hook",
  "entry": "./adapter.js",
  "capabilities": {
    "events": true,
    "actions": true,
    "approval": "maybe",
    "logs": true
  },
  "permissions": [
    "receive_hook_payload",
    "read_workspace_path",
    "send_local_events"
  ]
}
```

## 类型脚本接口

```ts
export interface TermPetPlugin {
  id: string;
  name: string;
  version: string;
  type: "hook" | "wrapper" | "parser";
  setup?(context: PluginContext): Promise<void>;
  handleEvent?(input: unknown, context: PluginContext): Promise<TermPetEvent[]>;
  handleAction?(action: TermPetActionRequest, context: PluginContext): Promise<TermPetActionResult>;
  stop?(): Promise<void>;
}
```

```ts
export interface PluginContext {
  emit(event: TermPetEvent): Promise<void>;
  log(level: "info" | "warn" | "error", message: string, metadata?: unknown): void;
  getSettings<T = unknown>(pluginId: string): Promise<T | undefined>;
}
```

```ts
export interface TermPetActionRequest {
  actionId: string;
  eventId: string;
  sessionId: string;
  source: string;
  kind: TermPetAction["kind"];
  metadata?: Record<string, unknown>;
}
```

```ts
export interface TermPetActionResult {
  ok: boolean;
  message?: string;
  requiresTerminalFallback?: boolean;
}
```

## 代码代理插件第一版

职责：

- 接收代码代理工具钩子载荷。
- 把钩子名称映射成桌宠状态。
- 生成短标题和短摘要。
- 把确认请求标记为需要用户动作。
- 将敏感原始数据保存在普通事件摘要之外。

预期映射：

| 钩子 | 状态 | 打断级别 |
| --- | --- | --- |
| `SessionStart` | `listening` | `bubble` |
| `UserPromptSubmit` | `thinking` | `bubble` |
| `PreToolUse` | `working` | `bubble` |
| `PermissionRequest` | `waiting_approval` | `modal` |
| `PostToolUse` 成功 | `working` | `bubble` |
| `PostToolUse` 失败 | `error` | `modal` |
| `Stop` | `success` | `toast` |

## 自定义命令行工具接入

如果用户自己的命令行工具暴露钩子，也可以直接接入桌宠。

推荐接入等级：

| 等级 | 能力 |
| --- | --- |
| 一级 | 只发送状态事件。 |
| 二级 | 发送任务详情和日志摘要。 |
| 三级 | 支持动作回传，例如允许、拒绝、停止、重跑。 |

最小钩子载荷示例：

```json
{
  "hook_event_name": "CommandStart",
  "session_id": "mycli_123",
  "cwd": "D:/project/foo",
  "command": "npm test",
  "summary": "正在运行测试",
  "timestamp": 1778060000000
}
```

适配器把它转换成统一事件：

```json
{
  "protocolVersion": "1.0",
  "id": "evt_001",
  "source": "my-cli",
  "sourceKind": "agent",
  "sessionId": "mycli_123",
  "workspace": "D:/project/foo",
  "state": "working",
  "title": "自定义工具正在工作",
  "summary": "正在运行测试",
  "timestamp": 1778060000000
}
```

## 通用命令插件后续规划

命令：

```bash
termpet run <command> [...args]
```

生命周期：

```text
进程开始 -> working
标准输出匹配 -> working、testing、building 等后续细分
退出码为 0 -> success
退出码非 0 -> error
```

第一版协议只使用 `working`、`success`、`error`。如果后续反复遇到明确类别，再增加更细状态。

## 插件安全

插件需要声明权限。至少包括：

- 是否读取命令输出。
- 是否读取工作目录。
- 是否展示原始日志。
- 是否能向工具回传动作。

未来插件安装界面需要在启用前展示这些权限。
