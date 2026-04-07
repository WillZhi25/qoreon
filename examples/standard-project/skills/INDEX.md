# Standard Project Skills Index

`standard_project` 只保留公共技能。

角色相关的信息不再单独做成 role skill，而是放在各通道目录、通讯录和知识沉淀里。

## 入口分工

- `README.md`
  说明标准项目是什么、先读什么、如何启动。
- `seed/skills-manifest.json`
  机器读真源，说明哪些 skill 默认启用、能力标签和副作用等级。
- `skills/README.md`
  人读总入口，说明为什么只保留这 8 个公共 skill、各入口分别负责什么。
- `skills/INDEX.md`
  人读入口，说明推荐加载顺序、默认启用情况和公开安全边界。
- `skills/<skill>/SKILL.md`
  单个 skill 的用途、触发场景、门禁、输出和边界。

## 默认启用

以下 7 个 skill 默认启用：

- `project-startup-collab-suite`
- `agent-init-training-playbook`
- `collab-message-send`
- `ccr-update-playbook`
- `skills-governance-upgrade`
- `session-health-inspector`
- `task-health-organizer`

按需启用：

- `session-rotation-handoff`

## 技能分组

默认启动与首轮接手：

- `project-startup-collab-suite`
  项目启动、读取通讯录、生成启动批次。
- `agent-init-training-playbook`
  首轮培训、职责复述、首个动作对齐。
- `collab-message-send`
  跨通道协作、消息通知和最小回执。
- `ccr-update-playbook`
  维护通讯录、通道真源和协作入口。

治理辅助：

- `skills-governance-upgrade`
  技能增删、升级和培训边界判断。
- `session-health-inspector`
  会话健康检查和上下文腐烂判断。
- `task-health-organizer`
  任务空间健康检查和知识整理。

按需切换：

- `session-rotation-handoff`
  会话轮换和接力切换。

## 推荐阅读顺序

1. 先读 `seed/skills-manifest.json`，确认默认启用和能力标签。
2. 再读 `skills/README.md`，理解技能包入口分工。
3. `project-startup-collab-suite`
4. `agent-init-training-playbook`
5. `collab-message-send`
6. 再读取自己负责通道下的 `任务/`、`反馈/`、`产出物/材料/`、`产出物/沉淀/`
7. 需要治理时，再读 `ccr-update-playbook` / `skills-governance-upgrade` / `session-health-inspector` / `task-health-organizer`
8. 需要换会话时，再读 `session-rotation-handoff`

## 公开安全边界

- 公开 skill 只抽象协作方法、训练门禁和治理动作。
- 可以公开字段名和状态名，但不公开真实 `session_id`、`run_id`、`announce_run_id`。
- 不公开私有 `.runtime/.sessions/.runs`、内部固定端口或生产 registry 真源。
- 如果某条规则依赖项目私有实现，公开版只保留“判断条件”和“输出口径”，不暴露内部代码路径。

## 对安装电脑上的 AI 的意义

- 通道目录和通讯录帮助你理解各通道分工
- 公共技能帮助你把项目真的跑起来、协同起来、维护起来
