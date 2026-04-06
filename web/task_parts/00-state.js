    // task.js 拆解首刀：基础状态、排序口径、通道知识折叠状态
    const CONV_SORT_OPTIONS = [
      { value: "time_desc", label: "时间↓" },
      { value: "time_asc", label: "时间↑" },
      { value: "name_asc", label: "名称↑" },
      { value: "name_desc", label: "名称↓" },
    ];
    const CONV_LAYOUT_OPTIONS = [
      { value: "flat", label: "对话" },
      { value: "channel", label: "通道块" },
    ];
    const ITEM_SORT_OPTIONS = [
      { value: "time_desc", label: "更新↓" },
      { value: "time_asc", label: "更新↑" },
      { value: "name_asc", label: "名称↑" },
      { value: "name_desc", label: "名称↓" },
    ];
    // 会话消息加载分页口径（首屏优先，历史按需加载）
    // 2026-03-05：下调首屏/增量拉取上限，降低初次渲染与轮询压力。
    const CONV_PAGE = {
      timelineInitial: 24,      // 首次进入会话时间线
      timelineIncremental: 20,  // 增量刷新
      timelineBefore: 24,       // 向上加载历史
      projectRunsInitial: 40,   // 项目级 run 首次拉取
      projectRunsIncremental: 24, // 项目级增量轮询
    };
    const CONV_MENTION_BOUNDARY = "[^0-9A-Za-z_@]";
    const CONV_MENTION_PREFIX_RE = new RegExp("(?:^|" + CONV_MENTION_BOUNDARY + ")@([^\\s@]{0,32})$");
    const CONV_MENTION_TOKEN_RE = new RegExp("(?:^|" + CONV_MENTION_BOUNDARY + ")@([^\\s@,，。；;：:!！?？、\\]\\[()（）{}<>《》\\\"'“”‘’]{1,64})", "g");
    const CONV_MENTION_DND_MIME = "application/x-taskdashboard-mention-target";
    const CONV_QUEUE_FORWARD_DND_MIME = "application/x-taskdashboard-queued-forward";
    const CONV_REPLY_PREVIEW_MAX_CHARS = 360;
    const CONV_REPLY_PREVIEW_MAX_LINES = 8;

    const STATE = {
      project: "",           // <project_id>，在 bootstrap 时按 hash/live health 决定
      channel: "",           // per project
      q: "",
      type: "全部",
      status: "待办",        // 待办 | 进行中 | 已完成 | 全部
      view: "work",          // work | comms
      panelMode: "channel",  // channel | task | conv | org | arch
      selectedPath: "",
      selectedTaskId: "",
      selectedSessionId: "",
      selectedSessionExplicit: false, // true=用户显式选择会话；false=系统默认路由
      convSort: "time_desc",
      convListLayout: "channel",
      itemSort: "time_desc",
      taskModule: "tasks",   // tasks | schedule | org
      taskLane: "全部",
      taskGroupExpanded: Object.create(null),
      taskLaneCollapsed: { "已完成": true, "已归档": true },
    };
    const HASH_BOOTSTRAP = {
      projectOnly: false,
    };
    const CHANNEL_KNOWLEDGE_COLLAPSE_KEY = "taskDashboard.channelKnowledgeCollapsed.v2";
    const CONV_UNREAD_CURSOR_KEY = "taskDashboard.convUnreadCursor.v1";
    const CONV_MEMO_CONSUMED_KEY = "taskDashboard.convMemoConsumed.v1";
    const CONV_FILE_STARRED_KEY = "taskDashboard.convFileStarred.v1";
    const CONV_TRAINING_SENT_KEY = "taskDashboard.convTrainingSent.v1";
    const CONV_LAST_SELECTION_KEY = "taskDashboard.convLastSelection.v1";
    const TASK_COMPLETED_VIEWED_KEY = "taskDashboard.taskCompletedViewed.v1";
    const ORG_MANUAL_RELATIONS_KEY = "taskDashboard.orgManualRelations.v1";
    const FEATURE_UNREAD_MONOTONIC_KEY = "__feature_unread_monotonic__";
    const FEATURE_UNREAD_CROSS_TAB_SYNC_KEY = "__feature_unread_cross_tab_sync__";

    function loadChannelKnowledgeCollapsed() {
      try {
        const raw = localStorage.getItem(CHANNEL_KNOWLEDGE_COLLAPSE_KEY);
        if (!raw) return Object.create(null);
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return Object.create(null);
        return Object.assign(Object.create(null), parsed);
      } catch (_) {}
      return Object.create(null);
    }

    const CHANNEL_KNOWLEDGE_COLLAPSED = loadChannelKnowledgeCollapsed();
    const CONV_LAST_SELECTION_BY_SCOPE = loadConversationLastSelectionMap();

    function loadConversationLastSelectionMap() {
      try {
        const raw = localStorage.getItem(CONV_LAST_SELECTION_KEY);
        if (!raw) return Object.create(null);
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return Object.create(null);
        return Object.assign(Object.create(null), parsed);
      } catch (_) {}
      return Object.create(null);
    }

    function conversationSelectionScopeKey(projectId, channelName) {
      const pid = String(projectId || "").trim();
      const ch = String(channelName || "").trim();
      if (!pid) return "";
      return pid + "::" + (ch || "*");
    }

    function persistConversationLastSelectionMap() {
      try {
        localStorage.setItem(CONV_LAST_SELECTION_KEY, JSON.stringify(CONV_LAST_SELECTION_BY_SCOPE));
      } catch (_) {}
    }

    function rememberConversationSelection(projectId, channelName, sessionId) {
      const pid = String(projectId || "").trim();
      const key = conversationSelectionScopeKey(pid, channelName);
      const projectKey = conversationSelectionScopeKey(pid, "");
      const sid = String(sessionId || "").trim();
      if (!pid || !sid) return;
      if (key) CONV_LAST_SELECTION_BY_SCOPE[key] = sid;
      if (projectKey) CONV_LAST_SELECTION_BY_SCOPE[projectKey] = sid;
      persistConversationLastSelectionMap();
    }

    function readRememberedConversationSelection(projectId, channelName) {
      const key = conversationSelectionScopeKey(projectId, channelName);
      const projectKey = conversationSelectionScopeKey(projectId, "");
      if (key && CONV_LAST_SELECTION_BY_SCOPE[key]) {
        return String(CONV_LAST_SELECTION_BY_SCOPE[key] || "").trim();
      }
      if (projectKey) {
        return String(CONV_LAST_SELECTION_BY_SCOPE[projectKey] || "").trim();
      }
      return "";
    }

    function channelKnowledgeKey(projectId, channelName) {
      return String(projectId || "") + "::" + String(channelName || "");
    }

    function isChannelKnowledgeCollapsed(projectId, channelName) {
      const key = channelKnowledgeKey(projectId, channelName);
      if (!key || key === "::") return false;
      if (!Object.prototype.hasOwnProperty.call(CHANNEL_KNOWLEDGE_COLLAPSED, key)) return false;
      return !!CHANNEL_KNOWLEDGE_COLLAPSED[key];
    }

    function setChannelKnowledgeCollapsed(projectId, channelName, collapsed) {
      const key = channelKnowledgeKey(projectId, channelName);
      if (!key || key === "::") return;
      CHANNEL_KNOWLEDGE_COLLAPSED[key] = !!collapsed;
      try {
        localStorage.setItem(CHANNEL_KNOWLEDGE_COLLAPSE_KEY, JSON.stringify(CHANNEL_KNOWLEDGE_COLLAPSED));
      } catch (_) {}
    }
