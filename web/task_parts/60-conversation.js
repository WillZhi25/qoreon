// 第六刀：会话详情壳层与会话 API/缓存桥接
    function renderConversationQuickTips(ctx, runs) {
      const box = document.getElementById("convQuickTips");
      if (!box) return;
      box.innerHTML = "";
      const tips = conversationQuickTipsForRuns(ctx, runs);
      if (!tips.length) {
        box.style.display = "none";
        return;
      }
      box.style.display = "flex";
      tips.forEach((tip) => {
        box.appendChild(el("span", {
          class: "convquicktip-label",
          text: String(tip.label || tip.message || "快捷发送"),
          title: String(tip.label || tip.message || ""),
        }));
        const sendQuickBtn = el("button", {
          class: "btn textbtn convquicktip-send",
          type: "button",
          text: PCONV.sending ? "发送中..." : "发送",
        });
        sendQuickBtn.disabled = !!PCONV.sending;
        sendQuickBtn.addEventListener("click", async (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (sendQuickBtn.disabled) return;
          sendQuickBtn.disabled = true;
          await sendConversationQuickMessage(String(tip.message || ""));
        });
        box.appendChild(sendQuickBtn);
      });
    }

    function renderConvComposerRunActions(ctx, runs) {
      const box = document.getElementById("convComposerRunActions");
      if (!box) return;
      box.innerHTML = "";
      box.style.display = "none";
    }

    function summarizeConversationLivePreview(rawText, maxLen = 120) {
      const text = String(rawText || "").replace(/\r\n?/g, "\n").trim();
      if (!text) return "";
      const compact = text
        .split("\n")
        .map((line) => String(line || "").trim())
        .filter(Boolean)
        .join(" ");
      if (!compact) return "";
      return compact.length > maxLen ? (compact.slice(0, maxLen) + "…") : compact;
    }

    function buildConversationLiveRunHint(runs) {
      const list = Array.isArray(runs) ? runs : [];
      for (let i = list.length - 1; i >= 0; i -= 1) {
        const run = list[i] || {};
        const rid = String(run.id || "").trim();
        if (!rid) continue;
        const detail = PCONV.detailMap[rid] || null;
        const st = String(getRunDisplayState(run, detail) || "").trim().toLowerCase();
        if (!isWorkingLikeState(st)) continue;
        const assistantText = stripInjectedConversationReplyText(resolveAssistantText(run, detail));
        const processInfo = collectRunProcessInfo(rid, st, run, detail);
        const preview = summarizeConversationLivePreview(firstNonEmptyText([
          assistantText,
          run.partialPreview,
          run.lastPreview,
          processInfo && processInfo.latest,
        ]));
        return {
          runId: rid,
          state: st,
          preview,
          latestProgressAt: String(firstNonEmptyText([
            processInfo && processInfo.latestProgressAt,
            run.lastProgressAt,
            run.updatedAt,
            run.updated_at,
            run.createdAt,
          ]) || "").trim(),
        };
      }
      return null;
    }

    function buildConversationSessionRunSummary(currentSession, currentRuntimeState, liveRunHint = null) {
      const session = (currentSession && typeof currentSession === "object") ? currentSession : {};
      const runtimeState = (currentRuntimeState && typeof currentRuntimeState === "object") ? currentRuntimeState : {};
      const latestRunSummary = getSessionLatestRunSummary(session);
      const sessionStatus = String(getSessionStatus(session) || runtimeState.display_state || "").trim().toLowerCase();
      const activeRunId = String(firstNonEmptyText([
        runtimeState.active_run_id,
        liveRunHint && liveRunHint.runId,
      ]) || "").trim();
      const queuedRunId = String(runtimeState.queued_run_id || "").trim();
      const activeLike = isWorkingLikeState(sessionStatus) || !!activeRunId || !!queuedRunId;
      if (!activeLike) return null;

      let headline = "";
      if (sessionStatus === "queued" || (!activeRunId && queuedRunId)) {
        headline = "当前会话有消息排队中";
      } else if (sessionStatus === "retry_waiting") {
        headline = "当前会话正在等待自动重试";
      } else if (sessionStatus === "external_busy") {
        headline = "当前会话当前被外部占用";
      } else if (activeRunId) {
        headline = "当前活跃 run " + shortId(activeRunId) + " 正在执行";
      } else {
        headline = "当前会话正在执行";
      }

      const detailParts = [];
      if (liveRunHint && liveRunHint.preview) {
        detailParts.push(String(liveRunHint.preview || "").trim());
      } else if (liveRunHint && liveRunHint.latestProgressAt) {
        const progressText = compactDateTime(liveRunHint.latestProgressAt) || shortDateTime(liveRunHint.latestProgressAt);
        if (progressText) detailParts.push("最近进展 " + progressText);
      }
      if (runtimeState.queue_depth > 1) detailParts.push("队列 " + runtimeState.queue_depth);

      const latestSummaryStatus = normalizeDisplayState(firstNonEmptyText([
        latestRunSummary && latestRunSummary.status,
        latestRunSummary && latestRunSummary.display_state,
        latestRunSummary && latestRunSummary.displayState,
      ]), "idle");
      const latestSummaryRunId = String(firstNonEmptyText([
        latestRunSummary && latestRunSummary.run_id,
        latestRunSummary && latestRunSummary.runId,
      ]) || "").trim();
      const staleLatestError = latestSummaryStatus === "error"
        && (
          (activeRunId && latestSummaryRunId !== activeRunId)
          || (!activeRunId && queuedRunId && latestSummaryRunId !== queuedRunId)
          || (!latestSummaryRunId && (activeRunId || queuedRunId))
        );
      if (staleLatestError) {
        detailParts.push(
          latestSummaryRunId
            ? ("上一条 run " + shortId(latestSummaryRunId) + " 已异常")
            : "上一条 run 已异常"
        );
      }

      const titleParts = [headline];
      if (activeRunId) titleParts.push("active_run_id: " + activeRunId);
      if (queuedRunId) titleParts.push("queued_run_id: " + queuedRunId);
      if (runtimeState.updated_at) titleParts.push("runtime.updated_at: " + runtimeState.updated_at);
      if (latestSummaryRunId) titleParts.push("latest_run_summary.run_id: " + latestSummaryRunId);
      if (detailParts.length) titleParts.push(detailParts.join(" · "));
      return {
        text: [headline].concat(detailParts).join(" · "),
        title: titleParts.filter(Boolean).join("\n"),
      };
    }

    function buildConversationRuntimeShadowMeta(currentRuntimeState, runs) {
      const runtimeState = (currentRuntimeState && typeof currentRuntimeState === "object") ? currentRuntimeState : {};
      const visibleRunIds = new Set(
        (Array.isArray(runs) ? runs : [])
          .map((item) => String((item && item.id) || "").trim())
          .filter(Boolean)
      );
      const activeRunId = String(runtimeState.active_run_id || "").trim();
      const queuedRunId = String(runtimeState.queued_run_id || "").trim();
      return {
        activeRunId,
        queuedRunId,
        missingActiveRunId: activeRunId && !visibleRunIds.has(activeRunId) ? activeRunId : "",
        missingQueuedRunId: queuedRunId && !visibleRunIds.has(queuedRunId) ? queuedRunId : "",
        queueDepth: Math.max(0, Number(runtimeState.queue_depth || 0) || 0),
        updatedAt: String(runtimeState.updated_at || "").trim(),
      };
    }

    function buildConversationRuntimeShadowHint(shadowMeta) {
      const meta = (shadowMeta && typeof shadowMeta === "object") ? shadowMeta : {};
      if (!meta.missingActiveRunId && !meta.missingQueuedRunId) return null;
      const parts = [];
      if (meta.missingActiveRunId) parts.push("当前有 1 条活跃消息正在处理");
      if (meta.missingQueuedRunId) parts.push(meta.queueDepth > 0 ? ("另有 " + meta.queueDepth + " 条消息排队中") : "另有排队消息等待开始");
      return {
        text: parts.join(" · "),
        title: [
          meta.missingActiveRunId ? ("active_run_id: " + meta.missingActiveRunId) : "",
          meta.missingQueuedRunId ? ("queued_run_id: " + meta.missingQueuedRunId) : "",
          meta.updatedAt ? ("updated_at: " + meta.updatedAt) : "",
        ].filter(Boolean).join("\n"),
      };
    }

    function buildConversationRuntimeShadowRuns(ctx, currentSession, currentRuntimeState, shadowMeta) {
      const meta = (shadowMeta && typeof shadowMeta === "object") ? shadowMeta : {};
      const createdAt = String(firstNonEmptyText([
        meta.updatedAt,
        currentRuntimeState && currentRuntimeState.updated_at,
        currentSession && currentSession.lastActiveAt,
        new Date().toISOString(),
      ]) || "").trim();
      const queuedText = String(firstNonEmptyText([
        currentSession && currentSession.latestUserMsg,
        "新消息已进入队列，等待前序任务完成后自动开始。",
      ]) || "").trim();
      return {
        activeRun: meta.missingActiveRunId ? {
          id: meta.missingActiveRunId,
          createdAt,
          startedAt: createdAt,
          updatedAt: createdAt,
          status: "running",
          display_state: "running",
          channelName: String((ctx && ctx.channelName) || ""),
          cliType: String((ctx && ctx.cliType) || "codex"),
          runtime_state_shadow: true,
        } : null,
        queuedRun: meta.missingQueuedRunId ? {
          id: meta.missingQueuedRunId,
          createdAt,
          status: "queued",
          display_state: "queued",
          channelName: String((ctx && ctx.channelName) || ""),
          cliType: String((ctx && ctx.cliType) || "codex"),
          messagePreview: queuedText,
          queue_reason: "session_serial",
          blocked_by_run_id: meta.activeRunId || "",
          runtime_state_shadow: true,
        } : null,
      };
    }

    function normalizeConversationOptimisticText(value) {
      return String(value || "").replace(/\s+/g, " ").trim();
    }

    function conversationOptimisticTextLikelySame(leftValue, rightValue) {
      const left = normalizeConversationOptimisticText(leftValue);
      const right = normalizeConversationOptimisticText(rightValue);
      if (!left || !right) return false;
      return left === right || left.startsWith(right) || right.startsWith(left);
    }

    function isConversationRunMaterializedForOptimistic(run, optimisticMessage) {
      const runRow = (run && typeof run === "object") ? run : null;
      const optimistic = (optimisticMessage && typeof optimisticMessage === "object") ? optimisticMessage : null;
      if (!runRow || !optimistic) return false;

      const runId = String((runRow && runRow.id) || "").trim();
      const optimisticRunId = String((optimistic && optimistic.runId) || "").trim();
      if (runId && optimisticRunId && runId === optimisticRunId) return true;

      const optimisticText = String((optimistic && optimistic.message) || "").trim();
      const previewText = String((runRow && runRow.messagePreview) || "").trim();
      if (!conversationOptimisticTextLikelySame(previewText, optimisticText)) return false;

      const optimisticCreatedAtNum = toTimeNum((optimistic && optimistic.createdAt) || "");
      const runCreatedAtNum = toTimeNum((runRow && runRow.createdAt) || "");
      if (optimisticCreatedAtNum < 0 || runCreatedAtNum < 0) return false;
      const deltaMs = runCreatedAtNum - optimisticCreatedAtNum;
      return deltaMs >= -3_000 && deltaMs <= 120_000;
    }

    function shouldSuppressConversationQueuedShadow(queuedShadowRun, optimisticMessage) {
      const shadowRun = (queuedShadowRun && typeof queuedShadowRun === "object") ? queuedShadowRun : null;
      const optimistic = (optimisticMessage && typeof optimisticMessage === "object") ? optimisticMessage : null;
      if (!shadowRun || !optimistic) return false;

      const shadowRunId = String((shadowRun && shadowRun.id) || "").trim();
      const optimisticRunId = String((optimistic && optimistic.runId) || "").trim();
      if (shadowRunId && optimisticRunId && shadowRunId === optimisticRunId) return true;

      const shadowText = String((shadowRun && shadowRun.messagePreview) || "").trim();
      const optimisticText = String((optimistic && optimistic.message) || "").trim();
      return conversationOptimisticTextLikelySame(shadowText, optimisticText);
    }

    function captureDebugLogScrollPositions(container) {
      if (!container) return;
      if (!PCONV.debugLogScrollTop) PCONV.debugLogScrollTop = Object.create(null);
      const nodes = Array.from(container.querySelectorAll(".mdebug-log[data-run-id]"));
      for (const n of nodes) {
        const runId = String(n.getAttribute("data-run-id") || "").trim();
        if (!runId) continue;
        const top = Number(n.scrollTop || 0);
        if (top > 0) PCONV.debugLogScrollTop[runId] = top;
      }
    }

    function conversationComposerPlaceholder(cliChipName = "Codex") {
      const cliLabel = String(cliChipName || "Codex").trim() || "Codex";
      if (PCONV.enterSendEnabled === false) {
        return "输入要发给该会话 " + cliLabel + " 的消息（回车不发送，Shift+Enter 换行）";
      }
      return "输入要发给该会话 " + cliLabel + " 的消息（Enter 发送）";
    }

    function renderConversationEnterSendToggle(enabled = PCONV.enterSendEnabled !== false) {
      const btn = document.getElementById("convEnterSendToggle");
      if (!btn) return;
      const active = !!enabled;
      btn.classList.toggle("active", active);
      btn.classList.toggle("off", !active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
      btn.title = active ? "已启用回车发送，点击关闭" : "已关闭回车发送，点击启用";
      btn.setAttribute("aria-label", active ? "关闭回车发送" : "启用回车发送");
    }

    function refreshConversationComposerPlaceholder() {
      const input = document.getElementById("convMsg");
      if (!input) return;
      const ctx = currentConversationCtx();
      const cliChipName = ctx && ctx.cliType ? String(ctx.cliType).toUpperCase() : "Codex";
      input.placeholder = conversationComposerPlaceholder(cliChipName);
    }

    function collectConversationReceiptHostRunIds(run) {
      const meta = (run && typeof run === "object") ? run : {};
      const ids = new Set();
      const pushId = (value) => {
        const id = String(value || "").trim();
        if (id) ids.add(id);
      };
      const sourceRef = (meta.source_ref && typeof meta.source_ref === "object")
        ? meta.source_ref
        : ((meta.sourceRef && typeof meta.sourceRef === "object") ? meta.sourceRef : null);
      const routeResolution = (meta.route_resolution && typeof meta.route_resolution === "object")
        ? meta.route_resolution
        : ((meta.routeResolution && typeof meta.routeResolution === "object") ? meta.routeResolution : null);
      const routeSourceRef = routeResolution && routeResolution.source_ref && typeof routeResolution.source_ref === "object"
        ? routeResolution.source_ref
        : ((routeResolution && routeResolution.sourceRef && typeof routeResolution.sourceRef === "object") ? routeResolution.sourceRef : null);
      pushId(meta.host_run_id || meta.hostRunId);
      pushId(meta.display_host_run_id || meta.displayHostRunId);
      pushId(sourceRef && (sourceRef.run_id || sourceRef.runId));
      pushId(routeSourceRef && (routeSourceRef.run_id || routeSourceRef.runId));
      pushId(meta.source_run_id || meta.sourceRunId);
      readCallbackSummaryIds(meta.callback_summary_of || meta.callbackSummaryOf).forEach(pushId);
      readCallbackSummaryIds(meta.callback_aggregate_source_run_ids || meta.callbackAggregateSourceRunIds).forEach(pushId);
      return Array.from(ids);
    }

    function conversationReceiptProjectionMatchesHost(projection, opts = {}) {
      if (!projection || typeof projection !== "object") return false;
      const callbackRunId = String(opts.callbackRunId || "").trim();
      const relatedRunIds = new Set(
        (Array.isArray(opts.relatedRunIds) ? opts.relatedRunIds : [])
          .map((id) => String(id || "").trim())
          .filter(Boolean)
      );
      const items = Array.isArray(projection.items) ? projection.items : [];
      if (callbackRunId && items.some((row) => String((row && row.callbackRunId) || "").trim() === callbackRunId)) {
        return true;
      }
      if (relatedRunIds.size && items.some((row) => {
        const sourceRunId = String((row && row.sourceRunId) || "").trim();
        const hostRunId = String((row && row.hostRunId) || "").trim();
        return relatedRunIds.has(sourceRunId) || relatedRunIds.has(hostRunId);
      })) {
        return true;
      }
      const rollup = (projection.rollup && typeof projection.rollup === "object") ? projection.rollup : null;
      if (rollup) {
        const rollupHostRunId = String(rollup.hostRunId || "").trim();
        if (rollupHostRunId && relatedRunIds.has(rollupHostRunId)) return true;
      }
      return false;
    }

    function resolveConversationReceiptHostRunId(run, runId, visibleRunIds, runsById, detailMap) {
      const currentRunId = String(runId || "").trim();
      const candidateIds = collectConversationReceiptHostRunIds(run)
        .map((id) => String(id || "").trim())
        .filter((id, index, list) => !!id && id !== currentRunId && list.indexOf(id) === index);
      const relatedRunIds = [currentRunId].concat(candidateIds);
      for (const candidateId of candidateIds) {
        if (!(visibleRunIds && visibleRunIds.has(candidateId))) continue;
        const candidateRun = runsById && runsById.get ? (runsById.get(candidateId) || null) : null;
        const candidateDetail = detailMap ? (detailMap[candidateId] || null) : null;
        const projection = readConversationReceiptProjection(candidateRun, candidateDetail);
        if (conversationReceiptProjectionMatchesHost(projection, {
          callbackRunId: currentRunId,
          relatedRunIds,
        })) {
          return candidateId;
        }
      }
      for (const candidateId of candidateIds) {
        if (!(visibleRunIds && visibleRunIds.has(candidateId))) continue;
        const candidateRun = runsById && runsById.get ? (runsById.get(candidateId) || null) : null;
        const candidateDetail = detailMap ? (detailMap[candidateId] || null) : null;
        if (readConversationReceiptProjection(candidateRun, candidateDetail)) return candidateId;
      }
      return candidateIds[0] || "";
    }

    function mergeConversationReceiptProjection(baseProjection, extraProjection) {
      const base = (baseProjection && typeof baseProjection === "object") ? baseProjection : null;
      const extra = (extraProjection && typeof extraProjection === "object") ? extraProjection : null;
      if (!base && !extra) return null;
      const items = [];
      const pendingActions = [];
      const itemKeys = new Set();
      const pendingKeys = new Set();
      const pushItem = (row) => {
        if (!row || typeof row !== "object") return;
        const key = [
          String(row.callbackRunId || "").trim(),
          String(row.sourceRunId || "").trim(),
          String(row.hostRunId || "").trim(),
        ].join("|");
        if (!key || itemKeys.has(key)) return;
        itemKeys.add(key);
        items.push(row);
      };
      const pushPending = (row) => {
        if (!row || typeof row !== "object") return;
        const key = [
          String(row.callbackRunId || "").trim(),
          String(row.sourceRunId || "").trim(),
          String(row.title || "").trim(),
        ].join("|");
        if (!key || pendingKeys.has(key)) return;
        pendingKeys.add(key);
        pendingActions.push(row);
      };
      (Array.isArray(base && base.items) ? base.items : []).forEach(pushItem);
      (Array.isArray(extra && extra.items) ? extra.items : []).forEach(pushItem);
      (Array.isArray(base && base.pendingActions) ? base.pendingActions : []).forEach(pushPending);
      (Array.isArray(extra && extra.pendingActions) ? extra.pendingActions : []).forEach(pushPending);
      const baseRollup = (base && base.rollup && typeof base.rollup === "object") ? base.rollup : null;
      const extraRollup = (extra && extra.rollup && typeof extra.rollup === "object") ? extra.rollup : null;
      const agentSet = new Set();
      const collectAgents = (rollup) => {
        (Array.isArray(rollup && rollup.agents) ? rollup.agents : []).forEach((name) => {
          const token = String(name || "").trim();
          if (token) agentSet.add(token);
        });
      };
      collectAgents(baseRollup);
      collectAgents(extraRollup);
      const needConfirmCount = items.reduce((count, row) => {
        const needConfirm = String((row && row.needConfirm) || "").trim();
        return count + ((needConfirm && needConfirm !== "无") ? 1 : 0);
      }, 0);
      const rollup = (baseRollup || extraRollup || items.length || pendingActions.length) ? {
        hostRunId: String(firstNonEmptyText([
          extraRollup && extraRollup.hostRunId,
          baseRollup && baseRollup.hostRunId,
          items[0] && items[0].hostRunId,
        ]) || "").trim(),
        totalCallbacks: Math.max(
          items.length,
          Number((baseRollup && baseRollup.totalCallbacks) || 0),
          Number((extraRollup && extraRollup.totalCallbacks) || 0)
        ),
        pendingActionCount: Math.max(
          pendingActions.length,
          Number((baseRollup && baseRollup.pendingActionCount) || 0),
          Number((extraRollup && extraRollup.pendingActionCount) || 0)
        ),
        latestStatus: String(firstNonEmptyText([
          extraRollup && extraRollup.latestStatus,
          baseRollup && baseRollup.latestStatus,
        ]) || "").trim(),
        latestConclusion: String(firstNonEmptyText([
          extraRollup && extraRollup.latestConclusion,
          baseRollup && baseRollup.latestConclusion,
          items[0] && items[0].currentConclusion,
        ]) || "").trim(),
        needConfirmCount,
        agents: Array.from(agentSet).slice(0, 20),
        lastCallbackAt: String(firstNonEmptyText([
          extraRollup && extraRollup.lastCallbackAt,
          baseRollup && baseRollup.lastCallbackAt,
          items[0] && items[0].callbackAt,
        ]) || "").trim(),
      } : null;
      if (!items.length && !pendingActions.length && !rollup) return null;
      return { items, pendingActions, rollup };
    }

    function readConversationTimelineAnchorInfo(run, detail) {
      const mergedRun = mergeRunForDisplay(
        (detail && detail.full && detail.full.run && typeof detail.full.run === "object") ? detail.full.run : null,
        (run && typeof run === "object") ? run : null
      );
      const senderType = String(firstNonEmptyText([
        mergedRun && mergedRun.sender_type,
        mergedRun && mergedRun.senderType,
      ]) || "").trim().toLowerCase();
      const triggerType = String(firstNonEmptyText([
        mergedRun && mergedRun.trigger_type,
        mergedRun && mergedRun.triggerType,
      ]) || "").trim().toLowerCase();
      const messageKind = String(resolveConversationMessageKind(mergedRun) || "").trim().toLowerCase();
      const sourceRef = (mergedRun.source_ref && typeof mergedRun.source_ref === "object")
        ? mergedRun.source_ref
        : ((mergedRun.sourceRef && typeof mergedRun.sourceRef === "object") ? mergedRun.sourceRef : null);
      const routeResolution = readRouteResolution(mergedRun.route_resolution || mergedRun.routeResolution);
      const routeSourceRef = routeResolution && routeResolution.sourceRef && typeof routeResolution.sourceRef === "object"
        ? routeResolution.sourceRef
        : ((routeResolution && routeResolution.source_ref && typeof routeResolution.source_ref === "object") ? routeResolution.source_ref : null);
      const callbackTo = (mergedRun.callback_to && typeof mergedRun.callback_to === "object")
        ? mergedRun.callback_to
        : ((mergedRun.callbackTo && typeof mergedRun.callbackTo === "object") ? mergedRun.callbackTo : null);
      const messageText = String(firstNonEmptyText([
        detail && detail.full && detail.full.message,
        run && run.messagePreview,
      ]) || "");
      const inboundSummary = readConversationInboundSummary(messageText);
      return {
        run: mergedRun,
        senderType,
        triggerType,
        messageKind,
        sourceChannel: String(firstNonEmptyText([
          sourceRef && (sourceRef.channel_name || sourceRef.channelName),
          routeSourceRef && (routeSourceRef.channel_name || routeSourceRef.channelName),
          inboundSummary && inboundSummary.sourceChannel,
        ]) || "").trim(),
        sourceSessionId: String(firstNonEmptyText([
          sourceRef && (sourceRef.session_id || sourceRef.sessionId),
          routeSourceRef && (routeSourceRef.session_id || routeSourceRef.sessionId),
        ]) || "").trim(),
        targetSessionId: String(firstNonEmptyText([
          callbackTo && (callbackTo.session_id || callbackTo.sessionId),
        ]) || "").trim(),
      };
    }

    function resolveConversationLocalReceiptAnchorRunId(payload = {}) {
      const runs = Array.isArray(payload.runs) ? payload.runs : [];
      const callbackRunId = String(payload.callbackRunId || "").trim();
      const callbackEventMeta = (payload.callbackEventMeta && typeof payload.callbackEventMeta === "object")
        ? payload.callbackEventMeta
        : null;
      if (!callbackRunId || !callbackEventMeta || !runs.length) return "";
      const explicitHostRunId = String(firstNonEmptyText([
        payload.callbackRun && (payload.callbackRun.display_host_run_id || payload.callbackRun.displayHostRunId),
      ]) || "").trim();
      if (explicitHostRunId && explicitHostRunId !== callbackRunId) {
        const visible = runs.some((row) => String((row && row.id) || "").trim() === explicitHostRunId);
        if (visible) return explicitHostRunId;
      }
      const detailMap = payload.detailMap || null;
      const currentSessionId = String(payload.currentSessionId || "").trim();
      const callbackIndex = runs.findIndex((row) => String((row && row.id) || "").trim() === callbackRunId);
      if (callbackIndex < 0) return "";
      const sourceChannel = String(firstNonEmptyText([
        callbackEventMeta.comm && callbackEventMeta.comm.sourceChannel,
      ]) || "").trim();
      const sourceRunId = String(callbackEventMeta.sourceRunId || "").trim();
      const relatedRunIds = new Set([callbackRunId, sourceRunId].filter(Boolean));
      collectConversationReceiptHostRunIds(payload.callbackRun || null).forEach((id) => {
        const token = String(id || "").trim();
        if (token) relatedRunIds.add(token);
      });
      let bestId = "";
      let bestScore = -Infinity;
      for (let idx = 0; idx < runs.length; idx += 1) {
        const row = runs[idx] || null;
        const candidateRunId = String((row && row.id) || "").trim();
        if (!candidateRunId || candidateRunId === callbackRunId) continue;
        const info = readConversationTimelineAnchorInfo(row, detailMap ? detailMap[candidateRunId] : null);
        const candidateStatus = String(getRunDisplayState(row, detailMap ? detailMap[candidateRunId] : null) || "").trim().toLowerCase();
        const callbackLike = info.triggerType === "callback_auto"
          || info.triggerType === "callback_auto_summary"
          || info.messageKind === "system_callback"
          || info.messageKind === "system_callback_summary"
          || info.messageKind === "restart_recovery_summary";
        if (info.senderType === "system" || callbackLike || isRunWorking(candidateStatus)) continue;
        let score = 0;
        if (idx < callbackIndex) score += 40;
        else score += 10;
        score -= Math.min(Math.abs(callbackIndex - idx), 30);
        if (relatedRunIds.has(candidateRunId)) score += 160;
        if (sourceChannel && info.sourceChannel && info.sourceChannel === sourceChannel) score += 120;
        if (sourceRunId && candidateRunId === sourceRunId) score += 200;
        if (info.messageKind === "collab_update" || info.messageKind === "manual_update") score += 20;
        if (info.senderType === "agent") score += 12;
        if (currentSessionId && info.targetSessionId && info.targetSessionId === currentSessionId) score += 8;
        if (score > bestScore) {
          bestScore = score;
          bestId = candidateRunId;
        }
      }
      return bestId;
    }

    function buildConversationLocalReceiptProjectionFromCallback(payload = {}) {
      const callbackEventMeta = (payload.callbackEventMeta && typeof payload.callbackEventMeta === "object")
        ? payload.callbackEventMeta
        : null;
      const senderRun = (payload.senderRun && typeof payload.senderRun === "object") ? payload.senderRun : {};
      const anchorRunId = String(payload.anchorRunId || "").trim();
      if (!callbackEventMeta || !anchorRunId) return null;
      const callbackRunId = String(payload.callbackRunId || "").trim();
      const ctx = payload.ctx || {};
      const callbackAt = String(firstNonEmptyText([
        senderRun.updated_at,
        senderRun.updatedAt,
        senderRun.created_at,
        senderRun.createdAt,
      ]) || "").trim();
      const needConfirm = String(firstNonEmptyText([
        callbackEventMeta.comm && callbackEventMeta.comm.needConfirm,
        senderRun.need_confirm,
        senderRun.needConfirm,
        "无",
      ]) || "无").trim() || "无";
      const needPeer = String(firstNonEmptyText([
        callbackEventMeta.comm && callbackEventMeta.comm.needPeer,
        senderRun.need_peer,
        senderRun.needPeer,
      ]) || "").trim();
      const expectedResult = String(firstNonEmptyText([
        callbackEventMeta.comm && callbackEventMeta.comm.expectedResult,
        senderRun.expected_result,
        senderRun.expectedResult,
      ]) || "").trim();
      const currentConclusion = String(firstNonEmptyText([
        callbackEventMeta.comm && callbackEventMeta.comm.currentConclusion,
        senderRun.current_conclusion,
        senderRun.currentConclusion,
        callbackConclusionDefault(callbackEventMeta.eventType),
      ]) || "").trim();
      const sourceAgentName = String(firstNonEmptyText([
        senderRun.source_alias,
        senderRun.sourceAlias,
        senderRun.source_agent_alias,
        senderRun.sourceAgentAlias,
        senderRun.source_agent_name,
        senderRun.sourceAgentName,
      ]) || "").trim();
      const item = normalizeConversationReceiptItem({
        source_run_id: String(callbackEventMeta.sourceRunId || callbackRunId || anchorRunId).trim(),
        callback_run_id: callbackRunId,
        host_run_id: anchorRunId,
        host_reason: "local_timeline_anchor",
        trigger_type: callbackEventMeta.triggerType,
        event_type: callbackEventMeta.eventType,
        event_reason: callbackEventMeta.eventReason,
        dispatch_status: "local_anchor",
        source_channel: callbackEventMeta.comm && callbackEventMeta.comm.sourceChannel,
        source_agent_name: sourceAgentName,
        source_project_id: callbackEventMeta.projectId || STATE.project,
        source_session_id: firstNonEmptyText([
          senderRun.source_session_id,
          senderRun.sourceSessionId,
        ]),
        target_project_id: String(firstNonEmptyText([ctx.projectId, STATE.project]) || "").trim(),
        target_channel: String(firstNonEmptyText([ctx.channelName, ctx.displayChannel, ctx.alias]) || "").trim(),
        target_session_id: String(firstNonEmptyText([ctx.sessionId]) || "").trim(),
        callback_task: callbackEventMeta.comm && callbackEventMeta.comm.receiptTask,
        execution_stage: callbackEventMeta.comm && callbackEventMeta.comm.stage,
        current_conclusion: currentConclusion,
        need_peer: needPeer,
        expected_result: expectedResult,
        need_confirm: needConfirm,
        feedback_file_path: callbackEventMeta.feedbackFilePath,
        callback_merge_mode: callbackEventMeta.callbackMergeMode || "local_timeline_anchor",
        callback_anchor_action: "anchored_to_visible_timeline",
        callback_at: callbackAt,
        updated_at: callbackAt,
        route_resolution: callbackEventMeta.routeResolution,
        late_callback: false,
        route_mismatch: false,
        is_summary: !!callbackEventMeta.isSummary,
        aggregate_count: Number(callbackEventMeta.aggregateCount || 0),
        summary_count: Number(callbackEventMeta.summaryCount || 0),
      });
      if (!item) return null;
      const needsAction = !!(
        (needConfirm && needConfirm !== "无")
        || conversationNeedsPeerAction(needPeer)
        || callbackEventMeta.eventType === "error"
        || callbackEventMeta.eventType === "interrupted"
      );
      const pendingAction = needsAction
        ? normalizeConversationReceiptPendingAction({
            source_run_id: item.sourceRunId,
            callback_run_id: item.callbackRunId,
            title: firstNonEmptyText([
              callbackEventMeta.comm && callbackEventMeta.comm.receiptTask,
              sourceAgentName ? (sourceAgentName + " 回执待处理") : "",
              item.sourceChannel ? (item.sourceChannel + " 回执待处理") : "",
              "待处理回执",
            ]),
            action_text: firstNonEmptyText([
              needConfirm && needConfirm !== "无" ? needConfirm : "",
              conversationNeedsPeerAction(needPeer) ? needPeer : "",
              expectedResult,
              currentConclusion,
            ]),
            action_kind: (needConfirm && needConfirm !== "无")
              ? "confirm"
              : ((callbackEventMeta.eventType === "error" || callbackEventMeta.eventType === "interrupted") ? "follow_up" : "receipt"),
            priority: (callbackEventMeta.eventType === "error" || callbackEventMeta.eventType === "interrupted" || (needConfirm && needConfirm !== "无"))
              ? "high"
              : "normal",
            source_channel: item.sourceChannel,
            source_agent_name: item.sourceAgentName,
            event_type: item.eventType,
            callback_at: item.callbackAt,
            need_confirm: item.needConfirm,
          })
        : null;
      return {
        items: item ? [item] : [],
        pendingActions: pendingAction ? [pendingAction] : [],
        rollup: {
          hostRunId: anchorRunId,
          totalCallbacks: 1,
          pendingActionCount: pendingAction ? 1 : 0,
          latestStatus: String(item.eventType || "").trim().toLowerCase(),
          latestConclusion: currentConclusion,
          needConfirmCount: (needConfirm && needConfirm !== "无") ? 1 : 0,
          agents: [item.sourceAgentName || item.sourceChannel].filter(Boolean),
          lastCallbackAt: item.callbackAt,
        },
      };
    }

    function buildConversationLocalReceiptAnchorMaps(runs, visibleRunIds, runsById, detailMap, ctx) {
      const anchoredByHostRunId = Object.create(null);
      const anchoredCallbackRunIds = new Set();
      const list = Array.isArray(runs) ? runs : [];
      for (const row of list) {
        const rid = String((row && row.id) || "").trim();
        if (!rid) continue;
        const detail = detailMap ? (detailMap[rid] || null) : null;
        const senderRun = mergeRunForDisplay(
          (detail && detail.full && detail.full.run && typeof detail.full.run === "object") ? detail.full.run : null,
          row
        );
        const userText = String(firstNonEmptyText([
          detail && detail.full && detail.full.message,
          row && row.messagePreview,
        ]) || "");
        const callbackEventMeta = readRunCallbackEventMeta(senderRun, ctx, userText);
        if (!callbackEventMeta) continue;
        const projectedReceiptHostRunId = resolveConversationReceiptHostRunId(senderRun, rid, visibleRunIds, runsById, detailMap);
        const projectedHostRun = projectedReceiptHostRunId
          ? (runsById && runsById.get ? (runsById.get(projectedReceiptHostRunId) || null) : null)
          : null;
        const projectedHostDetail = projectedReceiptHostRunId ? (detailMap ? (detailMap[projectedReceiptHostRunId] || null) : null) : null;
        const projectedHostReceiptProjection = projectedReceiptHostRunId
          ? readConversationReceiptProjection(projectedHostRun, projectedHostDetail)
          : null;
        const callbackProjectedToVisibleHost = !!(
          projectedReceiptHostRunId
          && projectedReceiptHostRunId !== rid
          && visibleRunIds.has(projectedReceiptHostRunId)
          && conversationReceiptProjectionMatchesHost(projectedHostReceiptProjection, {
            callbackRunId: rid,
            relatedRunIds: [rid].concat(collectConversationReceiptHostRunIds(senderRun)),
          })
        );
        if (callbackProjectedToVisibleHost) continue;
        const anchorRunId = resolveConversationLocalReceiptAnchorRunId({
          runs: list,
          callbackRun: senderRun,
          callbackRunId: rid,
          callbackEventMeta,
          detailMap,
          currentSessionId: ctx && ctx.sessionId,
        });
        if (!anchorRunId) continue;
        const localProjection = buildConversationLocalReceiptProjectionFromCallback({
          callbackEventMeta,
          callbackRunId: rid,
          senderRun,
          anchorRunId,
          ctx,
        });
        if (!localProjection) continue;
        anchoredByHostRunId[anchorRunId] = mergeConversationReceiptProjection(
          anchoredByHostRunId[anchorRunId] || null,
          localProjection
        );
        anchoredCallbackRunIds.add(rid);
      }
      return {
        anchoredByHostRunId,
        anchoredCallbackRunIds,
      };
    }

    function conversationTaskStatusTone(statusText) {
      return taskDisplayStatusMeta(statusText, "待办").tone;
    }

    function conversationTaskActionLabel(kind) {
      const key = String(kind || "").trim().toLowerCase();
      const map = {
        create: "新产生",
        link: "已关联",
        start: "开始推进",
        update: "有更新",
        confirm: "待确认",
        block: "受阻",
        done: "已完成",
        pause: "已暂停",
        follow_up: "待跟进",
      };
      return map[key] || (key ? String(kind) : "");
    }

    function conversationTaskActionTone(kind, status = "") {
      const key = String(kind || "").trim().toLowerCase();
      const normalizedStatus = String(status || "").trim().toLowerCase();
      if (normalizedStatus === "error" || key === "block") return "bad";
      if (key === "done" || normalizedStatus === "done") return "good";
      if (key === "confirm" || key === "follow_up" || key === "create" || key === "start" || key === "pause") return "warn";
      return "muted";
    }

    function conversationTaskOwnerDisplayMeta(rawOwner) {
      const owner = (rawOwner && typeof rawOwner === "object") ? rawOwner : {};
      const state = String(owner.state || "missing").trim().toLowerCase();
      const text = String(firstNonEmptyText([owner.agent_name, owner.alias]) || "待明确").trim() || "待明确";
      let meta = "";
      if (state === "pending") meta = owner.session_id ? "等待该会话回执" : "等待对方处理";
      else if (state === "missing") meta = "责任人待补充";
      else if (owner.alias && owner.agent_name && owner.alias !== owner.agent_name) meta = String(owner.alias || "").trim();
      return {
        text,
        meta,
        state: ["confirmed", "pending", "missing"].includes(state) ? state : "missing",
      };
    }

    function conversationTaskTitleText(row) {
      const raw = String(firstNonEmptyText([
        row && row.task_title,
        row && row.task_path,
      ]) || "").trim();
      return raw ? shortTitle(raw) : "未命名任务";
    }

    function buildConversationTaskOwnerNode(rawOwner, label = "负责Agent") {
      const info = conversationTaskOwnerDisplayMeta(rawOwner);
      const box = el("div", { class: "convtaskowner" });
      box.appendChild(el("div", { class: "convtaskowner-label", text: String(label || "").trim() || "负责Agent" }));
      box.appendChild(el("div", { class: "convtaskowner-name", text: info.text }));
      if (info.meta) box.appendChild(el("div", { class: "convtaskowner-meta", text: info.meta }));
      return box;
    }

    function cloneConversationTaskRoleMember(rawMember) {
      const member = (rawMember && typeof rawMember === "object") ? rawMember : null;
      return member ? { ...member } : null;
    }

    function cloneConversationTaskCustomRole(rawRole) {
      const role = (rawRole && typeof rawRole === "object") ? rawRole : null;
      if (!role) return null;
      return {
        ...role,
        members: Array.isArray(role.members) ? role.members.map(cloneConversationTaskRoleMember).filter(Boolean) : [],
      };
    }

    function conversationTaskRoleMemberDisplayMeta(rawMember) {
      const member = (rawMember && typeof rawMember === "object") ? rawMember : {};
      const text = String(firstNonEmptyText([
        member.display_name,
        member.agent_alias,
        member.agent_name,
        member.name,
      ]) || "待补充").trim() || "待补充";
      const metaParts = [];
      const channelText = String(member.channel_name || "").trim();
      const responsibilityText = String(member.responsibility || "").trim();
      if (channelText) metaParts.push(channelText);
      if (responsibilityText) metaParts.push(responsibilityText);
      return {
        text,
        meta: metaParts.join(" · "),
      };
    }

    function conversationTaskResponsibilityModel(raw) {
      const item = (raw && typeof raw === "object") ? raw : {};
      const model = {
        main_owner: cloneConversationTaskRoleMember(item.main_owner),
        collaborators: Array.isArray(item.collaborators) ? item.collaborators.map(cloneConversationTaskRoleMember).filter(Boolean) : [],
        validators: Array.isArray(item.validators) ? item.validators.map(cloneConversationTaskRoleMember).filter(Boolean) : [],
        challengers: Array.isArray(item.challengers) ? item.challengers.map(cloneConversationTaskRoleMember).filter(Boolean) : [],
        backup_owners: Array.isArray(item.backup_owners) ? item.backup_owners.map(cloneConversationTaskRoleMember).filter(Boolean) : [],
        management_slot: Array.isArray(item.management_slot) ? item.management_slot.map(cloneConversationTaskRoleMember).filter(Boolean) : [],
        custom_roles: Array.isArray(item.custom_roles) ? item.custom_roles.map(cloneConversationTaskCustomRole).filter(Boolean) : [],
      };
      model.hasData = !!(model.main_owner
        || model.collaborators.length
        || model.validators.length
        || model.challengers.length
        || model.backup_owners.length
        || model.management_slot.length
        || model.custom_roles.length);
      return model;
    }

    function buildConversationTaskRoleCard(rawMember, opts = {}) {
      const info = conversationTaskRoleMemberDisplayMeta(rawMember);
      const card = el("div", { class: "convtaskrolecard" + (opts.compact ? " is-compact" : "") });
      card.appendChild(el("div", {
        class: "convtaskrolecard-label",
        text: String(opts.label || "").trim() || "责任位",
      }));
      card.appendChild(el("div", { class: "convtaskrolecard-name", text: info.text }));
      if (info.meta) card.appendChild(el("div", { class: "convtaskrolecard-meta", text: info.meta }));
      return card;
    }

    function conversationTaskRolePreviewText(members, emptyText = "未配置") {
      const list = Array.isArray(members) ? members.filter(Boolean) : [];
      if (!list.length) return emptyText;
      const names = list
        .map((member) => conversationTaskRoleMemberDisplayMeta(member).text)
        .filter(Boolean);
      if (!names.length) return emptyText;
      if (names.length <= 2) return names.join(" · ");
      return names.slice(0, 2).join(" · ") + " 等 " + names.length + " 项";
    }

    function buildConversationTaskManagementOverviewNode(model) {
      const data = (model && typeof model === "object") ? model : conversationTaskResponsibilityModel(null);
      const members = Array.isArray(data.management_slot) ? data.management_slot : [];
      const card = el("div", { class: "convtaskroleoverview" });
      card.appendChild(el("div", { class: "convtaskroleoverview-label", text: "管理位概览" }));
      card.appendChild(el("div", {
        class: "convtaskroleoverview-text" + (!members.length ? " is-placeholder" : ""),
        text: conversationTaskRolePreviewText(members, "管理位待接入正式读模型"),
      }));
      card.appendChild(el("div", {
        class: "convtaskroleoverview-meta",
        text: members.length ? ("共 " + members.length + " 项") : "只读展示，不拆固定槽位",
      }));
      return card;
    }

    function buildConversationTaskResponsibilityRail(raw) {
      const model = conversationTaskResponsibilityModel(raw);
      if (!model.hasData) return null;
      const rail = el("div", { class: "convtaskrole-rail" });
      rail.appendChild(
        model.main_owner
          ? buildConversationTaskRoleCard(model.main_owner, { label: "主负责位", compact: true })
          : buildConversationTaskRoleCard({ display_name: "主负责位待接入正式读模型" }, { label: "主负责位", compact: true })
      );
      rail.appendChild(buildConversationTaskManagementOverviewNode(model));
      return rail;
    }

    function buildConversationTaskResponsibilitySummaryLine(raw) {
      const model = conversationTaskResponsibilityModel(raw);
      if (!model.hasData) return null;
      const line = el("div", { class: "convtaskrole-inline" });
      const mainOwnerText = model.main_owner
        ? conversationTaskRoleMemberDisplayMeta(model.main_owner).text
        : "待接入";
      const parts = ["主负责位 " + mainOwnerText];
      if (model.management_slot.length) {
        parts.push("管理位 " + conversationTaskRolePreviewText(model.management_slot, "未配置"));
      }
      line.appendChild(el("span", { class: "k", text: "责任位" }));
      line.appendChild(el("span", { class: "v", text: parts.join(" · ") }));
      return line;
    }

    function conversationTaskRoleLabel(roleKey = "") {
      const key = String(roleKey || "").trim().toLowerCase();
      if (key === "main_owner") return "主负责位";
      if (key === "collaborators") return "协同位";
      if (key === "validators") return "验证位";
      if (key === "challengers") return "质疑位";
      if (key === "backup_owners") return "备份位";
      if (key === "management_slot") return "管理位";
      return key ? "责任位" : "";
    }

    function conversationTaskCoreAgentEntryKey(roleKey, member, info) {
      const raw = (member && typeof member === "object") ? member : {};
      const display = (info && typeof info === "object") ? info : conversationTaskRoleMemberDisplayMeta(raw);
      const parts = [
        String(raw.session_id || raw.sessionId || "").trim(),
        String(raw.agent_id || raw.agentId || "").trim(),
        String(raw.agent_name || raw.agentName || "").trim(),
        String(display.text || "").trim().toLowerCase(),
      ].filter(Boolean);
      return parts.join("::");
    }

    function conversationTaskCoreAgentEntries(raw) {
      const model = conversationTaskResponsibilityModel(raw);
      const out = [];
      const seen = new Set();
      function push(roleKey, label, member, opts = {}) {
        const rawMember = (member && typeof member === "object") ? member : null;
        if (!rawMember) return;
        const info = conversationTaskRoleMemberDisplayMeta(rawMember);
        const text = String(info.text || "").trim();
        if (!text) return;
        const dedupeKey = conversationTaskCoreAgentEntryKey(roleKey, rawMember, info);
        if (dedupeKey && seen.has(dedupeKey)) return;
        if (dedupeKey) seen.add(dedupeKey);
        out.push({
          roleKey: String(roleKey || "").trim().toLowerCase(),
          roleLabel: String(label || "").trim() || conversationTaskRoleLabel(roleKey) || "责任位",
          text,
          meta: String(info.meta || "").trim(),
          emphasis: String(opts.emphasis || "secondary").trim().toLowerCase() || "secondary",
        });
      }

      if (model.main_owner) push("main_owner", "主负责位", model.main_owner, { emphasis: "primary" });
      model.collaborators.forEach((member) => push("collaborators", "协同位", member));
      model.validators.forEach((member) => push("validators", "验证位", member));
      model.challengers.forEach((member) => push("challengers", "质疑位", member));
      model.backup_owners.forEach((member) => push("backup_owners", "备份位", member));
      model.custom_roles.forEach((role) => {
        const label = String(role && role.name || "").trim() || "自定义责任位";
        (Array.isArray(role && role.members) ? role.members : []).forEach((member) => push("custom_role", label, member));
      });

      if (!out.length) {
        const owner = conversationTaskOwnerDisplayMeta((raw && raw.next_owner) || null);
        if (owner.text) {
          out.push({
            roleKey: "next_owner",
            roleLabel: "负责Agent",
            text: owner.text,
            meta: owner.meta,
            emphasis: "primary",
          });
        }
      }
      return out;
    }

    function buildConversationTaskAgentChip(entry) {
      const item = (entry && typeof entry === "object") ? entry : {};
      const chipNode = el("div", { class: "convtaskagentchip" });
      chipNode.appendChild(el("span", {
        class: "convtaskagentchip-role",
        text: String(item.roleLabel || "").trim() || "责任位",
      }));
      chipNode.appendChild(el("span", {
        class: "convtaskagentchip-name",
        text: String(item.text || "").trim() || "待补充",
      }));
      return chipNode;
    }

    function buildConversationTaskManagementHint(model) {
      const data = (model && typeof model === "object") ? model : conversationTaskResponsibilityModel(null);
      if (!Array.isArray(data.management_slot) || !data.management_slot.length) return null;
      return el("div", {
        class: "convtaskagents-management",
        text: "管理位概览 · " + conversationTaskRolePreviewText(data.management_slot, "未配置"),
      });
    }

    function buildConversationTaskCoreAgentCluster(raw, opts = {}) {
      return buildTaskRoleGroups(raw, {
        className: "convtask-role-groups" + (opts.compact ? " is-compact" : ""),
        avatarClassName: opts.compact ? "is-compact" : "",
      });
    }

    function conversationTaskProgressText(raw) {
      const item = (raw && typeof raw === "object") ? raw : {};
      const latestActionText = String(item.latest_action_text || "").trim();
      if (latestActionText) return latestActionText;
      const summaryText = String(item.task_summary_text || "").trim();
      if (summaryText) return summaryText;
      return "最近暂无补充进展。";
    }

    function buildConversationTaskRoleGroup(label, members, opts = {}) {
      const list = Array.isArray(members) ? members.filter(Boolean) : [];
      if (!list.length) return null;
      const block = el("div", { class: "conv-task-role-group" });
      const title = String(opts.title || label || "").trim();
      block.appendChild(el("div", {
        class: "conv-task-role-group-title",
        text: title + (list.length > 1 ? (" · " + list.length + " 项") : ""),
      }));
      const items = el("div", { class: "conv-task-role-members" });
      list.forEach((member) => items.appendChild(buildConversationTaskRoleCard(member, { label })));
      block.appendChild(items);
      return block;
    }

    function buildConversationTaskCustomRoleGroup(role) {
      const item = (role && typeof role === "object") ? role : null;
      if (!item) return null;
      const block = buildConversationTaskRoleGroup(item.name || "自定义责任位", item.members || [], {
        title: String(item.name || "自定义责任位").trim(),
      });
      if (!block) return null;
      const responsibilityText = String(item.responsibility || "").trim();
      if (responsibilityText) {
        block.appendChild(el("div", { class: "conv-task-role-group-note", text: responsibilityText }));
      }
      return block;
    }

    function buildConversationTaskResponsibilitySection(raw) {
      const model = conversationTaskResponsibilityModel(raw);
      if (!model.hasData) return null;
      const section = el("section", { class: "conv-task-detail-section" });
      section.appendChild(el("div", { class: "conv-task-detail-section-title", text: "责任位" }));
      const mainRow = el("div", { class: "conv-task-role-main" });
      mainRow.appendChild(
        model.main_owner
          ? buildConversationTaskRoleCard(model.main_owner, { label: "主负责位" })
          : buildConversationTaskRoleCard({ display_name: "主负责位待接入正式读模型" }, { label: "主负责位" })
      );
      if (model.management_slot.length) mainRow.appendChild(buildConversationTaskManagementOverviewNode(model));
      section.appendChild(mainRow);
      const groups = el("div", { class: "conv-task-role-groups" });
      [
        buildConversationTaskRoleGroup("协同位", model.collaborators),
        buildConversationTaskRoleGroup("验证位", model.validators),
        buildConversationTaskRoleGroup("质疑位", model.challengers),
        buildConversationTaskRoleGroup("备份位", model.backup_owners),
        buildConversationTaskRoleGroup("管理位", model.management_slot),
      ].filter(Boolean).forEach((node) => groups.appendChild(node));
      model.custom_roles.forEach((role) => {
        const node = buildConversationTaskCustomRoleGroup(role);
        if (node) groups.appendChild(node);
      });
      if (groups.childNodes.length) section.appendChild(groups);
      return section;
    }

    function buildConversationTaskMetaLine(parts = []) {
      const bits = (Array.isArray(parts) ? parts : []).map((part) => String(part || "").trim()).filter(Boolean);
      if (!bits.length) return null;
      return el("div", { class: "convtaskmeta", text: bits.join(" · ") });
    }

    function conversationTaskGroupLabel(groupTitle = "", relation = "") {
      const explicit = String(groupTitle || "").trim();
      if (explicit) return explicit;
      const key = String(relation || "").trim().toLowerCase();
      if (key === "current") return "当前任务";
      if (key === "created" || key === "tracking") return "相关任务";
      return "会话任务";
    }

    function conversationTaskRelationLabel(relation = "") {
      const key = String(relation || "").trim().toLowerCase();
      if (key === "created") return "本轮新建";
      if (key === "tracking") return "后续跟进";
      if (key === "current") return "当前任务";
      return "";
    }

    function conversationTaskActivityCountText(value) {
      const count = Math.max(0, Number(value || 0) || 0);
      if (!count) return "";
      return count > 99 ? "99+条动态" : (count + "条动态");
    }

    function buildConversationTaskActionSummaryMap(actions = []) {
      const map = Object.create(null);
      (Array.isArray(actions) ? actions : []).forEach((row) => {
        const key = conversationTaskStableKey(row);
        if (!key) return;
        if (!map[key]) map[key] = { count: 0, latest: null };
        map[key].count += 1;
        if (!map[key].latest) map[key].latest = row;
      });
      return map;
    }

    function mergeConversationTaskActivity(row, actionMap) {
      const item = (row && typeof row === "object") ? { ...row } : {};
      const key = conversationTaskStableKey(item);
      const summary = key && actionMap ? actionMap[key] : null;
      const latest = summary && summary.latest && typeof summary.latest === "object" ? summary.latest : null;
      if (latest) {
        if (String(latest.action_kind || "").trim()) item.latest_action_kind = String(latest.action_kind || "").trim();
        if (String(latest.action_text || "").trim()) item.latest_action_text = String(latest.action_text || "").trim();
        if (String(latest.at || "").trim()) item.latest_action_at = String(latest.at || "").trim();
        item.latest_action_source = String(firstNonEmptyText([
          latest.source_agent_name,
          latest.source_channel,
        ]) || "").trim();
      }
      const fallbackCount = (item.latest_action_kind || item.latest_action_text || item.latest_action_at) ? 1 : 0;
      item.activity_count = summary ? Math.max(summary.count, fallbackCount) : fallbackCount;
      item.relation_label = conversationTaskRelationLabel(item.relation);
      return item;
    }

    function cloneConversationTaskDetailFallback(row) {
      const item = (row && typeof row === "object") ? row : null;
      if (!item) return null;
      return {
        ...item,
        next_owner: item.next_owner && typeof item.next_owner === "object"
          ? { ...item.next_owner }
          : item.next_owner || null,
        main_owner: cloneConversationTaskRoleMember(item.main_owner),
        collaborators: Array.isArray(item.collaborators) ? item.collaborators.map(cloneConversationTaskRoleMember).filter(Boolean) : [],
        validators: Array.isArray(item.validators) ? item.validators.map(cloneConversationTaskRoleMember).filter(Boolean) : [],
        challengers: Array.isArray(item.challengers) ? item.challengers.map(cloneConversationTaskRoleMember).filter(Boolean) : [],
        backup_owners: Array.isArray(item.backup_owners) ? item.backup_owners.map(cloneConversationTaskRoleMember).filter(Boolean) : [],
        management_slot: Array.isArray(item.management_slot) ? item.management_slot.map(cloneConversationTaskRoleMember).filter(Boolean) : [],
        custom_roles: Array.isArray(item.custom_roles) ? item.custom_roles.map(cloneConversationTaskCustomRole).filter(Boolean) : [],
        task_summary_text: String(item.task_summary_text || "").trim(),
      };
    }

    function normalizeConversationTaskStableId(value) {
      return String(value || "").trim();
    }

    function conversationTaskStableId(row) {
      const item = (row && typeof row === "object") ? row : null;
      return normalizeConversationTaskStableId(firstNonEmptyText([
        item && item.task_id,
        item && item.taskId,
      ]) || "");
    }

    function conversationTaskStablePath(row) {
      const item = (row && typeof row === "object") ? row : null;
      return String(firstNonEmptyText([
        item && item.task_path,
        item && item.taskPath,
      ]) || "").trim();
    }

    function conversationTaskStableKey(row) {
      const taskId = conversationTaskStableId(row);
      if (taskId) return "task_id::" + taskId;
      const taskPath = conversationTaskStablePath(row);
      if (taskPath) return "task_path::" + taskPath;
      return "";
    }

    function ensureConversationTaskDetailViewerState() {
      const base = (PCONV.taskDetailViewer && typeof PCONV.taskDetailViewer === "object") ? PCONV.taskDetailViewer : {};
      const state = {
        open: !!base.open,
        sourceMode: String(base.sourceMode || "drawer").trim() === "standalone" ? "standalone" : "drawer",
        sessionKey: String(base.sessionKey || "").trim(),
        taskId: normalizeConversationTaskStableId(base.taskId || ""),
        taskPath: String(base.taskPath || "").trim(),
        groupTitle: String(base.groupTitle || "").trim(),
        showActionContext: !!base.showActionContext,
        fallbackRef: cloneConversationTaskDetailFallback(base.fallbackRef),
        payload: cloneConversationTaskDetailPayload(base.payload),
      };
      PCONV.taskDetailViewer = state;
      return state;
    }

    function ensureConversationTaskDrawerRenderState() {
      const base = (PCONV.taskDrawerRenderState && typeof PCONV.taskDrawerRenderState === "object")
        ? PCONV.taskDrawerRenderState
        : {};
      const state = {
        sessionKey: String(base.sessionKey || "").trim(),
        signature: String(base.signature || "").trim(),
      };
      PCONV.taskDrawerRenderState = state;
      return state;
    }

    function resetConversationTaskDrawerRenderState() {
      const state = ensureConversationTaskDrawerRenderState();
      state.sessionKey = "";
      state.signature = "";
      return state;
    }

    function ensureConversationTaskFilePreviewCache() {
      if (!PCONV.taskFilePreviewCache || typeof PCONV.taskFilePreviewCache !== "object") {
        PCONV.taskFilePreviewCache = Object.create(null);
      }
      return PCONV.taskFilePreviewCache;
    }

    function getConversationTaskFilePreviewEntry(taskPath) {
      const key = String(taskPath || "").trim();
      if (!key) return null;
      const cache = ensureConversationTaskFilePreviewCache();
      if (!cache[key] || typeof cache[key] !== "object") {
        cache[key] = {
          taskPath: key,
          loading: false,
          loaded: false,
          error: "",
          item: null,
          loadedAt: "",
        };
      }
      return cache[key];
    }

    function rerenderConversationTaskDetailViewerForPath(taskPath) {
      const viewer = ensureConversationTaskDetailViewerState();
      const key = String(taskPath || "").trim();
      if (!viewer.open || !key || viewer.taskPath !== key) return;
      renderConversationTaskDetailViewer(currentConversationTaskDetailViewerPayload(viewer));
    }

    function cloneConversationTaskDetailPayload(payload = null) {
      const src = (payload && typeof payload === "object") ? payload : null;
      if (!src) return null;
      const tracking = (src.taskTracking && typeof src.taskTracking === "object") ? src.taskTracking : null;
      return {
        taskTracking: tracking ? {
          ...tracking,
          current_task_ref: cloneConversationTaskDetailFallback(tracking.current_task_ref),
          conversation_task_refs: Array.isArray(tracking.conversation_task_refs)
            ? tracking.conversation_task_refs.map((row) => cloneConversationTaskDetailFallback(row)).filter(Boolean)
            : [],
          recent_task_actions: Array.isArray(tracking.recent_task_actions)
            ? tracking.recent_task_actions.map((row) => ((row && typeof row === "object") ? { ...row } : null)).filter(Boolean)
            : [],
        } : null,
        loading: !!src.loading,
        error: String(src.error || "").trim(),
      };
    }

    function requestConversationTaskFilePreview(taskPath, opts = {}) {
      const entry = getConversationTaskFilePreviewEntry(taskPath);
      if (!entry) return null;
      const force = !!opts.force;
      if (entry.loading) return entry;
      if (!force && (entry.loaded || entry.error)) return entry;
      entry.loading = true;
      entry.error = "";
      if (force) {
        entry.loaded = false;
        entry.item = null;
      }
      (async () => {
        try {
          const resp = await fetch("/api/fs/read?path=" + encodeURIComponent(entry.taskPath), {
            headers: authHeaders({}),
            credentials: "same-origin",
          });
          if (!resp.ok) {
            throw new Error(await parseResponseDetail(resp) || ("HTTP " + resp.status));
          }
          const data = await resp.json().catch(() => null);
          const item = (data && data.ok && data.item && typeof data.item === "object") ? data.item : null;
          if (!item) throw new Error("只读文件链路未返回可读取正文。");
          entry.item = {
            path: String(item.path || entry.taskPath).trim() || entry.taskPath,
            name: String(item.name || "").trim(),
            kind: String(item.kind || "").trim(),
            is_text: !!item.is_text,
            mime_type: String(item.mime_type || "").trim(),
            preview_mode: String(item.preview_mode || "").trim().toLowerCase(),
            truncated: !!item.truncated,
            content: String(item.content || ""),
          };
          entry.loaded = true;
          entry.loadedAt = new Date().toISOString();
        } catch (err) {
          entry.loaded = false;
          entry.item = null;
          entry.error = String((err && err.message) || err || "正文读取失败").trim() || "正文读取失败";
        } finally {
          entry.loading = false;
          rerenderConversationTaskDetailViewerForPath(entry.taskPath);
        }
      })();
      return entry;
    }

    function resetConversationTaskDetailViewer(opts = {}) {
      const viewer = ensureConversationTaskDetailViewerState();
      const clearSession = opts.clearSession !== false;
      viewer.open = false;
      viewer.sourceMode = "drawer";
      viewer.taskId = "";
      viewer.taskPath = "";
      viewer.groupTitle = "";
      viewer.showActionContext = false;
      viewer.fallbackRef = null;
      viewer.payload = null;
      if (clearSession) viewer.sessionKey = "";
      return viewer;
    }

    function removeConversationTaskDetailViewerMask() {
      const existing = document.getElementById("convTaskDetailViewerMask");
      if (existing) existing.remove();
    }

    function conversationTaskSelectionTitle(viewer) {
      const item = viewer && viewer.fallbackRef && typeof viewer.fallbackRef === "object"
        ? viewer.fallbackRef
        : null;
      return String(firstNonEmptyText([
        item && item.task_title,
        item && item.taskTitle,
      ]) || "").trim();
    }

    function conversationTaskMatchesViewerSelection(row, viewer) {
      const item = (row && typeof row === "object") ? row : null;
      if (!item) return false;
      const selectedTaskId = normalizeConversationTaskStableId((viewer && viewer.taskId) || "");
      const selectedPath = String((viewer && viewer.taskPath) || "").trim();
      const selectedTitle = conversationTaskSelectionTitle(viewer);
      const rowTaskId = conversationTaskStableId(item);
      const rowPath = conversationTaskStablePath(item);
      const rowTitle = String(firstNonEmptyText([item.task_title, item.taskTitle]) || "").trim();
      if (selectedTaskId && rowTaskId && rowTaskId === selectedTaskId) return true;
      if (selectedPath && rowPath && rowPath === selectedPath) return true;
      if (selectedTitle && rowTitle && rowTitle === selectedTitle) return true;
      return false;
    }

    function buildConversationTaskDetailLatestActionFromRef(item) {
      const ref = (item && typeof item === "object") ? item : null;
      if (!ref) return null;
      const actionKind = String(ref.latest_action_kind || "").trim();
      const actionText = String(ref.latest_action_text || "").trim();
      const actionAt = String(ref.latest_action_at || "").trim();
      if (!actionKind && !actionText && !actionAt) return null;
      return {
        task_id: conversationTaskStableId(ref),
        task_path: String(ref.task_path || "").trim(),
        task_title: String(ref.task_title || "").trim(),
        action_kind: actionKind,
        action_text: actionText,
        status: String(ref.task_primary_status || "").trim().toLowerCase(),
        source_channel: "",
        source_agent_name: "",
        at: actionAt,
      };
    }

    function buildConversationTaskDetailContextItems(actions, latestAction) {
      const rows = Array.isArray(actions) ? actions.slice() : [];
      const fallback = latestAction && typeof latestAction === "object" ? latestAction : null;
      if (!fallback) return rows;
      const fallbackKey = [
        conversationTaskStableKey(fallback),
        String(fallback.action_kind || "").trim(),
        String(fallback.action_text || "").trim(),
        String(fallback.at || "").trim(),
      ].join("::");
      const exists = rows.some((row) => [
        conversationTaskStableKey(row),
        String(row && row.action_kind || "").trim(),
        String(row && row.action_text || "").trim(),
        String(row && row.at || "").trim(),
      ].join("::") === fallbackKey);
      if (!exists) rows.unshift(fallback);
      return rows;
    }

    function resolveConversationTaskDetailView(view, viewerState = null) {
      const viewer = viewerState || ensureConversationTaskDetailViewerState();
      const payload = (view && typeof view === "object") ? view : {};
      const fallback = viewer.fallbackRef && typeof viewer.fallbackRef === "object"
        ? viewer.fallbackRef
        : null;
      const refs = [];
      if (payload.currentRef) refs.push({ ...payload.currentRef, __groupTitle: "当前任务" });
      (Array.isArray(payload.createdRows) ? payload.createdRows : []).forEach((row) => refs.push({ ...row, __groupTitle: "相关任务" }));
      (Array.isArray(payload.trackingRows) ? payload.trackingRows : []).forEach((row) => refs.push({ ...row, __groupTitle: "相关任务" }));
      const matchedRef = refs.find((row) => conversationTaskMatchesViewerSelection(row, viewer))
        || (fallback && (fallback.task_primary_status
          || fallback.next_owner
          || (conversationTaskResponsibilityModel(fallback).hasData)
          || fallback.latest_action_kind
          || fallback.latest_action_text)
          ? fallback
          : null);
      const matchedActions = (Array.isArray(payload.actions) ? payload.actions : [])
        .filter((row) => conversationTaskMatchesViewerSelection(row, viewer));
      const fallbackAction = (fallback && (fallback.action_kind || fallback.action_text || fallback.status || fallback.at))
        ? fallback
        : null;
      const latestAction = matchedActions[0]
        || fallbackAction
        || buildConversationTaskDetailLatestActionFromRef(matchedRef);
      const titleSource = matchedRef || latestAction || fallback || null;
      if (!titleSource) return null;
      const taskId = String(firstNonEmptyText([
        matchedRef && matchedRef.task_id,
        latestAction && latestAction.task_id,
        fallback && fallback.task_id,
      ]) || "").trim();
      const taskPath = String(firstNonEmptyText([
        matchedRef && matchedRef.task_path,
        latestAction && latestAction.task_path,
        fallback && fallback.task_path,
      ]) || "").trim();
      const relation = String(firstNonEmptyText([
        matchedRef && matchedRef.relation,
        fallback && fallback.relation,
      ]) || "").trim().toLowerCase();
      const groupTitle = conversationTaskGroupLabel(
        firstNonEmptyText([
          viewer.groupTitle,
          matchedRef && matchedRef.__groupTitle,
        ]) || "",
        relation
      );
      const relationLabel = conversationTaskRelationLabel(relation);
      const statusText = String(firstNonEmptyText([
        matchedRef && matchedRef.task_primary_status,
        latestAction && latestAction.status,
      ]) || "").trim();
      const latestActionLabel = conversationTaskActionLabel(firstNonEmptyText([
        latestAction && latestAction.action_kind,
        matchedRef && matchedRef.latest_action_kind,
      ]) || "");
      const latestActionText = String(firstNonEmptyText([
        latestAction && latestAction.action_text,
        matchedRef && matchedRef.latest_action_text,
      ]) || "").trim();
      const latestActionAt = String(firstNonEmptyText([
        latestAction && latestAction.at,
        matchedRef && matchedRef.latest_action_at,
      ]) || "").trim();
      const latestActionSource = String(firstNonEmptyText([
        latestAction && latestAction.source_agent_name,
        latestAction && latestAction.source_channel,
      ]) || "").trim();
      const sourceText = String(firstNonEmptyText([
        matchedRef && matchedRef.source,
        latestAction && latestAction.source_channel,
      ]) || "").trim();
      const owner = matchedRef && matchedRef.next_owner ? matchedRef.next_owner : null;
      const responsibilityModel = conversationTaskResponsibilityModel(matchedRef || fallback || null);
      const taskSummaryText = String(firstNonEmptyText([
        matchedRef && matchedRef.task_summary_text,
        fallback && fallback.task_summary_text,
      ]) || "").trim();
      const createdAt = String(firstNonEmptyText([
        matchedRef && matchedRef.created_at,
        fallback && fallback.created_at,
      ]) || "").trim();
      const dueAt = String(firstNonEmptyText([
        matchedRef && matchedRef.due,
        fallback && fallback.due,
      ]) || "").trim();
      const taskSummaryPlaceholder = "任务一句话说明待接入正式真源。";
      const whyParts = [];
      if (groupTitle) whyParts.push("当前在“" + groupTitle + "”中展示。");
      if (relationLabel && relationLabel !== groupTitle) whyParts.push("关联关系为“" + relationLabel + "”。");
      if (sourceText) whyParts.push("来源标记为 " + sourceText + "。");
      const contextItems = buildConversationTaskDetailContextItems(matchedActions, latestAction);
      return {
        title: conversationTaskTitleText(titleSource),
        taskId,
        taskPath,
        groupTitle,
        relationLabel,
        statusText,
        latestActionLabel,
        latestActionText: latestActionText || "最近暂无任务动作补充。",
        latestActionAt,
        latestActionSource,
        taskSummaryText,
        taskSummaryPlaceholder,
        createdAt,
        dueAt,
        sourceText,
        whyAppearsText: whyParts.join(" "),
        firstSeenAt: String(matchedRef && matchedRef.first_seen_at || "").trim(),
        lastSeenAt: String(matchedRef && matchedRef.last_seen_at || "").trim(),
        owner,
        responsibilityModel,
        latestAction,
        contextItems,
        hasActionContext: contextItems.length > 0,
      };
    }

    function renderConversationTaskDetailInfoRow(label, value, opts = {}) {
      const text = String(value || "").trim();
      if (!text) return null;
      const row = el("div", { class: "conv-task-detail-info-row" + (opts.stack ? " is-stack" : "") });
      row.appendChild(el("div", { class: "conv-task-detail-info-label", text: String(label || "").trim() || "-" }));
      row.appendChild(el("div", { class: "conv-task-detail-info-value" + (opts.mono ? " is-mono" : ""), text }));
      return row;
    }

    function buildConversationTaskDetailReadingBody(entry) {
      const state = (entry && typeof entry === "object") ? entry : {};
      const item = (state.item && typeof state.item === "object") ? state.item : null;
      const body = el("div", { class: "conv-task-detail-reading-body" });
      if (!item || !String(item.content || "")) {
        body.appendChild(el("div", {
          class: "conv-task-detail-reading-empty",
          text: "只读链路尚未返回可显示的正文内容。",
        }));
        return body;
      }
      if (!item.is_text) {
        body.appendChild(el("div", {
          class: "conv-task-detail-reading-empty",
          text: "当前任务文件不是文本类型，页内不做二次解析，请直接打开原任务文件阅读。",
        }));
        return body;
      }
      const mode = String(item.preview_mode || "").trim().toLowerCase();
      if (mode === "markdown" && typeof markdownToHtml === "function") {
        body.classList.add("is-markdown");
        body.innerHTML = markdownToHtml(String(item.content || ""));
        return body;
      }
      body.classList.add("is-plain");
      const pre = el("pre", {
        class: "conv-task-detail-reading-pre",
        text: String(item.content || ""),
      });
      body.appendChild(pre);
      return body;
    }

    function buildConversationTaskDetailReadingSection(detail) {
      const taskPath = String(detail && detail.taskPath || "").trim();
      const section = el("section", { class: "conv-task-detail-section conv-task-detail-reading" });
      const titleRow = el("div", { class: "conv-task-detail-reading-head" });
      titleRow.appendChild(el("div", { class: "conv-task-detail-section-title", text: "完整任务正文" }));
      if (taskPath) titleRow.appendChild(chip("只读接线", "muted"));
      section.appendChild(titleRow);
      if (!taskPath) {
        section.appendChild(el("div", {
          class: "conv-task-detail-reading-empty",
          text: "当前任务缺少 task_path，暂时无法接入正文阅读层。",
        }));
        return section;
      }

      const entry = requestConversationTaskFilePreview(taskPath);
      const item = (entry && entry.item && typeof entry.item === "object") ? entry.item : null;
      const meta = buildConversationTaskMetaLine([
        taskPath,
        item && item.preview_mode ? ("预览 " + item.preview_mode) : "",
        item && item.truncated ? "当前预览已截断" : "",
      ]);
      if (meta) meta.classList.add("conv-task-detail-reading-meta");
      if (meta) section.appendChild(meta);

      if (entry && entry.loading) {
        section.appendChild(el("div", {
          class: "conv-task-detail-reading-loading",
          text: "正在通过 /api/fs/read 读取任务正文…",
        }));
      } else if (entry && entry.error) {
        section.appendChild(el("div", {
          class: "conv-task-detail-reading-error",
          text: "正文读取失败：" + entry.error,
        }));
      } else {
        section.appendChild(buildConversationTaskDetailReadingBody(entry));
      }

      const noteText = item && item.truncated
        ? "当前只读预览已截断；若要继续深读，请使用底部“查看原任务文件”。"
        : "当前正文按只读文件链路接入，不在页面侧生成第二套正文真源。";
      section.appendChild(el("div", {
        class: "conv-task-detail-reading-note",
        text: noteText,
      }));
      return section;
    }

    function closeConversationTaskDetailViewer() {
      resetConversationTaskDetailViewer();
      renderConversationTaskDetailViewer();
    }

    function toggleConversationTaskDetailActionContext() {
      const viewer = ensureConversationTaskDetailViewerState();
      if (!viewer.open) return;
      viewer.showActionContext = !viewer.showActionContext;
      renderConversationTaskDetailViewer(currentConversationTaskDetailViewerPayload(viewer));
    }

    function openConversationTaskDetailViewer(row, opts = {}) {
      const viewer = ensureConversationTaskDetailViewerState();
      const item = (row && typeof row === "object") ? row : null;
      viewer.open = true;
      viewer.sourceMode = "drawer";
      viewer.sessionKey = String(firstNonEmptyText([
        opts.sessionKey,
        PCONV.taskDrawerSessionKey,
        currentConvComposerDraftKey(),
      ]) || "").trim();
      viewer.taskId = conversationTaskStableId(item);
      viewer.taskPath = String(item && item.task_path || "").trim();
      viewer.groupTitle = conversationTaskGroupLabel(opts.groupTitle || "", item && item.relation);
      viewer.showActionContext = false;
      viewer.fallbackRef = cloneConversationTaskDetailFallback(item);
      viewer.payload = null;
      renderConversationTaskDetailViewer(currentConversationTaskPayload());
    }

    function openConversationTaskDetailViewerStandalone(row, payload = null, opts = {}) {
      const viewer = ensureConversationTaskDetailViewerState();
      const item = (row && typeof row === "object") ? row : null;
      viewer.open = true;
      viewer.sourceMode = "standalone";
      viewer.sessionKey = String(firstNonEmptyText([
        opts.sessionKey,
        "task-standalone-viewer",
      ]) || "").trim();
      viewer.taskId = conversationTaskStableId(item);
      viewer.taskPath = String(item && item.task_path || "").trim();
      viewer.groupTitle = conversationTaskGroupLabel(opts.groupTitle || "", item && item.relation);
      viewer.showActionContext = false;
      viewer.fallbackRef = cloneConversationTaskDetailFallback(item);
      viewer.payload = cloneConversationTaskDetailPayload(payload);
      renderConversationTaskDetailViewer(viewer.payload);
    }

    function bindConversationTaskCardOpenDetail(node, row, opts = {}) {
      if (!node || typeof opts.onOpenDetail !== "function") return;
      node.classList.add("is-clickable");
      node.tabIndex = 0;
      node.setAttribute("role", "button");
      node.addEventListener("click", () => opts.onOpenDetail(row, opts));
      node.addEventListener("keydown", (e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        opts.onOpenDetail(row, opts);
      });
    }

    function buildConversationTaskRefCard(row, opts = {}) {
      const item = (row && typeof row === "object") ? row : {};
      const compact = !!opts.compact;
      const statusMeta = taskDisplayStatusMeta(item.task_primary_status || item, "待办");
      const card = el("div", { class: "convtaskcard status-" + statusMeta.key + (compact ? " compact" : "") });
      const titleRow = el("div", { class: "convtaskcard-title-row" });
      titleRow.appendChild(buildTaskTypeBadge(item));
      titleRow.appendChild(el("div", {
        class: "convtaskcard-title",
        text: conversationTaskTitleText(item),
        title: String(item.task_title || item.task_path || "").trim(),
      }));
      titleRow.appendChild(buildTaskStatusChip(item.task_primary_status || item, "待办"));
      card.appendChild(titleRow);

      const activity = el("div", { class: "convtaskcard-activity" });
      activity.appendChild(el("div", { class: "convtaskcard-activity-label", text: "最近进展" }));
      activity.appendChild(el("div", {
        class: "convtaskcard-activity-text",
        text: taskSummaryText(item, "最近暂无补充说明。"),
      }));
      const actionAt = compactDateTime(item.latest_action_at) || shortDateTime(item.latest_action_at);
      const activityMeta = buildConversationTaskMetaLine([
        actionAt ? ("更新 " + actionAt) : "",
        firstNonEmptyText([
          item.latest_action_source,
          item.source,
        ]) ? ("来源 " + firstNonEmptyText([
          item.latest_action_source,
          item.source,
        ])) : "",
      ]);
      if (activityMeta) {
        activityMeta.classList.add("convtaskcard-activity-meta");
        activity.appendChild(activityMeta);
      }
      card.appendChild(activity);
      const agentCluster = buildConversationTaskCoreAgentCluster(item, { compact });
      if (agentCluster) card.appendChild(agentCluster);
      bindConversationTaskCardOpenDetail(card, item, opts);
      return card;
    }

    function buildConversationTaskActionCard(row, opts = {}) {
      const item = (row && typeof row === "object") ? row : {};
      const card = el("div", { class: "convtaskaction" });
      const titleRow = el("div", { class: "convtaskaction-title-row" });
      titleRow.appendChild(buildTaskTypeBadge(item));
      titleRow.appendChild(el("div", {
        class: "convtaskaction-title",
        text: conversationTaskTitleText(item),
        title: String(item.task_title || item.task_path || "").trim(),
      }));
      if (item.action_kind) titleRow.appendChild(chip(conversationTaskActionLabel(item.action_kind), conversationTaskActionTone(item.action_kind, item.status)));
      if (item.status && item.status !== "done" && item.status !== "pending") {
        titleRow.appendChild(chip(String(item.status || ""), conversationTaskActionTone(item.action_kind, item.status)));
      }
      card.appendChild(titleRow);
      card.appendChild(el("div", {
        class: "convtaskaction-text",
        text: String(item.action_text || "").trim() || "最近暂无补充说明。",
      }));
      const meta = buildConversationTaskMetaLine([
        firstNonEmptyText([item.source_agent_name, item.source_channel]),
        compactDateTime(item.at) || shortDateTime(item.at),
      ]);
      if (meta) card.appendChild(meta);
      if (item.task_path) card.appendChild(el("div", { class: "convtaskpath", text: item.task_path, title: item.task_path }));
      bindConversationTaskCardOpenDetail(card, item, opts);
      return card;
    }

    function renderConversationTaskGroup(title, rows, builder, opts = {}) {
      const list = Array.isArray(rows) ? rows : [];
      const limit = Math.max(1, Number(opts.limit || list.length || 1));
      const visible = list.slice(0, limit);
      const block = el("section", { class: "convtaskgroup" + (opts.compact ? " is-compact" : "") });
      const head = el("div", { class: "convtaskgroup-head" });
      head.appendChild(el("div", { class: "convtaskgroup-title", text: String(title || "").trim() }));
      head.appendChild(el("div", {
        class: "convtaskgroup-count",
        text: list.length ? ("共 " + list.length + " 项") : "当前为空",
      }));
      block.appendChild(head);
      if (!visible.length) {
        block.appendChild(el("div", {
          class: opts.error ? "convtaskerror" : (opts.loading ? "convtaskloading" : "convtaskempty"),
          text: String(opts.emptyText || "").trim() || "当前没有可展示内容。",
        }));
        return block;
      }
      const listNode = el("div", { class: "convtaskgroup-list" + (opts.singleColumn ? " single-column" : "") });
      visible.forEach((row) => {
        const node = builder(row);
        if (node) listNode.appendChild(node);
      });
      block.appendChild(listNode);
      if (list.length > visible.length) {
        block.appendChild(el("div", {
          class: "convtaskoverflow",
          text: "其余 " + (list.length - visible.length) + " 项已收起。",
        }));
      }
      return block;
    }

    function resolveConversationTaskTrackingPayload(payload = {}) {
      const src = (payload && typeof payload === "object") ? payload : {};
      const tracking = normalizeTaskTrackingClient(src.taskTracking || null);
      const loading = !!src.loading;
      const errorText = String(src.error || "").trim();
      const currentRef = tracking && tracking.current_task_ref ? tracking.current_task_ref : null;
      const refs = tracking && Array.isArray(tracking.conversation_task_refs) ? tracking.conversation_task_refs : [];
      const actions = tracking && Array.isArray(tracking.recent_task_actions) ? tracking.recent_task_actions : [];
      const currentKey = conversationTaskStableKey(currentRef);
      const actionMap = buildConversationTaskActionSummaryMap(actions);
      const createdRows = refs.filter((row) => {
        const relation = String(row && row.relation || "").trim().toLowerCase();
        return relation === "created" && conversationTaskStableKey(row) !== currentKey;
      }).map((row) => mergeConversationTaskActivity(row, actionMap));
      const trackingRows = refs.filter((row) => {
        const relation = String((row && row.relation) || "").trim().toLowerCase();
        return relation !== "created" && relation !== "current" && conversationTaskStableKey(row) !== currentKey;
      }).map((row) => mergeConversationTaskActivity(row, actionMap));
      const relatedRows = createdRows.concat(trackingRows);
      return {
        ctx: src.ctx || null,
        tracking,
        loading,
        errorText,
        currentRef: currentRef ? mergeConversationTaskActivity(currentRef, actionMap) : null,
        createdRows,
        trackingRows,
        relatedRows,
        actions,
      };
    }

    function buildConversationTaskSummaryCard(data, opts = {}) {
      const view = (data && typeof data === "object") ? data : {};
      const loading = !!view.loading;
      const errorText = String(view.errorText || "").trim();
      const currentRef = view.currentRef || null;
      return renderConversationTaskGroup(
        "当前任务",
        currentRef ? [currentRef] : [],
        (row) => buildConversationTaskRefCard(row, {
          onOpenDetail: typeof opts.onOpenDetail === "function"
            ? ((item) => opts.onOpenDetail(item, { groupTitle: "当前任务" }))
            : null,
        }),
        {
          limit: 1,
          singleColumn: true,
          emptyText: errorText || (loading
            ? "正在读取会话 task_tracking 真源。"
            : "本轮对话暂未汇总出 current_task_ref。"),
          loading: loading && !currentRef,
          error: !!errorText && !currentRef,
        }
      );
    }


    function currentConversationTaskPayload() {
      const ctx = currentConversationCtx();
      const sessionId = String((ctx && ctx.sessionId) || "").trim();
      const currentSession = sessionId ? findConversationSessionById(sessionId) : null;
      return {
        ctx,
        taskTracking: currentSession && currentSession.task_tracking,
        loading: sessionId
          ? (typeof isConversationSessionDetailLoading === "function"
            ? isConversationSessionDetailLoading(sessionId)
            : false)
          : false,
        error: sessionId && typeof getConversationSessionDetailError === "function"
          ? getConversationSessionDetailError(sessionId)
          : "",
      };
    }

    function normalizeConversationTaskIdentityText(value) {
      return String(value || "").trim().toLowerCase();
    }

    function appendConversationTaskIdentityKey(set, prefix, value) {
      if (!(set instanceof Set)) return false;
      const text = normalizeConversationTaskIdentityText(value);
      if (!text) return false;
      set.add(prefix + ":" + text);
      return true;
    }

    function collectConversationTaskAgentIdentityKeys(raw) {
      const item = (raw && typeof raw === "object") ? raw : {};
      const keys = new Set();
      appendConversationTaskIdentityKey(keys, "sid", firstNonEmptyText([
        item.session_id,
        item.sessionId,
      ], ""));
      appendConversationTaskIdentityKey(keys, "aid", firstNonEmptyText([
        item.agent_id,
        item.agentId,
      ], ""));
      const nameCount = [
        item.display_name,
        item.displayName,
        item.agent_alias,
        item.alias,
        item.agent_name,
        item.agentName,
        item.name,
        item.label,
      ].reduce((count, value) => count + (appendConversationTaskIdentityKey(keys, "name", value) ? 1 : 0), 0);
      if (!nameCount) {
        appendConversationTaskIdentityKey(keys, "channel", firstNonEmptyText([
          item.channel_name,
          item.channelName,
          item.primaryChannel,
          item.displayChannel,
        ], ""));
      }
      return keys;
    }

    function currentConversationTaskAgentIdentityKeys(ctx) {
      const keys = collectConversationTaskAgentIdentityKeys(ctx);
      const sessionId = String((ctx && ctx.sessionId) || "").trim();
      const session = sessionId ? findConversationSessionById(sessionId) : null;
      if (session && typeof session === "object") {
        collectConversationTaskAgentIdentityKeys(session).forEach((key) => keys.add(key));
      }
      return keys;
    }

    function conversationTaskMainOwnerIdentityKeys(row) {
      const item = (row && typeof row === "object") ? row : {};
      const owner = (item.main_owner && typeof item.main_owner === "object")
        ? item.main_owner
        : ((item.next_owner && typeof item.next_owner === "object") ? item.next_owner : null);
      return collectConversationTaskAgentIdentityKeys(owner);
    }

    function conversationTaskKeyForCount(row) {
      return conversationTaskStableKey(row)
        || String(firstNonEmptyText([
          row && row.task_path,
          row && row.task_title,
          row && row.task_id,
          row && row.id,
        ], "") || "").trim();
    }

    function countConversationMainOwnerTasks(ctx, payload = {}) {
      const actorKeys = currentConversationTaskAgentIdentityKeys(ctx);
      const counts = { todo: 0, in_progress: 0 };
      if (!actorKeys.size) return counts;
      const view = resolveConversationTaskTrackingPayload(payload);
      const seen = new Set();
      const rows = [];
      if (view.currentRef) rows.push(view.currentRef);
      if (Array.isArray(view.createdRows)) rows.push(...view.createdRows);
      if (Array.isArray(view.trackingRows)) rows.push(...view.trackingRows);
      rows.forEach((row) => {
        const rowKey = conversationTaskKeyForCount(row);
        if (rowKey && seen.has(rowKey)) return;
        if (rowKey) seen.add(rowKey);
        const ownerKeys = conversationTaskMainOwnerIdentityKeys(row);
        if (!ownerKeys.size) return;
        let matched = false;
        ownerKeys.forEach((key) => {
          if (matched) return;
          if (actorKeys.has(key)) matched = true;
        });
        if (!matched) return;
        const statusKey = taskDisplayStatusMeta((row && row.task_primary_status) || row, "待办").key;
        if (statusKey === "todo") counts.todo += 1;
        if (statusKey === "in_progress") counts.in_progress += 1;
      });
      return counts;
    }

    function conversationTaskDrawerStatusRank(row) {
      const statusKey = taskDisplayStatusMeta((row && row.task_primary_status) || row, "待办").key;
      if (statusKey === "in_progress") return 0;
      if (statusKey === "todo") return 1;
      if (statusKey === "review") return 2;
      if (statusKey === "done") return 3;
      if (statusKey === "paused") return 4;
      return 9;
    }

    function conversationTaskRowMatchesCurrentMainOwner(ctx, row) {
      const actorKeys = currentConversationTaskAgentIdentityKeys(ctx);
      if (!actorKeys.size) return false;
      const ownerKeys = conversationTaskMainOwnerIdentityKeys(row);
      if (!ownerKeys.size) return false;
      let matched = false;
      ownerKeys.forEach((key) => {
        if (matched) return;
        if (actorKeys.has(key)) matched = true;
      });
      return matched;
    }

    function sortConversationTaskDrawerRelatedRows(ctx, rows) {
      const list = Array.isArray(rows) ? rows.slice() : [];
      list.sort((a, b) => {
        const aRank = conversationTaskDrawerStatusRank(a);
        const bRank = conversationTaskDrawerStatusRank(b);
        if (aRank !== bRank) return aRank - bRank;
        const aOwner = conversationTaskRowMatchesCurrentMainOwner(ctx, a) ? 0 : 1;
        const bOwner = conversationTaskRowMatchesCurrentMainOwner(ctx, b) ? 0 : 1;
        if (aOwner !== bOwner) return aOwner - bOwner;
        const aTime = toTimeNum(firstNonEmptyText([
          a && a.latest_action_at,
          a && a.last_seen_at,
          a && a.created_at,
        ], ""));
        const bTime = toTimeNum(firstNonEmptyText([
          b && b.latest_action_at,
          b && b.last_seen_at,
          b && b.created_at,
        ], ""));
        if (aTime !== bTime) return bTime - aTime;
        return conversationTaskTitleText(a).localeCompare(conversationTaskTitleText(b), "zh-CN");
      });
      return list;
    }

    function filterConversationTaskDrawerRelatedRows(ctx, rows) {
      const list = Array.isArray(rows) ? rows : [];
      return list.filter((row) => conversationTaskRowMatchesCurrentMainOwner(ctx, row));
    }

    function applyConversationTaskEntryCounts(btn, counts = {}) {
      const todo = Math.max(0, Number(counts.todo || 0) || 0);
      const inProgress = Math.max(0, Number(counts.in_progress || 0) || 0);
      const todoNode = btn ? btn.querySelector("#detailTaskTrackingTodo") : null;
      const progressNode = btn ? btn.querySelector("#detailTaskTrackingProgress") : null;
      if (todoNode) todoNode.textContent = String(todo);
      if (progressNode) progressNode.textContent = String(inProgress);
      if (btn) {
        const title = `查看当前会话任务（主负责 待开始 ${todo} / 进行中 ${inProgress}）`;
        btn.title = title;
        btn.setAttribute("aria-label", title);
      }
    }

    function currentConversationTaskDetailViewerPayload(viewerState = null) {
      const viewer = viewerState || ensureConversationTaskDetailViewerState();
      if (viewer.sourceMode === "standalone") return cloneConversationTaskDetailPayload(viewer.payload) || {};
      return currentConversationTaskPayload();
    }

    function buildConversationTaskDrawerRenderSignature(view, sessionKey = "") {
      const currentView = (view && typeof view === "object") ? view : {};
      const tracking = currentView.tracking && typeof currentView.tracking === "object"
        ? currentView.tracking
        : null;
      const displayLoading = !tracking && !!currentView.loading;
      const displayError = !tracking ? String(currentView.errorText || "").trim() : "";
      return JSON.stringify({
        sessionKey: String(sessionKey || "").trim(),
        loading: displayLoading,
        errorText: displayError,
        tracking: tracking ? {
          version: String(tracking.version || "").trim(),
          updated_at: String(tracking.updated_at || "").trim(),
          current_task_ref: tracking.current_task_ref || null,
          conversation_task_refs: Array.isArray(tracking.conversation_task_refs) ? tracking.conversation_task_refs : [],
          recent_task_actions: Array.isArray(tracking.recent_task_actions) ? tracking.recent_task_actions : [],
        } : null,
      });
    }

    function renderConversationTaskDetailViewer(payload = null) {
      const viewer = ensureConversationTaskDetailViewerState();
      const standalone = viewer.sourceMode === "standalone";
      const currentKey = standalone
        ? String(viewer.sessionKey || "").trim()
        : String(firstNonEmptyText([
          PCONV.taskDrawerSessionKey,
          currentConvComposerDraftKey(),
        ]) || "").trim();
      if ((!standalone && !PCONV.taskDrawerOpen) || !viewer.open || !currentKey || viewer.sessionKey !== currentKey) {
        removeConversationTaskDetailViewerMask();
        if ((!standalone && !PCONV.taskDrawerOpen) || !currentKey || viewer.sessionKey !== currentKey) {
          resetConversationTaskDetailViewer();
        }
        return;
      }
      const activePayload = payload || currentConversationTaskDetailViewerPayload(viewer);
      const detail = resolveConversationTaskDetailView(
        resolveConversationTaskTrackingPayload(activePayload),
        viewer
      );
      if (!detail) {
        removeConversationTaskDetailViewerMask();
        return;
      }
      const mask = el("div", {
        id: "convTaskDetailViewerMask",
        class: "bmask conv-task-detail-mask show",
      });
      mask.addEventListener("click", (e) => {
        if (e.target === mask) closeConversationTaskDetailViewer();
      });
      const dialog = el("div", { class: "bmodal conv-task-detail-modal" });
      const head = el("div", { class: "bmodalh conv-task-detail-head" });
      head.appendChild(el("div", { class: "t", text: "任务详情 · " + detail.title }));
      head.appendChild(el("div", {
        class: "s",
        text: detail.groupTitle
          ? ("当前位于“" + detail.groupTitle + "”，保持只读轻下钻。")
          : "当前任务详情仅提供只读轻下钻。",
      }));
      dialog.appendChild(head);

      const body = el("div", { class: "bmodalb conv-task-detail-body" });
      const hero = el("section", { class: "conv-task-detail-hero" });
      const titleRow = el("div", { class: "conv-task-detail-title-row" });
      titleRow.appendChild(el("div", {
        class: "conv-task-detail-title",
        text: detail.title,
        title: detail.taskPath || detail.title,
      }));
      if (detail.statusText) titleRow.appendChild(chip(detail.statusText, conversationTaskStatusTone(detail.statusText)));
      if (detail.latestActionLabel) {
        titleRow.appendChild(chip(
          detail.latestActionLabel,
          conversationTaskActionTone(detail.latestAction && detail.latestAction.action_kind, detail.latestAction && detail.latestAction.status)
        ));
      }
      if (detail.groupTitle) titleRow.appendChild(chip(detail.groupTitle, "muted"));
      hero.appendChild(titleRow);
      const summaryBlock = el("div", { class: "conv-task-detail-summary-block" });
      summaryBlock.appendChild(el("div", { class: "conv-task-detail-summary-label", text: "任务一句话说明" }));
      summaryBlock.appendChild(el("div", {
        class: "conv-task-detail-summary-text" + (!detail.taskSummaryText ? " is-placeholder" : ""),
        text: detail.taskSummaryText || detail.taskSummaryPlaceholder,
      }));
      hero.appendChild(summaryBlock);
      const snapshot = el("div", { class: "conv-task-detail-snapshot" });
      const ownerCard = el("div", { class: "conv-task-detail-panel" });
      if (detail.responsibilityModel && detail.responsibilityModel.hasData) {
        ownerCard.appendChild(
          detail.responsibilityModel.main_owner
            ? buildConversationTaskRoleCard(detail.responsibilityModel.main_owner, { label: "主负责位" })
            : buildConversationTaskRoleCard({ display_name: "主负责位待接入正式读模型" }, { label: "主负责位" })
        );
      } else {
        ownerCard.appendChild(buildConversationTaskOwnerNode(detail.owner || null));
      }
      snapshot.appendChild(ownerCard);
      const actionCard = el("div", { class: "conv-task-detail-panel conv-task-detail-panel-action" });
      actionCard.appendChild(el("div", { class: "conv-task-detail-panel-label", text: "最近动作摘要" }));
      actionCard.appendChild(el("div", { class: "conv-task-detail-action-text", text: detail.latestActionText }));
      const actionMeta = buildConversationTaskMetaLine([
        detail.latestActionAt ? ("时间 " + (compactDateTime(detail.latestActionAt) || shortDateTime(detail.latestActionAt))) : "",
        detail.latestActionSource ? ("来源 " + detail.latestActionSource) : "",
      ]);
      if (actionMeta) actionCard.appendChild(actionMeta);
      snapshot.appendChild(actionCard);
      hero.appendChild(snapshot);
      body.appendChild(hero);

      const sourceBlock = el("section", { class: "conv-task-detail-section" });
      sourceBlock.appendChild(el("div", { class: "conv-task-detail-section-title", text: "来源说明" }));
      if (detail.whyAppearsText) {
        sourceBlock.appendChild(el("div", { class: "conv-task-detail-why", text: detail.whyAppearsText }));
      }
      const infoRows = [
        renderConversationTaskDetailInfoRow("所在分组", detail.groupTitle),
        renderConversationTaskDetailInfoRow("关联关系", detail.relationLabel),
        renderConversationTaskDetailInfoRow("来源标记", detail.sourceText),
        renderConversationTaskDetailInfoRow(
          "创建时间",
          compactDateTime(detail.createdAt) || shortDateTime(detail.createdAt) || detail.createdAt
        ),
        renderConversationTaskDetailInfoRow("截止时间", compactDateTime(detail.dueAt) || shortDateTime(detail.dueAt) || detail.dueAt),
        renderConversationTaskDetailInfoRow("首次纳入", compactDateTime(detail.firstSeenAt) || shortDateTime(detail.firstSeenAt)),
        renderConversationTaskDetailInfoRow("最近观察", compactDateTime(detail.lastSeenAt) || shortDateTime(detail.lastSeenAt)),
        renderConversationTaskDetailInfoRow("任务路径", detail.taskPath, { mono: true, stack: true }),
      ].filter(Boolean);
      if (infoRows.length) {
        const info = el("div", { class: "conv-task-detail-info" });
        infoRows.forEach((row) => info.appendChild(row));
        sourceBlock.appendChild(info);
      }
      body.appendChild(sourceBlock);

      const responsibilitySection = buildConversationTaskResponsibilitySection(detail.responsibilityModel || null);
      if (responsibilitySection) body.appendChild(responsibilitySection);

      if (viewer.showActionContext) {
        const contextBlock = el("section", { class: "conv-task-detail-section" });
        contextBlock.appendChild(el("div", { class: "conv-task-detail-section-title", text: "最近动作上下文" }));
        if (!detail.contextItems.length) {
          contextBlock.appendChild(el("div", { class: "convtaskempty", text: "当前没有可展示的动作上下文。" }));
        } else {
          const list = el("div", { class: "conv-task-detail-context-list" });
          detail.contextItems.slice(0, 5).forEach((row) => {
            const item = el("div", { class: "conv-task-detail-context-item" });
            const itemHead = el("div", { class: "conv-task-detail-context-head" });
            if (row.action_kind) itemHead.appendChild(chip(conversationTaskActionLabel(row.action_kind), conversationTaskActionTone(row.action_kind, row.status)));
            const whenText = compactDateTime(row.at) || shortDateTime(row.at);
            if (whenText) itemHead.appendChild(el("div", { class: "conv-task-detail-context-time", text: whenText }));
            item.appendChild(itemHead);
            item.appendChild(el("div", {
              class: "conv-task-detail-context-text",
              text: String(row.action_text || "").trim() || "最近暂无补充说明。",
            }));
            const rowMeta = buildConversationTaskMetaLine([
              firstNonEmptyText([row.source_agent_name, row.source_channel]),
              row.callback_run_id ? ("回执 " + row.callback_run_id) : "",
            ]);
            if (rowMeta) item.appendChild(rowMeta);
            list.appendChild(item);
          });
          contextBlock.appendChild(list);
        }
        body.appendChild(contextBlock);
      }

      body.appendChild(buildConversationTaskDetailReadingSection(detail));
      dialog.appendChild(body);

      const foot = el("div", { class: "bmodalf conv-task-detail-foot" });
      const openBtn = el("button", {
        class: "btn primary",
        type: "button",
        text: "查看原任务文件",
      });
      openBtn.disabled = !detail.taskPath;
      openBtn.addEventListener("click", () => {
        if (!detail.taskPath) return;
        openNew(String(location.origin || "") + "/api/fs/open?path=" + encodeURIComponent(detail.taskPath));
      });
      foot.appendChild(openBtn);
      const contextBtn = el("button", {
        class: "btn",
        type: "button",
        text: viewer.showActionContext ? "收起最近动作上下文" : "查看最近动作上下文",
      });
      contextBtn.disabled = !detail.hasActionContext;
      contextBtn.addEventListener("click", toggleConversationTaskDetailActionContext);
      foot.appendChild(contextBtn);
      const closeBtn = el("button", { class: "btn", type: "button", text: "关闭" });
      closeBtn.addEventListener("click", closeConversationTaskDetailViewer);
      foot.appendChild(closeBtn);
      dialog.appendChild(foot);
      mask.appendChild(dialog);

      const existing = document.getElementById("convTaskDetailViewerMask");
      if (existing) existing.replaceWith(mask);
      else document.body.appendChild(mask);
    }

    function renderConversationTaskDrawer(payload = {}) {
      const mask = document.getElementById("convTaskDrawerMask");
      const list = document.getElementById("convTaskDrawerList");
      const sub = document.getElementById("convTaskDrawerSub");
      const hint = document.getElementById("convTaskHint");
      if (!mask || !list || !sub || !hint) return;
      if (!PCONV.taskDrawerOpen) {
        resetConversationTaskDrawerRenderState();
        mask.classList.remove("show");
        renderConversationTaskDetailViewer();
        return;
      }
      const sessionKey = String(PCONV.taskDrawerSessionKey || "").trim();
      const view = resolveConversationTaskTrackingPayload(payload);
      const renderState = ensureConversationTaskDrawerRenderState();
      const tracking = view.tracking;
      const loading = view.loading;
      const errorText = view.errorText;
      const displayLoading = !tracking && loading;
      const displayErrorText = !tracking ? errorText : "";
      const renderView = {
        ...view,
        loading: displayLoading,
        errorText: displayErrorText,
      };
      const renderSignature = buildConversationTaskDrawerRenderSignature(renderView, sessionKey);
      const relatedRows = sortConversationTaskDrawerRelatedRows(
        renderView.ctx,
        filterConversationTaskDrawerRelatedRows(renderView.ctx, renderView.relatedRows)
      );
      sub.textContent = tracking && tracking.updated_at
        ? ("更新于 " + (compactDateTime(tracking.updated_at) || shortDateTime(tracking.updated_at)))
        : (displayLoading ? "同步中…" : "当前会话暂无任务跟踪");
      hint.textContent = displayErrorText
        ? ("任务跟踪读取失败：" + displayErrorText)
        : "这里会展示当前任务、相关任务，以及每条任务最近的一次活动。";
      if (
        renderState.sessionKey === sessionKey
        && renderState.signature === renderSignature
        && list.childElementCount > 0
      ) {
        mask.classList.add("show");
        return;
      }
      const prevScrollTop = Number(list.scrollTop || 0);
      list.innerHTML = "";
      const stack = el("div", { class: "conv-task-drawer-stack" });
      stack.appendChild(buildConversationTaskSummaryCard(renderView, {
        onOpenDetail: (row, opts = {}) => openConversationTaskDetailViewer(row, {
          sessionKey: PCONV.taskDrawerSessionKey,
          groupTitle: opts.groupTitle || "当前任务",
        }),
      }));
      const groups = el("div", { class: "convtaskgroups" });
      groups.appendChild(renderConversationTaskGroup(
        "相关任务",
        relatedRows,
        (row) => buildConversationTaskRefCard(row, {
          onOpenDetail: (item) => openConversationTaskDetailViewer(item, {
            sessionKey: PCONV.taskDrawerSessionKey,
            groupTitle: "相关任务",
          }),
        }),
        {
          limit: 4,
          emptyText: displayLoading && !relatedRows.length ? "相关任务同步中…" : "当前没有其他由你主负责的任务。",
          loading: displayLoading && !relatedRows.length,
        }
      ));
      stack.appendChild(groups);
      list.appendChild(stack);
      if (prevScrollTop > 0) {
        requestAnimationFrame(() => {
          const currentList = document.getElementById("convTaskDrawerList");
          if (!currentList) return;
          currentList.scrollTop = prevScrollTop;
        });
      }
      renderState.sessionKey = sessionKey;
      renderState.signature = renderSignature;
      mask.classList.add("show");
      renderConversationTaskDetailViewer(payload);
    }

    function hideConversationTaskEntry() {
      const btn = document.getElementById("detailTaskTrackingBtn");
      if (btn) {
        btn.style.display = "none";
        btn.onclick = null;
        btn.classList.remove("active");
        applyConversationTaskEntryCounts(btn, { todo: 0, in_progress: 0 });
      }
      if (PCONV.taskDrawerOpen) {
        PCONV.taskDrawerOpen = false;
        PCONV.taskDrawerSessionKey = "";
        resetConversationTaskDrawerRenderState();
        renderConversationTaskDrawer();
      }
      resetConversationTaskDetailViewer();
      renderConversationTaskDetailViewer();
      hideConversationCurrentTaskStrip();
    }

    function conversationCurrentTaskStripSessionKey(ctx) {
      if (!ctx || !ctx.projectId || !ctx.sessionId) return "";
      return String(convComposerDraftKey(ctx.projectId, ctx.sessionId) || "").trim();
    }

    function setConversationCurrentTaskStripCollapsed(sessionKey, collapsed) {
      const key = String(sessionKey || "").trim();
      if (!key) return;
      if (collapsed) PCONV.currentTaskStripCollapsedBySessionKey[key] = true;
      else delete PCONV.currentTaskStripCollapsedBySessionKey[key];
    }

    function hideConversationCurrentTaskStrip() {
      const dock = document.getElementById("convCurrentTaskDock");
      const row = document.getElementById("convCurrentTaskRow");
      const strip = document.getElementById("convCurrentTaskStrip");
      const title = document.getElementById("convCurrentTaskStripTitle");
      const summary = document.getElementById("convCurrentTaskStripSummary");
      const status = document.getElementById("convCurrentTaskStripStatus");
      const updated = document.getElementById("convCurrentTaskStripUpdated");
      const closeBtn = document.getElementById("convCurrentTaskStripClose");
      const peekBtn = document.getElementById("convCurrentTaskPeek");
      if (dock) {
        dock.style.display = "none";
        dock.classList.remove("is-collapsed");
      }
      if (row) row.style.display = "none";
      if (peekBtn) {
        peekBtn.style.display = "none";
        peekBtn.onclick = null;
      }
      if (strip) {
        strip.className = "convcurrenttaskstrip";
        strip.onclick = null;
      }
      if (closeBtn) closeBtn.onclick = null;
      if (title) title.textContent = "";
      if (summary) summary.textContent = "";
      if (status) status.replaceChildren();
      if (updated) updated.textContent = "";
    }

    function renderConversationCurrentTaskStrip(ctx, payload = {}) {
      const dock = document.getElementById("convCurrentTaskDock");
      const row = document.getElementById("convCurrentTaskRow");
      const strip = document.getElementById("convCurrentTaskStrip");
      const title = document.getElementById("convCurrentTaskStripTitle");
      const summary = document.getElementById("convCurrentTaskStripSummary");
      const status = document.getElementById("convCurrentTaskStripStatus");
      const updated = document.getElementById("convCurrentTaskStripUpdated");
      const closeBtn = document.getElementById("convCurrentTaskStripClose");
      const peekBtn = document.getElementById("convCurrentTaskPeek");
      if (!dock || !row || !strip || !title || !summary || !status || !updated || !closeBtn || !peekBtn) return;
      if (!ctx || !ctx.projectId || !ctx.sessionId) {
        hideConversationCurrentTaskStrip();
        return;
      }
      const view = resolveConversationTaskTrackingPayload(payload);
      const currentRef = view.currentRef || null;
      if (!currentRef) {
        hideConversationCurrentTaskStrip();
        return;
      }
      const sessionKey = conversationCurrentTaskStripSessionKey(ctx);
      const collapsed = !!(sessionKey && PCONV.currentTaskStripCollapsedBySessionKey[sessionKey]);
      const statusMeta = taskDisplayStatusMeta(currentRef.task_primary_status || currentRef, "待办");
      const updatedText = compactDateTime(currentRef.latest_action_at) || shortDateTime(currentRef.latest_action_at);
      const groupTitle = "当前任务";
      dock.style.display = "block";
      dock.classList.toggle("is-collapsed", collapsed);
      row.style.display = collapsed ? "none" : "flex";
      peekBtn.style.display = collapsed ? "inline-flex" : "none";
      strip.className = "convcurrenttaskstrip status-" + statusMeta.key;
      title.textContent = conversationTaskTitleText(currentRef);
      title.title = String(currentRef.task_title || currentRef.task_path || "").trim();
      summary.textContent = taskSummaryText(currentRef, "当前任务已建立，最近活动待补充。");
      summary.title = summary.textContent;
      status.replaceChildren();
      status.appendChild(buildTaskStatusChip(currentRef.task_primary_status || currentRef, "待办"));
      updated.textContent = updatedText ? ("更新 " + updatedText) : "";
      strip.onclick = () => openConversationTaskDetailViewerStandalone(currentRef, payload, {
        sessionKey: sessionKey || "conversation-current-task-strip",
        groupTitle,
      });
      closeBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setConversationCurrentTaskStripCollapsed(sessionKey, true);
        renderConversationCurrentTaskStrip(ctx, payload);
      };
      peekBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setConversationCurrentTaskStripCollapsed(sessionKey, false);
        renderConversationCurrentTaskStrip(ctx, payload);
      };
    }

    function renderConversationTaskEntry(ctx, payload = {}) {
      const btn = document.getElementById("detailTaskTrackingBtn");
      if (!btn) return;
      if (!ctx || !ctx.projectId || !ctx.sessionId) {
        hideConversationTaskEntry();
        return;
      }
      const key = convComposerDraftKey(ctx.projectId, ctx.sessionId);
      applyConversationTaskEntryCounts(btn, countConversationMainOwnerTasks(ctx, payload));
      btn.style.display = "";
      btn.classList.toggle("active", !!(PCONV.taskDrawerOpen && String(PCONV.taskDrawerSessionKey || "") === key));
      btn.onclick = () => {
        const same = PCONV.taskDrawerOpen && String(PCONV.taskDrawerSessionKey || "") === key;
        if (same) {
          PCONV.taskDrawerOpen = false;
          resetConversationTaskDetailViewer();
          renderConversationTaskDrawer();
          renderConversationTaskEntry(ctx, payload);
          return;
        }
        PCONV.memoDrawerOpen = false;
        renderConversationMemoDrawer();
        renderConversationMemoEntry(ctx);
        PCONV.fileDrawerOpen = false;
        renderConversationFileDrawer();
        renderConversationFileEntry(ctx);
        PCONV.taskDrawerOpen = true;
        PCONV.taskDrawerSessionKey = key;
        renderConversationTaskDrawer(payload);
        renderConversationTaskEntry(ctx, payload);
      };
    }

    function closeConversationTaskDrawer() {
      const payload = currentConversationTaskPayload();
      PCONV.taskDrawerOpen = false;
      PCONV.taskDrawerSessionKey = "";
      resetConversationTaskDrawerRenderState();
      resetConversationTaskDetailViewer();
      renderConversationTaskDrawer();
      renderConversationTaskEntry(payload.ctx, payload);
    }

    function initConversationTaskUi() {
      const mask = document.getElementById("convTaskDrawerMask");
      const closeBtn = document.getElementById("convTaskCloseBtn");
      if (mask) {
        mask.addEventListener("click", (e) => {
          if (e.target === mask) closeConversationTaskDrawer();
        });
      }
      if (closeBtn) closeBtn.addEventListener("click", closeConversationTaskDrawer);
    }

    function renderConversationDetail(forceScroll = false) {
      if (STATE.panelMode === "channel") return;
      const titleEl = document.getElementById("detailTitle");
      const subEl = document.getElementById("detailSub");
      const hintEl = document.getElementById("convHint");
      const senderHintEl = document.getElementById("convSenderHint");
      const timeline = document.getElementById("convTimeline");
      const input = document.getElementById("convMsg");
      const sendBtn = document.getElementById("convSendBtn");
      const memoSaveBtn = document.getElementById("convMemoSaveBtn");
      const pathBar = document.getElementById("detailPathBar");
      const basePlaceholder = conversationComposerPlaceholder("Codex");
      if (pathBar) pathBar.style.display = "none";
      if (!titleEl || !timeline || !input || !sendBtn || !hintEl || !subEl) return;
      bindConvComposerToSelectedSession();

      captureDebugLogScrollPositions(timeline);
      const wasNearBottom = (timeline.scrollHeight - timeline.scrollTop - timeline.clientHeight) < 80;
      const scrollAnchor = {
        scrollTop: Number(timeline.scrollTop || 0),
      };

      timeline.innerHTML = "";
      if (STATE.project === "overview") {
        titleEl.textContent = "项目对话";
        subEl.textContent = "";
        hintEl.textContent = "";
        if (senderHintEl) senderHintEl.textContent = "";
        renderConversationEnterSendToggle(false);
        renderConversationQuickTips(null, []);
        renderConversationTrainingPrompt(null, []);
        renderConversationTeamExpansionHint(null, null);
        renderConvComposerRunActions(null, []);
        input.placeholder = "请先选择具体项目，再发送会话消息";
        input.disabled = true;
        sendBtn.disabled = true;
        if (memoSaveBtn) {
          memoSaveBtn.disabled = true;
          memoSaveBtn.textContent = "记录";
        }
        hideConvMentionSuggest();
        renderConversationRecentAgentsByKey("");
        hideConversationMemoEntry();
        hideConversationTaskEntry();
        hideConversationCurrentTaskStrip();
        PCONV.fileDrawerOpen = false;
        hideConversationFileEntry();
        renderConversationFileDrawer();
        renderConversationTaskDrawer();
        timeline.appendChild(el("div", { class: "hint", text: "总揽模式不展示会话详情。" }));
        return;
      }

      const ctx = currentConversationCtx();
      if (!ctx) {
        titleEl.textContent = "项目对话";
        subEl.textContent = "";
        hintEl.textContent = "";
        if (senderHintEl) senderHintEl.textContent = "";
        renderConversationEnterSendToggle(false);
        renderConversationQuickTips(null, []);
        renderConversationTrainingPrompt(null, []);
        renderConversationTeamExpansionHint(null, null);
        renderConvComposerRunActions(null, []);
        input.placeholder = "当前项目没有可用会话，请先维护 session_id";
        input.disabled = true;
        sendBtn.disabled = true;
        if (memoSaveBtn) {
          memoSaveBtn.disabled = true;
          memoSaveBtn.textContent = "记录";
        }
        hideConvMentionSuggest();
        renderConversationRecentAgentsByKey("");
        hideConversationMemoEntry();
        hideConversationTaskEntry();
        hideConversationCurrentTaskStrip();
        PCONV.fileDrawerOpen = false;
        hideConversationFileEntry();
        renderConversationFileDrawer();
        renderConversationTaskDrawer();
        timeline.appendChild(el("div", { class: "hint", text: "无可用会话。" }));
        return;
      }

      const cliChipName = ctx && ctx.cliType ? String(ctx.cliType).toUpperCase() : "Codex";
      const agentDisplay = firstNonEmptyText([ctx.agentName, ctx.alias, ctx.displayChannel]) || "未命名会话";
      const currentSession = findConversationSessionById(String(ctx.sessionId || ""));
      const currentSessionId = String(ctx.sessionId || "").trim();
      if (currentSessionId && typeof ensureConversationSessionDetailLoaded === "function") {
        ensureConversationSessionDetailLoaded(currentSessionId, { maxAgeMs: 15_000 }).catch(() => {});
      }
      titleEl.innerHTML = "";
      const titleRow = el("div", { class: "detail-title-row" });
      titleRow.appendChild(buildConversationAvatarNode(currentSession || ctx));
      const titleLine = el("div", { class: "detail-title-line" });
      titleLine.appendChild(el("span", { class: "detail-title-text", text: agentDisplay, title: agentDisplay }));
      titleLine.appendChild(buildConversationRoleBadge(currentSession || ctx));
      titleLine.appendChild(buildConversationCliBadge(currentSession || ctx, { detail: true }));
      const detailHeartbeatBadge = buildConversationHeartbeatBadges(currentSession || ctx);
      if (detailHeartbeatBadge) titleLine.appendChild(detailHeartbeatBadge);
      const titleStatus = buildConversationStatusBadge(currentSession || ctx);
      if (titleStatus) titleLine.appendChild(titleStatus);
      const sessionIdText = String(ctx.sessionId || "");
      if (sessionIdText) {
        titleLine.appendChild(el("span", {
          class: "detail-inline-id",
          text: sessionIdText,
          title: sessionIdText,
        }));
      }
      titleRow.appendChild(titleLine);
      titleEl.appendChild(titleRow);
      subEl.textContent = "";
      subEl.title = "";
      hintEl.textContent = "";
      if (senderHintEl) senderHintEl.textContent = buildConversationComposerSenderHint();
      renderConversationEnterSendToggle(PCONV.enterSendEnabled !== false);
      input.placeholder = conversationComposerPlaceholder(cliChipName);
      input.disabled = false;
      sendBtn.disabled = PCONV.sending;
      sendBtn.textContent = PCONV.sending ? "发送中..." : "发送";
      const memoKey = convComposerDraftKey(ctx.projectId, ctx.sessionId);
      const memoBusy = String(PCONV.memoActionBusyBySessionKey[memoKey] || "");
      if (memoSaveBtn) {
        memoSaveBtn.disabled = !!memoBusy;
        memoSaveBtn.textContent = memoBusy === "save" ? "记录中..." : "记录";
      }
      renderConversationMemoEntry(ctx);
      renderConversationFileEntry(ctx);
      const taskPayload = currentConversationTaskPayload();
      renderConversationTaskEntry(ctx, taskPayload);
      renderConversationCurrentTaskStrip(ctx, taskPayload);
      const consumedUnread = consumeConversationUnreadByCtx(ctx);
      if (consumedUnread) refreshConversationCountDots();
      ensureConversationMemosLoaded(ctx.projectId, ctx.sessionId, { maxAgeMs: 10_000 });
      if (PCONV.memoDrawerOpen) {
        PCONV.memoDrawerSessionKey = memoKey;
        renderConversationMemoDrawer();
      }
      if (PCONV.fileDrawerOpen) {
        PCONV.fileDrawerSessionKey = memoKey;
        renderConversationFileDrawer();
      }
      if (PCONV.taskDrawerOpen) {
        PCONV.taskDrawerSessionKey = memoKey;
      }
      renderConversationTaskDrawer(taskPayload);

      const timelineKey = String(STATE.project || "") + "::" + String(ctx.sessionId || "");
      if (PCONV.autoExpandTimelineKey !== timelineKey) {
        // 每次进入一个会话：重置展开状态（仅最新消息默认展开）
        PCONV.autoExpandTimelineKey = timelineKey;
        PCONV.autoExpandDone = false;
        PCONV.autoExpandedLatestBubbleKey = "";
        PCONV.bubbleExpanded = new Set();
        PCONV.bubblePendingExpand = new Set();
        PCONV.inlineSnippetExpanded = new Set();
        PCONV.skillsExpandedByRun = Object.create(null);
        PCONV.businessRefsExpandedByRun = Object.create(null);
        PCONV.agentRefsExpandedByRun = Object.create(null);
      }
      const runSource = Array.isArray(PCONV.sessionTimelineMap[timelineKey])
        ? PCONV.sessionTimelineMap[timelineKey]
        : (PCONV.runsBySession[ctx.sessionId] || []);
      const runs = runSource.slice().sort((a, b) => {
        const ta = toTimeNum(a.createdAt);
        const tb = toTimeNum(b.createdAt);
        if (ta >= 0 && tb >= 0 && ta !== tb) return ta - tb; // oldest first (newest at bottom)
        return String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
      });
      const optimisticForSession = (PCONV.optimistic && PCONV.optimistic.sessionId === ctx.sessionId)
        ? PCONV.optimistic
        : null;
      if (optimisticForSession) {
        const materialized = runs.some((run) => isConversationRunMaterializedForOptimistic(run, optimisticForSession));
        if (materialized) {
          PCONV.optimistic = null;
        }
      }
      const effectiveOptimistic = (PCONV.optimistic && PCONV.optimistic.sessionId === ctx.sessionId)
        ? PCONV.optimistic
        : null;
      const currentRuntimeState = getSessionRuntimeState(currentSession);
      const currentQueueDepth = (() => {
        const runtimeDepth = Math.max(0, Number((currentRuntimeState && currentRuntimeState.queue_depth) || 0));
        const fallbackDepth = runs.reduce((count, item) => {
          const oneStatus = getRunDisplayState(item, PCONV.detailMap[String((item && item.id) || "")] || null);
          return count + ((oneStatus === "queued" || oneStatus === "retry_waiting") ? 1 : 0);
        }, 0);
        return Math.max(runtimeDepth, fallbackDepth);
      })();
      const runtimeShadowMeta = buildConversationRuntimeShadowMeta(currentRuntimeState, runs);
      const runtimeShadowRuns = buildConversationRuntimeShadowRuns(ctx, currentSession, currentRuntimeState, runtimeShadowMeta);
      const liveRunHint = buildConversationLiveRunHint(runs);
      const sessionRunSummary = buildConversationSessionRunSummary(currentSession, currentRuntimeState, liveRunHint);
      const currentActiveRunId = String(firstNonEmptyText([
        currentRuntimeState && currentRuntimeState.active_run_id,
        liveRunHint && liveRunHint.runId,
      ]) || "").trim();
      const currentQueuedRunId = String((currentRuntimeState && currentRuntimeState.queued_run_id) || "").trim();
      hintEl.textContent = "";
      hintEl.title = "";
      subEl.textContent = sessionRunSummary ? String(sessionRunSummary.text || "") : "";
      subEl.title = sessionRunSummary ? String(sessionRunSummary.title || sessionRunSummary.text || "") : "";
      const timelineLoading = PCONV.timelineLoadingKey === timelineKey;
      const timelineLoadingBefore = PCONV.timelineBeforeLoadingKey === timelineKey;
      const timelineBeforeError = String(PCONV.timelineBeforeErrorByKey[timelineKey] || "");
      const hasStoredBeforeFlag = Object.prototype.hasOwnProperty.call(PCONV.timelineBeforeHasMoreByKey, timelineKey);
      const hasSessionTimelineCache = Array.isArray(PCONV.sessionTimelineMap[timelineKey]);
      const timelineHasMoreBefore = hasStoredBeforeFlag
        ? !!PCONV.timelineBeforeHasMoreByKey[timelineKey]
        : (hasSessionTimelineCache ? runs.length >= CONV_PAGE.timelineInitial : runs.length > 0);
      renderConversationQuickTips(ctx, runs);
      renderConversationTrainingPrompt(ctx, runs, { timelineReady: hasSessionTimelineCache });
      renderConversationTeamExpansionHint(ctx, currentSession || ctx);
      refreshConversationRecentAgentsFromRuns(ctx, runs);
      renderConvComposerRunActions(ctx, runs);
      // 找到“最新可展开”的 AI 正文：
      // 1) 只考虑终态消息；
      // 2) 系统回执/恢复摘要不抢自动展开位；
      // 3) 短消息不自动展开，继续向上找最近一条真正需要展开的正文。
      let latestExpandableBubbleKey = "";
      for (let i = runs.length - 1; i >= 0; i--) {
        const rr = runs[i] || {};
        const rid = String(rr.id || "");
        if (!rid) continue;
        const detail = PCONV.detailMap[rid] || null;
        const rs = String(getRunDisplayState(rr, detail) || rr.status || "");
        if (isRunWorking(rs)) continue;
        const senderType = String(firstNonEmptyText([
          rr && rr.sender_type,
          rr && rr.senderType,
          detail && detail.full && detail.full.run && detail.full.run.sender_type,
          detail && detail.full && detail.full.run && detail.full.run.senderType,
        ]) || "").trim().toLowerCase();
        const messageKind = String(firstNonEmptyText([
          rr && rr.communication_view && rr.communication_view.message_kind,
          rr && rr.communicationView && rr.communicationView.message_kind,
          rr && rr.trigger_type,
          rr && rr.triggerType,
          detail && detail.full && detail.full.run && detail.full.run.trigger_type,
          detail && detail.full && detail.full.run && detail.full.run.triggerType,
        ]) || "").trim().toLowerCase();
        const callbackLike = messageKind === "system_callback"
          || messageKind === "system_callback_summary"
          || messageKind === "restart_recovery_summary";
        if (senderType === "system" || callbackLike) continue;
        const assistantPreview = String(resolveAssistantText(rr, detail) || "").trim();
        if (!shouldFoldBubble(assistantPreview, "assistant")) continue;
        latestExpandableBubbleKey = rid + ":assistant";
        break;
      }
      if (latestExpandableBubbleKey) {
        PCONV.autoExpandDone = true;
        PCONV.autoExpandedLatestBubbleKey = latestExpandableBubbleKey;
      }

      if (!runs.length && !(PCONV.optimistic && PCONV.optimistic.sessionId === ctx.sessionId)) {
        timeline.appendChild(el("div", { class: "hint", text: timelineLoading ? "加载会话记录中..." : "该会话暂无消息记录，可直接在下方发送消息。" }));
      }

      if (runs.length || timelineLoadingBefore || timelineBeforeError) {
        const historyBar = el("div", { class: "conv-historybar" });
        const loadOlderBtn = el("button", {
          class: "btn conv-history-btn",
          text: timelineLoadingBefore
            ? "加载更早消息中..."
            : (timelineHasMoreBefore ? "加载更早消息" : "已到最早消息"),
        });
        loadOlderBtn.disabled = !!timelineLoadingBefore || !timelineHasMoreBefore;
        loadOlderBtn.addEventListener("click", () => {
          if (loadOlderBtn.disabled) return;
          loadOlderConversationTimeline(String(ctx.projectId || STATE.project || ""), String(ctx.sessionId || ""));
        });
        historyBar.appendChild(loadOlderBtn);
        if (timelineBeforeError) {
          historyBar.appendChild(el("span", { class: "conv-history-error", text: timelineBeforeError }));
        } else if (!timelineHasMoreBefore && runs.length > 0) {
          historyBar.appendChild(el("span", { class: "conv-history-done", text: "历史消息已全部加载" }));
        }
        timeline.appendChild(historyBar);
      }

      const seenCallbackEventKeys = new Set();
      const seenRestartRecoveryKeys = new Set();
      const visibleRunIds = new Set(runs.map((item) => String((item && item.id) || "").trim()).filter(Boolean));
      const runsById = new Map(runs.map((item) => [String((item && item.id) || "").trim(), item]));
      const localReceiptAnchorMaps = buildConversationLocalReceiptAnchorMaps(runs, visibleRunIds, runsById, PCONV.detailMap, ctx);
      const localReceiptProjectionByRunId = (localReceiptAnchorMaps && localReceiptAnchorMaps.anchoredByHostRunId) || Object.create(null);
      const localAnchoredCallbackRunIds = (localReceiptAnchorMaps && localReceiptAnchorMaps.anchoredCallbackRunIds) || new Set();
      for (const r of runs) {
        const rid = String(r.id || "");
        const d = PCONV.detailMap[rid] || null;
        const st = getRunDisplayState(r, d);
        const queueReason = getRunQueueReason(r, d);
        const queueReasonText = queueReasonLabel(queueReason);
        const blockedByRunId = getRunBlockedByRunId(r, d);
        const blockedByText = blockedByRunId ? shortId(blockedByRunId) : "";
        const actionBusy = String(PCONV.runActionBusy[rid] || "");
        const stNorm = String(st || "").toLowerCase();
        const timeoutLike = stNorm === "error" && isRunTimeoutLike(r, d);
        const userText = (d && d.full && d.full.message) ? String(d.full.message) : String(r.messagePreview || "");
        const assistantText = resolveAssistantText(r, d);
        const displayUserText = stripInjectedConversationReplyText(userText);
        const displayAssistantText = stripInjectedConversationReplyText(assistantText);
        const err = String(r.error || "").trim();
        const hint = String(r.errorHint || "").trim();
        const senderRun = mergeRunForDisplay(
          (d && d.full && d.full.run && typeof d.full.run === "object") ? d.full.run : null,
          r
        );
        const userMessageKind = resolveConversationMessageKind(senderRun, "user");
        const assistantMessageKind = resolveConversationMessageKind(senderRun, "assistant");
        const userSender = resolveMessageSender(senderRun, {
          role: "user",
          cliType: firstNonEmptyText([senderRun && senderRun.cliType, r && r.cliType, ctx && ctx.cliType]),
          channelName: firstNonEmptyText([senderRun && senderRun.channelName, r && r.channelName, ctx && ctx.channelName]),
          displayChannel: firstNonEmptyText([ctx && ctx.alias, ctx && ctx.displayChannel]),
          textCandidates: [userText, String(r.messagePreview || "")],
        });
        const assistantSender = resolveMessageSender(senderRun, {
          role: "assistant",
          cliType: firstNonEmptyText([senderRun && senderRun.cliType, r && r.cliType, ctx && ctx.cliType]),
          agentName: firstNonEmptyText([ctx && ctx.agentName, ctx && ctx.alias, ctx && ctx.displayName, ctx && ctx.displayChannel]),
          channelName: firstNonEmptyText([senderRun && senderRun.channelName, r && r.channelName, ctx && ctx.channelName]),
          displayChannel: firstNonEmptyText([ctx && ctx.alias, ctx && ctx.displayChannel]),
          textCandidates: [assistantText, String(r.lastPreview || ""), String(r.partialPreview || "")],
        });
        const runSpec = readConversationSpecFields(senderRun);
        // Get attachments from run data
        const attachments = Array.isArray(r.attachments) ? r.attachments : [];
        const callbackEventMeta = readRunCallbackEventMeta(senderRun, ctx, userText || String(r.messagePreview || ""));
        const receiptProjection = mergeConversationReceiptProjection(
          readConversationReceiptProjection(senderRun, d),
          rid ? (localReceiptProjectionByRunId[rid] || null) : null
        );
        const projectedReceiptHostRunId = callbackEventMeta
          ? resolveConversationReceiptHostRunId(senderRun, rid, visibleRunIds, runsById, PCONV.detailMap)
          : "";
        const projectedHostRun = projectedReceiptHostRunId
          ? (runsById.get(projectedReceiptHostRunId) || null)
          : null;
        const projectedHostDetail = projectedReceiptHostRunId
          ? (PCONV.detailMap[projectedReceiptHostRunId] || null)
          : null;
        const projectedHostStatus = projectedReceiptHostRunId
          ? String(getRunDisplayState(projectedHostRun, projectedHostDetail) || "").trim().toLowerCase()
          : "";
        const projectedHostReceiptProjection = projectedReceiptHostRunId
          ? readConversationReceiptProjection(projectedHostRun, projectedHostDetail)
          : null;
        const callbackProjectedToVisibleHost = !!(
          callbackEventMeta
          && projectedReceiptHostRunId
          && projectedReceiptHostRunId !== rid
          && visibleRunIds.has(projectedReceiptHostRunId)
          && !isRunWorking(projectedHostStatus)
          && conversationReceiptProjectionMatchesHost(projectedHostReceiptProjection, {
            callbackRunId: rid,
            relatedRunIds: [rid].concat(collectConversationReceiptHostRunIds(senderRun)),
          })
        );
        const callbackLocallyAnchored = !!(callbackEventMeta && rid && localAnchoredCallbackRunIds.has(rid));
        let callbackEventDuplicate = false;
        if (callbackEventMeta && callbackEventMeta.dedupeKey) {
          if (seenCallbackEventKeys.has(callbackEventMeta.dedupeKey)) callbackEventDuplicate = true;
          else seenCallbackEventKeys.add(callbackEventMeta.dedupeKey);
        }
        const restartRecoveryMeta = readRunRestartRecoveryMeta(senderRun, ctx);
        let restartRecoveryDuplicate = false;
        if (restartRecoveryMeta && restartRecoveryMeta.dedupeKey) {
          if (seenRestartRecoveryKeys.has(restartRecoveryMeta.dedupeKey)) restartRecoveryDuplicate = true;
          else seenRestartRecoveryKeys.add(restartRecoveryMeta.dedupeKey);
        }

        const aggregateMeta = getRunAggregateMeta(senderRun, d);
        const aggregateCount = callbackEventMeta
          ? Math.max(Number(callbackEventMeta.aggregateCount || 0), Number(aggregateMeta.aggregateCount || 0))
          : Number(aggregateMeta.aggregateCount || 0);
        const aggregateLastMergedAt = firstNonEmptyText([
          callbackEventMeta && callbackEventMeta.callbackLastMergedAt,
          aggregateMeta && aggregateMeta.lastMergedAt,
        ]);
        const replyContext = readConversationReplyContext(senderRun, userText || assistantText || String(r.messagePreview || ""));
        const mentionTargets = collectRunMentionTargets(senderRun, d, userText);
        const queuedCompactMode = (st === "queued" && !restartRecoveryMeta);
        const systemFamilyMode = !!(callbackEventMeta || restartRecoveryMeta);
        const userVisualMode = resolveConversationUserVisualMode({
          senderRun,
          runSpec,
          userSender,
          userMessageKind,
          displayUserText,
          userText,
          sourceText: firstNonEmptyText([
            userText,
            displayUserText,
            r.messagePreview,
            d && d.full && d.full.lastMessage,
            d && d.full && d.full.message,
          ]),
        });
        if (systemFamilyMode) {
          if ((callbackProjectedToVisibleHost || callbackLocallyAnchored) && !restartRecoveryMeta) continue;
          const systemRow = renderConversationSystemFamily({
            rid,
            r,
            d,
            ctx,
            runSpec,
            userSender,
            displayUserText,
            userText,
            attachments,
            replyContext,
            callbackEventMeta,
            callbackEventDuplicate,
            restartRecoveryMeta,
            restartRecoveryDuplicate,
            queuedCompactMode,
            currentQueueDepth,
            aggregateCount,
            aggregateLastMergedAt,
            actionBusy,
            mentionTargets,
          });
          timeline.appendChild(systemRow);
          continue;
        }

        const userRow = renderConversationUserFamily({
          rid,
          r,
          d,
          senderRun,
          ctx,
          runSpec,
          userSender,
          userMessageKind,
          displayUserText,
          userText,
          attachments,
          replyContext,
          queuedCompactMode,
          callbackEventMeta,
          callbackEventDuplicate,
          restartRecoveryMeta,
          restartRecoveryDuplicate,
          receiptProjection,
          currentQueueDepth,
          aggregateCount,
          aggregateLastMergedAt,
          actionBusy,
          mentionTargets,
        });
        timeline.appendChild(userRow);
        if (queuedCompactMode) continue;
        const aiRow = renderConversationAssistantFamily({
          rid,
          r,
          d,
          ctx,
          runSpec,
          st,
          timeoutLike,
          actionBusy,
          assistantSender,
          assistantMessageKind,
          assistantText,
          displayAssistantText,
          displayUserText,
          err,
          hint,
          callbackEventMeta,
          restartRecoveryMeta,
          queueReasonText,
          blockedByText,
          receiptProjection: isRunWorking(stNorm) ? null : receiptProjection,
          receiptCardVisible: userVisualMode.kind === "receipt-inbound",
          mentionTargets,
          currentActiveRunId,
          currentQueuedRunId,
        });
        timeline.appendChild(aiRow);
      }

      if (runtimeShadowRuns.activeRun) {
        const shadowRun = runtimeShadowRuns.activeRun;
        const shadowSender = resolveMessageSender(shadowRun, {
          role: "assistant",
          cliType: firstNonEmptyText([shadowRun.cliType, ctx && ctx.cliType]),
          agentName: firstNonEmptyText([ctx && ctx.agentName, ctx && ctx.alias, ctx && ctx.displayName, ctx && ctx.displayChannel]),
          channelName: firstNonEmptyText([shadowRun.channelName, ctx && ctx.channelName]),
          displayChannel: firstNonEmptyText([ctx && ctx.alias, ctx && ctx.displayChannel]),
          textCandidates: [],
        });
        const shadowAiRow = renderConversationAssistantFamily({
          rid: String(shadowRun.id || ""),
          r: shadowRun,
          d: null,
          ctx,
          runSpec: readConversationSpecFields(shadowRun),
          st: "running",
          timeoutLike: false,
          actionBusy: "",
          assistantSender: shadowSender,
          assistantMessageKind: resolveConversationMessageKind(shadowRun, "assistant"),
          assistantText: "",
          displayAssistantText: "",
          displayUserText: "",
          err: "",
          hint: "",
          callbackEventMeta: null,
          restartRecoveryMeta: null,
          queueReasonText: "",
          blockedByText: "",
          receiptProjection: null,
          mentionTargets: [],
        });
        shadowAiRow.classList.add("runtime-shadow");
        timeline.appendChild(shadowAiRow);
      }

      if (runtimeShadowRuns.queuedRun) {
        const suppressQueuedShadow = shouldSuppressConversationQueuedShadow(runtimeShadowRuns.queuedRun, effectiveOptimistic);
        if (!suppressQueuedShadow) {
          const shadowRun = runtimeShadowRuns.queuedRun;
          const shadowSender = resolveMessageSender(shadowRun, {
            role: "user",
            cliType: firstNonEmptyText([shadowRun.cliType, ctx && ctx.cliType]),
            channelName: firstNonEmptyText([shadowRun.channelName, ctx && ctx.channelName]),
            displayChannel: firstNonEmptyText([ctx && ctx.displayChannel, ctx && ctx.alias]),
            textCandidates: [shadowRun.messagePreview],
          });
          const shadowUserRow = renderConversationUserFamily({
            rid: String(shadowRun.id || ""),
            r: shadowRun,
            d: null,
            senderRun: shadowRun,
            ctx,
            runSpec: readConversationSpecFields(shadowRun),
            userSender: shadowSender,
            userMessageKind: resolveConversationMessageKind(shadowRun, "user"),
            displayUserText: String(shadowRun.messagePreview || ""),
            userText: String(shadowRun.messagePreview || ""),
            attachments: [],
            replyContext: null,
            queuedCompactMode: true,
            callbackEventMeta: null,
            callbackEventDuplicate: false,
            restartRecoveryMeta: null,
            restartRecoveryDuplicate: false,
            currentQueueDepth,
            aggregateCount: 0,
            aggregateLastMergedAt: "",
            actionBusy: "",
            mentionTargets: [],
          });
          shadowUserRow.classList.add("runtime-shadow");
          timeline.appendChild(shadowUserRow);
        }
      }

      if (effectiveOptimistic) {
        const m = effectiveOptimistic;
        const userRow = renderConversationOptimisticUserFamily({
          ctx,
          message: m,
        });
        timeline.appendChild(userRow);
      }

      syncConversationReceiptViewerMount();

      refreshConversationFilesFromTimeline(ctx, timeline);
      renderConversationFileUi();

      if (forceScroll || wasNearBottom) {
        maybeStickConversationBottom(true);
      } else {
        restoreConversationTimelineScroll(timeline, scrollAnchor);
        requestAnimationFrame(() => restoreConversationTimelineScroll(timeline, scrollAnchor));
      }
    }

    async function refreshConversationTimeline(projectId, sessionId, forceScroll = false) {
      const pid = String(projectId || "").trim();
      const sid = String(sessionId || "").trim();
      if (!pid || !sid || pid === "overview") return;
      if (
        isConversationListScrollActive()
        && String(STATE.project || "").trim() === pid
        && String(STATE.selectedSessionId || "").trim() === sid
      ) {
        queueDeferredConversationRender({
          panelRender: true,
          projectId: pid,
          sessionId: sid,
          forceScroll,
        });
        return;
      }
      const key = pid + "::" + sid;
      const shouldForce = forceScroll || !Array.isArray(PCONV.sessionTimelineMap[key]);
      let shouldRefreshCountDots = false;
      const seq = ++PCONV.timelineRequestSeq;
      PCONV.timelineLoadingKey = key;
      try {
        const hasSessionTimelineCache = Array.isArray(PCONV.sessionTimelineMap[key]);
        const existingRuns = hasSessionTimelineCache
          ? PCONV.sessionTimelineMap[key]
          : (Array.isArray(PCONV.runsBySession[sid]) ? PCONV.runsBySession[sid] : []);
        const prevUnreadTerminalAt = latestUnreadTerminalCreatedAt(existingRuns);
        // Only use incremental pull after this session has its own dedicated timeline cache.
        const canIncremental = hasSessionTimelineCache && existingRuns.length > 0 && !hasWorkingRun(existingRuns);
        const cursor = canIncremental ? incrementalAfterCursorWithOverlap(existingRuns, 1000) : "";
        const requestLimit = canIncremental
          ? CONV_PAGE.timelineIncremental
          : CONV_PAGE.timelineInitial;
        const resp = await loadRuns({
          projectId: pid,
          sessionId: sid,
          limit: requestLimit,
          afterCreatedAt: cursor,
          payloadMode: "light",
        });
        if (seq !== PCONV.timelineRequestSeq) return;
        const incoming = Array.isArray(resp && resp.runs) ? resp.runs : [];
        const keepLimit = Math.max(260, Math.min(1200, Number(existingRuns.length || 0) + 120));
        const mergedRuns = mergeRunsById(existingRuns, incoming, keepLimit);
        PCONV.sessionTimelineMap[key] = mergedRuns;
        const nextUnreadTerminalAt = latestUnreadTerminalCreatedAt(mergedRuns);
        if (nextUnreadTerminalAt && nextUnreadTerminalAt !== prevUnreadTerminalAt) {
          shouldRefreshCountDots = true;
        }
        if (canIncremental) {
          if (!Object.prototype.hasOwnProperty.call(PCONV.timelineBeforeHasMoreByKey, key)) {
            PCONV.timelineBeforeHasMoreByKey[key] = existingRuns.length >= CONV_PAGE.timelineInitial;
          }
        } else {
          PCONV.timelineBeforeHasMoreByKey[key] = (incoming.length >= requestLimit) || (mergedRuns.length > incoming.length);
        }
        PCONV.timelineBeforeErrorByKey[key] = "";
      } catch (_) {
        if (seq !== PCONV.timelineRequestSeq) return;
        // Keep fallback timeline from project-level grouping.
      } finally {
        if (seq === PCONV.timelineRequestSeq) PCONV.timelineLoadingKey = "";
        if (shouldRefreshCountDots) refreshConversationCountDots();
        renderConversationDetail(shouldForce);
      }
    }

    async function loadOlderConversationTimeline(projectId, sessionId) {
      const pid = String(projectId || "").trim();
      const sid = String(sessionId || "").trim();
      if (!pid || !sid || pid === "overview") return;
      const key = pid + "::" + sid;
      if (PCONV.timelineBeforeLoadingKey === key) return;
      const existingRuns = Array.isArray(PCONV.sessionTimelineMap[key])
        ? PCONV.sessionTimelineMap[key].slice()
        : (Array.isArray(PCONV.runsBySession[sid]) ? PCONV.runsBySession[sid].slice() : []);
      if (!existingRuns.length) return;
      const beforeCursor = runsOldestCreatedAt(existingRuns);
      if (!beforeCursor) return;

      const timelineBox = document.getElementById("convTimeline");
      const prevHeight = timelineBox ? Number(timelineBox.scrollHeight || 0) : 0;
      const prevTop = timelineBox ? Number(timelineBox.scrollTop || 0) : 0;
      let needRestoreScroll = false;

      const beforeLimit = CONV_PAGE.timelineBefore;
      PCONV.timelineBeforeLoadingKey = key;
      PCONV.timelineBeforeErrorByKey[key] = "";
      renderConversationDetail(false);
      try {
        const resp = await loadRuns({
          projectId: pid,
          sessionId: sid,
          limit: beforeLimit,
          beforeCreatedAt: beforeCursor,
          payloadMode: "light",
        });
        const incoming = Array.isArray(resp && resp.runs) ? resp.runs : [];
        const keepLimit = Math.max(320, Math.min(1200, existingRuns.length + beforeLimit + 40));
        PCONV.sessionTimelineMap[key] = mergeRunsById(existingRuns, incoming, keepLimit);
        PCONV.timelineBeforeHasMoreByKey[key] = incoming.length >= beforeLimit;
        PCONV.timelineBeforeErrorByKey[key] = "";
        needRestoreScroll = incoming.length > 0;
      } catch (e) {
        PCONV.timelineBeforeErrorByKey[key] = "历史加载失败：" + String((e && e.message) || e || "unknown");
      } finally {
        if (PCONV.timelineBeforeLoadingKey === key) PCONV.timelineBeforeLoadingKey = "";
        renderConversationDetail(false);
        if (needRestoreScroll) {
          requestAnimationFrame(() => {
            const box = document.getElementById("convTimeline");
            if (!box) return;
            const delta = Math.max(0, Number(box.scrollHeight || 0) - prevHeight);
            box.scrollTop = Math.max(0, prevTop + delta);
          });
        }
      }
    }

    // 加载项目会话数据（不依赖 panelMode，可供任务模式和对话模式共用）
    async function loadProjectConversations(projectId) {
      const pid = String(projectId || STATE.project || "");
      if (!pid || pid === "overview") {
        PCONV.sessions = [];
        PCONV.sessionDirectoryByProject = Object.create(null);
        PCONV.sessionDirectoryMetaByProject = Object.create(null);
        PCONV.sessionDirectoryPromiseByProject = Object.create(null);
        PCONV.projectRuns = [];
        PCONV.runsBySession = Object.create(null);
        PCONV.sessionTimelineMap = Object.create(null);
        PCONV.timelineRequestSeq = 0;
        PCONV.timelineLoadingKey = "";
        PCONV.timelineBeforeLoadingKey = "";
        PCONV.timelineBeforeHasMoreByKey = Object.create(null);
        PCONV.timelineBeforeErrorByKey = Object.create(null);
        PCONV.memoDrawerOpen = false;
        PCONV.memoDrawerSessionKey = "";
        PCONV.taskDrawerOpen = false;
        PCONV.taskDrawerSessionKey = "";
        resetConversationTaskDrawerRenderState();
        resetConversationTaskDetailViewer();
        PCONV.fileDrawerOpen = false;
        PCONV.fileDrawerSessionKey = "";
        return;
      }

      // 始终重置项目切换时的缓存
      if (PCONV.lastProjectId !== pid) {
        PCONV.lastProjectId = pid;
        PCONV.sessions = [];
        PCONV.detailMap = Object.create(null);
        PCONV.debugExpanded = new Set();
        PCONV.debugLogScrollTop = Object.create(null);
        PCONV.bubbleExpanded = new Set();
        PCONV.bubblePendingExpand = new Set();
        PCONV.processUi = Object.create(null);
        PCONV.runDetailTabByRun = Object.create(null);
        PCONV.skillsExpandedByRun = Object.create(null);
        PCONV.businessRefsExpandedByRun = Object.create(null);
        PCONV.agentRefsExpandedByRun = Object.create(null);
        PCONV.processTrailByRun = Object.create(null);
        PCONV.sessionTimelineMap = Object.create(null);
        PCONV.timelineRequestSeq = 0;
        PCONV.timelineLoadingKey = "";
        PCONV.timelineBeforeLoadingKey = "";
        PCONV.timelineBeforeHasMoreByKey = Object.create(null);
        PCONV.timelineBeforeErrorByKey = Object.create(null);
        PCONV.autoExpandTimelineKey = "";
        PCONV.autoExpandDone = false;
        PCONV.autoExpandedLatestBubbleKey = "";
        PCONV.memoDrawerOpen = false;
        PCONV.memoDrawerSessionKey = "";
        PCONV.taskDrawerOpen = false;
        PCONV.taskDrawerSessionKey = "";
        resetConversationTaskDrawerRenderState();
        resetConversationTaskDetailViewer();
        PCONV.fileDrawerOpen = false;
        PCONV.fileDrawerSessionKey = "";
      }

      // 如果已经加载过且没有变化，直接返回
      if (PCONV.sessions && PCONV.sessions.length > 0 && PCONV.lastProjectId === pid) {
        return;
      }

      try {
        await loadChannelSessions(pid, null);
        const serverSessions = Array.isArray(PCONV.sessions) ? PCONV.sessions : [];
        let baseSessions = mergeConversationSessions(configuredProjectConversations(pid), serverSessions);
        PCONV.projectRuns = [];
        PCONV.runsBySession = Object.create(null);
        for (const s of baseSessions) {
          const latestRunSummary = getSessionLatestRunSummary(s);
          const preferSyntheticPreviewSender = sessionUsesSyntheticPreviewSender(s, getSessionPrimaryPreviewText(s));
          s.lastActiveAt = String(s.lastActiveAt || latestRunSummary.updated_at || s.last_used_at || "");
          s.lastStatus = getSessionStatus(s);
          s.lastError = String(s.lastError || latestRunSummary.error || "");
          s.lastPreview = String(getSessionPrimaryPreviewText(s) || s.lastPreview || latestRunSummary.preview || "");
          s.lastSpeaker = String(s.lastSpeaker || (preferSyntheticPreviewSender ? "assistant" : (latestRunSummary.speaker || "assistant")) || "assistant");
          s.lastSenderType = String(s.lastSenderType || (preferSyntheticPreviewSender ? "" : (latestRunSummary.sender_type || "legacy")));
          s.lastSenderName = String(s.lastSenderName || (preferSyntheticPreviewSender ? "" : (latestRunSummary.sender_name || "")));
          s.lastSenderSource = String(s.lastSenderSource || (preferSyntheticPreviewSender ? "" : (latestRunSummary.sender_source || "legacy")));
          s.latestUserMsg = String(s.latestUserMsg || latestRunSummary.latest_user_msg || "");
          s.latestAiMsg = String(s.latestAiMsg || latestRunSummary.latest_ai_msg || "");
          s.runCount = Math.max(0, Number(s.runCount || latestRunSummary.run_count || 0) || 0);
          if (!s.primaryChannel) s.primaryChannel = (s.channels && s.channels[0]) ? String(s.channels[0]) : "";
          if (!s.displayChannel) s.displayChannel = s.primaryChannel || s.alias || s.sessionId;
        }

        seedConversationUnreadCursorsForSessions(pid, baseSessions);

        PCONV.sessionDirectoryByProject[pid] = baseSessions.slice();
        markConversationSessionDirectoryMeta(pid, {
          liveLoaded: true,
          source: "panel",
          loadedAt: new Date().toISOString(),
          error: "",
        });
        PCONV.sessions = baseSessions;
        PCONV.lastRefreshAt = new Date().toISOString().slice(0, 16).replace("T", " ");
      } catch (e) {
        console.error("loadProjectConversations error:", e);
      }
    }

    async function refreshConversationPanel() {
      if (PCONV.busy) return;
      const projectId = String(STATE.project || "");
      if (!projectId || projectId === "overview") {
        stopConversationPoll();
        PCONV.sessions = [];
        PCONV.sessionDirectoryByProject = Object.create(null);
        PCONV.sessionDirectoryMetaByProject = Object.create(null);
        PCONV.sessionDirectoryPromiseByProject = Object.create(null);
        PCONV.projectRuns = [];
        PCONV.runsBySession = Object.create(null);
        PCONV.sessionTimelineMap = Object.create(null);
        PCONV.debugLogScrollTop = Object.create(null);
        PCONV.bubbleExpanded = new Set();
        PCONV.bubblePendingExpand = new Set();
        PCONV.processUi = Object.create(null);
        PCONV.runDetailTabByRun = Object.create(null);
        PCONV.skillsExpandedByRun = Object.create(null);
        PCONV.businessRefsExpandedByRun = Object.create(null);
        PCONV.agentRefsExpandedByRun = Object.create(null);
        PCONV.processTrailByRun = Object.create(null);
        PCONV.timelineRequestSeq = 0;
        PCONV.timelineLoadingKey = "";
        PCONV.timelineBeforeLoadingKey = "";
        PCONV.timelineBeforeHasMoreByKey = Object.create(null);
        PCONV.timelineBeforeErrorByKey = Object.create(null);
        PCONV.autoExpandTimelineKey = "";
        PCONV.autoExpandDone = false;
        PCONV.autoExpandedLatestBubbleKey = "";
        PCONV.memoDrawerOpen = false;
        PCONV.memoDrawerSessionKey = "";
        PCONV.taskDrawerOpen = false;
        PCONV.taskDrawerSessionKey = "";
        resetConversationTaskDrawerRenderState();
        resetConversationTaskDetailViewer();
        PCONV.fileDrawerOpen = false;
        PCONV.fileDrawerSessionKey = "";
        if (STATE.panelMode === "conv") {
          buildConversationLeftList();
          buildConversationMainList(document.getElementById("fileList"));
          renderConversationDetail(true);
        } else {
          buildChannelConversationList();
          renderDetail(selectedItem());
        }
        return;
      }

      if (PCONV.lastProjectId !== projectId) {
        PCONV.lastProjectId = projectId;
        PCONV.detailMap = Object.create(null);
        PCONV.debugExpanded = new Set();
        PCONV.debugLogScrollTop = Object.create(null);
        PCONV.bubbleExpanded = new Set();
        PCONV.bubblePendingExpand = new Set();
        PCONV.processUi = Object.create(null);
        PCONV.runDetailTabByRun = Object.create(null);
        PCONV.skillsExpandedByRun = Object.create(null);
        PCONV.businessRefsExpandedByRun = Object.create(null);
        PCONV.agentRefsExpandedByRun = Object.create(null);
        PCONV.processTrailByRun = Object.create(null);
        PCONV.sessionTimelineMap = Object.create(null);
        PCONV.timelineRequestSeq = 0;
        PCONV.timelineLoadingKey = "";
        PCONV.timelineBeforeLoadingKey = "";
        PCONV.timelineBeforeHasMoreByKey = Object.create(null);
        PCONV.timelineBeforeErrorByKey = Object.create(null);
        PCONV.autoExpandTimelineKey = "";
        PCONV.autoExpandDone = false;
        PCONV.autoExpandedLatestBubbleKey = "";
        PCONV.memoDrawerOpen = false;
        PCONV.memoDrawerSessionKey = "";
        PCONV.taskDrawerOpen = false;
        PCONV.taskDrawerSessionKey = "";
        resetConversationTaskDrawerRenderState();
        resetConversationTaskDetailViewer();
        PCONV.fileDrawerOpen = false;
        PCONV.fileDrawerSessionKey = "";
      }

      PCONV.busy = true;
      try {
        // 先加载服务端会话，再与本地绑定会话合并，避免“绑定成功但列表不可见”。
        await loadChannelSessions(projectId, null);
        const serverSessions = Array.isArray(PCONV.sessions) ? PCONV.sessions : [];
        const localSessions = configuredProjectConversations(projectId);
        let baseSessions = mergeConversationSessions(localSessions, serverSessions);
        PCONV.projectRuns = [];
        PCONV.runsBySession = Object.create(null);
        for (const s of baseSessions) {
          const latestRunSummary = getSessionLatestRunSummary(s);
          const preferSyntheticPreviewSender = sessionUsesSyntheticPreviewSender(s, getSessionPrimaryPreviewText(s));
          s.lastActiveAt = String(s.lastActiveAt || latestRunSummary.updated_at || s.last_used_at || "");
          s.lastStatus = getSessionStatus(s);
          s.lastError = String(s.lastError || latestRunSummary.error || "");
          s.lastErrorHint = String(s.lastErrorHint || "");
          s.lastSpeaker = String(s.lastSpeaker || (preferSyntheticPreviewSender ? "assistant" : (latestRunSummary.speaker || "assistant")) || "assistant");
          s.lastPreview = String(getSessionPrimaryPreviewText(s) || s.lastPreview || latestRunSummary.preview || "");
          s.lastSenderType = String(s.lastSenderType || (preferSyntheticPreviewSender ? "" : (latestRunSummary.sender_type || "legacy")));
          s.lastSenderName = String(s.lastSenderName || (preferSyntheticPreviewSender ? "" : (latestRunSummary.sender_name || "")));
          s.lastSenderSource = String(s.lastSenderSource || (preferSyntheticPreviewSender ? "" : (latestRunSummary.sender_source || "legacy")));
          s.latestUserMsg = String(s.latestUserMsg || latestRunSummary.latest_user_msg || "");
          s.latestAiMsg = String(s.latestAiMsg || latestRunSummary.latest_ai_msg || "");
          s.runCount = Math.max(0, Number(s.runCount || latestRunSummary.run_count || 0) || 0);
          // 兼容新旧字段名
          const channelName = s.channel_name || s.primaryChannel;
          if (channelName) {
            s.primaryChannel = String(channelName);
            s.channel_name = String(channelName);
            if (!s.displayChannel) s.displayChannel = channelName;
          }
          if (!s.primaryChannel) s.primaryChannel = (s.channels && s.channels[0]) ? String(s.channels[0]) : "";
          if (!s.displayChannel) s.displayChannel = s.primaryChannel || s.alias || (s.sessionId || s.id);
        }

        seedConversationUnreadCursorsForSessions(projectId, baseSessions);

        PCONV.sessionDirectoryByProject[projectId] = baseSessions.slice();
        markConversationSessionDirectoryMeta(projectId, {
          liveLoaded: true,
          source: "panel",
          loadedAt: new Date().toISOString(),
          error: "",
        });
        const q = String(STATE.q || "").trim().toLowerCase();
        let sessions = baseSessions.slice();
        if (q) {
          sessions = sessions.filter((s) => {
            const hay = [
              s.alias,
              (s.sessionId || s.id),
              (s.channels || []).join(" "),
              s.lastSenderName || "",
              s.lastPreview || "",
            ].join(" ").toLowerCase();
            return hay.includes(q);
          });
        }
        sessions.sort((a, b) => {
          const ta = String(a.lastActiveAt || "");
          const tb = String(b.lastActiveAt || "");
          if (ta !== tb) return tb.localeCompare(ta);
          return String(a.alias || "").localeCompare(String(b.alias || ""), "zh-Hans-CN");
        });
        PCONV.sessions = sessions;
        PCONV.lastRefreshAt = new Date().toLocaleTimeString("zh-CN", { hour12: false });
        if (baseSessions.length) {
          const selectedSid = String(STATE.selectedSessionId || "");
          const ok = baseSessions.some((x) => String(x.sessionId || x.id || "") === selectedSid);
          const rememberedSid = readRememberedConversationSelection(projectId, STATE.channel);
          const rememberedOk = rememberedSid
            ? baseSessions.some((x) => String(x.sessionId || x.id || "") === rememberedSid)
            : false;
          const defaultSid = pickDefaultConversationSessionId(sessions.length ? sessions : baseSessions, STATE.channel);
          const preferredSid = rememberedOk ? rememberedSid : defaultSid;
          if (STATE.panelMode === "conv") {
            if (!ok) {
              STATE.selectedSessionId = preferredSid;
              STATE.selectedSessionExplicit = rememberedOk;
            } else if (!selectedSid) {
              // 仅在未选中会话时回退默认会话；若已存在选中（含刷新恢复），保持当前选中不被轮询覆盖。
              STATE.selectedSessionId = preferredSid;
              STATE.selectedSessionExplicit = rememberedOk;
            }
            if (String(STATE.selectedSessionId || "").trim()) {
              rememberConversationSelection(projectId, STATE.channel, String(STATE.selectedSessionId || ""));
            }
          } else if (!ok && selectedSid) {
            // 任务模式下不自动抢占右侧详情，仅在原会话已失效时清掉失效选中。
            STATE.selectedSessionId = "";
            STATE.selectedSessionExplicit = false;
          }
        } else {
          STATE.selectedSessionId = "";
          STATE.selectedSessionExplicit = false;
        }

        const deferConvRender = STATE.panelMode === "conv" && isConversationListScrollActive();
        if (STATE.panelMode === "conv") {
          if (deferConvRender) {
            queueDeferredConversationRender({
              panelRender: true,
              projectId,
              sessionId: String(STATE.selectedSessionId || "").trim(),
            });
          } else {
            buildConversationLeftList();
            buildConversationMainList(document.getElementById("fileList"));
            // 由 refreshConversationTimeline 统一驱动右侧重绘，避免轮询周期内重复全量重绘导致抖动。
            if (!STATE.selectedSessionId) renderConversationDetail(true);
          }
        } else {
          buildChannelConversationList();
          // 通道模式不再承载会话详情；其它非对话模式保留旧会话刷新兼容。
          if (STATE.panelMode !== "channel" && STATE.selectedSessionId) renderDetail(selectedItem());
        }
        if (STATE.panelMode !== "channel" && STATE.selectedSessionId) {
          if (deferConvRender) {
            queueDeferredConversationRender({
              panelRender: true,
              projectId,
              sessionId: String(STATE.selectedSessionId || "").trim(),
              forceScroll: false,
            });
          } else {
            refreshConversationTimeline(projectId, STATE.selectedSessionId, !STATE.selectedSessionId);
          }
        }

        const hasRuntimeWorking = baseSessions.some((s) => {
          const st = String(getSessionStatus(s) || "").trim().toLowerCase();
          return st === "running" || st === "queued" || st === "retry_waiting" || st === "external_busy";
        });
        const selectedSessionId = String(STATE.selectedSessionId || "").trim();
        const selectedSession = selectedSessionId
          ? baseSessions.find((s) => String((s && (s.sessionId || s.id)) || "").trim() === selectedSessionId)
          : null;
        const selectedRuntimeState = getSessionRuntimeState(selectedSession);
        const selectedSessionHasRuntimeWork = !!(
          selectedRuntimeState
          && (
            String(selectedRuntimeState.active_run_id || "").trim()
            || String(selectedRuntimeState.queued_run_id || "").trim()
          )
        );
        const nextPollMs = selectedSessionHasRuntimeWork ? 1200 : conversationPollDelay(hasRuntimeWorking);
        scheduleConversationPoll(nextPollMs);
      } catch (err) {
        console.error("refreshConversationPanel error:", err);
        if (String(STATE.project || "").trim() && String(STATE.project || "").trim() !== "overview") {
          scheduleConversationPoll(5000);
        } else {
          stopConversationPoll();
        }
      } finally {
        PCONV.busy = false;
      }
    }
