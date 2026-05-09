# 事件协议

## 目标

统一事件协议为所有命令行工具适配器提供稳定格式。协议需要足够表达代码代理和未来工具的状态，同时又要简单，让桌面端不需要理解具体工具的内部结构。

## 版本

每个事件都包含 `protocolVersion`。

第一版协议版本：

```text
1.0
```

破坏性变更必须提升主版本号。

## 状态模型

```ts
export type TermPetState =
  | "idle"
  | "listening"
  | "thinking"
  | "working"
  | "waiting_approval"
  | "success"
  | "error";
```

状态含义：

| 状态 | 含义 |
| --- | --- |
| `idle` | 当前没有活跃任务。 |
| `listening` | 用户正在提交或刚提交输入。 |
| `thinking` | 代理或命令行工具正在规划、推理或准备。 |
| `working` | 正在执行工具、修改文件、运行命令、跑测试等实际工作。 |
| `waiting_approval` | 需要用户做决定。 |
| `success` | 任务或命令成功完成。 |
| `error` | 任务或命令失败，或产生重要错误。 |

## 打断模型

```ts
export type InterruptLevel =
  | "silent"
  | "bubble"
  | "toast"
  | "modal";
```

默认映射：

```ts
export const defaultInterruptLevelByState = {
  idle: "silent",
  listening: "bubble",
  thinking: "bubble",
  working: "bubble",
  waiting_approval: "modal",
  success: "toast",
  error: "modal",
} as const;
```

## 事件结构

```ts
export interface TermPetEvent {
  protocolVersion: "1.0";
  id: string;
  source: string;
  sourceKind: "agent" | "command" | "system";
  sessionId: string;
  workspace?: string;
  state: TermPetState;
  interruptLevel?: InterruptLevel;
  title: string;
  summary: string;
  detail?: string;
  severity?: "info" | "success" | "warning" | "error";
  requiresAction?: boolean;
  actions?: TermPetAction[];
  rawRef?: string;
  metadata?: Record<string, unknown>;
  timestamp: number;
}
```

字段说明：

| 字段 | 说明 |
| --- | --- |
| `id` | 唯一事件标识。 |
| `source` | 适配器标识，例如 `codex`。 |
| `sourceKind` | 来源大类。 |
| `sessionId` | 稳定会话标识。 |
| `workspace` | 项目目录或工作目录。 |
| `state` | 标准化后的桌宠状态。 |
| `interruptLevel` | 可选，用于覆盖状态默认打断级别。 |
| `title` | 短标题，用于界面展示。 |
| `summary` | 短摘要，用于气泡或提示。 |
| `detail` | 可选长文本，用于详情面板。 |
| `requiresAction` | 是否需要用户操作。 |
| `actions` | 可用用户操作。 |
| `rawRef` | 原始载荷引用，不直接放原始内容。 |
| `metadata` | 适配器自定义结构化数据。 |
| `timestamp` | 毫秒级时间戳。 |

## 动作结构

```ts
export interface TermPetAction {
  id: string;
  label: string;
  kind:
    | "approve"
    | "deny"
    | "open_detail"
    | "open_terminal"
    | "dismiss"
    | "rerun"
    | "stop";
  risk?: "low" | "medium" | "high";
  enabled?: boolean;
  requiresTerminalFallback?: boolean;
  metadata?: Record<string, unknown>;
}
```

## 会话结构

```ts
export interface TermPetSession {
  id: string;
  source: string;
  sourceKind: "agent" | "command" | "system";
  workspace?: string;
  title: string;
  currentState: TermPetState;
  latestEventId: string;
  latestActivityAt: number;
  createdAt: number;
  pinned?: boolean;
}
```

## 示例事件

### 思考中

```json
{
  "protocolVersion": "1.0",
  "id": "evt_001",
  "source": "codex",
  "sourceKind": "agent",
  "sessionId": "codex_abc",
  "workspace": "D:/projects/app",
  "state": "thinking",
  "title": "代码代理正在思考",
  "summary": "我正在判断需要修改什么。",
  "severity": "info",
  "timestamp": 1778060000000
}
```

### 等待确认

```json
{
  "protocolVersion": "1.0",
  "id": "evt_002",
  "source": "codex",
  "sourceKind": "agent",
  "sessionId": "codex_abc",
  "workspace": "D:/projects/app",
  "state": "waiting_approval",
  "interruptLevel": "modal",
  "title": "代码代理需要确认",
  "summary": "代码代理请求运行一个命令。",
  "severity": "warning",
  "requiresAction": true,
  "actions": [
    {
      "id": "approve_001",
      "label": "允许",
      "kind": "approve",
      "risk": "medium"
    },
    {
      "id": "deny_001",
      "label": "拒绝",
      "kind": "deny",
      "risk": "low"
    },
    {
      "id": "detail_001",
      "label": "查看详情",
      "kind": "open_detail"
    }
  ],
  "timestamp": 1778060001000
}
```

### 失败

```json
{
  "protocolVersion": "1.0",
  "id": "evt_003",
  "source": "codex",
  "sourceKind": "agent",
  "sessionId": "codex_abc",
  "workspace": "D:/projects/app",
  "state": "error",
  "interruptLevel": "modal",
  "title": "代码代理遇到错误",
  "summary": "上一次工具调用失败，最近日志可以查看。",
  "severity": "error",
  "timestamp": 1778060002000
}
```

## 隐私规则

事件默认只包含短摘要。大段原始载荷、代码片段、命令输出、密钥、文件内容应该单独存储，并通过 `rawRef` 引用。
