(() => {
  const DATA = JSON.parse(document.getElementById("data")?.textContent || "{}");
  const LINKS = (DATA && DATA.links && typeof DATA.links === "object") ? DATA.links : {};
  const TOKEN_KEY = "taskDashboard.token";
  const AVATAR_V1_KEY = "taskDashboard.avatarAssignments.v1";
  const AVATAR_V2_KEY = "taskDashboard.avatarAssignments.v2";
  const STORAGE_PREFIX = "taskDashboard.agentRelationshipBoard.v2";
  const CARD_WIDTH = 228;
  const CARD_HEIGHT = 116;
  const GROUP_PADDING = 24;
  const STAGE_MIN = {
    project: { width: 3800, height: 2280 },
    platform: { width: 11200, height: 6800 },
  };
  const ROWS = {
    master: { label: "总管", y: 120, accent: "#63dac8" },
    assist: { label: "营运（辅助）", y: 470, accent: "#7db7ff" },
    dev: { label: "业务执行", y: 1030, accent: "#f4c86d" },
    other: { label: "新业务（其他）", y: 1590, accent: "#ba9cff" },
  };
  const WINDOW_MS = {
    "1h": 60 * 60 * 1000,
    "3h": 3 * 60 * 60 * 1000,
    "24h": 24 * 60 * 60 * 1000,
  };
  const PLATFORM_HIGH_FREQ_COUNT = 5;
  const PLATFORM_RUNS_PAGE_LIMIT = 200;
  const PLATFORM_RUNS_MAX_PAGES = 12;
  const PLATFORM_PROJECT_LAYOUT_BASE_SCALE = 0.42;
  const PLATFORM_PROJECT_LAYOUT_MAX_WIDTH = 1260;
  const PLATFORM_PROJECT_LAYOUT_MAX_HEIGHT = 860;
  const PLATFORM_PROJECT_LAYOUT_COMPACT_SCALE = 0.86;
  const RELATION_TYPES = {
    business: { label: "主责", color: "rgba(99,218,200,0.92)" },
    support: { label: "支撑", color: "rgba(125,183,255,0.9)" },
    dependency: { label: "依赖", color: "rgba(244,200,109,0.92)" },
  };
  const AVATAR_CATALOG = [
    ["chief", "总控指挥", "🧭", "#dbeafe", "#bfdbfe"],
    ["pmo", "督办PMO", "📣", "#fef3c7", "#fde68a"],
    ["planner", "需求规划", "🗺️", "#e0e7ff", "#c7d2fe"],
    ["prototype", "原型设计", "🧩", "#ede9fe", "#ddd6fe"],
    ["ui", "UI视觉", "🎨", "#fae8ff", "#f5d0fe"],
    ["ux", "交互体验", "🖱️", "#fce7f3", "#fbcfe8"],
    ["frontend", "前端开发", "💻", "#dcfce7", "#bbf7d0"],
    ["backend", "后端开发", "🧱", "#d1fae5", "#a7f3d0"],
    ["api", "接口契约", "🔌", "#cffafe", "#a5f3fc"],
    ["data", "数据治理", "🧮", "#e0f2fe", "#bae6fd"],
    ["runtime", "运行时", "⚙️", "#f1f5f9", "#e2e8f0"],
    ["scheduler", "任务调度", "🕒", "#fef9c3", "#fde047"],
    ["ai-engine", "AI引擎", "🤖", "#ecfccb", "#d9f99d"],
    ["adapter", "多CLI适配", "🔀", "#ccfbf1", "#99f6e4"],
    ["qa", "测试验收", "✅", "#dcfce7", "#86efac"],
    ["regression", "回归测试", "♻️", "#ecfccb", "#bef264"],
    ["release", "发布管控", "🚀", "#ede9fe", "#c4b5fd"],
    ["ops", "运维巡检", "🛠️", "#ffedd5", "#fdba74"],
    ["sre", "稳定性SRE", "🛡️", "#dbeafe", "#93c5fd"],
    ["alarm", "异常告警", "🚨", "#fee2e2", "#fecaca"],
    ["security", "安全审查", "🔐", "#f3e8ff", "#e9d5ff"],
    ["compliance", "合规审查", "📜", "#fae8ff", "#e9d5ff"],
    ["doc", "文档沉淀", "🗂️", "#f8fafc", "#e2e8f0"],
    ["knowledge", "知识库", "📚", "#e0f2fe", "#bae6fd"],
    ["collab", "跨通道协作", "🤝", "#d1fae5", "#6ee7b7"],
    ["announce", "通道通知", "📨", "#fef3c7", "#fcd34d"],
    ["meeting", "对齐会议", "🧑‍💼", "#ede9fe", "#c4b5fd"],
    ["archive", "归档收口", "📦", "#e2e8f0", "#cbd5e1"],
    ["board", "看板可视化", "📊", "#cffafe", "#67e8f9"],
    ["org", "组织架构", "🕸️", "#e0e7ff", "#a5b4fc"],
    ["timeline", "进度时间线", "📈", "#dcfce7", "#86efac"],
    ["message", "消息治理", "💬", "#fee2e2", "#fda4af"],
    ["memo", "备忘提醒", "📝", "#fef9c3", "#fde68a"],
    ["avatar", "头像管理", "🧑", "#fae8ff", "#f5d0fe"],
    ["inspector", "自动巡查", "🔍", "#dbeafe", "#93c5fd"],
    ["heartbeat", "心跳监控", "💓", "#fee2e2", "#fca5a5"],
    ["queue", "队列治理", "🧵", "#ecfccb", "#bef264"],
    ["callback", "系统回执", "📬", "#e0f2fe", "#7dd3fc"],
    ["escalate", "升级处理", "⬆️", "#ffedd5", "#fdba74"],
    ["product", "产品经理", "👩‍💼", "#fce7f3", "#fbcfe8"],
    ["engineer", "工程师", "👨‍💻", "#dcfce7", "#86efac"],
    ["tester", "测试同学", "🧪", "#cffafe", "#67e8f9"],
    ["analyst", "业务分析", "🔎", "#f3e8ff", "#ddd6fe"],
    ["designer", "设计师", "🖌️", "#fae8ff", "#f5d0fe"],
    ["mentor", "协同教练", "🧠", "#fef3c7", "#fde68a"],
    ["finance", "成本评估", "💰", "#ecfccb", "#bef264"],
    ["crm", "客户沟通", "☎️", "#dbeafe", "#bfdbfe"],
    ["contract", "合同流程", "📄", "#f1f5f9", "#cbd5e1"],
    ["delivery", "交付推进", "🚚", "#ffedd5", "#fed7aa"],
    ["risk", "风险管理", "⚠️", "#fee2e2", "#fecaca"],
    ["decision", "决策支持", "🎯", "#e0e7ff", "#c7d2fe"],
    ["customer", "用户成功", "🙋", "#dcfce7", "#bbf7d0"],
    ["growth", "增长运营", "📣", "#fef3c7", "#fcd34d"],
    ["notion", "知识协同", "🗃️", "#e2e8f0", "#cbd5e1"],
    ["github", "代码协同", "🐙", "#e0e7ff", "#a5b4fc"],
    ["chat", "对话协同", "🗨️", "#fce7f3", "#fbcfe8"],
    ["cloud", "云端同步", "☁️", "#cffafe", "#a5f3fc"],
    ["local", "本地运行", "🖥️", "#f1f5f9", "#cbd5e1"],
    ["script", "自动脚本", "📟", "#e0f2fe", "#bae6fd"],
  ].map(([id, name, emoji, c1, c2]) => ({ id, name, emoji, c1, c2 }));
  const AVATAR_MAP = new Map(AVATAR_CATALOG.map((item) => [String(item.id), item]));
  const STATE = {
    projectId: "",
    projectName: "",
    viewMode: "project",
    platformLayoutMode: "project",
    platformCommScope: "all",
    platformLineCountMin: 0,
    platformProjects: [],
    platformCommLinks: [],
    channelHint: "",
    sessionHint: "",
    windowKey: "24h",
    customRange: { startMs: 0, endMs: 0 },
    sessions: [],
    runs: [],
    groups: [],
    channelSections: [],
    nodes: [],
    commLinks: [],
    manualRelations: [],
    activeRelationType: "business",
    visibleRelations: {
      business: true,
      support: true,
      dependency: true,
      message: true,
      labels: true,
    },
    selectedGroupId: "",
    selectedSessionId: "",
    selectedRelationId: "",
    selectedPlatformCommLinkId: "",
    dragNode: null,
    dragGroup: null,
    resizeGroup: null,
    dragLayerGroupId: "",
    relationDraft: null,
    pan: null,
    zoom: 1,
    platformLoadToken: 0,
    sharedAvatarStore: { bySessionId: {}, clearedSessionIds: {} },
  };

  const dom = {
    taskLink: document.getElementById("taskLink"),
    curtainLink: document.getElementById("curtainLink"),
    refreshBtn: document.getElementById("refreshBtn"),
    saveLayoutBtn: document.getElementById("saveLayoutBtn"),
    exportConfigBtn: document.getElementById("exportConfigBtn"),
    copyConfigBtn: document.getElementById("copyConfigBtn"),
    envBadge: document.getElementById("envBadge"),
    platformModeTabsWrap: document.getElementById("platformModeTabs"),
    platformModeButtons: Array.from(document.querySelectorAll("[data-platform-layout]")),
    platformCommScopeFilters: document.getElementById("platformCommScopeFilters"),
    platformScopeButtons: Array.from(document.querySelectorAll("[data-comm-scope]")),
    timeTabs: Array.from(document.querySelectorAll("[data-window]")),
    customRange: document.getElementById("customRange"),
    customStartInput: document.getElementById("customStartInput"),
    customEndInput: document.getElementById("customEndInput"),
    customApplyBtn: document.getElementById("customApplyBtn"),
    relationToolbarStack: document.getElementById("relationToolbarStack"),
    relationTypeButtons: Array.from(document.querySelectorAll("[data-relation-type]")),
    visibilityButtons: Array.from(document.querySelectorAll("[data-visibility]")),
    platformCommCountFilters: document.getElementById("platformCommCountFilters"),
    platformCountButtons: Array.from(document.querySelectorAll("[data-comm-count-min]")),
    toggleLayersBtn: document.getElementById("toggleLayersBtn"),
    toggleDetailBtn: document.getElementById("toggleDetailBtn"),
    boardMeta: document.getElementById("boardMeta"),
    summaryMeta: document.getElementById("summaryMeta"),
    statusBanner: document.getElementById("statusBanner"),
    stageWrap: document.getElementById("stageWrap"),
    stageViewport: document.getElementById("stageViewport"),
    stage: document.getElementById("stage"),
    groupsLayer: document.getElementById("groupsLayer"),
    groupChipLayer: document.getElementById("groupChipLayer"),
    nodesLayer: document.getElementById("nodesLayer"),
    linesSvg: document.getElementById("linesSvg"),
    layersPanel: document.getElementById("layersPanel"),
    openLayersBtn: document.getElementById("openLayersBtn"),
    closeLayersBtn: document.getElementById("closeLayersBtn"),
    groupList: document.getElementById("groupList"),
    searchInput: document.getElementById("searchInput"),
    rosterList: document.getElementById("rosterList"),
    detailPanel: document.getElementById("detailPanel"),
    openDetailBtn: document.getElementById("openDetailBtn"),
    closeDetailBtn: document.getElementById("closeDetailBtn"),
    detailTitle: document.getElementById("detailTitle"),
    detailBody: document.getElementById("detailBody"),
    rosterSectionTitle: document.getElementById("rosterSectionTitle"),
    miniMap: document.getElementById("miniMap"),
    zoomInBtn: document.getElementById("zoomInBtn"),
    zoomOutBtn: document.getElementById("zoomOutBtn"),
    zoomResetBtn: document.getElementById("zoomResetBtn"),
    bubbleTooltip: document.getElementById("bubbleTooltip"),
  };

  function safeText(value, fallback = "") {
    const text = String(value == null ? "" : value).trim();
    return text || fallback;
  }

  function firstText(values, fallback = "") {
    for (const value of values || []) {
      const text = safeText(value);
      if (text) return text;
    }
    return fallback;
  }

  function dateMs(value) {
    if (!value) return 0;
    const n = Date.parse(String(value));
    return Number.isFinite(n) ? n : 0;
  }

  function pad2(value) {
    return String(Math.max(0, Number(value) || 0)).padStart(2, "0");
  }

  function fmtTime(value) {
    const ts = typeof value === "number" ? value : dateMs(value);
    if (!ts) return "--:--";
    return new Date(ts).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false });
  }

  function fmtDateTime(value) {
    const ts = typeof value === "number" ? value : dateMs(value);
    if (!ts) return "-";
    return new Date(ts).toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).replace(",", " ");
  }

  function formatDateTimeLocal(value) {
    const ts = typeof value === "number" ? value : dateMs(value);
    if (!ts) return "";
    const dt = new Date(ts);
    return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}T${pad2(dt.getHours())}:${pad2(dt.getMinutes())}`;
  }

  function parseDateTimeLocal(value) {
    const text = safeText(value);
    return text ? dateMs(text) : 0;
  }

  function authHeaders(base = {}) {
    const headers = { ...(base || {}) };
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      if (token) headers.Authorization = `Bearer ${token}`;
    } catch (_) {}
    return headers;
  }

  async function fetchJson(url, options = {}) {
    const timeoutMs = Math.max(0, Number(options && options.timeoutMs) || 0);
    const controller = timeoutMs > 0 ? new AbortController() : null;
    let timer = 0;
    if (controller && timeoutMs > 0) {
      timer = window.setTimeout(() => controller.abort("timeout"), timeoutMs);
    }
    const resp = await fetch(url, {
      cache: "no-store",
      headers: authHeaders(),
      signal: controller ? controller.signal : undefined,
    }).finally(() => {
      if (timer) window.clearTimeout(timer);
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return await resp.json();
  }

  function emptyAvatarStore() {
    return {
      bySessionId: Object.create(null),
      clearedSessionIds: Object.create(null),
    };
  }

  function normalizeAvatarStore(raw) {
    return {
      bySessionId: Object.assign(Object.create(null), raw && typeof raw.bySessionId === "object" ? raw.bySessionId : {}),
      clearedSessionIds: Object.assign(Object.create(null), raw && typeof raw.clearedSessionIds === "object" ? raw.clearedSessionIds : {}),
    };
  }

  function getAvatarAssignmentsV1() {
    try {
      const raw = String(localStorage.getItem(AVATAR_V1_KEY) || "");
      if (!raw) return Object.create(null);
      const data = JSON.parse(raw);
      const assignments = data && typeof data === "object" && data.assignments && typeof data.assignments === "object"
        ? data.assignments
        : {};
      return Object.assign(Object.create(null), assignments);
    } catch (_) {
      return Object.create(null);
    }
  }

  function getAvatarStoreV2() {
    try {
      const raw = String(localStorage.getItem(AVATAR_V2_KEY) || "");
      if (!raw) return emptyAvatarStore();
      return normalizeAvatarStore(JSON.parse(raw));
    } catch (_) {
      return emptyAvatarStore();
    }
  }

  function payloadAvatarStores() {
    const candidates = [
      DATA.avatar_assignments_by_project,
      DATA.avatarAssignmentsByProject,
      DATA.shared_avatar_store_by_project,
      DATA.sharedAvatarStoreByProject,
    ];
    for (const item of candidates) {
      if (item && typeof item === "object") return item;
    }
    return Object.create(null);
  }

  async function fetchSharedAvatarStore(projectId) {
    const pid = safeText(projectId);
    if (!pid) return emptyAvatarStore();
    const stores = payloadAvatarStores();
    return normalizeAvatarStore(stores[pid]);
  }

  async function fetchSharedAvatarStores(projectIds) {
    const ids = [...new Set((Array.isArray(projectIds) ? projectIds : []).map((item) => safeText(item)).filter(Boolean))];
    if (!ids.length) return emptyAvatarStore();
    const stores = await Promise.all(ids.map((projectId) => fetchSharedAvatarStore(projectId)));
    const merged = emptyAvatarStore();
    stores.forEach((store) => {
      Object.assign(merged.bySessionId, store.bySessionId || {});
      Object.assign(merged.clearedSessionIds, store.clearedSessionIds || {});
    });
    return merged;
  }

  function sessionDisplayName(sessionLike) {
    return firstText([
      sessionLike && sessionLike.alias,
      sessionLike && sessionLike.display_name,
      sessionLike && sessionLike.displayName,
      sessionLike && sessionLike.sender_name,
      sessionLike && sessionLike.channel_name,
      sessionLike && sessionLike.channelName,
      sessionLike && sessionLike.session_id,
      sessionLike && sessionLike.id,
    ], "未命名会话");
  }

  function avatarFallbackLabel(name) {
    const text = safeText(name, "会");
    const digits = text.match(/\d+/);
    if (digits && digits[0]) return digits[0].slice(0, 2);
    return text.slice(0, 1).toUpperCase();
  }

  function getAssignedAvatarId(sessionLike) {
    const sessionId = safeText(sessionLike && (sessionLike.session_id || sessionLike.id));
    const storeV2 = getAvatarStoreV2();
    if (sessionId && storeV2.clearedSessionIds && storeV2.clearedSessionIds[sessionId]) return "";
    const localId = sessionId ? safeText(storeV2.bySessionId && storeV2.bySessionId[sessionId]) : "";
    if (localId && AVATAR_MAP.has(localId)) return localId;
    const sharedId = sessionId ? safeText(STATE.sharedAvatarStore.bySessionId && STATE.sharedAvatarStore.bySessionId[sessionId]) : "";
    if (sharedId && AVATAR_MAP.has(sharedId)) return sharedId;
    const v1 = getAvatarAssignmentsV1();
    const candidates = [
      sessionDisplayName(sessionLike),
      safeText(sessionLike && sessionLike.channel_name),
      safeText(sessionLike && sessionLike.channelName),
      safeText(sessionLike && sessionLike.alias),
    ].filter(Boolean);
    for (const key of candidates) {
      const avatarId = safeText(v1[key]);
      if (avatarId && AVATAR_MAP.has(avatarId)) return avatarId;
    }
    return "";
  }

  function avatarMeta(sessionLike) {
    const avatarId = getAssignedAvatarId(sessionLike);
    if (avatarId && AVATAR_MAP.has(avatarId)) {
      const meta = AVATAR_MAP.get(avatarId);
      return {
        text: String(meta.emoji || "🧑"),
        title: `${sessionDisplayName(sessionLike)} · ${meta.name || avatarId}`,
        c1: String(meta.c1 || "#edf2ff"),
        c2: String(meta.c2 || "#dbe5ff"),
        fallback: false,
      };
    }
    return {
      text: avatarFallbackLabel(sessionDisplayName(sessionLike)),
      title: sessionDisplayName(sessionLike),
      c1: "#edf2ff",
      c2: "#dbe5ff",
      fallback: true,
    };
  }

  function qs() {
    try {
      const search = new URLSearchParams(window.location.search || "");
      const hash = new URLSearchParams((window.location.hash || "").replace(/^#/, ""));
      const explicitMode = firstText([
        hash.get("mode"),
        search.get("mode"),
      ], "").toLowerCase();
      const explicitLayout = firstText([
        hash.get("layout"),
        search.get("layout"),
      ], "").toLowerCase();
      const explicitProjectId = firstText([
        hash.get("p"),
        search.get("project_id"),
        search.get("projectId"),
      ], "");
      const mode = firstText([
        explicitMode,
        DATA.mode,
      ], "project").toLowerCase();
      return {
        projectId: mode === "platform"
          ? explicitProjectId
          : firstText([
            explicitProjectId,
            DATA.project_id,
            DATA.projectId,
          ]),
        channelName: firstText([
          search.get("channel_name"),
          search.get("channelName"),
          hash.get("c"),
          DATA.channel_name,
          DATA.channelName,
        ]),
        sessionId: firstText([
          search.get("session_id"),
          search.get("sessionId"),
          hash.get("sid"),
          DATA.session_id,
          DATA.sessionId,
        ]),
        mode,
        layout: firstText([
          explicitLayout,
          DATA.layout,
        ], "project").toLowerCase(),
      };
    } catch (_) {
      return { projectId: "", channelName: "", sessionId: "", mode: "project", layout: "project" };
    }
  }

  function isPlatformMode() {
    return safeText(STATE.viewMode).toLowerCase() === "platform";
  }

  function syncRouteLayout() {
    if (!isPlatformMode()) return;
    try {
      const hash = new URLSearchParams((window.location.hash || "").replace(/^#/, ""));
      hash.set("mode", "platform");
      hash.set("layout", safeText(STATE.platformLayoutMode || "project"));
      window.history.replaceState(null, "", `#${hash.toString()}`);
    } catch (_) {}
  }

  function projectCatalog() {
    const map = new Map();
    const primary = Array.isArray(DATA.projects) ? DATA.projects : [];
    const overviewProjects = Array.isArray(DATA.overview && DATA.overview.projects) ? DATA.overview.projects : [];

    primary.forEach((item) => {
      const projectId = safeText(item.id || item.project_id);
      if (!projectId) return;
      map.set(projectId, {
        ...item,
        project_id: projectId,
        project_name: firstText([item.name, item.project_name, item.id], projectId),
      });
    });

    overviewProjects.forEach((item) => {
      const projectId = safeText(item.project_id || item.id);
      if (!projectId) return;
      const prev = map.get(projectId) || {};
      map.set(projectId, {
        ...prev,
        ...item,
        project_id: projectId,
        project_name: firstText([
          item.project_name,
          item.name,
          prev.project_name,
          prev.name,
          projectId,
        ], projectId),
        color: firstText([item.color, prev.color]),
        description: firstText([item.description, prev.description]),
        source_kind: firstText([item.source_kind, item.sourceKind, prev.source_kind, prev.sourceKind]),
        source_label: firstText([item.source_label, item.sourceLabel, prev.source_label, prev.sourceLabel]),
        channel_sessions: Array.isArray(prev.channel_sessions) ? prev.channel_sessions : [],
        channels: Array.isArray(prev.channels) ? prev.channels : [],
        registry: prev.registry || {},
        agent_directory_summary: prev.agent_directory_summary || {},
        session_health_config: prev.session_health_config || {},
      });
    });

    return Array.from(map.values());
  }

  function projectMetaById(projectId) {
    const pid = safeText(projectId);
    if (!pid) return null;
    return projectCatalog().find((item) => safeText(item.project_id) === pid) || null;
  }

  function normalizeSession(raw) {
    if (!raw || typeof raw !== "object") return null;
    const sessionId = firstText([raw.id, raw.session_id, raw.sessionId]);
    if (!sessionId) return null;
    const runtimeState = raw.runtime_state && typeof raw.runtime_state === "object" ? raw.runtime_state : {};
    const channelName = firstText([raw.channel_name, raw.channelName]);
    return {
      session_id: sessionId,
      alias: firstText([raw.alias, raw.display_name, raw.displayName, channelName, sessionId]),
      channel_name: channelName,
      project_id: firstText([raw.project_id, raw.projectId], STATE.projectId),
      project_name: firstText([raw.project_name, raw.projectName], STATE.projectName),
      cli_type: firstText([raw.cli_type, raw.cliType], "codex"),
      status: firstText([runtimeState.display_state, runtimeState.internal_state, raw.status], "idle"),
      environment: firstText([raw.environment], DATA.environment || "stable"),
      role: firstText([raw.session_role, raw.sessionRole, raw.desc], "协作Agent"),
      desc: firstText([raw.desc]),
    };
  }

  function buildPlatformSessionsFromPayload(projects) {
    const sessions = [];
    const seen = new Set();
    (Array.isArray(projects) ? projects : []).forEach((project) => {
      const projectId = safeText(project.project_id || project.id);
      const projectName = firstText([project.project_name, project.name], projectId);
      const rows = Array.isArray(project.channel_sessions) ? project.channel_sessions : [];
      rows.forEach((row, index) => {
        const channelName = firstText([row.name, row.channel_name, row.channelName], `未命名通道${index + 1}`);
        const realSessionId = safeText(row.session_id || row.sessionId);
        const syntheticSessionId = `virtual:${projectId}:${channelName}:${index}`;
        const sessionId = realSessionId || syntheticSessionId;
        if (!sessionId || seen.has(sessionId)) return;
        seen.add(sessionId);
        sessions.push({
          session_id: sessionId,
          alias: firstText([
            row.alias,
            row.display_name,
            row.displayName,
            row.name,
            channelName,
            sessionId,
          ], channelName),
          channel_name: channelName,
          project_id: projectId,
          project_name: projectName,
          cli_type: firstText([row.cli_type, row.cliType], "codex"),
          status: firstText([row.status], realSessionId ? "idle" : "unbound"),
          environment: firstText([row.environment], DATA.environment || "stable"),
          role: firstText([row.desc, row.session_role, row.sessionRole], "协作Agent"),
          desc: firstText([row.desc]),
          is_virtual: !realSessionId,
        });
      });
    });
    return sessions;
  }

  function normalizeRunStatus(raw) {
    const status = firstText([raw && raw.status], "").toLowerCase();
    const display = firstText([raw && raw.display_state, raw && raw.displayState], "").toLowerCase();
    if (status === "done" || status === "error" || status === "interrupted") return status;
    return display || status || "unknown";
  }

  function normalizeSenderType(raw, fallbackRole = "") {
    const text = safeText(raw).toLowerCase();
    if (["user", "human", "person", "requester", "用户", "人类"].includes(text)) return "user";
    if (["agent", "assistant", "bot", "model", "channel", "智能体", "助手", "模型", "通道"].includes(text)) return "agent";
    if (["system", "runtime", "scheduler", "ccb", "系统", "运行时", "调度器"].includes(text)) return "system";
    if (["legacy", "unknown", "default", "历史", "未知"].includes(text)) return "legacy";
    const role = safeText(fallbackRole).toLowerCase();
    if (role === "user") return "user";
    if (role === "assistant") return "agent";
    return "legacy";
  }

  function readCommunicationViewMeta(raw) {
    if (raw && raw.communication_view && typeof raw.communication_view === "object") return raw.communication_view;
    if (raw && raw.communicationView && typeof raw.communicationView === "object") return raw.communicationView;
    return {};
  }

  function readStructuredSender(raw) {
    const obj = (raw && typeof raw === "object") ? raw : {};
    const nested = (obj.sender && typeof obj.sender === "object") ? obj.sender : {};
    const typeRaw = firstText([
      obj.sender_type, obj.senderType, obj.sender_role, obj.senderRole,
      nested.sender_type, nested.senderType, nested.sender_role, nested.senderRole, nested.type, nested.role,
    ]);
    const id = firstText([
      obj.sender_id, obj.senderId,
      nested.sender_id, nested.senderId, nested.id,
    ]);
    const name = firstText([
      obj.sender_name, obj.senderName,
      nested.sender_name, nested.senderName, nested.name,
    ]);
    return {
      type: normalizeSenderType(typeRaw, ""),
      id,
      name,
    };
  }

  function normalizeMessageKind(raw) {
    const kind = safeText(raw).toLowerCase();
    const allow = new Set([
      "system_callback",
      "system_callback_summary",
      "restart_recovery_summary",
      "user_input",
      "agent_output",
      "system_notice",
      "collab_update",
      "manual_update",
    ]);
    return allow.has(kind) ? kind : "";
  }

  function resolveMessageKind(raw) {
    const run = (raw && typeof raw === "object") ? raw : {};
    const communicationView = readCommunicationViewMeta(run);
    const cvKind = normalizeMessageKind(communicationView.message_kind || communicationView.messageKind);
    if (cvKind) return cvKind;
    const triggerType = firstText([run.trigger_type, run.triggerType]).toLowerCase();
    if (triggerType === "callback_auto") return "system_callback";
    if (triggerType === "callback_auto_summary") return "system_callback_summary";
    if (triggerType === "restart_recovery_summary" || triggerType === "restart_recovery") return "restart_recovery_summary";
    const sender = readStructuredSender(run);
    if (sender.type === "user") return "user_input";
    if (sender.type === "agent") return "agent_output";
    if (sender.type === "system") return "system_notice";
    return "manual_update";
  }

  function messageKindLabel(kind) {
    return ({
      system_callback: "系统回执",
      system_callback_summary: "系统回执汇总",
      restart_recovery_summary: "服务恢复",
      user_input: "用户输入",
      agent_output: "Agent 输出",
      system_notice: "系统提示",
      collab_update: "协同更新",
      manual_update: "兼容消息",
    })[safeText(kind).toLowerCase()] || "消息";
  }

  function interactionModeLabel(mode) {
    return ({
      task_with_receipt: "需回执",
      notify_only: "仅通知",
      task_only: "任务",
    })[safeText(mode).toLowerCase()] || "";
  }

  function formatRefValue(raw) {
    if (raw == null) return "";
    if (typeof raw === "string" || typeof raw === "number" || typeof raw === "boolean") return safeText(raw);
    if (typeof raw === "object" && !Array.isArray(raw)) {
      const channelName = firstText([raw.channel_name, raw.channelName, raw.channel]);
      const sessionId = firstText([raw.session_id, raw.sessionId]);
      const runId = firstText([raw.run_id, raw.runId]);
      const parts = [];
      if (channelName) parts.push(`channel=${channelName}`);
      if (sessionId) parts.push(`session=${sessionId}`);
      if (runId) parts.push(`run=${runId}`);
      if (parts.length) return parts.join(" · ");
      try { return JSON.stringify(raw); } catch (_) {}
    }
    try { return JSON.stringify(raw); } catch (_) {}
    return safeText(raw);
  }

  function displaySenderLabel(run) {
    return firstText([run && run.sender_name, run && run.channel_name, run && run.sender_id, run && run.session_id], "未知发送方");
  }

  function normalizeRun(raw) {
    if (!raw || typeof raw !== "object") return null;
    const runId = firstText([raw.id, raw.run_id, raw.runId]);
    const sessionId = firstText([raw.sessionId, raw.session_id]);
    if (!runId || !sessionId) return null;
    const communicationView = readCommunicationViewMeta(raw);
    const sender = readStructuredSender(raw);
    const callbackTo = raw.callback_to && typeof raw.callback_to === "object"
      ? raw.callback_to
      : ((communicationView.callback_to && typeof communicationView.callback_to === "object") ? communicationView.callback_to : {});
    const sourceRef = raw.source_ref || raw.sourceRef || communicationView.source_ref || communicationView.sourceRef || null;
    return {
      run_id: runId,
      session_id: sessionId,
      project_id: firstText([raw.project_id, raw.projectId], STATE.projectId),
      project_name: firstText([raw.project_name, raw.projectName], STATE.projectName),
      channel_name: firstText([raw.channel_name, raw.channelName]),
      created_at: firstText([raw.createdAt, raw.created_at, raw.lastProgressAt]),
      status: normalizeRunStatus(raw),
      sender_type: sender.type,
      sender_name: firstText([sender.name]),
      sender_id: firstText([sender.id]),
      message_kind: resolveMessageKind(raw),
      interaction_mode: firstText([
        raw.interaction_mode, raw.interactionMode,
        communicationView.interaction_mode, communicationView.interactionMode,
      ]).toLowerCase(),
      reply_to_run_id: firstText([raw.reply_to_run_id, raw.replyToRunId]),
      source_ref: sourceRef,
      source_ref_text: formatRefValue(sourceRef),
      callback_to: callbackTo,
      callback_to_text: formatRefValue(callbackTo),
      message_preview: firstText([raw.messagePreview, raw.message_preview, raw.lastMessage, raw.partialMessage, raw.errorHint], "无摘要消息"),
    };
  }

  function classifyChannel(channelName) {
    const text = safeText(channelName);
    if (!text) return "other";
    if (text.startsWith("主体") || text.includes("总控")) return "master";
    if (text.startsWith("辅助")) return "assist";
    if (text.startsWith("子级") || text.startsWith("业务")) return "dev";
    return "other";
  }

  function accentFor(text) {
    const value = safeText(text);
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
    const palette = ["#63dac8", "#7db7ff", "#f4c86d", "#ba9cff", "#8ad79c", "#ff6f84", "#f7a8c2"];
    return palette[Math.abs(hash) % palette.length];
  }

  function rgbaFromHex(hex, alpha) {
    const raw = safeText(hex).replace(/^#/, "");
    if (raw.length !== 6) return `rgba(99,218,200,${alpha})`;
    const r = parseInt(raw.slice(0, 2), 16);
    const g = parseInt(raw.slice(2, 4), 16);
    const b = parseInt(raw.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function layoutStorageKey() {
    let scope = "";
    if (isPlatformMode()) {
      const mode = safeText(STATE.platformLayoutMode || "project");
      const version = mode === "agent" ? "v5" : "v3";
      scope = `platform:${mode}:${version}`;
    } else {
      scope = safeText(STATE.projectId || "global");
    }
    return `${STORAGE_PREFIX}:${scope}`;
  }

  function projectLayoutStorageKey(projectId) {
    return `${STORAGE_PREFIX}:${safeText(projectId || "global")}`;
  }

  function compactNodeCardSize(alias, mode = "project") {
    const length = safeText(alias, "Agent").length;
    const baseWidth = mode === "platform" ? 136 : 148;
    const extraWidth = Math.min(84, Math.max(0, length - 3) * 10);
    return {
      w: baseWidth + extraWidth,
      h: mode === "platform" ? 52 : 56,
    };
  }

  function loadLayoutStoreByKey(key) {
    try {
      const raw = localStorage.getItem(safeText(key));
      if (!raw) return { groups: [], relations: [], nodes: [], zoom: 1 };
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : { groups: [], relations: [], nodes: [], zoom: 1 };
    } catch (_) {
      return { groups: [], relations: [], nodes: [], zoom: 1 };
    }
  }

  function loadLayoutStore() {
    return loadLayoutStoreByKey(layoutStorageKey());
  }

  function persistLayoutStore() {
    try {
      const groups = isPlatformMode()
        ? STATE.groups.filter((group) => safeText(group.kind) === "project-shell")
        : STATE.groups;
      localStorage.setItem(layoutStorageKey(), JSON.stringify({
        groups,
        relations: isPlatformMode() ? [] : STATE.manualRelations,
        nodes: isPlatformMode() ? [] : STATE.nodes.map((node) => ({ session_id: node.session_id, x: node.x, y: node.y })),
        zoom: STATE.zoom,
      }));
    } catch (_) {}
  }

  function relationTone(type) {
    return RELATION_TYPES[type] || RELATION_TYPES.business;
  }

  function currentWindowRange() {
    const now = Date.now();
    if (STATE.windowKey === "custom") {
      const startMs = Number(STATE.customRange.startMs) || 0;
      const endMs = Number(STATE.customRange.endMs) || now;
      return { startMs, endMs, label: "自定义" };
    }
    const span = WINDOW_MS[STATE.windowKey] || WINDOW_MS["1h"];
    return { startMs: now - span, endMs: now, label: STATE.windowKey };
  }

  function currentWindowLabel() {
    const range = currentWindowRange();
    return STATE.windowKey === "custom"
      ? `自定义 ${fmtDateTime(range.startMs)} ~ ${fmtDateTime(range.endMs)}`
      : `窗口 ${STATE.windowKey}`;
  }

  function totalCommCount(links) {
    return (Array.isArray(links) ? links : []).reduce((sum, link) => sum + Number(link.count || 0), 0);
  }

  function groupActivityStats(group) {
    const sessionIds = new Set(group && Array.isArray(group.sessionIds) ? group.sessionIds : []);
    if (isPlatformMode()) {
      const relevant = (STATE.platformCommLinks || []).filter((link) => {
        const fromHit = sessionIds.has(link.from_id) || sessionIds.has(`project::${safeText(link.source_project_id)}`);
        const toHit = sessionIds.has(link.to_id) || sessionIds.has(`project::${safeText(link.target_project_id)}`);
        return fromHit || toHit;
      });
      const count = relevant.reduce((sum, link) => sum + Number(link.count || 0), 0);
      return {
        count,
        recent: relevant.filter((link) => Number(link.count || 0) >= 5).length,
        active: relevant.length > 0,
        peak: relevant.some((link) => Number(link.count || 0) >= 10),
      };
    }
    const relevant = (STATE.commLinks || []).filter((link) => sessionIds.has(link.from_id) || sessionIds.has(link.to_id));
    const count = relevant.reduce((sum, link) => sum + Number(link.count || 0), 0);
    return {
      count,
      recent: relevant.length,
      active: count > 0,
      peak: relevant.some((link) => Number(link.count || 0) >= PLATFORM_HIGH_FREQ_COUNT),
    };
  }

  function syncTimeControls() {
    dom.timeTabs.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.window === STATE.windowKey);
    });
    if (dom.customRange) dom.customRange.hidden = STATE.windowKey !== "custom";
    if (dom.customStartInput) dom.customStartInput.value = formatDateTimeLocal(STATE.customRange.startMs);
    if (dom.customEndInput) dom.customEndInput.value = formatDateTimeLocal(STATE.customRange.endMs);
  }

  function setStatus(text, tone = "loading") {
    if (!dom.statusBanner) return;
    dom.statusBanner.textContent = safeText(text);
    dom.statusBanner.className = `status-banner is-${tone}`;
    dom.statusBanner.hidden = !text;
  }

  function curvePath(start, end) {
    const dx = end.x - start.x;
    const c1x = start.x + Math.max(60, Math.abs(dx) * 0.34);
    const c2x = end.x - Math.max(60, Math.abs(dx) * 0.34);
    const mid = dx >= 0 ? 18 : -18;
    return `M ${start.x} ${start.y} C ${c1x} ${start.y + mid}, ${c2x} ${end.y - mid}, ${end.x} ${end.y}`;
  }

  function parseBracketValues(text, label) {
    const results = [];
    const source = safeText(text);
    const pattern = new RegExp(`\\[${label}:\\s*([^\\]]+)\\]`, "g");
    let match;
    while ((match = pattern.exec(source))) {
      const value = safeText(match[1]);
      if (value) results.push(value);
    }
    return results;
  }

  function parseMentionTargets(text) {
    const results = [];
    const source = safeText(text);
    const pattern = /@([^\s\]\[，。,:：；;（）()<>]+)/g;
    let match;
    while ((match = pattern.exec(source))) {
      const value = safeText(match[1]);
      if (value) results.push(value);
    }
    return results;
  }

  function resolveTargetSessionIds(preview, sessionMap) {
    const hints = [
      ...parseMentionTargets(preview),
      ...parseBracketValues(preview, "协同对象"),
      ...parseBracketValues(preview, "目标通道"),
      ...parseBracketValues(preview, "主负责Agent"),
    ];
    const resolved = new Set();
    hints.forEach((hint) => {
      const normalized = safeText(hint.split(";")[0]);
      if (!normalized) return;
      sessionMap.forEach((session) => {
        const candidates = [safeText(session.alias), safeText(session.channel_name), safeText(session.desc)];
        if (candidates.some((item) => item && (item === normalized || item.includes(normalized) || normalized.includes(item)))) {
          resolved.add(session.session_id);
        }
      });
    });
    return Array.from(resolved);
  }

  function computeGroupsAndNodes(sessions, layoutStore = loadLayoutStore()) {
    const channels = new Map();
    (sessions || []).forEach((session) => {
      const channelName = safeText(session.channel_name, "未分组通道");
      const rowKind = classifyChannel(channelName);
      if (!channels.has(channelName)) {
        channels.set(channelName, {
          id: `group:${channelName}`,
          label: channelName,
          rowKind,
          accent: accentFor(channelName),
          sessions: [],
        });
      }
      channels.get(channelName).sessions.push(session);
    });
    const savedMap = new Map((Array.isArray(layoutStore.groups) ? layoutStore.groups : []).map((group) => [group.id, group]));
    const savedNodeMap = new Map((Array.isArray(layoutStore.nodes) ? layoutStore.nodes : []).map((node) => [safeText(node.session_id || node.sessionId), node]));
    const rows = { master: [], assist: [], dev: [], other: [] };
    Array.from(channels.values())
      .sort((a, b) => a.label.localeCompare(b.label, "zh-Hans-CN"))
      .forEach((group) => rows[group.rowKind].push(group));

    const groups = [];
    Object.entries(rows).forEach(([rowKind, items]) => {
      let cursorX = 140;
      items.forEach((group, index) => {
        const columns = Math.max(1, Math.min(3, Math.ceil(group.sessions.length / 2) || 1));
        const width = Math.max(320, columns * (CARD_WIDTH + 20) + GROUP_PADDING * 2 - 20);
        const height = Math.max(250, Math.ceil(group.sessions.length / columns) * (CARD_HEIGHT + 20) + 116);
        const saved = savedMap.get(group.id);
        groups.push({
          id: group.id,
          label: group.label,
          rowKind,
          accent: group.accent,
          x: Number(saved && saved.x) || cursorX,
          y: Number(saved && saved.y) || (ROWS[rowKind].y + (rowKind === "master" ? 0 : 10)),
          w: Number(saved && saved.w) || width,
          h: Number(saved && saved.h) || height,
          z: Number.isFinite(Number(saved && saved.z)) ? Number(saved.z) : index,
          sessionIds: group.sessions.map((item) => item.session_id),
        });
        cursorX += width + 40;
      });
    });
    groups.sort((a, b) => a.z - b.z);

    const nodes = [];
    groups.forEach((group) => {
      const groupSessions = (sessions || []).filter((session) => group.sessionIds.includes(session.session_id));
      const columns = Math.max(1, Math.floor((group.w - GROUP_PADDING * 2 + 20) / (CARD_WIDTH + 20)));
      groupSessions.forEach((session, index) => {
        const col = index % columns;
        const row = Math.floor(index / columns);
        const savedNode = savedNodeMap.get(session.session_id);
        nodes.push({
          id: session.session_id,
          session_id: session.session_id,
          group_id: group.id,
          x: Number(savedNode && savedNode.x) || (group.x + GROUP_PADDING + col * (CARD_WIDTH + 20)),
          y: Number(savedNode && savedNode.y) || (group.y + 72 + row * (CARD_HEIGHT + 20)),
          w: CARD_WIDTH,
          h: CARD_HEIGHT,
          alias: safeText(session.alias, session.session_id),
          role: safeText(session.desc || session.role, "协作Agent"),
          channel_name: safeText(session.channel_name, "未分组通道"),
          status: safeText(session.status, "idle"),
          accent: group.accent,
        });
      });
    });
    return { groups, nodes };
  }

  function projectStatusFromTotals(totals) {
    const info = (totals && typeof totals === "object") ? totals : {};
    const inProgress = Number(info.in_progress || 0);
    const active = Number(info.active || 0);
    const total = Number(info.total || 0);
    const done = Number(info.done || 0);
    if (inProgress > 0) return "进行中";
    if (active > 0) return "活跃";
    if (total > 0 && done >= total) return "已完成";
    return "待启动";
  }

  function projectAccent(project) {
    return safeText(project && project.color) || accentFor(firstText([
      project && project.project_name,
      project && project.project_id,
    ], "项目"));
  }

  function sortProjects(projects) {
    return [...(Array.isArray(projects) ? projects : [])].sort((a, b) => {
      const aTotals = (a && a.totals && typeof a.totals === "object") ? a.totals : {};
      const bTotals = (b && b.totals && typeof b.totals === "object") ? b.totals : {};
      const aScore = Number(aTotals.in_progress || 0) * 100 + Number(aTotals.active || 0) * 10 + Number(aTotals.channels || 0);
      const bScore = Number(bTotals.in_progress || 0) * 100 + Number(bTotals.active || 0) * 10 + Number(bTotals.channels || 0);
      if (aScore !== bScore) return bScore - aScore;
      return firstText([a.project_name, a.name, a.project_id]).localeCompare(firstText([b.project_name, b.name, b.project_id]), "zh-Hans-CN");
    });
  }

  function computeBoardBounds(groups, nodes) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = 0;
    let maxY = 0;
    (Array.isArray(groups) ? groups : []).forEach((group) => {
      minX = Math.min(minX, Number(group.x || 0));
      minY = Math.min(minY, Number(group.y || 0));
      maxX = Math.max(maxX, Number(group.x || 0) + Number(group.w || 0));
      maxY = Math.max(maxY, Number(group.y || 0) + Number(group.h || 0));
    });
    (Array.isArray(nodes) ? nodes : []).forEach((node) => {
      minX = Math.min(minX, Number(node.x || 0));
      minY = Math.min(minY, Number(node.y || 0));
      maxX = Math.max(maxX, Number(node.x || 0) + Number(node.w || CARD_WIDTH));
      maxY = Math.max(maxY, Number(node.y || 0) + Number(node.h || CARD_HEIGHT));
    });
    if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
    }
    return {
      minX,
      minY,
      maxX,
      maxY,
      width: Math.max(0, maxX - minX),
      height: Math.max(0, maxY - minY),
    };
  }

  function platformSectionMeta(channelName) {
    const name = safeText(channelName, "未分组通道");
    if (/^(主体|总控|总任务|总管)/.test(name) || name.includes("合并与验收")) {
      return { key: "core", label: "主体分工", order: 0 };
    }
    if (/^辅助/.test(name) || name.includes("skills") || name.includes("文档") || name.includes("项目管理") || name.includes("运维")) {
      return { key: "assist", label: "辅助支撑", order: 1 };
    }
    if (/^子级/.test(name) || name.includes("项目开发")) {
      return { key: "dev", label: "子级执行", order: 2 };
    }
    if (/^(业务|运营|游戏|日志)/.test(name) || name.includes("可视化") || name.includes("内容")) {
      return { key: "biz", label: "业务分工", order: 3 };
    }
    return { key: "other", label: "其他分工", order: 4 };
  }

  function stageMetrics() {
    let maxX = 0;
    let maxY = 0;
    STATE.groups.forEach((group) => {
      maxX = Math.max(maxX, Number(group.x || 0) + Number(group.w || 0));
      maxY = Math.max(maxY, Number(group.y || 0) + Number(group.h || 0));
    });
    STATE.nodes.forEach((node) => {
      maxX = Math.max(maxX, Number(node.x || 0) + Number(node.w || CARD_WIDTH));
      maxY = Math.max(maxY, Number(node.y || 0) + Number(node.h || CARD_HEIGHT));
    });
    return {
      width: Math.max(isPlatformMode() ? STAGE_MIN.platform.width : STAGE_MIN.project.width, Math.ceil(maxX + 520)),
      height: Math.max(isPlatformMode() ? STAGE_MIN.platform.height : STAGE_MIN.project.height, Math.ceil(maxY + 460)),
    };
  }

  function contentBounds() {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = 0;
    let maxY = 0;
    STATE.groups.forEach((group) => {
      minX = Math.min(minX, Number(group.x || 0));
      minY = Math.min(minY, Number(group.y || 0));
      maxX = Math.max(maxX, Number(group.x || 0) + Number(group.w || 0));
      maxY = Math.max(maxY, Number(group.y || 0) + Number(group.h || 0));
    });
    STATE.nodes.forEach((node) => {
      minX = Math.min(minX, Number(node.x || 0));
      minY = Math.min(minY, Number(node.y || 0));
      maxX = Math.max(maxX, Number(node.x || 0) + Number(node.w || CARD_WIDTH));
      maxY = Math.max(maxY, Number(node.y || 0) + Number(node.h || CARD_HEIGHT));
    });
    if (!Number.isFinite(minX) || !Number.isFinite(minY)) return null;
    return {
      minX,
      minY,
      maxX,
      maxY,
      width: Math.max(0, maxX - minX),
      height: Math.max(0, maxY - minY),
    };
  }

  function restoreViewportForFreshLayout(layoutStore) {
    const hasSavedGroups = Array.isArray(layoutStore && layoutStore.groups) && layoutStore.groups.length > 0;
    const hasSavedNodes = Array.isArray(layoutStore && layoutStore.nodes) && layoutStore.nodes.length > 0;
    if (hasSavedGroups || hasSavedNodes || !dom.stageWrap) return;
    requestAnimationFrame(() => {
      const bounds = contentBounds();
      if (!bounds) return;
      const centerX = (bounds.minX + bounds.maxX) / 2;
      const centerY = (bounds.minY + bounds.maxY) / 2;
      dom.stageWrap.scrollLeft = Math.max(0, centerX * STATE.zoom - dom.stageWrap.clientWidth / 2);
      dom.stageWrap.scrollTop = Math.max(0, centerY * STATE.zoom - dom.stageWrap.clientHeight / 2);
      renderMiniMap();
    });
  }

  function applyStageMetrics() {
    if (!dom.stage || !dom.stageViewport) return;
    const metrics = stageMetrics();
    dom.stage.style.width = `${metrics.width}px`;
    dom.stage.style.minHeight = `${metrics.height}px`;
    dom.stageViewport.style.width = `${metrics.width * STATE.zoom}px`;
    dom.stageViewport.style.minHeight = `${metrics.height * STATE.zoom}px`;
  }

  function collectRunCommunicationPairs(sessions, runs) {
    const sessionMap = new Map((sessions || []).map((session) => [session.session_id, session]));
    const filteredRuns = filterRunsByWindow(runs).filter((run) => sessionMap.has(run.session_id));
    const runMap = new Map(filteredRuns.map((run) => [run.run_id, run]));
    const pairs = [];
    filteredRuns.forEach((run) => {
      const sourceSessionId = safeText(run.session_id);
      if (!sourceSessionId) return;
      const targets = new Set();
      if (run.reply_to_run_id && runMap.has(run.reply_to_run_id)) {
        targets.add(safeText(runMap.get(run.reply_to_run_id).session_id));
      }
      const callbackSessionId = firstText([
        run.callback_to && run.callback_to.session_id,
        run.callback_to && run.callback_to.sessionId,
      ]);
      if (callbackSessionId) targets.add(callbackSessionId);
      resolveTargetSessionIds(
        [
          safeText(run.message_preview),
          safeText(run.source_ref_text),
          safeText(run.callback_to_text),
        ].filter(Boolean).join("\n"),
        sessionMap,
      ).forEach((sid) => targets.add(sid));
      targets.forEach((targetSessionId) => {
        if (!targetSessionId || targetSessionId === sourceSessionId) return;
        if (!sessionMap.has(targetSessionId)) return;
        pairs.push({
          source_session_id: sourceSessionId,
          target_session_id: targetSessionId,
          created_at: safeText(run.created_at),
          ts: dateMs(run.created_at),
          run_id: safeText(run.run_id),
        });
      });
    });
    return { filteredRuns, pairs };
  }

  function aggregatePlatformCommunication(mode, projects, sessions, runs) {
    const orderedProjects = sortProjects(projects);
    const sessionMap = new Map((sessions || []).map((session) => [session.session_id, session]));
    const projectMap = new Map(orderedProjects.map((project) => [safeText(project.project_id), project]));
    const { filteredRuns, pairs } = collectRunCommunicationPairs(sessions, runs);
    const messageCountBySession = new Map();
    filteredRuns.forEach((run) => {
      const key = safeText(run.session_id);
      if (!key) return;
      messageCountBySession.set(key, Number(messageCountBySession.get(key) || 0) + 1);
    });

    if (mode === "project") {
      const linkMap = new Map();
      pairs.forEach((pair) => {
        const source = sessionMap.get(pair.source_session_id);
        const target = sessionMap.get(pair.target_session_id);
        const sourceProjectId = safeText(source && source.project_id);
        const targetProjectId = safeText(target && target.project_id);
        if (!sourceProjectId || !targetProjectId || sourceProjectId === targetProjectId) return;
        const [endpointA, endpointB] = [sourceProjectId, targetProjectId].sort((a, b) => a.localeCompare(b, "en"));
        const key = `${endpointA}|${endpointB}`;
        if (!linkMap.has(key)) {
          linkMap.set(key, {
            id: `project-link:${key}`,
            from_id: `project::${endpointA}`,
            to_id: `project::${endpointB}`,
            count: 0,
            from_to_count: 0,
            to_from_count: 0,
            cross_project: true,
            last_ts: 0,
            source_project_id: endpointA,
            target_project_id: endpointB,
          });
        }
        const link = linkMap.get(key);
        link.count += 1;
        if (sourceProjectId === endpointA) link.from_to_count += 1;
        else link.to_from_count += 1;
        link.last_ts = Math.max(link.last_ts, Number(pair.ts || 0));
      });
      const links = Array.from(linkMap.values()).sort((a, b) => b.count - a.count || a.from_id.localeCompare(b.from_id, "en"));
      const metricsByProject = new Map(orderedProjects.map((project) => [safeText(project.project_id), {
        message_count: 0,
        peer_count: 0,
        line_count: 0,
        cross_count: 0,
        session_count: 0,
      }]));
      (sessions || []).forEach((session) => {
        const pid = safeText(session.project_id);
        const metrics = metricsByProject.get(pid);
        if (!metrics) return;
        metrics.session_count += 1;
        metrics.message_count += Number(messageCountBySession.get(session.session_id) || 0);
      });
      links.forEach((link) => {
        [link.source_project_id, link.target_project_id].forEach((pid) => {
          const metrics = metricsByProject.get(pid);
          if (!metrics) return;
          metrics.peer_count += 1;
          metrics.line_count += 1;
          metrics.cross_count += link.count;
        });
      });
      return { links, messageCountBySession, metricsByProject };
    }

    const linkMap = new Map();
    pairs.forEach((pair) => {
      const source = sessionMap.get(pair.source_session_id);
      const target = sessionMap.get(pair.target_session_id);
      if (!source || !target) return;
      const [endpointA, endpointB] = [pair.source_session_id, pair.target_session_id].sort((a, b) => a.localeCompare(b, "en"));
      const key = `${endpointA}|${endpointB}`;
      if (!linkMap.has(key)) {
        linkMap.set(key, {
          id: `agent-link:${key}`,
          from_id: endpointA,
          to_id: endpointB,
          count: 0,
          from_to_count: 0,
          to_from_count: 0,
          cross_project: safeText(source.project_id) !== safeText(target.project_id),
          last_ts: 0,
          source_project_id: safeText(source.project_id),
          target_project_id: safeText(target.project_id),
        });
      }
      const link = linkMap.get(key);
      link.count += 1;
      if (pair.source_session_id === endpointA) link.from_to_count += 1;
      else link.to_from_count += 1;
      link.last_ts = Math.max(link.last_ts, Number(pair.ts || 0));
    });
    const links = Array.from(linkMap.values()).sort((a, b) => b.count - a.count || a.from_id.localeCompare(b.from_id, "en"));
    const peerMap = new Map();
    const commCountBySession = new Map();
    links.forEach((link) => {
      peerMap.set(link.from_id, Number(peerMap.get(link.from_id) || 0) + 1);
      peerMap.set(link.to_id, Number(peerMap.get(link.to_id) || 0) + 1);
      commCountBySession.set(link.from_id, Number(commCountBySession.get(link.from_id) || 0) + Number(link.count || 0));
      commCountBySession.set(link.to_id, Number(commCountBySession.get(link.to_id) || 0) + Number(link.count || 0));
    });
    return { links, messageCountBySession, peerMap, commCountBySession };
  }

  function aggregateNodeCommunicationLinks(nodes, runs) {
    const nodeIds = new Set((nodes || []).map((node) => safeText(node.session_id)).filter(Boolean));
    const scopedSessions = (STATE.sessions || []).filter((session) => nodeIds.has(safeText(session.session_id)));
    const { filteredRuns, pairs } = collectRunCommunicationPairs(scopedSessions, runs);
    const messageCountBySession = new Map();
    filteredRuns.forEach((run) => {
      const sid = safeText(run.session_id);
      if (!nodeIds.has(sid)) return;
      messageCountBySession.set(sid, Number(messageCountBySession.get(sid) || 0) + 1);
    });
    const linkMap = new Map();
    pairs.forEach((pair) => {
      const sourceId = safeText(pair.source_session_id);
      const targetId = safeText(pair.target_session_id);
      if (!nodeIds.has(sourceId) || !nodeIds.has(targetId) || sourceId === targetId) return;
      const [endpointA, endpointB] = [sourceId, targetId].sort((a, b) => a.localeCompare(b, "en"));
      const key = `${endpointA}|${endpointB}`;
      if (!linkMap.has(key)) {
        linkMap.set(key, {
          id: `node-link:${key}`,
          from_id: endpointA,
          to_id: endpointB,
          count: 0,
          from_to_count: 0,
          to_from_count: 0,
          cross_project: false,
          last_ts: 0,
        });
      }
      const link = linkMap.get(key);
      link.count += 1;
      if (sourceId === endpointA) link.from_to_count += 1;
      else link.to_from_count += 1;
      link.last_ts = Math.max(link.last_ts, Number(pair.ts || 0));
    });
    const links = Array.from(linkMap.values()).sort((a, b) => b.count - a.count || a.from_id.localeCompare(b.from_id, "en"));
    const peerMap = new Map();
    const commCountBySession = new Map();
    links.forEach((link) => {
      peerMap.set(link.from_id, Number(peerMap.get(link.from_id) || 0) + 1);
      peerMap.set(link.to_id, Number(peerMap.get(link.to_id) || 0) + 1);
      commCountBySession.set(link.from_id, Number(commCountBySession.get(link.from_id) || 0) + Number(link.count || 0));
      commCountBySession.set(link.to_id, Number(commCountBySession.get(link.to_id) || 0) + Number(link.count || 0));
    });
    return { links, messageCountBySession, peerMap, commCountBySession };
  }

  function buildPlatformProjectGroupsAndNodes(projects, sessions, metricsByProject) {
    const layoutStore = loadLayoutStore();
    const savedMap = new Map((Array.isArray(layoutStore.groups) ? layoutStore.groups : []).map((group) => [group.id, group]));
    const savedNodeMap = new Map((Array.isArray(layoutStore.nodes) ? layoutStore.nodes : []).map((node) => [safeText(node.session_id || node.sessionId), node]));
    const groups = [];
    const nodes = [];
    const orderedProjects = sortProjects(projects);
    const maxRowWidth = 8000;
    const startX = 420;
    const startY = 300;
    const colGap = 260;
    const rowGap = 250;
    let cursorX = startX;
    let cursorY = startY;
    let rowHeight = 0;
    orderedProjects.forEach((project, index) => {
      const projectId = safeText(project.project_id);
      const groupId = `group:platform:project:${projectId}`;
      const shellWidth = 620;
      const shellHeight = 356;
      if (cursorX + shellWidth > maxRowWidth) {
        cursorX = startX;
        cursorY += rowHeight + rowGap;
        rowHeight = 0;
      }
      const groupX = cursorX;
      const groupY = cursorY;
      cursorX += shellWidth + colGap;
      rowHeight = Math.max(rowHeight, shellHeight);
      const saved = savedMap.get(groupId);
      const group = {
        id: groupId,
        label: safeText(project.project_name || project.name || project.project_id, projectId),
        rowKind: "other",
        accent: projectAccent(project),
        x: Number(saved && saved.x) || groupX,
        y: Number(saved && saved.y) || groupY,
        w: Number(saved && saved.w) || shellWidth,
        h: Number(saved && saved.h) || shellHeight,
        z: Number.isFinite(Number(saved && saved.z)) ? Number(saved.z) : index,
        sessionIds: [`project::${projectId}`],
        kind: "project-shell",
        project_id: projectId,
      };
      groups.push(group);
      const totals = (project && project.totals && typeof project.totals === "object") ? project.totals : {};
      const savedNode = savedNodeMap.get(`project::${projectId}`);
      const metrics = metricsByProject.get(projectId) || { session_count: 0, line_count: 0, cross_count: 0, message_count: 0, peer_count: 0 };
      nodes.push({
        id: `project::${projectId}`,
        session_id: `project::${projectId}`,
        group_id: group.id,
        x: Number(savedNode && savedNode.x) || (group.x + 36),
        y: Number(savedNode && savedNode.y) || (group.y + 104),
        w: 412,
        h: 160,
        alias: safeText(project.project_name || project.name || project.project_id, projectId),
        role: `${Number(metrics.session_count || totals.channels || 0)} Agent · ${Number(totals.active || 0)} 活跃`,
        channel_name: "平台项目",
        status: projectStatusFromTotals(totals),
        accent: group.accent,
        kind: "project",
        project_id: projectId,
        metric_items: [
          { label: "Agent", value: Number(metrics.session_count || 0) },
          { label: "沟通线", value: Number(metrics.line_count || 0) },
          { label: "沟通量", value: Number(metrics.cross_count || 0) },
          { label: "进行中", value: Number(totals.in_progress || 0) },
        ],
        project_summary: {
          source: safeText(project.source_kind || project.sourceKind || "real"),
          description: safeText(project.description),
          totals,
          metrics,
        },
      });
    });
    return { groups, nodes, channelSections: [] };
  }

  function buildRunsUrl(projectId = STATE.projectId, limit = 200) {
    const params = new URLSearchParams();
    const pid = safeText(projectId);
    if (pid) params.set("projectId", pid);
    params.set("limit", String(Math.max(1, Math.min(200, Number(limit) || 200))));
    params.set("payloadMode", "light");
    const range = currentWindowRange();
    if (range.startMs) params.set("afterCreatedAt", new Date(range.startMs).toISOString());
    if (range.endMs) params.set("beforeCreatedAt", new Date(range.endMs).toISOString());
    return `/api/codex/runs?${params.toString()}`;
  }

  function buildPlatformRunsPageUrl({ limit = PLATFORM_RUNS_PAGE_LIMIT, beforeCreatedAt = "", afterCreatedAt = "" } = {}) {
    const params = new URLSearchParams();
    params.set("limit", String(Math.max(1, Math.min(PLATFORM_RUNS_PAGE_LIMIT, Number(limit) || PLATFORM_RUNS_PAGE_LIMIT))));
    params.set("payloadMode", "light");
    const range = currentWindowRange();
    const afterIso = safeText(afterCreatedAt) || (range.startMs ? new Date(range.startMs).toISOString() : "");
    const beforeIso = safeText(beforeCreatedAt) || (range.endMs ? new Date(range.endMs).toISOString() : "");
    if (afterIso) params.set("afterCreatedAt", afterIso);
    if (beforeIso) params.set("beforeCreatedAt", beforeIso);
    return `/api/codex/runs?${params.toString()}`;
  }

  function filterRunsByWindow(runs) {
    const range = currentWindowRange();
    return (runs || []).filter((run) => {
      const ts = dateMs(run.created_at);
      return ts >= range.startMs && ts <= range.endMs;
    }).sort((a, b) => dateMs(a.created_at) - dateMs(b.created_at));
  }

  function filteredPlatformCommLinks() {
    const min = Math.max(0, Number(STATE.platformLineCountMin) || 0);
    const scope = safeText(STATE.platformCommScope || "all");
    return (STATE.platformCommLinks || []).filter((link) => {
      const count = Number(link.count || 0);
      if (count < min) return false;
      if (scope === "cross") return Boolean(link.cross_project);
      if (scope === "high") return count >= PLATFORM_HIGH_FREQ_COUNT;
      return true;
    });
  }

  function currentViewportRect() {
    if (!dom.stageWrap) return null;
    if (dom.stageWrap.hidden || dom.stageWrap.clientWidth < 24 || dom.stageWrap.clientHeight < 24) return null;
    return {
      left: dom.stageWrap.scrollLeft / STATE.zoom,
      top: dom.stageWrap.scrollTop / STATE.zoom,
      right: (dom.stageWrap.scrollLeft + dom.stageWrap.clientWidth) / STATE.zoom,
      bottom: (dom.stageWrap.scrollTop + dom.stageWrap.clientHeight) / STATE.zoom,
    };
  }

  function lineNearViewport(start, end, viewport, padding = 260) {
    if (!viewport) return true;
    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    const minY = Math.min(start.y, end.y);
    const maxY = Math.max(start.y, end.y);
    return !(
      maxX < viewport.left - padding
      || minX > viewport.right + padding
      || maxY < viewport.top - padding
      || minY > viewport.bottom + padding
    );
  }

  function nodeCommunicationStats(sessionId, links = STATE.commLinks) {
    return (Array.isArray(links) ? links : []).reduce((acc, link) => {
      const endpointA = safeText(link.from_id);
      const endpointB = safeText(link.to_id);
      if (sessionId !== endpointA && sessionId !== endpointB) return acc;
      acc.peer_count += 1;
      acc.total_count += Number(link.count || 0);
      if (sessionId === endpointA) {
        acc.outbound_count += Number(link.from_to_count || 0);
        acc.inbound_count += Number(link.to_from_count || 0);
      } else {
        acc.outbound_count += Number(link.to_from_count || 0);
        acc.inbound_count += Number(link.from_to_count || 0);
      }
      return acc;
    }, { peer_count: 0, total_count: 0, outbound_count: 0, inbound_count: 0 });
  }

  function nodeBySessionId(sessionId) {
    return STATE.nodes.find((item) => item.session_id === sessionId) || null;
  }

  function nodeAnchor(node, side) {
    if (!node) return null;
    if (side === "top") return { x: node.x + node.w / 2, y: node.y };
    if (side === "bottom") return { x: node.x + node.w / 2, y: node.y + node.h };
    if (side === "left") return { x: node.x, y: node.y + node.h / 2 };
    return { x: node.x + node.w, y: node.y + node.h / 2 };
  }

  function inferNodeSideFromPoint(nodeEl, clientX, clientY) {
    if (!nodeEl) return "left";
    const rect = nodeEl.getBoundingClientRect();
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;
    const dx = localX - rect.width / 2;
    const dy = localY - rect.height / 2;
    if (Math.abs(dx) > Math.abs(dy)) return dx >= 0 ? "right" : "left";
    return dy >= 0 ? "bottom" : "top";
  }

  function defaultRelationLabel(type) {
    return relationTone(type).label;
  }

  function buildStoredRelations(nodes, layoutStore = loadLayoutStore()) {
    const validIds = new Set(nodes.map((node) => node.session_id));
    const stored = Array.isArray(layoutStore.relations) ? layoutStore.relations : [];
    return stored
      .filter((edge) => edge && typeof edge === "object")
      .map((edge) => ({
        id: safeText(edge.id) || `relation:${Math.random().toString(36).slice(2, 10)}`,
        from_session_id: safeText(edge.from_session_id || edge.fromSessionId),
        to_session_id: safeText(edge.to_session_id || edge.toSessionId),
        from_side: safeText(edge.from_side || edge.fromSide, "right"),
        to_side: safeText(edge.to_side || edge.toSide, "left"),
        type: safeText(edge.type, "business"),
        label: safeText(edge.label, defaultRelationLabel(safeText(edge.type, "business"))),
      }))
      .filter((edge) => validIds.has(edge.from_session_id) && validIds.has(edge.to_session_id));
  }

  function buildProjectLayoutSnapshot(projectId, sessions) {
    const scopedStore = loadLayoutStoreByKey(projectLayoutStorageKey(projectId));
    const { groups, nodes } = computeGroupsAndNodes(sessions, scopedStore);
    const relations = buildStoredRelations(nodes, scopedStore);
    return {
      project_id: safeText(projectId),
      groups,
      nodes,
      relations,
      bounds: computeBoardBounds(groups, nodes),
      zoom: Math.max(0.55, Math.min(1.6, Number(scopedStore.zoom) || 1)),
    };
  }

  function platformShellCount() {
    return STATE.groups.filter((group) => safeText(group.kind) === "project-shell").length;
  }

  function platformLayoutGroupCount() {
    return STATE.groups.filter((group) => safeText(group.kind) === "project-layout-group").length;
  }

  function buildPlatformComposedAgentLayout(projects, sessions, messageCountBySession, peerMap, commCountBySession) {
    const layoutStore = loadLayoutStore();
    const savedShellMap = new Map(
      (Array.isArray(layoutStore.groups) ? layoutStore.groups : [])
        .filter((group) => safeText(group.kind) === "project-shell" || /^group:platform:project:/.test(safeText(group.id)))
        .map((group) => [group.id, group])
    );
    const groups = [];
    const nodes = [];
    const relations = [];
    const layoutGroups = [];
    const orderedProjects = sortProjects(projects);
    const maxRowWidth = 9600;
    const startX = 560;
    const startY = 320;
    const colGap = 560;
    const rowGap = 560;
    const shellPadX = 110;
    const shellPadY = 60;
    const shellHeaderH = 108;
    let cursorX = startX;
    let cursorY = startY;
    let rowHeight = 0;

    orderedProjects.forEach((project, index) => {
      const projectId = safeText(project.project_id);
      const projectSessions = (sessions || []).filter((session) => safeText(session.project_id) === projectId);
      const snapshot = buildProjectLayoutSnapshot(projectId, projectSessions);
      const bounds = snapshot.bounds && snapshot.bounds.width >= 0
        ? snapshot.bounds
        : computeBoardBounds(snapshot.groups, snapshot.nodes);
      const rawWidth = Math.max(480, Number(bounds && bounds.width) || 0);
      const rawHeight = Math.max(320, Number(bounds && bounds.height) || 0);
      const scale = Math.max(
        0.22,
        Math.min(
          PLATFORM_PROJECT_LAYOUT_BASE_SCALE,
          PLATFORM_PROJECT_LAYOUT_MAX_WIDTH / rawWidth,
          PLATFORM_PROJECT_LAYOUT_MAX_HEIGHT / rawHeight,
        ),
      ) * PLATFORM_PROJECT_LAYOUT_COMPACT_SCALE;
      const shellWidth = Math.ceil(rawWidth * scale + shellPadX * 2);
      const shellHeight = Math.ceil(rawHeight * scale + shellHeaderH + shellPadY * 2);
      if (cursorX + shellWidth > maxRowWidth) {
        cursorX = startX;
        cursorY += rowHeight + rowGap;
        rowHeight = 0;
      }
      const groupId = `group:platform:project:${projectId}`;
      const savedShell = savedShellMap.get(groupId);
      const shellX = Number(savedShell && savedShell.x) || cursorX;
      const shellY = Number(savedShell && savedShell.y) || cursorY;
      cursorX += shellWidth + colGap;
      rowHeight = Math.max(rowHeight, shellHeight);

      const shellGroup = {
        id: groupId,
        label: safeText(project.project_name || project.name || project.project_id, projectId),
        rowKind: "other",
        accent: projectAccent(project),
        x: shellX,
        y: shellY,
        w: Number(savedShell && savedShell.w) || shellWidth,
        h: Number(savedShell && savedShell.h) || shellHeight,
        z: Number.isFinite(Number(savedShell && savedShell.z)) ? Number(savedShell.z) : index * 100,
        sessionIds: projectSessions.map((session) => session.session_id),
        kind: "project-shell",
        project_id: projectId,
        readonly: true,
      };
      groups.push(shellGroup);

      const offsetX = shellGroup.x + shellPadX - Number(bounds && bounds.minX || 0) * scale;
      const offsetY = shellGroup.y + shellHeaderH + shellPadY - Number(bounds && bounds.minY || 0) * scale;

      snapshot.groups.forEach((group, groupIndex) => {
        const mapped = {
          ...group,
          id: `platform:${projectId}:${group.id}`,
          parent_group_id: shellGroup.id,
          x: Math.round(offsetX + Number(group.x || 0) * scale),
          y: Math.round(offsetY + Number(group.y || 0) * scale),
          w: Math.max(140, Math.round(Number(group.w || 0) * scale)),
          h: Math.max(96, Math.round(Number(group.h || 0) * scale)),
          z: shellGroup.z + 1 + groupIndex,
          kind: "project-layout-group",
          project_id: projectId,
          readonly: true,
          accent: safeText(group.accent) || shellGroup.accent,
        };
        groups.push(mapped);
        layoutGroups.push(mapped);
      });

      snapshot.nodes.forEach((node) => {
        const compactSize = compactNodeCardSize(node.alias, "platform");
        nodes.push({
          ...node,
          group_id: node.group_id ? `platform:${projectId}:${node.group_id}` : shellGroup.id,
          x: Math.round(offsetX + Number(node.x || 0) * scale),
          y: Math.round(offsetY + Number(node.y || 0) * scale),
          w: compactSize.w,
          h: compactSize.h,
          project_id: projectId,
          readonly: true,
          metric_items: [
            { label: "消息", value: Number(messageCountBySession.get(node.session_id) || 0) },
            { label: "对象", value: Number(peerMap.get(node.session_id) || 0) },
            { label: "往来", value: Number(commCountBySession.get(node.session_id) || 0) },
          ],
        });
      });

      snapshot.relations.forEach((relation) => {
        relations.push({
          ...relation,
          id: `platform:${projectId}:${relation.id}`,
          readonly: true,
          project_id: projectId,
        });
      });
    });

    groups.sort((a, b) => a.z - b.z);
    return { groups, nodes, relations, layoutGroups };
  }

  function visibleRelationCount() {
    return STATE.manualRelations.filter((relation) => STATE.visibleRelations[relation.type] !== false).length;
  }

  function showHoverTooltip(contentHtml, clientX, clientY) {
    if (!dom.bubbleTooltip) return;
    dom.bubbleTooltip.innerHTML = contentHtml;
    dom.bubbleTooltip.style.left = `${Math.min(window.innerWidth - 300, clientX + 14)}px`;
    dom.bubbleTooltip.style.top = `${Math.min(window.innerHeight - 90, clientY + 14)}px`;
    dom.bubbleTooltip.classList.add("visible");
  }

  function hideHoverTooltip() {
    dom.bubbleTooltip?.classList.remove("visible");
  }

  function communicationDetailHtml(link, fromLabel, toLabel) {
    const total = Number(link.count || 0);
    const fromTo = Number(link.from_to_count || 0);
    const toFrom = Number(link.to_from_count || 0);
    return `
      <div>${escapeHtml(fromLabel)} ↔ ${escapeHtml(toLabel)}</div>
      <div class="meta">总量 ${total} · ${escapeHtml(fromLabel)}→${escapeHtml(toLabel)} ${fromTo} · ${escapeHtml(toLabel)}→${escapeHtml(fromLabel)} ${toFrom}</div>
    `;
  }

  function escapeHtml(text) {
    return String(text == null ? "" : text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function renderHeader() {
    const toggleVisible = (el, visible) => {
      if (!el) return;
      el.classList.toggle("is-hidden", !visible);
      el.hidden = !visible;
    };
    if (dom.envBadge) dom.envBadge.textContent = safeText(DATA.environment, "stable");
    if (dom.taskLink) {
      if (isPlatformMode()) {
        dom.taskLink.textContent = "平台页";
        dom.taskLink.href = safeText(LINKS.overview_page, "/share/project-overview-dashboard.html");
      } else {
        dom.taskLink.textContent = "任务页";
        dom.taskLink.href = `${safeText(LINKS.task_page, "/share/project-task-dashboard.html")}#p=${encodeURIComponent(STATE.projectId)}`;
      }
    }
    if (dom.curtainLink) {
      if (isPlatformMode()) {
        dom.curtainLink.href = `${safeText(DATA.agent_curtain_page || LINKS.agent_curtain_page, "/share/project-agent-curtain.html")}#mode=global`;
      } else {
        dom.curtainLink.href = `${safeText(DATA.agent_curtain_page || LINKS.agent_curtain_page, "/share/project-agent-curtain.html")}#p=${encodeURIComponent(STATE.projectId)}`;
      }
    }
    toggleVisible(dom.platformModeTabsWrap, isPlatformMode());
    toggleVisible(dom.platformCommScopeFilters, isPlatformMode());
    toggleVisible(dom.platformCommCountFilters, isPlatformMode());
    toggleVisible(dom.relationToolbarStack, false);
    if (dom.rosterSectionTitle) {
      dom.rosterSectionTitle.textContent = isPlatformMode()
        ? (STATE.platformLayoutMode === "project" ? "项目节点池" : "通道节点池（项目级布局拼接）")
        : "Agent 节点池";
    }
    document.querySelectorAll(".row-label").forEach((label) => {
      label.hidden = isPlatformMode();
    });
    if (dom.boardMeta) {
      dom.boardMeta.textContent = isPlatformMode()
        ? `平台组织战略 · ${STATE.platformLayoutMode === "agent" ? "Agent模式（项目壳 + 项目级布局拼接）" : "项目模式"} · ${currentWindowLabel()}`
        : `${STATE.projectName || STATE.projectId} · ${STATE.channelHint ? `通道 ${STATE.channelHint}` : "单项目组织视图"} · ${currentWindowLabel()}`;
    }
    if (dom.summaryMeta) {
      const visibleComm = STATE.visibleRelations.message ? filteredPlatformCommLinks().length : 0;
      const visibleCommTotal = STATE.visibleRelations.message ? totalCommCount(filteredPlatformCommLinks()) : 0;
      dom.summaryMeta.textContent = isPlatformMode()
        ? `项目 ${platformShellCount()} · ${STATE.platformLayoutMode === "agent" ? `节点 ${STATE.nodes.length}` : `项目节点 ${STATE.nodes.length}`} · 沟通线 ${visibleComm}/${STATE.platformCommLinks.length} · 总量 ${visibleCommTotal}${STATE.platformLineCountMin > 0 ? ` · 数量 ${STATE.platformLineCountMin}+` : ""}`
        : `背景板 ${STATE.groups.length} · Agent ${STATE.nodes.length} · 沟通线 ${(STATE.visibleRelations.message ? STATE.commLinks.length : 0)} · 总量 ${STATE.visibleRelations.message ? totalCommCount(STATE.commLinks) : 0}`;
    }
    dom.platformModeButtons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.platformLayout === STATE.platformLayoutMode);
    });
    dom.platformScopeButtons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.commScope === STATE.platformCommScope);
    });
    dom.platformCountButtons.forEach((button) => {
      button.classList.toggle("is-active", Number(button.dataset.commCountMin || 0) === Number(STATE.platformLineCountMin || 0));
    });
    dom.relationTypeButtons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.relationType === STATE.activeRelationType);
    });
    dom.visibilityButtons.forEach((button) => {
      const key = button.dataset.visibility || "";
      button.classList.toggle("is-active", STATE.visibleRelations[key] !== false);
    });
    syncTimeControls();
  }

  function syncZoom() {
    if (!dom.stage || !dom.stageViewport || !dom.stageWrap) return;
    const zoom = Math.max(0.55, Math.min(1.6, Number(STATE.zoom) || 1));
    STATE.zoom = zoom;
    const baseW = dom.stage.offsetWidth || 3800;
    const baseH = dom.stage.offsetHeight || 2280;
    const prevZoom = Number(dom.stage.dataset.zoom || 1) || 1;
    const centerRatioX = ((dom.stageWrap.scrollLeft + dom.stageWrap.clientWidth / 2) / Math.max(baseW * prevZoom, 1));
    const centerRatioY = ((dom.stageWrap.scrollTop + dom.stageWrap.clientHeight / 2) / Math.max(baseH * prevZoom, 1));
    dom.stage.style.transform = `scale(${zoom})`;
    dom.stage.dataset.zoom = String(zoom);
    dom.stageViewport.style.width = `${baseW * zoom}px`;
    dom.stageViewport.style.height = `${baseH * zoom}px`;
    dom.stageWrap.scrollLeft = Math.max(0, centerRatioX * baseW * zoom - dom.stageWrap.clientWidth / 2);
    dom.stageWrap.scrollTop = Math.max(0, centerRatioY * baseH * zoom - dom.stageWrap.clientHeight / 2);
    dom.zoomResetBtn && (dom.zoomResetBtn.textContent = `${Math.round(zoom * 100)}%`);
    renderMiniMap();
  }

  function renderMiniMap() {
    if (!dom.miniMap || !dom.stage || !dom.stageWrap) return;
    dom.miniMap.innerHTML = "";
    const baseW = dom.stage.offsetWidth || 3800;
    const baseH = dom.stage.offsetHeight || 2280;
    const scaleX = dom.miniMap.clientWidth / Math.max(baseW, 1);
    const scaleY = dom.miniMap.clientHeight / Math.max(baseH, 1);
    STATE.groups.forEach((group) => {
      const box = document.createElement("div");
      box.className = "mini-group";
      box.style.left = `${group.x * scaleX}px`;
      box.style.top = `${group.y * scaleY}px`;
      box.style.width = `${Math.max(6, group.w * scaleX)}px`;
      box.style.height = `${Math.max(6, group.h * scaleY)}px`;
      dom.miniMap.appendChild(box);
    });
    STATE.nodes.forEach((node) => {
      const mark = document.createElement("div");
      mark.className = "mini-node";
      mark.style.left = `${node.x * scaleX}px`;
      mark.style.top = `${node.y * scaleY}px`;
      dom.miniMap.appendChild(mark);
    });
    const viewport = document.createElement("div");
    viewport.className = "mini-viewport";
    const width = Math.min(dom.miniMap.clientWidth, (dom.stageWrap.clientWidth / Math.max(baseW * STATE.zoom, 1)) * dom.miniMap.clientWidth);
    const height = Math.min(dom.miniMap.clientHeight, (dom.stageWrap.clientHeight / Math.max(baseH * STATE.zoom, 1)) * dom.miniMap.clientHeight);
    const left = (dom.stageWrap.scrollLeft / Math.max(baseW * STATE.zoom, 1)) * dom.miniMap.clientWidth;
    const top = (dom.stageWrap.scrollTop / Math.max(baseH * STATE.zoom, 1)) * dom.miniMap.clientHeight;
    viewport.style.width = `${Math.max(18, width)}px`;
    viewport.style.height = `${Math.max(18, height)}px`;
    viewport.style.left = `${Math.max(0, Math.min(dom.miniMap.clientWidth - width, left))}px`;
    viewport.style.top = `${Math.max(0, Math.min(dom.miniMap.clientHeight - height, top))}px`;
    dom.miniMap.appendChild(viewport);
  }

  function renderGroups() {
    dom.groupsLayer.innerHTML = "";
    dom.groupChipLayer.innerHTML = "";
    const ordered = [...STATE.groups].sort((a, b) => a.z - b.z);
    ordered.forEach((group) => {
      const activity = groupActivityStats(group);
      const box = document.createElement("div");
      const kind = safeText(group.kind);
      const readonly = Boolean(isPlatformMode() && group.readonly);
      box.className = `group-box${group.id === STATE.selectedGroupId ? " selected" : ""}${activity.active ? " active" : ""}${activity.peak ? " peak" : ""}${kind === "project-shell" ? " project-shell" : ""}${kind === "project-layout-group" ? " layout-group" : ""}${readonly ? " readonly" : ""}`;
      box.style.left = `${group.x}px`;
      box.style.top = `${group.y}px`;
      box.style.width = `${group.w}px`;
      box.style.height = `${group.h}px`;
      box.style.setProperty("--group-soft", rgbaFromHex(group.accent, 0.1));
      box.style.setProperty("--group-fade", rgbaFromHex(group.accent, 0.05));
      box.addEventListener("click", () => {
        STATE.selectedGroupId = group.id;
        STATE.selectedSessionId = "";
        STATE.selectedRelationId = "";
        STATE.selectedPlatformCommLinkId = "";
        renderAll();
      });
      dom.groupsLayer.appendChild(box);

      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = `group-chip${group.id === STATE.selectedGroupId ? " selected" : ""}${activity.active ? " active" : ""}${activity.peak ? " peak" : ""}${readonly ? " readonly" : ""}`;
      chip.style.left = `${group.x + 14}px`;
      chip.style.top = `${group.y + 14}px`;
      chip.innerHTML = `<span>${escapeHtml(group.label)}</span><span class="hint">${readonly ? "只读查看" : "拖动 / 改名"}</span>`;
      if (!readonly) {
        chip.addEventListener("pointerdown", (event) => {
          STATE.selectedGroupId = group.id;
          STATE.selectedRelationId = "";
          STATE.selectedSessionId = "";
          STATE.selectedPlatformCommLinkId = "";
          STATE.dragGroup = { id: group.id, pointerId: event.pointerId, originX: group.x, originY: group.y, startX: event.clientX, startY: event.clientY };
          chip.setPointerCapture(event.pointerId);
          renderDetail();
          renderGroups();
        });
        chip.addEventListener("dblclick", () => {
          const next = window.prompt("修改背景板名称", group.label);
          if (!next) return;
          group.label = safeText(next, group.label);
          persistLayoutStore();
          renderAll();
        });
      } else {
        chip.addEventListener("click", () => {
          STATE.selectedGroupId = group.id;
          STATE.selectedRelationId = "";
          STATE.selectedSessionId = "";
          STATE.selectedPlatformCommLinkId = "";
          renderAll();
        });
      }
      dom.groupChipLayer.appendChild(chip);

      if (!readonly && group.id === STATE.selectedGroupId) {
        [
          { corner: "nw", x: group.x - 8, y: group.y - 8 },
          { corner: "ne", x: group.x + group.w - 8, y: group.y - 8 },
          { corner: "sw", x: group.x - 8, y: group.y + group.h - 8 },
          { corner: "se", x: group.x + group.w - 8, y: group.y + group.h - 8 },
        ].forEach((meta) => {
          const handle = document.createElement("div");
          handle.className = `group-resize ${meta.corner}`;
          handle.style.left = `${meta.x}px`;
          handle.style.top = `${meta.y}px`;
          handle.addEventListener("pointerdown", (event) => {
            STATE.resizeGroup = {
              id: group.id,
              corner: meta.corner,
              pointerId: event.pointerId,
              startX: event.clientX,
              startY: event.clientY,
              originX: group.x,
              originY: group.y,
              originW: group.w,
              originH: group.h,
            };
            handle.setPointerCapture(event.pointerId);
            event.stopPropagation();
          });
          dom.groupChipLayer.appendChild(handle);
        });
      }
    });
  }

  function nodeAvatar(node) {
    return avatarMeta(node).text;
  }

  function renderNodes() {
    dom.nodesLayer.innerHTML = "";
    STATE.nodes.forEach((node) => {
      const el = document.createElement("div");
      const isPlatformNode = isPlatformMode();
      const nodeKind = safeText(node.kind || (isPlatformNode ? "agent" : ""), "agent");
      const readonly = Boolean(isPlatformNode && node.readonly);
      const compactAgentNode = nodeKind !== "project";
      const avatar = avatarMeta(node);
      el.className = `node${node.session_id === STATE.selectedSessionId ? " selected" : ""}${STATE.relationDraft && STATE.relationDraft.from_session_id === node.session_id ? " connecting" : ""}${compactAgentNode ? " compact-name-only" : ""}${isPlatformNode ? ` platform-node ${nodeKind === "project" ? "project-node" : "agent-node"}` : ""}${readonly ? " readonly" : ""}`;
      el.dataset.sessionId = node.session_id;
      el.style.left = `${node.x}px`;
      el.style.top = `${node.y}px`;
      el.style.width = `${Number(node.w || CARD_WIDTH)}px`;
      el.style.minHeight = `${Number(node.h || CARD_HEIGHT)}px`;
      el.style.setProperty("--avatar-a", avatar.c1 || node.accent);
      el.style.setProperty("--avatar-b", avatar.c2 || rgbaFromHex(node.accent, 0.68));
      const tags = [];
      tags.push(`<span class="tag">${escapeHtml(node.status || "idle")}</span>`);
      tags.push(`<span class="tag">${escapeHtml(node.channel_name)}</span>`);
      const metricItems = Array.isArray(node.metric_items) ? node.metric_items : [];
      const showPlatformStats = !(isPlatformNode && STATE.platformLayoutMode === "agent" && nodeKind !== "project");
      const platformStats = showPlatformStats
        ? (metricItems.length
          ? `<div class="platform-stat-grid">${metricItems.map((item) => `<div class="platform-stat-card"><span class="platform-stat-label">${escapeHtml(safeText(item.label))}</span><span class="platform-stat-value">${escapeHtml(String(item.value == null ? 0 : item.value))}</span></div>`).join("")}</div>`
          : '<div class="empty-platform-hint">当前时间窗口暂无通讯统计。</div>')
        : "";
      const compactHead = `
        <div class="compact-head">
          <div class="avatar${avatar.fallback ? " is-fallback" : ""}" title="${escapeHtml(avatar.title)}">${escapeHtml(nodeAvatar(node))}</div>
          <div class="compact-title" title="${escapeHtml(node.alias)}">${escapeHtml(node.alias)}</div>
        </div>
      `;
      const sharedNodeBody = isPlatformNode
        ? (compactAgentNode
          ? compactHead
          : `
          <div class="node-head">
            <div class="avatar${avatar.fallback ? " is-fallback" : ""}" title="${escapeHtml(avatar.title)}">${escapeHtml(nodeAvatar(node))}</div>
            <div>
              <div class="node-title">${escapeHtml(node.alias)}</div>
              <div class="node-sub">${escapeHtml(node.role)}</div>
            </div>
          </div>
          <div class="node-tags">${STATE.visibleRelations.labels !== false ? tags.join("") : ""}</div>
          ${platformStats || '<div class="empty-platform-hint">当前时间窗口暂无统计。</div>'}
          `)
        : "";
      el.innerHTML = `
        ${isPlatformNode ? sharedNodeBody : compactHead}
        ${node.kind === "project" || isPlatformNode ? "" : `
        <button class="connector top" data-side="top" type="button" aria-label="从上侧连接 ${escapeHtml(node.alias)}"></button>
        <button class="connector right" data-side="right" type="button" aria-label="从右侧连接 ${escapeHtml(node.alias)}"></button>
        <button class="connector bottom" data-side="bottom" type="button" aria-label="从下侧连接 ${escapeHtml(node.alias)}"></button>
        <button class="connector left" data-side="left" type="button" aria-label="从左侧连接 ${escapeHtml(node.alias)}"></button>`}
      `;
      if (!readonly) {
        el.addEventListener("pointerdown", (event) => {
          if (event.button !== 0) return;
          if (event.target && event.target.closest && event.target.closest(".connector")) return;
          STATE.dragNode = {
            id: node.session_id,
            pointerId: event.pointerId,
            originX: node.x,
            originY: node.y,
            startX: event.clientX,
            startY: event.clientY,
          };
          el.setPointerCapture(event.pointerId);
        });
      }
      el.addEventListener("click", () => {
        STATE.selectedSessionId = node.session_id;
        STATE.selectedGroupId = "";
        STATE.selectedRelationId = "";
        STATE.selectedPlatformCommLinkId = "";
        renderAll();
      });
      dom.nodesLayer.appendChild(el);
      el.querySelectorAll(".connector").forEach((connector) => {
        connector.addEventListener("click", (event) => {
          event.stopPropagation();
          const side = connector.dataset.side || "right";
          const draft = STATE.relationDraft;
          if (draft) {
            if (draft.from_session_id === node.session_id) {
              STATE.relationDraft = null;
              renderLinks();
              return;
            }
            completeRelationDraft(node.session_id, side);
            return;
          }
          const start = nodeAnchor(node, side);
          STATE.relationDraft = {
            from_session_id: node.session_id,
            from_side: side,
            currentX: start ? start.x : node.x + node.w,
            currentY: start ? start.y : node.y + node.h / 2,
          };
          renderAll();
        });
      });
    });
  }

  function completeRelationDraft(targetSessionId, targetSide) {
    const draft = STATE.relationDraft;
    if (!draft || !targetSessionId) return false;
    if (draft.from_session_id === targetSessionId) {
      STATE.relationDraft = null;
      renderLinks();
      return false;
    }
    STATE.manualRelations.push({
      id: `relation:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 7)}`,
      from_session_id: draft.from_session_id,
      to_session_id: targetSessionId,
      from_side: draft.from_side,
      to_side: safeText(targetSide, "left"),
      type: STATE.activeRelationType,
      label: defaultRelationLabel(STATE.activeRelationType),
    });
    STATE.relationDraft = null;
    persistLayoutStore();
    renderAll();
    return true;
  }

  function nodeCenter(node) {
    if (!node) return null;
    return {
      x: Number(node.x || 0) + Number(node.w || CARD_WIDTH) / 2,
      y: Number(node.y || 0) + Number(node.h || CARD_HEIGHT) / 2,
    };
  }

  function nodeLinkAnchor(fromNode, toNode) {
    if (!fromNode || !toNode) return null;
    const fromCenter = nodeCenter(fromNode);
    const toCenter = nodeCenter(toNode);
    if (!fromCenter || !toCenter) return null;
    const dx = toCenter.x - fromCenter.x;
    const dy = toCenter.y - fromCenter.y;
    if (Math.abs(dx) >= Math.abs(dy)) {
      return nodeAnchor(fromNode, dx >= 0 ? "right" : "left");
    }
    return nodeAnchor(fromNode, dy >= 0 ? "bottom" : "top");
  }

  function communicationTone(count) {
    if (count >= 10) return "strong";
    if (count >= 5) return "mid";
    return "soft";
  }

  function communicationStrokeWidth(count, mode = "project") {
    const base = mode === "platform" ? 4.2 : 3.2;
    const max = mode === "platform" ? 10.8 : 8.4;
    return Math.min(max, base + Math.log2(Math.max(1, Number(count || 1))));
  }

  function communicationEndpointLabels(link) {
    const fromNode = nodeBySessionId(link.from_id);
    const toNode = nodeBySessionId(link.to_id);
    return {
      fromNode,
      toNode,
      fromLabel: safeText(fromNode && fromNode.alias, link.from_id),
      toLabel: safeText(toNode && toNode.alias, link.to_id),
    };
  }

  function communicationLabelPoint(start, end) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lift = Math.max(18, Math.min(46, Math.abs(dx) * 0.08 + Math.abs(dy) * 0.04));
    return {
      x: Math.round((start.x + end.x) / 2),
      y: Math.round((start.y + end.y) / 2 - lift),
    };
  }

  function bindCommunicationHover(target, link, labels) {
    target.addEventListener("mouseenter", (event) => {
      showHoverTooltip(communicationDetailHtml(link, labels.fromLabel, labels.toLabel), event.clientX, event.clientY);
    });
    target.addEventListener("mousemove", (event) => {
      showHoverTooltip(communicationDetailHtml(link, labels.fromLabel, labels.toLabel), event.clientX, event.clientY);
    });
    target.addEventListener("mouseleave", hideHoverTooltip);
  }

  function drawAggregatedCommLink(link, index, viewport, mode = "project") {
    const { fromNode, toNode, fromLabel, toLabel } = communicationEndpointLabels(link);
    if (!fromNode || !toNode) return;
    const start = nodeLinkAnchor(fromNode, toNode);
    const end = nodeLinkAnchor(toNode, fromNode);
    if (!start || !end) return;
    const tone = communicationTone(Number(link.count || 0));
    const selectLink = (event) => {
      event.stopPropagation();
      STATE.selectedPlatformCommLinkId = link.id;
      STATE.selectedRelationId = "";
      STATE.selectedGroupId = "";
      STATE.selectedSessionId = "";
      renderAll();
    };
    const hit = document.createElementNS("http://www.w3.org/2000/svg", "path");
    hit.setAttribute("d", curvePath(start, end));
    hit.setAttribute("class", "relation-hit");
    hit.dataset.commId = link.id;
    hit.addEventListener("click", selectLink);
    bindCommunicationHover(hit, link, { fromLabel, toLabel });
    dom.linesSvg.appendChild(hit);

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", curvePath(start, end));
    path.setAttribute("class", `comm-line ${mode} ${tone}${link.cross_project ? " cross-project" : ""}${link.id === STATE.selectedPlatformCommLinkId ? " selected" : ""}`);
    path.style.setProperty("--comm-width", String(communicationStrokeWidth(link.count, mode)));
    path.addEventListener("click", selectLink);
    bindCommunicationHover(path, link, { fromLabel, toLabel });
    dom.linesSvg.appendChild(path);

    if (Number(link.count || 0) > 0) {
      const labelPoint = communicationLabelPoint(start, end);
      const labelText = String(Number(link.count || 0));
      const badgeWidth = Math.max(24, 16 + labelText.length * 8);
      const badge = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      badge.setAttribute("class", `comm-badge${link.cross_project ? " cross-project" : ""}${link.id === STATE.selectedPlatformCommLinkId ? " selected" : ""}`);
      badge.setAttribute("x", String(Math.round(labelPoint.x - badgeWidth / 2)));
      badge.setAttribute("y", String(Math.round(labelPoint.y - 11)));
      badge.setAttribute("width", String(badgeWidth));
      badge.setAttribute("height", "22");
      badge.setAttribute("rx", "11");
      badge.setAttribute("ry", "11");
      badge.addEventListener("click", selectLink);
      bindCommunicationHover(badge, link, { fromLabel, toLabel });
      dom.linesSvg.appendChild(badge);
      const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      label.setAttribute("class", `comm-label ${tone}${link.cross_project ? " cross-project" : ""}${link.id === STATE.selectedPlatformCommLinkId ? " selected" : ""}`);
      label.setAttribute("x", String(labelPoint.x));
      label.setAttribute("y", String(labelPoint.y + 1));
      label.setAttribute("text-anchor", "middle");
      label.textContent = labelText;
      label.addEventListener("click", selectLink);
      bindCommunicationHover(label, link, { fromLabel, toLabel });
      dom.linesSvg.appendChild(label);
    }
  }

  function drawRelation(edge) {
    if (STATE.visibleRelations[edge.type] === false) return;
    const fromNode = nodeBySessionId(edge.from_session_id);
    const toNode = nodeBySessionId(edge.to_session_id);
    const start = nodeAnchor(fromNode, edge.from_side);
    const end = nodeAnchor(toNode, edge.to_side);
    if (!start || !end) return;
    const tone = relationTone(edge.type);
    const selectRelation = (event) => {
      event.stopPropagation();
      STATE.selectedRelationId = edge.id;
      STATE.selectedPlatformCommLinkId = "";
      STATE.selectedGroupId = "";
      STATE.selectedSessionId = "";
      renderAll();
    };
    const hit = document.createElementNS("http://www.w3.org/2000/svg", "path");
    hit.setAttribute("d", curvePath(start, end));
    hit.setAttribute("class", "relation-hit");
    hit.dataset.relationId = edge.id;
    hit.addEventListener("click", selectRelation);
    dom.linesSvg.appendChild(hit);
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", curvePath(start, end));
    path.setAttribute("class", `relation-line ${edge.type}${edge.id === STATE.selectedRelationId ? " selected" : ""}`);
    path.setAttribute("stroke", tone.color);
    path.dataset.relationId = edge.id;
    path.addEventListener("click", selectRelation);
    dom.linesSvg.appendChild(path);
    if (STATE.visibleRelations.labels !== false) {
      const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      label.setAttribute("class", "relation-label");
      label.setAttribute("x", String((start.x + end.x) / 2));
      label.setAttribute("y", String((start.y + end.y) / 2 - 10));
      label.setAttribute("text-anchor", "middle");
      label.dataset.relationId = edge.id;
      label.textContent = edge.label || tone.label;
      label.addEventListener("click", selectRelation);
      dom.linesSvg.appendChild(label);
    }
  }

  function renderLinks() {
    dom.linesSvg.innerHTML = `
      <defs>
        <marker id="relationArrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L10,5 L0,10 z" fill="rgba(238,245,255,0.86)"></path>
        </marker>
      </defs>
    `;
    if (isPlatformMode()) {
      if (STATE.platformLayoutMode === "agent") {
        STATE.manualRelations.forEach((relation) => drawRelation(relation));
      }
      if (STATE.visibleRelations.message === true) {
        const visibleLinks = filteredPlatformCommLinks();
        const viewport = currentViewportRect();
        visibleLinks.forEach((link, index) => drawAggregatedCommLink(link, index, viewport, "platform"));
      }
      return;
    }
    STATE.manualRelations.forEach((relation) => drawRelation(relation));
    if (STATE.visibleRelations.message === true) {
      const viewport = currentViewportRect();
      STATE.commLinks.forEach((link, index) => drawAggregatedCommLink(link, index, viewport, "project"));
    }
    if (STATE.relationDraft) {
      const fromNode = nodeBySessionId(STATE.relationDraft.from_session_id);
      const start = nodeAnchor(fromNode, STATE.relationDraft.from_side);
      if (start) {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", curvePath(start, { x: STATE.relationDraft.currentX, y: STATE.relationDraft.currentY }));
        path.setAttribute("class", "draft-line");
        dom.linesSvg.appendChild(path);
      }
    }
  }

  function renderGroupList() {
    dom.groupList.innerHTML = "";
    const ordered = (isPlatformMode()
      ? STATE.groups.filter((group) => safeText(group.kind) === "project-shell")
      : STATE.groups
    ).sort((a, b) => b.z - a.z);
    if (!ordered.length) {
      dom.groupList.innerHTML = '<div class="empty-state">当前项目暂无可展示背景板。</div>';
      return;
    }
    ordered.forEach((group) => {
      const item = document.createElement("div");
      item.className = "layer-item";
      item.draggable = !isPlatformMode();
      item.dataset.groupId = group.id;
      item.innerHTML = `
        <div class="layer-title">${escapeHtml(group.label)}</div>
        <div class="layer-meta">${Math.round(group.w)} × ${Math.round(group.h)} · ${Math.round(group.x)}, ${Math.round(group.y)}</div>
      `;
      item.addEventListener("click", () => {
        STATE.selectedGroupId = group.id;
        STATE.selectedSessionId = "";
        STATE.selectedRelationId = "";
        STATE.selectedPlatformCommLinkId = "";
        renderAll();
      });
      if (!isPlatformMode()) {
        item.addEventListener("dragstart", () => {
          STATE.dragLayerGroupId = group.id;
          item.classList.add("dragging");
        });
        item.addEventListener("dragend", () => {
          item.classList.remove("dragging");
          dom.groupList.querySelectorAll(".layer-item").forEach((node) => node.classList.remove("drop-target"));
        });
        item.addEventListener("dragover", (event) => {
          event.preventDefault();
          if (STATE.dragLayerGroupId && STATE.dragLayerGroupId !== group.id) item.classList.add("drop-target");
        });
        item.addEventListener("dragleave", () => item.classList.remove("drop-target"));
        item.addEventListener("drop", (event) => {
          event.preventDefault();
          item.classList.remove("drop-target");
          if (!STATE.dragLayerGroupId || STATE.dragLayerGroupId === group.id) return;
          const topFirst = [...STATE.groups].sort((a, b) => b.z - a.z);
          const fromIndex = topFirst.findIndex((node) => node.id === STATE.dragLayerGroupId);
          const toIndex = topFirst.findIndex((node) => node.id === group.id);
          if (fromIndex < 0 || toIndex < 0) return;
          const [moved] = topFirst.splice(fromIndex, 1);
          topFirst.splice(toIndex, 0, moved);
          topFirst.forEach((node, index) => { node.z = topFirst.length - index; });
          STATE.groups = [...topFirst].sort((a, b) => a.z - b.z);
          persistLayoutStore();
          renderAll();
        });
      }
      dom.groupList.appendChild(item);
    });
  }

  function centerOnNode(node) {
    if (!node || !dom.stageWrap || !dom.stage) return;
    const targetLeft = Math.max(0, node.x * STATE.zoom - dom.stageWrap.clientWidth / 2 + node.w * STATE.zoom / 2);
    const targetTop = Math.max(0, node.y * STATE.zoom - dom.stageWrap.clientHeight / 2 + node.h * STATE.zoom / 2);
    dom.stageWrap.scrollTo({ left: targetLeft, top: targetTop, behavior: "smooth" });
    renderMiniMap();
  }

  function renderRosterList() {
    if (!dom.rosterList) return;
    const query = safeText(dom.searchInput && dom.searchInput.value).toLowerCase();
    const filtered = STATE.nodes
      .filter((node) => {
        if (!query) return true;
        return [node.alias, node.channel_name, node.role].some((item) => safeText(item).toLowerCase().includes(query));
      })
      .sort((a, b) => a.alias.localeCompare(b.alias, "zh-Hans-CN"));
    dom.rosterList.innerHTML = "";
    if (!filtered.length) {
      dom.rosterList.innerHTML = '<div class="empty-state">没有匹配的 Agent 节点。</div>';
      return;
    }
    filtered.forEach((node) => {
      const item = document.createElement("div");
      item.className = `roster-item${node.session_id === STATE.selectedSessionId ? " selected" : ""}`;
      item.innerHTML = `
        <div class="roster-name">${escapeHtml(node.alias)}</div>
        <div class="roster-meta">${escapeHtml(node.channel_name)} · ${escapeHtml(node.role)}</div>
      `;
      item.addEventListener("click", () => {
        STATE.selectedSessionId = node.session_id;
        STATE.selectedGroupId = "";
        STATE.selectedRelationId = "";
        STATE.selectedPlatformCommLinkId = "";
        renderAll();
        centerOnNode(node);
      });
      dom.rosterList.appendChild(item);
    });
  }

  function renderDetail() {
    const group = STATE.groups.find((item) => item.id === STATE.selectedGroupId);
    const node = STATE.nodes.find((item) => item.session_id === STATE.selectedSessionId);
    const relation = STATE.manualRelations.find((item) => item.id === STATE.selectedRelationId);
    const platformCommLink = (STATE.platformCommLinks || []).find((item) => item.id === STATE.selectedPlatformCommLinkId);
    if (group) {
      dom.detailTitle.textContent = group.label;
      const readonly = Boolean(isPlatformMode() && group.readonly);
      if (readonly) {
        dom.detailBody.innerHTML = `
          <div class="detail-grid">
            <div class="k">对象</div><div>${safeText(group.kind) === "project-shell" ? "项目外壳" : "项目内背景板"}</div>
            <div class="k">项目</div><div>${escapeHtml(group.project_id || "-")}</div>
            <div class="k">尺寸</div><div>${Math.round(group.w)} × ${Math.round(group.h)}</div>
            <div class="k">位置</div><div>${Math.round(group.x)}, ${Math.round(group.y)}</div>
            <div class="k">模式</div><div>只读拼接</div>
          </div>
          <div style="margin-top:14px;font-size:12px;color:var(--muted);">平台组织战略沿用项目级布局快照，平台页不允许直接修改项目内部背景板。</div>
        `;
        dom.detailPanel.classList.remove("collapsed");
        return;
      }
      dom.detailBody.innerHTML = `
        <div class="detail-grid">
          <div class="k">对象</div><div>背景板</div>
          <div class="k">分区</div><div>${escapeHtml(ROWS[group.rowKind].label)}</div>
          <div class="k">尺寸</div><div>${Math.round(group.w)} × ${Math.round(group.h)}</div>
          <div class="k">位置</div><div>${Math.round(group.x)}, ${Math.round(group.y)}</div>
          <div class="k">图层</div><div>${group.z}</div>
        </div>
        <div class="field-stack">
          <label class="field-label" for="groupNameInput">左上角名称</label>
          <input class="field-input" id="groupNameInput" value="${escapeHtml(group.label)}" />
        </div>
        <div class="detail-actions">
          <button class="chip" id="saveGroupNameBtn" type="button">保存名称</button>
        </div>
      `;
      dom.detailBody.querySelector("#saveGroupNameBtn")?.addEventListener("click", () => {
        const input = dom.detailBody.querySelector("#groupNameInput");
        group.label = safeText(input && input.value, group.label);
        persistLayoutStore();
        renderAll();
      });
      dom.detailPanel.classList.remove("collapsed");
      return;
    }
    if (platformCommLink) {
      const { fromNode, toNode, fromLabel, toLabel } = communicationEndpointLabels(platformCommLink);
      dom.detailTitle.textContent = "沟通线详情";
      dom.detailBody.innerHTML = `
        <div class="detail-grid">
          <div class="k">对象</div><div>${isPlatformMode() && STATE.platformLayoutMode === "project" ? "项目沟通线" : "Agent 沟通线"}</div>
          <div class="k">节点A</div><div>${escapeHtml(fromLabel)}</div>
          <div class="k">节点B</div><div>${escapeHtml(toLabel)}</div>
          <div class="k">沟通量</div><div>${Number(platformCommLink.count || 0)}</div>
          <div class="k">${escapeHtml(fromLabel)} → ${escapeHtml(toLabel)}</div><div>${Number(platformCommLink.from_to_count || 0)}</div>
          <div class="k">${escapeHtml(toLabel)} → ${escapeHtml(fromLabel)}</div><div>${Number(platformCommLink.to_from_count || 0)}</div>
          <div class="k">类型</div><div>${platformCommLink.cross_project ? "跨项目" : "项目内"}</div>
          <div class="k">范围过滤</div><div>${escapeHtml(({
            all: "全部沟通",
            cross: "只看跨项目",
            high: `只看高频(${PLATFORM_HIGH_FREQ_COUNT}+)`,
          })[safeText(STATE.platformCommScope || "all")] || "全部沟通")}</div>
          <div class="k">最近时间</div><div>${fmtDateTime(platformCommLink.last_ts)}</div>
        </div>
      `;
      dom.detailPanel.classList.remove("collapsed");
      return;
    }
    if (relation) {
      const fromNode = nodeBySessionId(relation.from_session_id);
      const toNode = nodeBySessionId(relation.to_session_id);
      if (isPlatformMode()) {
        dom.detailTitle.textContent = relation.label || relationTone(relation.type).label;
        dom.detailBody.innerHTML = `
          <div class="detail-grid">
            <div class="k">对象</div><div>项目内业务关系</div>
            <div class="k">项目</div><div>${escapeHtml(relation.project_id || "-")}</div>
            <div class="k">起点</div><div>${escapeHtml(fromNode ? fromNode.alias : relation.from_session_id)}</div>
            <div class="k">终点</div><div>${escapeHtml(toNode ? toNode.alias : relation.to_session_id)}</div>
            <div class="k">关系类型</div><div>${escapeHtml(relationTone(relation.type).label)}</div>
            <div class="k">显示名称</div><div>${escapeHtml(relation.label || relationTone(relation.type).label)}</div>
          </div>
          <div style="margin-top:14px;font-size:12px;color:var(--muted);">平台页中的项目内关系来自项目级布局快照，当前为只读查看。</div>
        `;
        dom.detailPanel.classList.remove("collapsed");
        return;
      }
      dom.detailTitle.textContent = relation.label || relationTone(relation.type).label;
      dom.detailBody.innerHTML = `
        <div class="detail-grid">
          <div class="k">对象</div><div>关系线</div>
          <div class="k">起点</div><div>${escapeHtml(fromNode ? fromNode.alias : relation.from_session_id)}</div>
          <div class="k">终点</div><div>${escapeHtml(toNode ? toNode.alias : relation.to_session_id)}</div>
        </div>
        <div class="field-stack">
          <label class="field-label" for="relationLabelInput">关系名称</label>
          <input class="field-input" id="relationLabelInput" value="${escapeHtml(relation.label || relationTone(relation.type).label)}" />
          <label class="field-label" for="relationTypeSelect">关系类型</label>
          <select class="field-select" id="relationTypeSelect">
            ${Object.entries(RELATION_TYPES).map(([key, meta]) => `<option value="${escapeHtml(key)}"${relation.type === key ? " selected" : ""}>${escapeHtml(meta.label)}</option>`).join("")}
          </select>
        </div>
        <div class="detail-actions">
          <button class="chip" id="saveRelationBtn" type="button">保存关系</button>
          <button class="chip" id="deleteRelationBtn" type="button">删除关系</button>
        </div>
      `;
      dom.detailBody.querySelector("#saveRelationBtn")?.addEventListener("click", () => {
        const labelInput = dom.detailBody.querySelector("#relationLabelInput");
        const typeSelect = dom.detailBody.querySelector("#relationTypeSelect");
        relation.type = safeText(typeSelect && typeSelect.value, relation.type);
        relation.label = safeText(labelInput && labelInput.value, defaultRelationLabel(relation.type));
        persistLayoutStore();
        renderAll();
      });
      dom.detailBody.querySelector("#deleteRelationBtn")?.addEventListener("click", () => {
        STATE.manualRelations = STATE.manualRelations.filter((item) => item.id !== relation.id);
        STATE.selectedRelationId = "";
        persistLayoutStore();
        renderAll();
      });
      dom.detailPanel.classList.remove("collapsed");
      return;
    }
    if (node) {
      if (node.kind === "project") {
        const summary = (node.project_summary && typeof node.project_summary === "object") ? node.project_summary : {};
        const totals = (summary.totals && typeof summary.totals === "object") ? summary.totals : {};
        const metrics = (summary.metrics && typeof summary.metrics === "object") ? summary.metrics : {};
        dom.detailTitle.textContent = node.alias;
        dom.detailBody.innerHTML = `
          <div class="detail-grid">
            <div class="k">对象</div><div>项目节点</div>
            <div class="k">项目ID</div><div>${escapeHtml(node.project_id || "-")}</div>
            <div class="k">来源</div><div>${escapeHtml(summary.source || "-")}</div>
            <div class="k">Agent数</div><div>${Number(metrics.session_count || 0)}</div>
            <div class="k">通道数</div><div>${Number(totals.channels || 0)}</div>
            <div class="k">活跃任务</div><div>${Number(totals.active || 0)}</div>
            <div class="k">进行中</div><div>${Number(totals.in_progress || 0)}</div>
            <div class="k">已完成</div><div>${Number(totals.done || 0)}</div>
            <div class="k">沟通线</div><div>${Number(metrics.line_count || 0)}</div>
            <div class="k">沟通量</div><div>${Number(metrics.cross_count || 0)}</div>
          </div>
          <div style="margin-top:14px;font-size:12px;color:var(--muted);">${escapeHtml(summary.description || "平台组织战略：项目外壳保留，内部再按视角切换项目摘要或 Agent 结构。")}</div>
        `;
        dom.detailPanel.classList.remove("collapsed");
        return;
      }
      if (isPlatformMode()) {
        const metricItems = Array.isArray(node.metric_items) ? node.metric_items : [];
        dom.detailTitle.textContent = node.alias;
        dom.detailBody.innerHTML = `
          <div class="detail-grid">
            <div class="k">对象</div><div>Agent</div>
            <div class="k">项目</div><div>${escapeHtml(node.project_id || "-")}</div>
            <div class="k">通道</div><div>${escapeHtml(node.channel_name)}</div>
            <div class="k">角色</div><div>${escapeHtml(node.role)}</div>
            <div class="k">状态</div><div>${escapeHtml(node.status)}</div>
            ${metricItems.map((item) => `<div class="k">${escapeHtml(String(item.label))}</div><div>${escapeHtml(String(item.value == null ? 0 : item.value))}</div>`).join("")}
          </div>
        `;
        dom.detailPanel.classList.remove("collapsed");
        return;
      }
      const stats = nodeCommunicationStats(node.session_id);
      dom.detailTitle.textContent = node.alias;
      dom.detailBody.innerHTML = `
        <div class="detail-grid">
          <div class="k">对象</div><div>Agent</div>
          <div class="k">通道</div><div>${escapeHtml(node.channel_name)}</div>
          <div class="k">角色</div><div>${escapeHtml(node.role)}</div>
          <div class="k">状态</div><div>${escapeHtml(node.status)}</div>
          <div class="k">消息总量</div><div>${Number((node.metric_items || []).find((item) => item.label === "消息")?.value || 0)}</div>
          <div class="k">沟通对象</div><div>${stats.peer_count}</div>
          <div class="k">往来总量</div><div>${stats.total_count}</div>
          <div class="k">发出</div><div>${stats.outbound_count}</div>
          <div class="k">收到</div><div>${stats.inbound_count}</div>
        </div>
        <div style="margin-top:14px;font-size:12px;color:var(--muted);">当前节点的沟通线已经按时间窗口聚合，不再逐条展示消息回放。</div>
      `;
      dom.detailPanel.classList.remove("collapsed");
      return;
    }
    dom.detailTitle.textContent = "未选中";
    dom.detailBody.innerHTML = '<div class="empty-state">点击背景板、Agent 卡片或关系线查看详情。</div>';
  }

  function renderAll() {
    if (dom.stageWrap && dom.stageWrap.hidden) dom.stageWrap.hidden = false;
    applyStageMetrics();
    renderHeader();
    renderGroups();
    renderNodes();
    renderLinks();
    renderGroupList();
    renderRosterList();
    renderDetail();
    renderMiniMap();
  }

  async function fetchPlatformRuns(projects) {
    const validProjectIds = new Set(
      sortProjects(projects)
        .map((project) => safeText(project.project_id))
        .filter(Boolean)
    );
    try {
      const dedup = new Map();
      const range = currentWindowRange();
      let beforeIso = range.endMs ? new Date(range.endMs).toISOString() : "";
      let pageCount = 0;
      let truncated = false;
      while (pageCount < PLATFORM_RUNS_MAX_PAGES && beforeIso) {
        const payload = await fetchJson(
          buildPlatformRunsPageUrl({
            limit: PLATFORM_RUNS_PAGE_LIMIT,
            beforeCreatedAt: beforeIso,
            afterCreatedAt: range.startMs ? new Date(range.startMs).toISOString() : "",
          }),
          { timeoutMs: 12000 }
        );
        const rawBatch = Array.isArray(payload && payload.runs) ? payload.runs : [];
        const batch = rawBatch
          .filter((item) => validProjectIds.has(safeText(item.project_id || item.projectId)));
        batch.forEach((item) => {
          const rid = safeText(item.run_id || item.id);
          if (rid && !dedup.has(rid)) dedup.set(rid, item);
        });
        pageCount += 1;
        if (rawBatch.length < PLATFORM_RUNS_PAGE_LIMIT) break;
        const oldestTs = rawBatch.reduce((min, item) => {
          const ts = dateMs(item.created_at || item.createdAt);
          return ts > 0 ? Math.min(min, ts) : min;
        }, Number.POSITIVE_INFINITY);
        if (!Number.isFinite(oldestTs) || oldestTs <= range.startMs) break;
        beforeIso = new Date(Math.max(range.startMs + 1, oldestTs - 1)).toISOString();
      }
      if (pageCount >= PLATFORM_RUNS_MAX_PAGES) truncated = true;
      const runs = Array.from(dedup.values())
        .sort((a, b) => dateMs(b.created_at || b.createdAt) - dateMs(a.created_at || a.createdAt));
      return {
        runs,
        failedProjects: [],
        truncated,
        pageCap: PLATFORM_RUNS_PAGE_LIMIT * PLATFORM_RUNS_MAX_PAGES,
      };
    } catch (error) {
      return {
        runs: [],
        failedProjects: [],
        truncated: false,
        pageCap: PLATFORM_RUNS_PAGE_LIMIT * PLATFORM_RUNS_MAX_PAGES,
        error,
      };
    }
  }

  function hydratePlatformView() {
    const projects = sortProjects(STATE.platformProjects);
    const sessions = (STATE.sessions || []).filter((session) => safeText(session.project_id));
    const layoutStore = loadLayoutStore();
    STATE.zoom = Math.max(0.55, Math.min(1.6, Number(layoutStore.zoom) || 1));
    const aggregate = aggregatePlatformCommunication(STATE.platformLayoutMode, projects, sessions, STATE.runs);
    STATE.platformCommLinks = aggregate.links;
    STATE.commLinks = [];
    STATE.channelSections = [];
    STATE.selectedRelationId = "";
    STATE.selectedPlatformCommLinkId = "";
    if (STATE.platformLayoutMode === "agent") {
      const { groups, nodes, relations, layoutGroups } = buildPlatformComposedAgentLayout(
        projects,
        sessions,
        aggregate.messageCountBySession || new Map(),
        aggregate.peerMap || new Map(),
        aggregate.commCountBySession || new Map(),
      );
      STATE.groups = groups;
      STATE.channelSections = layoutGroups;
      STATE.nodes = nodes;
      STATE.manualRelations = relations;
      setStatus(`已进入平台 Agent 模式，加载 ${platformShellCount()} 个项目外壳、${platformLayoutGroupCount()} 个项目内背景板、${STATE.nodes.length} 个通道节点、${STATE.platformCommLinks.length} 根沟通线。`, "ready");
    } else {
      const { groups, nodes } = buildPlatformProjectGroupsAndNodes(
        projects,
        sessions,
        aggregate.metricsByProject || new Map(),
      );
      STATE.groups = groups;
      STATE.nodes = nodes;
      STATE.manualRelations = [];
      setStatus(`已进入平台项目模式，加载 ${STATE.groups.length} 个项目外壳、${STATE.platformCommLinks.length} 根跨项目沟通线。`, "ready");
    }
    renderAll();
    syncZoom();
    restoreViewportForFreshLayout(layoutStore);
  }

  async function loadData() {
    if (isPlatformMode()) {
      setStatus("正在加载平台组织战略...", "loading");
      try {
        const projects = projectCatalog().map((item) => ({
          ...item,
          project_id: safeText(item.project_id || item.id),
          project_name: firstText([item.project_name, item.name, item.id]),
          totals: (item.totals && typeof item.totals === "object") ? item.totals : {},
          source_kind: firstText([item.source_kind, item.sourceKind], "real"),
        })).filter((item) => item.project_id);
        STATE.platformProjects = sortProjects(projects);
        STATE.sessions = buildPlatformSessionsFromPayload(STATE.platformProjects);
        STATE.sharedAvatarStore = await fetchSharedAvatarStores(STATE.platformProjects.map((item) => item.project_id));
        STATE.runs = [];
        hydratePlatformView();
        setStatus("平台组织战略骨架已加载，正在补充沟通数据...", "loading");
        STATE.platformLoadToken += 1;
        const loadToken = STATE.platformLoadToken;
        const runsResult = await fetchPlatformRuns(STATE.platformProjects);
        if (loadToken !== STATE.platformLoadToken) return;
        STATE.runs = (Array.isArray(runsResult && runsResult.runs) ? runsResult.runs : [])
          .map(normalizeRun)
          .filter(Boolean);
        hydratePlatformView();
        if (runsResult && runsResult.error) {
          const current = safeText(dom.statusBanner && dom.statusBanner.textContent);
          setStatus(`${current || "平台组织战略骨架已加载。"} 沟通数据拉取失败：${safeText(runsResult.error && runsResult.error.message, "未知错误")}。`, "empty");
        } else if (runsResult && runsResult.truncated) {
          const current = safeText(dom.statusBanner && dom.statusBanner.textContent);
          setStatus(`${current || "平台组织战略已加载。"} 当前窗口沟通数据达到分页上限 ${Number(runsResult.pageCap || 0)} 条，统计可能被截断。`, "empty");
        }
      } catch (error) {
        setStatus(`组织战略加载失败：${safeText(error && error.message, "未知错误")}`, "error");
      }
      return;
    }
    if (!STATE.projectId) {
      setStatus("缺少项目参数，组织战略暂时无法加载。", "error");
      return;
    }
    setStatus(`正在加载 ${STATE.projectId} 的 Agent 组织战略...`, "loading");
    try {
      const [sessionsPayload, runsPayload, sharedAvatarStore] = await Promise.all([
        fetchJson(`/api/sessions?project_id=${encodeURIComponent(STATE.projectId)}`),
        fetchJson(buildRunsUrl()),
        fetchSharedAvatarStore(STATE.projectId),
      ]);
      STATE.sharedAvatarStore = sharedAvatarStore;
      STATE.sessions = (Array.isArray(sessionsPayload.sessions) ? sessionsPayload.sessions : []).map(normalizeSession).filter(Boolean);
      STATE.runs = (Array.isArray(runsPayload.runs) ? runsPayload.runs : []).map(normalizeRun).filter(Boolean);
      const { groups, nodes } = computeGroupsAndNodes(STATE.sessions);
      const aggregate = aggregateNodeCommunicationLinks(nodes, STATE.runs);
      STATE.groups = groups;
      STATE.nodes = nodes.map((node) => ({
        ...node,
        ...compactNodeCardSize(node.alias, "project"),
        metric_items: [
          { label: "消息", value: Number(aggregate.messageCountBySession.get(node.session_id) || 0) },
          { label: "对象", value: Number(aggregate.peerMap.get(node.session_id) || 0) },
          { label: "往来", value: Number(aggregate.commCountBySession.get(node.session_id) || 0) },
        ],
      }));
      const layoutStore = loadLayoutStore();
      STATE.zoom = Math.max(0.55, Math.min(1.6, Number(layoutStore.zoom) || 1));
      STATE.manualRelations = buildStoredRelations(STATE.nodes);
      STATE.commLinks = aggregate.links;
      renderAll();
      syncZoom();
      if (!STATE.nodes.length) {
        setStatus("当前项目暂无会话数据，保持只读空态。", "empty");
      } else {
        setStatus(`已加载 ${STATE.nodes.length} 个 Agent，${STATE.manualRelations.length} 条业务关系，${STATE.commLinks.length} 根聚合沟通线。`, "ready");
      }
    } catch (error) {
      setStatus(`组织战略加载失败：${safeText(error && error.message, "未知错误")}`, "error");
    }
  }

  function bindEvents() {
    dom.refreshBtn?.addEventListener("click", () => loadData());
    dom.saveLayoutBtn?.addEventListener("click", () => {
      persistLayoutStore();
      setStatus("组织战略布局已保存到本地。", "ready");
    });
    dom.exportConfigBtn?.addEventListener("click", () => {
      const payload = JSON.stringify(loadLayoutStore(), null, 2);
      const blob = new Blob([payload], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${safeText(STATE.projectId || "project")}-relationship-board.json`;
      link.click();
      URL.revokeObjectURL(url);
    });
    dom.copyConfigBtn?.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(JSON.stringify(loadLayoutStore(), null, 2));
        setStatus("组织战略配置已复制到剪贴板。", "ready");
      } catch (_) {
        setStatus("复制失败，请改用导出 JSON。", "error");
      }
    });
    dom.timeTabs.forEach((button) => {
      button.addEventListener("click", () => {
        STATE.windowKey = button.dataset.window || "1h";
        syncTimeControls();
        loadData();
      });
    });
    dom.platformModeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const next = button.dataset.platformLayout === "agent" ? "agent" : "project";
        if (STATE.platformLayoutMode === next) return;
        STATE.platformLayoutMode = next;
        STATE.selectedGroupId = "";
        STATE.selectedSessionId = "";
        STATE.selectedRelationId = "";
        STATE.selectedPlatformCommLinkId = "";
        syncRouteLayout();
        if (STATE.platformProjects.length && STATE.sessions.length) {
          hydratePlatformView();
          return;
        }
        loadData();
      });
    });
    dom.platformScopeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const next = safeText(button.dataset.commScope, "all");
        if (STATE.platformCommScope === next) return;
        STATE.platformCommScope = next;
        STATE.selectedPlatformCommLinkId = "";
        renderAll();
      });
    });
    dom.platformCountButtons.forEach((button) => {
      button.addEventListener("click", () => {
        STATE.platformLineCountMin = Math.max(0, Number(button.dataset.commCountMin) || 0);
        STATE.selectedPlatformCommLinkId = "";
        renderAll();
      });
    });
    dom.customApplyBtn?.addEventListener("click", () => {
      const startMs = parseDateTimeLocal(dom.customStartInput?.value || "");
      const endMs = parseDateTimeLocal(dom.customEndInput?.value || "");
      if (!startMs || !endMs || endMs <= startMs) {
        setStatus("自定义时间范围无效，请重新输入。", "error");
        return;
      }
      STATE.windowKey = "custom";
      STATE.customRange = { startMs, endMs };
      syncTimeControls();
      loadData();
    });
    dom.relationTypeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        STATE.activeRelationType = button.dataset.relationType || "business";
        renderHeader();
      });
    });
    dom.visibilityButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const key = button.dataset.visibility || "";
        if (!key) return;
        STATE.visibleRelations[key] = !STATE.visibleRelations[key];
        renderAll();
      });
    });
    dom.toggleLayersBtn?.addEventListener("click", () => dom.layersPanel?.classList.toggle("collapsed"));
    dom.openLayersBtn?.addEventListener("click", () => dom.layersPanel?.classList.remove("collapsed"));
    dom.closeLayersBtn?.addEventListener("click", () => dom.layersPanel?.classList.add("collapsed"));
    dom.toggleDetailBtn?.addEventListener("click", () => dom.detailPanel?.classList.toggle("collapsed"));
    dom.openDetailBtn?.addEventListener("click", () => dom.detailPanel?.classList.remove("collapsed"));
    dom.closeDetailBtn?.addEventListener("click", () => dom.detailPanel?.classList.add("collapsed"));
    dom.searchInput?.addEventListener("input", renderRosterList);
    dom.zoomInBtn?.addEventListener("click", () => {
      STATE.zoom = Math.min(1.6, +(STATE.zoom + 0.1).toFixed(2));
      syncZoom();
      persistLayoutStore();
    });
    dom.zoomOutBtn?.addEventListener("click", () => {
      STATE.zoom = Math.max(0.55, +(STATE.zoom - 0.1).toFixed(2));
      syncZoom();
      persistLayoutStore();
    });
    dom.zoomResetBtn?.addEventListener("click", () => {
      STATE.zoom = 1;
      syncZoom();
      persistLayoutStore();
    });
    dom.stageWrap?.addEventListener("pointerdown", (event) => {
      if (event.target && event.target.closest && event.target.closest(".node, .group-chip, .group-resize, .floating-panel, .edge-handle, .floating-mini-map, button, input, select, textarea, a")) return;
      STATE.pan = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        left: dom.stageWrap.scrollLeft,
        top: dom.stageWrap.scrollTop,
      };
      dom.stageWrap.setPointerCapture(event.pointerId);
      dom.stageWrap.classList.add("dragging");
    });
    dom.stageWrap?.addEventListener("pointermove", (event) => {
      if (!STATE.pan) return;
      dom.stageWrap.scrollLeft = STATE.pan.left - (event.clientX - STATE.pan.x);
      dom.stageWrap.scrollTop = STATE.pan.top - (event.clientY - STATE.pan.y);
      renderMiniMap();
    });
    dom.stageWrap?.addEventListener("scroll", renderMiniMap);
    dom.miniMap?.addEventListener("click", (event) => {
      const rect = dom.miniMap.getBoundingClientRect();
      const ratioX = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      const ratioY = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
      const baseW = dom.stage.offsetWidth || 3800;
      const baseH = dom.stage.offsetHeight || 2280;
      dom.stageWrap.scrollLeft = ratioX * baseW * STATE.zoom - dom.stageWrap.clientWidth / 2;
      dom.stageWrap.scrollTop = ratioY * baseH * STATE.zoom - dom.stageWrap.clientHeight / 2;
      renderMiniMap();
    });
    dom.stage?.addEventListener("pointermove", (event) => {
      if (STATE.dragNode) {
        const node = STATE.nodes.find((item) => item.session_id === STATE.dragNode.id);
        if (!node) return;
        const dx = (event.clientX - STATE.dragNode.startX) / STATE.zoom;
        const dy = (event.clientY - STATE.dragNode.startY) / STATE.zoom;
        node.x = Math.max(30, STATE.dragNode.originX + dx);
        node.y = Math.max(30, STATE.dragNode.originY + dy);
        renderAll();
        return;
      }
      if (STATE.dragGroup) {
        const group = STATE.groups.find((item) => item.id === STATE.dragGroup.id);
        if (!group) return;
        const dx = (event.clientX - STATE.dragGroup.startX) / STATE.zoom;
        const dy = (event.clientY - STATE.dragGroup.startY) / STATE.zoom;
        group.x = Math.max(40, STATE.dragGroup.originX + dx);
        group.y = Math.max(40, STATE.dragGroup.originY + dy);
        renderAll();
        return;
      }
      if (STATE.relationDraft) {
        const stageRect = dom.stage.getBoundingClientRect();
        STATE.relationDraft.currentX = (event.clientX - stageRect.left) / STATE.zoom;
        STATE.relationDraft.currentY = (event.clientY - stageRect.top) / STATE.zoom;
        renderLinks();
        return;
      }
      if (STATE.resizeGroup) {
        const group = STATE.groups.find((item) => item.id === STATE.resizeGroup.id);
        if (!group) return;
        const dx = (event.clientX - STATE.resizeGroup.startX) / STATE.zoom;
        const dy = (event.clientY - STATE.resizeGroup.startY) / STATE.zoom;
        let nextX = STATE.resizeGroup.originX;
        let nextY = STATE.resizeGroup.originY;
        let nextW = STATE.resizeGroup.originW;
        let nextH = STATE.resizeGroup.originH;
        const corner = STATE.resizeGroup.corner;
        if (corner.includes("e")) nextW = STATE.resizeGroup.originW + dx;
        if (corner.includes("s")) nextH = STATE.resizeGroup.originH + dy;
        if (corner.includes("w")) {
          nextX = STATE.resizeGroup.originX + dx;
          nextW = STATE.resizeGroup.originW - dx;
        }
        if (corner.includes("n")) {
          nextY = STATE.resizeGroup.originY + dy;
          nextH = STATE.resizeGroup.originH - dy;
        }
        group.x = nextX;
        group.y = nextY;
        group.w = Math.max(32, nextW);
        group.h = Math.max(32, nextH);
        renderAll();
      }
    });
    window.addEventListener("pointerup", (event) => {
      if (STATE.dragNode || STATE.dragGroup || STATE.resizeGroup) persistLayoutStore();
      STATE.dragNode = null;
      STATE.dragGroup = null;
      STATE.resizeGroup = null;
      if (STATE.pan) {
        dom.stageWrap?.classList.remove("dragging");
        STATE.pan = null;
      }
      if (STATE.relationDraft) {
        const target = document.elementFromPoint(event.clientX, event.clientY);
        const connector = target && target.closest ? target.closest(".connector") : null;
        const hostNode = connector && connector.closest
          ? connector.closest(".node")
          : (target && target.closest ? target.closest(".node") : null);
        const targetSessionId = hostNode ? safeText(hostNode.getAttribute("data-session-id")) : "";
        const targetSide = connector
          ? safeText(connector.getAttribute("data-side"), "left")
          : inferNodeSideFromPoint(hostNode, event.clientX, event.clientY);
        if (targetSessionId && completeRelationDraft(targetSessionId, targetSide)) return;
        STATE.relationDraft = null;
        renderLinks();
      }
    });
    dom.linesSvg?.addEventListener("click", () => {
      STATE.selectedRelationId = "";
      STATE.selectedPlatformCommLinkId = "";
      renderDetail();
    });
    dom.stage?.addEventListener("click", (event) => {
      if (event.target === dom.stage || event.target === dom.groupsLayer || event.target === dom.linesSvg) {
        if (STATE.relationDraft) {
          STATE.relationDraft = null;
        }
        STATE.selectedGroupId = "";
        STATE.selectedSessionId = "";
        STATE.selectedRelationId = "";
        STATE.selectedPlatformCommLinkId = "";
        renderAll();
      }
    });
    window.addEventListener("resize", () => {
      syncZoom();
      renderMiniMap();
    });
  }

  function init() {
    bindEvents();
    const applyRoute = (force = false) => {
      const route = qs();
      const next = {
        projectId: route.projectId,
        viewMode: route.mode === "platform" ? "platform" : "project",
        platformLayoutMode: route.layout === "agent" ? "agent" : "project",
        channelHint: route.channelName,
        sessionHint: route.sessionId,
        windowKey: "24h",
      };
      const changed = force
        || STATE.projectId !== next.projectId
        || STATE.viewMode !== next.viewMode
        || STATE.platformLayoutMode !== next.platformLayoutMode
        || STATE.channelHint !== next.channelHint
        || STATE.sessionHint !== next.sessionHint
        || (force && STATE.windowKey !== next.windowKey);
      if (!changed) return;
      STATE.projectId = next.projectId;
      STATE.viewMode = next.viewMode;
      STATE.platformLayoutMode = next.platformLayoutMode;
      STATE.channelHint = next.channelHint;
      STATE.sessionHint = next.sessionHint;
      if (force) STATE.windowKey = next.windowKey;
      const projectMeta = projectMetaById(STATE.projectId);
      STATE.projectName = isPlatformMode()
        ? "Qoreon 平台"
        : firstText([projectMeta && projectMeta.project_name, STATE.projectId], STATE.projectId);
      syncTimeControls();
      loadData();
    };
    window.addEventListener("hashchange", () => applyRoute(false));
    applyRoute(true);
    window.setTimeout(() => applyRoute(false), 0);
  }

  init();
})();
