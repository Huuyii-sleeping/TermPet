# 角色灵魂系统

## 目的

角色系统把视觉资源和性格行为分开。

```text
二维动态模型
  -> 决定角色长什么样、怎么动

角色灵魂
  -> 决定角色怎么说话、怎么打断、怎么反应、怎么选择动作
```

这样不同角色可以共享同一套协议，但表现出不同性格。

## 第一版范围

第一版支持基于规则的角色灵魂配置。大模型生成行为放到后续阶段。

第一版角色灵魂控制：

- 状态文案模板。
- 状态到表情的映射。
- 状态到动作的映射。
- 打断级别覆盖。
- 文案长度偏好。
- 行为强度。

## 目录结构

```text
pets/
  default/
    pet.json
    soul.json
    motions.json
    model/
```

## 角色清单

```json
{
  "id": "default",
  "name": "默认角色",
  "version": "0.1.0",
  "model": {
    "type": "live2d",
    "entry": "./model/model3.json"
  },
  "soul": "./soul.json",
  "motions": "./motions.json"
}
```

## 角色灵魂配置

```json
{
  "id": "calm-helper",
  "name": "冷静助手",
  "personality": "冷静、简洁、轻微吐槽",
  "messageStyle": {
    "maxLength": 40,
    "showTechnicalSummary": true,
    "showPersonifiedSummary": true
  },
  "interruptRules": {
    "idle": "silent",
    "listening": "bubble",
    "thinking": "bubble",
    "working": "bubble",
    "waiting_approval": "modal",
    "success": "toast",
    "error": "modal"
  },
  "messages": {
    "idle": ["我在。"],
    "listening": ["我听到新任务了。"],
    "thinking": ["代码代理正在思考。"],
    "working": ["代码代理正在使用工具。"],
    "waiting_approval": ["这里需要你确认一下。"],
    "success": ["任务完成了。"],
    "error": ["出错了，我把关键日志留好了。"]
  }
}
```

## 动作映射

```json
{
  "idle": {
    "expression": "neutral",
    "motion": "idle_loop"
  },
  "thinking": {
    "expression": "focused",
    "motion": "thinking_loop"
  },
  "working": {
    "expression": "busy",
    "motion": "typing_loop"
  },
  "waiting_approval": {
    "expression": "alert",
    "motion": "raise_sign"
  },
  "success": {
    "expression": "happy",
    "motion": "celebrate"
  },
  "error": {
    "expression": "confused",
    "motion": "concerned"
  }
}
```

## 文案组合

界面可以同时展示两层信息：

- 主要信息：`代码代理请求运行一个命令。`
- 拟人化短句：`这里需要你确认一下。`

这样既满足实用信息，又保留桌宠性格。

## 后续大模型角色灵魂

后续可以让大模型根据结构化事件摘要生成短提示。

约束：

- 默认不发送原始密钥、完整命令输出或文件内容。
- 限制生成文本长度。
- 文案必须服务于状态表达。
- 保留事件严重等级。
- 用户可以完全关闭大模型角色灵魂。

可能的大模型输入：

```json
{
  "state": "error",
  "source": "codex",
  "title": "命令失败",
  "summary": "npm test 退出码为 1",
  "severity": "error",
  "soul": "calm-helper"
}
```

可能的大模型输出：

```json
{
  "bubble": "测试失败了，我把短日志留好了。",
  "tone": "calm"
}
```

