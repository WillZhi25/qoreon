(() => {
  const DATA = JSON.parse(document.getElementById("data").textContent || "{}");
  const LINKS = (DATA && DATA.links && typeof DATA.links === "object") ? DATA.links : {};
  const BOARD = (DATA && DATA.open_source_sync && typeof DATA.open_source_sync === "object") ? DATA.open_source_sync : {};

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([key, value]) => {
      if (key === "class") node.className = String(value || "");
      else if (key === "text") node.textContent = String(value || "");
      else if (key === "html") node.innerHTML = String(value || "");
      else node.setAttribute(key, String(value));
    });
    (children || []).forEach((child) => node.appendChild(child));
    return node;
  }

  function text(value, fallback = "") {
    const out = String(value || "").trim();
    return out || fallback;
  }

  function rows(value) {
    return Array.isArray(value) ? value.filter((item) => item && typeof item === "object") : [];
  }

  function toneClass(raw) {
    const key = text(raw, "muted").toLowerCase();
    const map = {
      accent: "tone-accent",
      good: "tone-good",
      warn: "tone-warn",
      danger: "tone-danger",
      done: "tone-done",
      doing: "tone-doing",
      todo: "tone-todo",
      next: "tone-next",
      later: "tone-later"
    };
    return map[key] || "tone-muted";
  }

  function toneLabel(raw) {
    const key = text(raw, "信息").toLowerCase();
    const map = {
      accent: "主线",
      good: "已就绪",
      warn: "需关注",
      danger: "高风险",
      done: "已完成",
      doing: "进行中",
      todo: "待执行",
      next: "下一步",
      later: "后续"
    };
    return map[key] || text(raw, "信息");
  }

  function setQuickLink(id, key, fallback) {
    const node = document.getElementById(id);
    if (!node) return;
    node.href = text(LINKS[key], fallback);
  }

  function renderHero() {
    const hero = BOARD.hero || {};
    const heroKicker = document.getElementById("heroKicker");
    const heroTitle = document.getElementById("heroTitle");
    const heroSubtitle = document.getElementById("heroSubtitle");
    const generatedAtChip = document.getElementById("generatedAtChip");
    const sourceFileChip = document.getElementById("sourceFileChip");
    if (heroKicker) heroKicker.textContent = text(hero.kicker, "Open Source Sync Board");
    if (heroTitle) heroTitle.textContent = text(hero.headline, text(BOARD.title, "开源同步与协作排程"));
    if (heroSubtitle) heroSubtitle.textContent = text(hero.summary || BOARD.subtitle, "—");
    if (generatedAtChip) generatedAtChip.textContent = "生成时间 · " + text(DATA.generated_at, "—");
    if (sourceFileChip) sourceFileChip.textContent = "数据源 · " + text(BOARD.source_file, "—");
  }

  function renderSummaryCards() {
    const wrap = document.getElementById("summaryGrid");
    if (!wrap) return;
    wrap.innerHTML = "";
    const cards = rows(BOARD.summary_cards);
    if (!cards.length) {
      wrap.appendChild(el("div", { class: "empty-state", text: "当前还没有摘要卡片。" }));
      return;
    }
    cards.forEach((item) => {
      wrap.appendChild(el("article", { class: "card " + toneClass(item.tone) }, [
        el("div", { class: "summary-label", text: text(item.label, "摘要") }),
        el("div", { class: "summary-value", text: text(item.value, "-") }),
        el("p", { class: "mini-note", text: text(item.detail, "") })
      ]));
    });
  }

  function renderVersionBoard() {
    const sectionTitle = document.getElementById("versionBoardTitle");
    const sectionSubtitle = document.getElementById("versionBoardSubtitle");
    const decision = document.getElementById("versionDecision");
    const versionGrid = document.getElementById("versionGrid");
    const metricGrid = document.getElementById("metricGrid");
    const board = (BOARD.version_board && typeof BOARD.version_board === "object") ? BOARD.version_board : {};
    const cards = rows(board.cards);
    const metrics = rows(board.metrics);
    const decisionItem = (board.decision && typeof board.decision === "object") ? board.decision : {};

    if (sectionTitle) sectionTitle.textContent = text(board.title, "版本差距看板");
    if (sectionSubtitle) sectionSubtitle.textContent = text(board.subtitle, "把当前真源、上一轮冻结批次和公开候选放到同一屏上看。");

    if (decision) {
      if (Object.keys(decisionItem).length) {
        decision.className = "decision-banner " + toneClass(decisionItem.status);
        decision.innerHTML = "";
        decision.appendChild(el("div", { class: "decision-label", text: "当前判断" }));
        decision.appendChild(el("div", { class: "decision-headline", text: text(decisionItem.headline, "—") }));
        decision.appendChild(el("p", { class: "decision-detail", text: text(decisionItem.detail, "") }));
      } else {
        decision.className = "decision-banner";
        decision.textContent = "当前还没有版本判断。";
      }
    }

    if (versionGrid) {
      versionGrid.innerHTML = "";
      if (!cards.length) {
        versionGrid.appendChild(el("div", { class: "empty-state", text: "当前还没有版本看板数据。" }));
      } else {
        cards.forEach((item) => {
          const facts = Array.isArray(item.facts) ? item.facts : [];
          versionGrid.appendChild(el("article", { class: "card version-card " + toneClass(item.status) }, [
            el("div", { class: "version-kicker", text: text(item.title, "版本位") }),
            el("div", { class: "version-headline", text: text(item.headline, "—") }),
            el("div", { class: "version-subtitle", text: text(item.kicker, "") }),
            el("div", { class: "version-facts" }, facts.map((fact) => el("div", { class: "version-fact" }, [
              el("div", { class: "repo-key", text: text(fact.label, "-") }),
              el("div", { class: "version-fact-value", text: text(fact.value, "-") })
            ])))
          ]));
        });
      }
    }

    if (metricGrid) {
      metricGrid.innerHTML = "";
      if (!metrics.length) {
        metricGrid.appendChild(el("div", { class: "empty-state", text: "当前还没有差距指标。" }));
      } else {
        metrics.forEach((item) => {
          metricGrid.appendChild(el("article", { class: "card metric-card " + toneClass(item.status) }, [
            el("div", { class: "summary-label", text: text(item.label, "指标") }),
            el("div", { class: "metric-value", text: text(item.value, "-") })
          ]));
        });
      }
    }
  }

  function renderRepoTargets() {
    const wrap = document.getElementById("repoGrid");
    if (!wrap) return;
    wrap.innerHTML = "";
    const items = rows(BOARD.repo_targets);
    if (!items.length) {
      wrap.appendChild(el("div", { class: "empty-state", text: "当前没有仓库快照。" }));
      return;
    }
    items.forEach((item) => {
      const snapshot = (item.snapshot && typeof item.snapshot === "object") ? item.snapshot : {};
      wrap.appendChild(el("article", { class: "card" }, [
        el("div", { class: "repo-head" }, [
          el("div", {}, [
            el("div", { class: "repo-title", text: text(item.label, "仓库") }),
            el("div", { class: "repo-role", text: text(item.role, "定位") })
          ]),
          el("span", {
            class: "tone-chip " + toneClass(item.exists ? "good" : "warn"),
            text: item.exists ? "已识别" : "未找到"
          })
        ]),
        el("p", { class: "repo-note", text: text(item.note, "") }),
        el("div", { class: "repo-metrics" }, [
          repoMetric("仓根", text(snapshot.repo_root || item.path, "-")),
          repoMetric("分支", text(snapshot.branch, "-")),
          repoMetric("HEAD", text(snapshot.head, "-")),
          repoMetric("origin", text(snapshot.remote_origin, "-")),
          repoMetric("未提交改动", String(Number(snapshot.dirty_count || 0))),
          repoMetric("改动预览", Array.isArray(snapshot.dirty_preview) && snapshot.dirty_preview.length ? snapshot.dirty_preview.join("\n") : "—")
        ])
      ]));
    });
  }

  function repoMetric(label, value) {
    return el("div", { class: "repo-metric" }, [
      el("div", { class: "repo-key", text: text(label, "-") }),
      el("div", { class: "repo-value", text: text(value, "-") })
    ]);
  }

  function renderMajorTimeline() {
    const wrap = document.getElementById("majorTimeline");
    if (!wrap) return;
    wrap.innerHTML = "";
    const items = rows(BOARD.major_timeline);
    if (!items.length) {
      wrap.appendChild(el("div", { class: "empty-state", text: "当前还没有大步骤时间轴。" }));
      return;
    }
    items.forEach((item, index) => {
      const step = text(item.step, String(index + 1));
      const title = text(item.title, "步骤");
      const detail = text(item.detail, "");
      const owner = text(item.owner, "");
      wrap.appendChild(el("article", { class: "timeline-card " + toneClass(item.status) }, [
        el("div", { class: "timeline-rail" }, [
          el("div", { class: "timeline-node " + toneClass(item.status), text: step }),
          index < items.length - 1 ? el("div", { class: "timeline-line" }) : el("div")
        ]),
        el("div", { class: "timeline-body" }, [
          el("div", { class: "stack-head" }, [
            el("div", { class: "stack-title", text: title }),
            el("span", { class: "tone-chip " + toneClass(item.status), text: toneLabel(item.status) })
          ]),
          owner ? el("div", { class: "timeline-owner", text: "负责 · " + owner }) : el("div"),
          el("p", { class: "stack-note", text: detail })
        ])
      ]));
    });
  }

  function renderOperatingModel() {
    const wrap = document.getElementById("modelGrid");
    if (!wrap) return;
    wrap.innerHTML = "";
    const items = rows(BOARD.operating_model);
    if (!items.length) {
      wrap.appendChild(el("div", { class: "empty-state", text: "当前没有固定工作法数据。" }));
      return;
    }
    items.forEach((item) => {
      wrap.appendChild(el("article", { class: "card " + toneClass(item.status) }, [
        el("div", { class: "stack-head" }, [
          el("div", { class: "stack-title", text: text(item.title, "工作法") }),
          el("span", { class: "tone-chip " + toneClass(item.status), text: toneLabel(item.status) })
        ]),
        el("div", { class: "stack-meta" }, [
          el("span", { text: "负责人 · " + text(item.owner, "-") }),
          el("span", { text: "产出 · " + text(item.output, "-") })
        ]),
        el("p", { class: "stack-note", text: text(item.summary, "") })
      ]));
    });
  }

  function renderExecutionPhases() {
    const wrap = document.getElementById("phaseLane");
    if (!wrap) return;
    wrap.innerHTML = "";
    const items = rows(BOARD.execution_phases);
    if (!items.length) {
      wrap.appendChild(el("div", { class: "empty-state", text: "当前没有执行排程。" }));
      return;
    }
    items.forEach((item) => {
      const checkpoints = Array.isArray(item.checkpoints) ? item.checkpoints : [];
      wrap.appendChild(el("article", { class: "card phase-card " + toneClass(item.status) }, [
        el("div", { class: "stack-head" }, [
          el("div", { class: "stack-title", text: text(item.title, "阶段") }),
          el("span", { class: "tone-chip " + toneClass(item.status), text: toneLabel(item.status) })
        ]),
        el("div", { class: "phase-meta" }, [
          el("div", { class: "stack-label", text: "负责人" }),
          el("div", { class: "phase-body", text: text(item.owner, "-") })
        ]),
        el("div", { class: "phase-meta" }, [
          el("div", { class: "stack-label", text: "输入" }),
          el("div", { class: "phase-body", text: text(item.input, "-") })
        ]),
        el("div", { class: "phase-output" }, [
          el("div", { class: "stack-label", text: "输出" }),
          el("div", { class: "phase-body", text: text(item.output, "-") })
        ]),
        checkpoints.length
          ? el("ul", { class: "phase-list" }, checkpoints.map((point) => el("li", { text: text(point, "") })))
          : el("div")
      ]));
    });
  }

  function renderRoleMatrix() {
    const wrap = document.getElementById("roleGrid");
    if (!wrap) return;
    wrap.innerHTML = "";
    const items = rows(BOARD.role_matrix);
    if (!items.length) {
      wrap.appendChild(el("div", { class: "empty-state", text: "当前没有角色分工。" }));
      return;
    }
    items.forEach((item) => {
      wrap.appendChild(el("article", { class: "card" }, [
        el("div", { class: "role-head" }, [
          el("div", { class: "role-title", text: text(item.role, "角色") }),
          el("span", { class: "tone-chip tone-accent", text: text(item.owner, "owner") })
        ]),
        el("p", { class: "mini-note", text: "负责 · " + text(item.responsibility, "-") }),
        el("p", { class: "mini-note", text: "交接 · " + text(item.handoff, "-") })
      ]));
    });
  }

  function renderDifferenceMatrix() {
    const wrap = document.getElementById("differenceGrid");
    if (!wrap) return;
    wrap.innerHTML = "";
    const items = rows(BOARD.difference_matrix);
    if (!items.length) {
      wrap.appendChild(el("div", { class: "empty-state", text: "当前没有差异保留规则。" }));
      return;
    }
    items.forEach((item) => {
      const list = Array.isArray(item.items) ? item.items : [];
      wrap.appendChild(el("article", { class: "card " + toneClass(item.tone) }, [
        el("div", { class: "stack-head" }, [
          el("div", { class: "stack-title", text: text(item.bucket, "分类") }),
          el("span", { class: "tone-chip " + toneClass(item.tone), text: toneLabel(item.tone) })
        ]),
        list.length
          ? el("ul", { class: "difference-list" }, list.map((entry) => el("li", { text: text(entry, "") })))
          : el("div")
      ]));
    });
  }

  function renderStackList(targetId, items, noteBuilder) {
    const wrap = document.getElementById(targetId);
    if (!wrap) return;
    wrap.innerHTML = "";
    if (!items.length) {
      wrap.appendChild(el("div", { class: "empty-state", text: "当前没有内容。" }));
      return;
    }
    items.forEach((item) => {
      const metaParts = [];
      if (item.run_id) metaParts.push("run · " + text(item.run_id, "-"));
      if (item.owner) metaParts.push("owner · " + text(item.owner, "-"));
      wrap.appendChild(el("article", { class: "stack-item" }, [
        el("div", { class: "stack-head" }, [
          el("div", { class: "stack-title", text: text(item.title, "条目") }),
          el("span", { class: "tone-chip " + toneClass(item.status), text: toneLabel(item.status) })
        ]),
        metaParts.length ? el("div", { class: "stack-meta" }, metaParts.map((part) => el("span", { text: part }))) : el("div"),
        el("p", { class: "stack-note", text: noteBuilder(item) })
      ]));
    });
  }

  function renderAlignmentRules() {
    const wrap = document.getElementById("alignmentRuleList");
    const rebuild = document.getElementById("rebuildCommand");
    if (rebuild) rebuild.textContent = text(BOARD.rebuild_command, "-");
    if (!wrap) return;
    wrap.innerHTML = "";
    const items = Array.isArray(BOARD.alignment_rules) ? BOARD.alignment_rules : [];
    if (!items.length) {
      wrap.appendChild(el("div", { class: "empty-state", text: "当前没有对齐规则。" }));
      return;
    }
    items.forEach((rule, index) => {
      wrap.appendChild(el("div", { class: "rule-item" }, [
        el("span", { class: "rule-index", text: String(index + 1) }),
        el("div", { class: "rule-text", text: text(rule, "-") })
      ]));
    });
  }

  function renderReferences() {
    const wrap = document.getElementById("referenceList");
    if (!wrap) return;
    wrap.innerHTML = "";
    const items = rows(BOARD.references);
    if (!items.length) {
      wrap.appendChild(el("div", { class: "empty-state", text: "当前没有参考资料。" }));
      return;
    }
    items.forEach((item) => {
      wrap.appendChild(el("article", { class: "reference-item" }, [
        el("div", { class: "reference-title", text: text(item.label, "资料") }),
        el("div", { class: "reference-path", text: text(item.path, "-") }),
        el("p", { class: "reference-note", text: text(item.note, "") })
      ]));
    });
  }

  setQuickLink("overviewLink", "overview_page", "/share/project-overview-dashboard.html");
  setQuickLink("taskLink", "task_page", "/share/project-task-dashboard.html");
  setQuickLink("statusReportLink", "status_report_page", "/share/project-status-report.html");
  setQuickLink("communicationLink", "communication_page", "/share/project-communication-audit.html");
  setQuickLink("sessionHealthLink", "session_health_page", "/share/project-session-health-dashboard.html");

  renderHero();
  renderSummaryCards();
  renderVersionBoard();
  renderMajorTimeline();
  renderRepoTargets();
  renderOperatingModel();
  renderExecutionPhases();
  renderRoleMatrix();
  renderDifferenceMatrix();
  renderStackList("currentLinkList", rows(BOARD.current_links), (item) => text(item.detail, ""));
  renderStackList("nextActionList", rows(BOARD.next_actions), (item) => text(item.title, ""));
  renderAlignmentRules();
  renderReferences();
})();
