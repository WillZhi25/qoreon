# Standard Project Public Skills

这份 README 是 `standard_project` 公共技能包的总入口。

如果你是第一次接手这个公开标准项目，先看这里，再决定是否继续深入到 `INDEX.md` 或单个 `SKILL.md`。

## 这层目录解决什么问题

`standard_project` 不再给每个角色单独做 role skill。

公开版把“我是谁、我负责什么”和“我该怎么做”拆开：

- 通道目录、通讯录、任务和知识沉淀
  负责告诉你自己负责什么
- 公共技能包
  负责告诉你启动、培训、协作、巡检和轮换时该怎么做

## 入口分工

- `seed/skills-manifest.json`
  机器读真源。说明哪些 skill 默认启用、能力标签、副作用等级和默认模式。
- `skills/README.md`
  人读总入口。先用它理解为什么只有这 8 个 skill、推荐先读什么、各入口各自负责什么。
- `skills/INDEX.md`
  目录页和推荐阅读顺序。适合准备正式接手项目前快速扫一遍。
- `skills/<skill>/SKILL.md`
  单个 skill 的详细说明。只有在你准备执行对应动作时，再进入单个 skill。

## 当前只公开这 8 个公共 skill

默认启用：

- `project-startup-collab-suite`
  负责启动项目、读取通讯录和生成启动批次。
- `agent-init-training-playbook`
  负责首轮培训、职责复述和首个动作对齐。
- `collab-message-send`
  负责跨通道协作、消息通知和最小回执。
- `ccr-update-playbook`
  负责维护通讯录、通道真源和协作入口。
- `skills-governance-upgrade`
  负责技能增删、升级和培训边界判断。
- `session-health-inspector`
  负责会话健康检查和上下文腐烂判断。
- `task-health-organizer`
  负责任务空间健康检查和知识整理。

按需启用：

- `session-rotation-handoff`
  只有在需要换会话、接力切换或会话轮换时再读。

## 推荐阅读顺序

如果你是安装电脑上的 AI，建议这样读：

1. 先读 `seed/skills-manifest.json`，确认默认启用范围。
2. 再读 `skills/README.md`，理解技能包的入口分工。
3. 然后读 `skills/INDEX.md`，按推荐顺序扫一遍 8 个公共 skill。
4. 真正开始工作前，再进入你要执行的 `skills/<skill>/SKILL.md`。
5. 进入某个通道后，再补读自己负责通道下的 `任务/`、`反馈/`、`产出物/材料/`、`产出物/沉淀/`。

## 和项目其他真源怎么配合

- `seed/ccr_roster_seed.json`
  告诉你 12 个通道分别是谁、做什么、怎么协作。
- `tasks/主体-总控/产出物/沉淀/03-标准项目通讯录与分工表.md`
  是人读版总表。
- `tasks/辅助05-团队协作Skills治理/产出物/沉淀/03-公开公共技能包清单.md`
  解释为什么公开版只保留这一层方法型 skill。

## 公开安全边界

- 公开 skill 只保留方法抽象、训练门禁、协作动作和治理判断。
- 可以公开字段名、状态名和推荐口径。
- 不公开真实 `session_id`、`run_id`、内部固定端口、私有 `.runtime/.sessions/.runs` 真源。
- 如果某条规则依赖项目私有实现，公开版只保留判断条件和输出口径，不暴露内部实现路径。
