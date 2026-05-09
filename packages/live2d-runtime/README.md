# live2d-runtime

`packages/live2d-runtime` 是二维动态角色运行时的轻量封装层。

## 作用

- 将标准状态映射为角色动作和表情。
- 隔离桌面端界面与具体角色资源实现。
- 为后续接入真实二维模型运行时保留统一出口。

## 当前实现

当前 `src/index.ts` 主要提供：

- `Live2DStateMotion`
- `defaultMotionByState`
- `getMotionForState(state)`

现阶段它还是“状态到表现参数”的映射层，不是完整的模型渲染器。

## 后续待补

- 角色资源加载。
- 动作队列与状态切换优先级。
- 表情、动作和打断提醒的联动控制。
- 不同角色配置的外部化能力。

