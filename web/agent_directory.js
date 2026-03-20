(function () {
  const DATA = JSON.parse(document.getElementById("data").textContent || "{}");
  const TASK_PAGE = (DATA.links && DATA.links.task_page) ? String(DATA.links.task_page) : "project-task-dashboard.html";
  const projects = Array.isArray(DATA.projects) ? DATA.projects : [];
  const COPY_LABEL = Object.create(null);
  const COPY_TIMER = Object.create(null);
  const FILTERS = ["all", "today-active", "today-inactive", "primary"];

  const STATE = {
    projectId: "",
    query: "",
    activity: "all",
  };

  function text(v) {
    return String(v == null ? "" : v).trim();
  }

  function numberValue(v) {
    const num = Number(v);
    return Number.isFinite(num) ? num : 0;
  }

  function formatZhDateTime(raw) {
    const value = text(raw);
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const pad = (num) => String(num).padStart(2, "0");
    return [
      date.getFullYear() + "年",
      pad(date.getMonth() + 1) + "月",
      pad(date.getDate()) + "日 ",
      pad(date.getHours()) + ":" + pad(date.getMinutes()),
    ].join("");
  }

  function el(tag, opts = {}, children = []) {
    const node = document.createElement(tag);
    if (opts.class) node.className = opts.class;
    if (opts.text != null) node.textContent = opts.text;
    if (opts.html != null) node.innerHTML = opts.html;
    if (opts.href) node.href = opts.href;
    if (opts.type) node.type = opts.type;
    if (opts.placeholder) node.placeholder = opts.placeholder;
    if (opts.title) node.title = opts.title;
    if (opts.dataset) {
      Object.entries(opts.dataset).forEach(([k, v]) => {
        if (v != null) node.dataset[k] = String(v);
      });
    }
    children.forEach((child) => {
      if (!child) return;
      node.appendChild(child);
    });
    return node;
  }

  function parseHash() {
    const hash = String(window.location.hash || "").replace(/^#/, "");
    const params = new URLSearchParams(hash);
    return {
      projectId: text(params.get("p")),
    };
  }

  function syncHash() {
    const params = new URLSearchParams();
    if (STATE.projectId) params.set("p", STATE.projectId);
    const next = params.toString();
    history.replaceState(null, "", next ? "#" + next : "#");
  }

  function primaryProjectId() {
    const fromHash = parseHash().projectId;
    if (fromHash && projects.some((p) => text(p.id) === fromHash)) return fromHash;
    return text(projects[0] && projects[0].id);
  }

  function getProject(projectId) {
    return projects.find((item) => text(item.id) === text(projectId)) || null;
  }

  function safeContext(raw) {
    const row = raw && typeof raw === "object" ? raw : {};
    return {
      project_id: text(row.project_id),
      channel_name: text(row.channel_name),
      session_id: text(row.session_id),
      environment: text(row.environment),
      worktree_root: text(row.worktree_root),
      workdir: text(row.workdir),
      branch: text(row.branch),
    };
  }

  function safeExecutionContext(raw) {
    const row = raw && typeof raw === "object" ? raw : {};
    const override = row.override && typeof row.override === "object" ? row.override : {};
    return {
      target: safeContext(row.target),
      source: safeContext(row.source),
      context_source: text(row.context_source),
      override: {
        applied: !!override.applied,
        fields: Array.isArray(override.fields) ? override.fields.map((item) => text(item)).filter(Boolean) : [],
        source: text(override.source),
      },
    };
  }

  function safeBusinessSummary(project) {
    const raw = project && project.agent_directory_summary && typeof project.agent_directory_summary === "object"
      ? project.agent_directory_summary
      : {};
    const topChannels = Array.isArray(raw.top_channels) ? raw.top_channels : [];
    const bySessionIdRaw = raw.by_session_id && typeof raw.by_session_id === "object" ? raw.by_session_id : {};
    const bySessionId = {};
    Object.keys(bySessionIdRaw).forEach((key) => {
      const row = bySessionIdRaw[key] && typeof bySessionIdRaw[key] === "object" ? bySessionIdRaw[key] : {};
      bySessionId[key] = {
        today_active: !!row.today_active,
        today_run_count: numberValue(row.today_run_count),
        total_run_count: numberValue(row.total_run_count),
        latest_run_id: text(row.latest_run_id),
        latest_status: text(row.latest_status).toLowerCase(),
        latest_created_at: text(row.latest_created_at),
        latest_channel_name: text(row.latest_channel_name),
        latest_summary: text(row.latest_summary),
        latest_conclusion: text(row.latest_conclusion),
        next_action: text(row.next_action),
        source_run_id: text(row.source_run_id),
        summary_source: text(row.summary_source),
      };
    });
    return {
      today: text(raw.today),
      generated_at: text(raw.generated_at),
      runs_root: text(raw.runs_root),
      today_run_count: numberValue(raw.today_run_count),
      active_agent_total: numberValue(raw.active_agent_total),
      active_today_agents: numberValue(raw.active_today_agents),
      inactive_today_agents: numberValue(raw.inactive_today_agents),
      top_channels: topChannels
        .map((row) => ({
          channel_name: text(row && row.channel_name),
          run_count: numberValue(row && row.run_count),
        }))
        .filter((row) => row.channel_name),
      bySessionId,
    };
  }

  function badge(nodeClass, label) {
    return el("span", { class: nodeClass, text: label });
  }

  function shortSessionId(value) {
    const sid = text(value);
    if (!sid) return "-";
    if (sid.length <= 16) return sid;
    return sid.slice(0, 8) + "…" + sid.slice(-4);
  }

  function sanitizeMentionLabelSegment(raw) {
    return text(raw).replace(/[^\u4e00-\u9fa5A-Za-z0-9._-]+/g, "");
  }

  function mentionBaseLabel(agent, channel) {
    const display = text(agent && (agent.name || agent.display_name));
    const channelName = text(channel && channel.channel_name);
    if (display && !/\s/.test(display)) return display;
    if (channelName && !/\s/.test(channelName)) return channelName;
    return (display || channelName || "协同对象").replace(/\s+/g, "");
  }

  function firstProjectText(project) {
    return text(project && (project.id || (project.project && project.project.project_id) || project.name || (project.project && project.project.project_name)));
  }

  function buildContactLabel(project, channel, agent) {
    const projectPart = sanitizeMentionLabelSegment(firstProjectText(project));
    const agentPart = sanitizeMentionLabelSegment(mentionBaseLabel(agent, channel));
    if (projectPart && agentPart) return projectPart + "/" + agentPart;
    return agentPart || projectPart || "协同对象";
  }

  function buildContactCopyText(project, channel, agent) {
    return "[协同对象: " + buildContactLabel(project, channel, agent) + "]";
  }

  function collabIdentityLabel(agent) {
    return agent && agent.is_primary ? "主协作" : "协作";
  }

  function statusLabel(status) {
    const value = text(status).toLowerCase();
    if (value === "running") return "进行中";
    if (value === "queued") return "排队中";
    if (value === "done") return "已完成";
    if (value === "error") return "异常";
    return value ? value : "未运行";
  }

  function statusBadgeClass(status) {
    const value = text(status).toLowerCase();
    if (value === "running") return "badge status is-running";
    if (value === "queued") return "badge status is-queued";
    if (value === "done") return "badge status is-done";
    if (value === "error") return "badge status is-error";
    return "badge status";
  }

  function businessStateLabel(agentStatus, business) {
    const status = text(agentStatus).toLowerCase();
    if (status && status !== "active") return status === "inactive" ? "当前未激活" : status;
    if (business.today_active) return "今日活跃";
    if (business.total_run_count > 0) return "今日未活跃";
    return "暂无业务记录";
  }

  function businessStateClass(agentStatus, business) {
    const status = text(agentStatus).toLowerCase();
    if (status && status !== "active") return "badge activity is-muted";
    if (business.today_active) return "badge activity is-active";
    if (business.total_run_count > 0) return "badge activity is-history";
    return "badge activity";
  }

  function businessSectionTitle(agentStatus, business) {
    const status = text(agentStatus).toLowerCase();
    if (status && status !== "active") return "最近留痕";
    if (business.today_active) return "今日业务摘要";
    if (business.total_run_count > 0) return "历史业务摘要";
    return "当前业务状态";
  }

  function businessSummaryText(agent) {
    const summary = text(agent.business.latest_summary);
    const conclusion = text(agent.business.latest_conclusion);
    const nextAction = text(agent.business.next_action);
    const desc = text(agent.desc);
    if (summary) return summary;
    if (conclusion) return "结论：" + conclusion;
    if (nextAction) return "下一步：" + nextAction;
    if (desc) return desc;
    return "还没有可展示的 run 级业务摘要，当前可先通过联系方式发起协同。";
  }

  function formatContextSummary(agent) {
    const parts = [];
    if (text(agent.target.environment)) parts.push(text(agent.target.environment));
    if (text(agent.target.branch)) parts.push("分支 " + text(agent.target.branch));
    return parts.length ? parts.join(" · ") : "未补充上下文";
  }

  async function copyTextToClipboard(content) {
    const value = text(content);
    if (!value) return false;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(value);
        return true;
      } catch (_) {}
    }
    const area = document.createElement("textarea");
    area.value = value;
    area.setAttribute("readonly", "readonly");
    area.style.position = "fixed";
    area.style.opacity = "0";
    area.style.pointerEvents = "none";
    document.body.appendChild(area);
    area.focus();
    area.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch (_) {
      ok = false;
    }
    document.body.removeChild(area);
    return ok;
  }

  function setCopyState(key, label) {
    if (!key) return;
    if (label) COPY_LABEL[key] = label;
    else delete COPY_LABEL[key];
    if (COPY_TIMER[key]) clearTimeout(COPY_TIMER[key]);
    if (label) {
      COPY_TIMER[key] = window.setTimeout(() => {
        delete COPY_LABEL[key];
        delete COPY_TIMER[key];
        render();
      }, 1500);
    }
  }

  function buildProjectContext(project) {
    const context = safeExecutionContext(project && project.project_execution_context);
    const target = context.target;
    return {
      environment: target.environment || "stable",
      worktree_root: target.worktree_root || "",
      workdir: target.workdir || target.worktree_root || "",
      branch: target.branch || "",
      context_source: context.context_source || "project",
    };
  }

  function buildSessionMaps(project) {
    const rows = Array.isArray(project && project.channel_sessions) ? project.channel_sessions : [];
    const byChannel = new Map();
    const bySessionId = new Map();
    rows.forEach((row) => {
      const normalized = row && typeof row === "object" ? row : {};
      const channelName = text(normalized.name || normalized.channel_name);
      if (!channelName) return;
      if (!byChannel.has(channelName)) byChannel.set(channelName, []);
      byChannel.get(channelName).push(normalized);
      const sessionId = text(normalized.session_id);
      if (sessionId) bySessionId.set(sessionId, normalized);
    });
    return { byChannel, bySessionId };
  }

  function buildAgentRecord(project, channel, agent, sessionRow, projectContext, businessSummary) {
    const rawAgent = agent && typeof agent === "object" ? agent : {};
    const rawSession = sessionRow && typeof sessionRow === "object" ? sessionRow : {};
    const executionContext = safeExecutionContext(rawSession.project_execution_context);
    const target = executionContext.target.environment || executionContext.target.worktree_root
      ? executionContext.target
      : safeContext({
          project_id: text(project && project.id),
          channel_name: text(channel && channel.channel_name),
          session_id: text(rawSession.session_id || rawAgent.session_id),
          environment: rawSession.environment || rawAgent.environment || projectContext.environment,
          worktree_root: rawSession.worktree_root || projectContext.worktree_root,
          workdir: rawSession.workdir || rawAgent.workdir || projectContext.workdir,
          branch: rawSession.branch || rawAgent.branch || projectContext.branch,
        });
    const source = executionContext.source.environment || executionContext.source.worktree_root
      ? executionContext.source
      : safeContext({
          project_id: text(project && project.id),
          channel_name: text(channel && channel.channel_name),
          environment: projectContext.environment,
          worktree_root: projectContext.worktree_root,
          workdir: projectContext.workdir,
          branch: projectContext.branch,
        });
    const bindingState = (() => {
      const raw = text(rawSession.context_binding_state).toLowerCase();
      if (raw) return raw;
      if (executionContext.override.applied) return "override";
      if (!text(rawSession.session_id || rawAgent.session_id)) return "unbound";
      return "bound";
    })();
    const effectiveWorkdir = target.workdir || rawSession.workdir || rawAgent.workdir || source.workdir;
    const effectiveWorktree = target.worktree_root || rawSession.worktree_root || source.worktree_root;
    const hasWorkdirDrift = !!(effectiveWorkdir && effectiveWorktree && effectiveWorkdir !== effectiveWorktree);
    const stateKind = (() => {
      if (bindingState === "unbound") return "unbound";
      if (bindingState === "override" || executionContext.override.applied) return "override";
      if (bindingState === "drift" || hasWorkdirDrift) return "drift";
      return "bound";
    })();
    const stateLabel = stateKind === "bound"
      ? "已绑定"
      : (stateKind === "override" ? "特例覆盖" : (stateKind === "drift" ? "上下文漂移" : "未完全绑定"));
    const contextBadges = [];
    if (target.environment || source.environment) {
      contextBadges.push(target.environment || source.environment || "stable");
    }
    if (target.branch || source.branch) {
      contextBadges.push("分支 " + (target.branch || source.branch));
    }
    if ((stateKind === "override" || stateKind === "drift") && executionContext.override.fields.length) {
      contextBadges.push("覆盖 " + executionContext.override.fields.join(" / "));
    }
    const sessionId = text(rawSession.session_id || rawAgent.session_id);
    const business = businessSummary.bySessionId[sessionId] || {
      today_active: false,
      today_run_count: 0,
      total_run_count: 0,
      latest_run_id: "",
      latest_status: "",
      latest_created_at: "",
      latest_channel_name: "",
      latest_summary: "",
      latest_conclusion: "",
      next_action: "",
      source_run_id: "",
      summary_source: "",
    };
    return {
      name: text(rawSession.display_name || rawAgent.display_name || rawSession.alias || rawAgent.desc || rawAgent.session_id) || "未命名 Agent",
      display_name: text(rawSession.display_name || rawAgent.display_name || rawSession.alias || rawAgent.desc || rawAgent.session_id),
      role: text(channel && channel.channel_role) || "未补角色",
      cli_type: text(rawSession.cli_type || rawAgent.cli_type || channel.primary_cli_type || "codex"),
      desc: text(rawSession.desc || rawAgent.desc),
      session_id: sessionId,
      is_primary: !!(rawSession.is_primary || rawAgent.is_primary),
      status: text(rawSession.status || rawAgent.status || "active"),
      session_role: text(rawSession.session_role || rawAgent.session_role || (rawSession.is_primary || rawAgent.is_primary ? "primary" : "child")),
      target,
      source,
      context_source: text(executionContext.context_source || projectContext.context_source || "project"),
      override_fields: executionContext.override.fields,
      state_kind: stateKind,
      state_label: stateLabel,
      context_badges: contextBadges,
      effective_worktree: effectiveWorktree,
      effective_workdir: effectiveWorkdir,
      business,
    };
  }

  function normalizeChannels(project) {
    const registry = (project && project.registry && typeof project.registry === "object") ? project.registry : {};
    const registryChannels = Array.isArray(registry.channels) ? registry.channels : [];
    const registryAgents = Array.isArray(registry.all_agents) ? registry.all_agents : [];
    const configChannels = Array.isArray(project && project.channels) ? project.channels : [];
    const projectContext = buildProjectContext(project);
    const sessionMaps = buildSessionMaps(project);
    const businessSummary = safeBusinessSummary(project);
    const channelsByName = new Map();
    registryChannels.forEach((channel) => {
      const name = text(channel.channel_name);
      if (name) channelsByName.set(name, channel);
    });
    configChannels.forEach((channel) => {
      const name = text(channel.name || channel.channel_name);
      if (name && !channelsByName.has(name)) {
        channelsByName.set(name, {
          channel_name: name,
          channel_desc: text(channel.desc || channel.channel_desc),
          channel_role: text(channel.channel_role),
          primary_session_id: "",
          primary_session_alias: "",
          primary_cli_type: "",
          startup_ready: false,
          session_candidates_count: 0,
          session_candidates: [],
        });
      }
    });
    sessionMaps.byChannel.forEach((_rows, channelName) => {
      if (!channelsByName.has(channelName)) {
        channelsByName.set(channelName, {
          channel_name: channelName,
          channel_desc: "",
          channel_role: "",
          primary_session_id: "",
          primary_session_alias: "",
          primary_cli_type: "",
          startup_ready: false,
          session_candidates_count: 0,
          session_candidates: [],
        });
      }
    });

    const registryAgentMap = new Map();
    registryAgents.forEach((agent) => {
      const channelName = text(agent.channel_name);
      if (!channelName) return;
      if (!registryAgentMap.has(channelName)) registryAgentMap.set(channelName, []);
      registryAgentMap.get(channelName).push(agent);
    });

    return Array.from(channelsByName.values()).map((channel) => {
      const channelName = text(channel.channel_name || channel.name);
      const sessionRows = sessionMaps.byChannel.get(channelName) || [];
      const channelAgents = registryAgentMap.get(channelName) || [];
      const sessionCandidateRows = channelAgents.length
        ? channelAgents
        : (sessionRows.length ? sessionRows : (Array.isArray(channel.session_candidates) ? channel.session_candidates : []));
      const agents = sessionCandidateRows.map((agent) => {
        const sessionId = text(agent.session_id);
        const sessionRow = sessionId && sessionMaps.bySessionId.has(sessionId)
          ? sessionMaps.bySessionId.get(sessionId)
          : sessionRows.find((row) => text(row.session_id) === sessionId) || null;
        return buildAgentRecord(project, channel, agent, sessionRow, projectContext, businessSummary);
      });
      agents.sort((a, b) => {
        const primaryDelta = Number(!!b.is_primary) - Number(!!a.is_primary);
        if (primaryDelta) return primaryDelta;
        const runDelta = numberValue(b.business.today_run_count) - numberValue(a.business.today_run_count);
        if (runDelta) return runDelta;
        return text(a.name).localeCompare(text(b.name), "zh-Hans-CN");
      });
      return {
        channel_name: channelName,
        channel_desc: text(channel.channel_desc || channel.desc),
        channel_role: text(channel.channel_role),
        primary_session_id: text(channel.primary_session_id),
        primary_session_alias: text(channel.primary_session_alias),
        primary_cli_type: text(channel.primary_cli_type),
        startup_ready: !!channel.startup_ready,
        session_candidates_count: Number(channel.session_candidates_count || agents.length || 0),
        agents,
        active_today_count: agents.filter((item) => item.business.today_active).length,
        today_run_count: agents.reduce((sum, item) => sum + numberValue(item.business.today_run_count), 0),
      };
    });
  }

  function collectAgents(channels) {
    return channels.reduce((list, channel) => list.concat(channel.agents || []), []);
  }

  function matchesActivity(agent) {
    if (STATE.activity === "today-active") return !!(agent && agent.business && agent.business.today_active);
    if (STATE.activity === "today-inactive") return text(agent && agent.status).toLowerCase() === "active" && !(agent && agent.business && agent.business.today_active);
    if (STATE.activity === "primary") return !!(agent && agent.is_primary);
    return true;
  }

  function matchesQuery(channel, agent, query) {
    const q = text(query).toLowerCase();
    if (!q) return true;
    const channelMatched = [
      channel.channel_name,
      channel.channel_desc,
      channel.channel_role,
      channel.primary_session_alias,
    ].some((value) => text(value).toLowerCase().includes(q));
    if (channelMatched) return true;
    return [
      agent.name,
      agent.desc,
      agent.session_id,
      agent.cli_type,
      agent.state_label,
      agent.target.environment,
      agent.target.branch,
      agent.effective_worktree,
      agent.business.latest_summary,
      agent.business.latest_conclusion,
      agent.business.next_action,
      businessStateLabel(agent.status, agent.business),
      statusLabel(agent.business.latest_status),
    ].some((value) => text(value).toLowerCase().includes(q));
  }

  function filterChannels(channels) {
    return channels
      .map((channel) => {
        const agents = channel.agents.filter((agent) => matchesActivity(agent) && matchesQuery(channel, agent, STATE.query));
        if (!agents.length) return null;
        return {
          ...channel,
          agents,
          active_today_count: agents.filter((item) => item.business.today_active).length,
          today_run_count: agents.reduce((sum, item) => sum + numberValue(item.business.today_run_count), 0),
        };
      })
      .filter(Boolean);
  }

  function updateHeader(project) {
    const title = document.getElementById("pageTitle");
    const subtitle = document.getElementById("pageSubtitle");
    const back = document.getElementById("backToTaskPage");
    const summary = safeBusinessSummary(project);
    const projectName = text(project && project.name) || firstProjectText(project) || "项目通讯录";
    if (title) title.textContent = projectName + " · Agent 联系名单";
    const generatedAt = text(project && project.registry && project.registry.generated_at) || text(summary.generated_at) || text(DATA.generated_at);
    if (subtitle) {
      subtitle.textContent = generatedAt
        ? `当前项目 ${projectName}，把联系方式、今日业务近况和活跃状态合并展示。数据基于通讯录真源与 run 留痕，最近同步：${formatZhDateTime(generatedAt)}。`
        : `当前项目 ${projectName}，把联系方式、今日业务近况和活跃状态合并展示。数据基于通讯录真源与 run 留痕。`;
    }
    if (back && project) back.href = String(TASK_PAGE || "project-task-dashboard.html") + "#p=" + encodeURIComponent(text(project.id));
    document.title = projectName + " · Agent 联系名单";
  }

  function renderProjectList() {
    const list = document.getElementById("projectList");
    if (!list) return;
    list.innerHTML = "";
    projects.forEach((project) => {
      const channels = normalizeChannels(project);
      const agents = collectAgents(channels);
      const summary = safeBusinessSummary(project);
      const item = el("button", {
        class: "project-item" + (text(project.id) === text(STATE.projectId) ? " active" : ""),
        type: "button",
        dataset: { projectId: text(project.id) },
      }, [
        el("div", { class: "project-item-title", text: text(project.name) || firstProjectText(project) }),
        el("div", { class: "project-item-meta", text: `通道 ${channels.length} · Agent ${agents.length} · 今日活跃 ${summary.active_today_agents || 0}` }),
      ]);
      item.addEventListener("click", () => {
        STATE.projectId = text(project.id);
        syncHash();
        render();
      });
      list.appendChild(item);
    });
  }

  function renderSummary(project, allChannels) {
    const bar = document.getElementById("summaryBar");
    if (!bar) return;
    const summary = safeBusinessSummary(project);
    const allAgents = collectAgents(allChannels);
    const primaryAgents = allAgents.filter((agent) => agent && agent.is_primary).length;
    const topChannel = summary.top_channels[0];
    const cards = [
      ["当前项目", text(project && project.name) || firstProjectText(project) || "-", true],
      ["总 Agent", String(allAgents.length)],
      ["今日活跃", String(summary.active_today_agents || allAgents.filter((agent) => agent.business.today_active).length)],
      ["今日 Run", String(summary.today_run_count || 0)],
      ["主协作", String(primaryAgents)],
      ["最忙通道", topChannel ? `${topChannel.channel_name} · ${topChannel.run_count}` : "-"],
    ];
    bar.innerHTML = "";
    cards.forEach(([label, value, isProject]) => {
      bar.appendChild(el("div", { class: "summary-card" }, [
        el("div", { class: "summary-label", text: label }),
        el("div", { class: isProject ? "summary-value is-project" : "summary-value", text: value }),
      ]));
    });
  }

  function renderFilters(project, allChannels) {
    const filterBar = document.getElementById("filterBar");
    const toolbarNote = document.getElementById("toolbarNote");
    if (!filterBar || !toolbarNote) return;
    const summary = safeBusinessSummary(project);
    const allAgents = collectAgents(allChannels);
    const counts = {
      all: allAgents.length,
      "today-active": allAgents.filter((agent) => agent.business.today_active).length,
      "today-inactive": allAgents.filter((agent) => text(agent.status).toLowerCase() === "active" && !agent.business.today_active).length,
      primary: allAgents.filter((agent) => agent.is_primary).length,
    };
    const labels = {
      all: "全部",
      "today-active": "今日活跃",
      "today-inactive": "今日未活跃",
      primary: "主协作",
    };
    filterBar.innerHTML = "";
    FILTERS.forEach((key) => {
      const button = el("button", {
        class: "filter-btn" + (STATE.activity === key ? " active" : ""),
        type: "button",
        text: `${labels[key]} ${counts[key] || 0}`,
      });
      button.addEventListener("click", () => {
        STATE.activity = key;
        render();
      });
      filterBar.appendChild(button);
    });
    const topChannels = summary.top_channels.slice(0, 3).map((row) => `${row.channel_name} ${row.run_count}`).join(" · ");
    toolbarNote.textContent = topChannels
      ? `${summary.today || "今日"} 主线通道：${topChannels}`
      : `${summary.today || "今日"} 暂无 run 级活跃数据，当前页面仅展示通讯录与历史业务摘要。`;
  }

  function renderChannels(project, channels) {
    const grid = document.getElementById("channelGrid");
    const empty = document.getElementById("emptyState");
    if (!grid || !empty) return;
    grid.innerHTML = "";
    if (!project || !channels.length) {
      empty.hidden = false;
      return;
    }
    empty.hidden = true;
    channels.forEach((channel) => {
      const card = el("article", { class: "channel-card" });
      const headMetaParts = [];
      if (channel.channel_desc) headMetaParts.push(channel.channel_desc);
      headMetaParts.push(`Agent ${channel.agents.length}`);
      headMetaParts.push(`今日活跃 ${channel.active_today_count}`);
      headMetaParts.push(`今日 run ${channel.today_run_count}`);
      const head = el("div", { class: "channel-head" }, [
        el("div", {}, [
          el("h2", { class: "channel-title", text: channel.channel_name }),
          el("div", { class: "channel-meta", text: headMetaParts.join(" · ") }),
        ]),
        el("div", { class: "channel-count", text: channel.channel_role || "未补角色" }),
      ]);
      const agentList = el("div", { class: "agent-list" });
      channel.agents.forEach((agent) => {
        const copyKey = text(agent.session_id) || `${firstProjectText(project)}-${channel.channel_name}-${agent.name}`;
        const copyLabel = COPY_LABEL[copyKey] || "复制联系方式";
        const contactText = buildContactCopyText(project, channel, agent);
        const copyBtn = el("button", {
          class: `contact-btn${copyLabel === "已复制" ? " copied" : ""}`,
          type: "button",
          text: copyLabel,
          title: `复制后可直接粘贴到输入框：${contactText}`,
        });
        copyBtn.addEventListener("click", async () => {
          const ok = await copyTextToClipboard(contactText);
          setCopyState(copyKey, ok ? "已复制" : "复制失败");
          render();
        });
        const chipRow = el("div", { class: "agent-chip-row" });
        chipRow.appendChild(badge("badge role" + (agent.is_primary ? " primary" : " secondary"), collabIdentityLabel(agent)));
        chipRow.appendChild(badge(businessStateClass(agent.status, agent.business), businessStateLabel(agent.status, agent.business)));
        chipRow.appendChild(badge(statusBadgeClass(agent.business.latest_status), statusLabel(agent.business.latest_status)));
        if (agent.state_label) chipRow.appendChild(badge("badge state", agent.state_label));
        const metrics = el("div", { class: "agent-metrics" });
        [
          `CLI ${agent.cli_type || "-"}`,
          `Session ${shortSessionId(agent.session_id)}`,
          `今日 ${numberValue(agent.business.today_run_count)}`,
          `最近 ${formatZhDateTime(agent.business.latest_created_at)}`,
        ].forEach((label) => {
          metrics.appendChild(el("span", { class: "metric-pill", text: label }));
        });
        if (agent.business.latest_run_id) {
          metrics.appendChild(el("span", {
            class: "metric-pill strong",
            text: `run ${shortSessionId(agent.business.latest_run_id)}`,
            title: agent.business.latest_run_id,
          }));
        }
        const contextRow = el("div", { class: "agent-context-row" });
        (agent.context_badges.length ? agent.context_badges : [formatContextSummary(agent)]).forEach((label) => {
          contextRow.appendChild(el("span", { class: "context-pill", text: label }));
        });
        const fieldList = el("div", { class: "agent-field-list" }, [
          el("div", { class: "agent-field-row" }, [
            el("div", { class: "agent-field-label", text: "通道" }),
            el("div", { class: "agent-field-value", text: channel.channel_name }),
          ]),
          el("div", { class: "agent-field-row" }, [
            el("div", { class: "agent-field-label", text: "会话" }),
            el("div", { class: "agent-field-value", text: agent.session_id || "未绑定 session" }),
          ]),
        ]);
        if (agent.business.next_action) {
          fieldList.appendChild(el("div", { class: "agent-field-row" }, [
            el("div", { class: "agent-field-label", text: "下一步" }),
            el("div", { class: "agent-field-value", text: agent.business.next_action }),
          ]));
        }
        const agentCard = el("div", { class: "agent-card" + (agent.is_primary ? " primary" : "") }, [
          el("div", { class: "agent-main" }, [
            el("div", { class: "agent-name-row" }, [
              el("div", { class: "agent-name-block" }, [
                el("div", { class: "agent-name", text: agent.name }),
                text(agent.desc) && text(agent.desc) !== text(agent.name)
                  ? el("div", { class: "agent-desc", text: agent.desc })
                  : null,
              ]),
              chipRow,
            ]),
            metrics,
            contextRow,
            el("div", { class: "business-panel" }, [
              el("div", { class: "business-title", text: businessSectionTitle(agent.status, agent.business) }),
              el("div", { class: "business-summary", text: businessSummaryText(agent) }),
            ]),
            fieldList,
            el("div", { class: "agent-contact-row" }, [
              el("div", { class: "agent-contact-label", text: "联系方式" }),
              el("code", { class: "agent-contact-value", text: contactText, title: contactText }),
            ]),
          ]),
          el("div", { class: "agent-actions" }, [
            copyBtn,
          ]),
        ]);
        agentList.appendChild(agentCard);
      });
      card.appendChild(head);
      card.appendChild(agentList);
      grid.appendChild(card);
    });
  }

  function render() {
    const project = getProject(STATE.projectId);
    const allChannels = normalizeChannels(project);
    const visibleChannels = filterChannels(allChannels);
    renderProjectList();
    updateHeader(project);
    renderSummary(project, allChannels);
    renderFilters(project, allChannels);
    renderChannels(project, visibleChannels);
  }

  function bindSearch() {
    const input = document.getElementById("searchInput");
    if (!input) return;
    input.addEventListener("input", () => {
      STATE.query = text(input.value);
      render();
    });
  }

  function init() {
    const hashState = parseHash();
    STATE.projectId = hashState.projectId || primaryProjectId();
    if (!FILTERS.includes(STATE.activity)) STATE.activity = "all";
    bindSearch();
    render();
  }

  init();
})();
