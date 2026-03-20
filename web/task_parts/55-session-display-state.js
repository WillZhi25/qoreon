    function normalizeSessionDisplayState(raw, fallback = "idle") {
      return normalizeDisplayState(raw, fallback);
    }

    function normalizeLatestRunSummary(raw) {
      const src = (raw && typeof raw === "object") ? raw : {};
      return {
        run_id: String(firstNonEmptyText([src.run_id, src.runId]) || "").trim(),
        status: normalizeSessionDisplayState(firstNonEmptyText([src.status, src.display_state, src.displayState]), "idle"),
        updated_at: String(firstNonEmptyText([src.updated_at, src.updatedAt, src.finished_at, src.finishedAt, src.created_at, src.createdAt]) || "").trim(),
        preview: String(firstNonEmptyText([src.preview, src.last_preview, src.lastPreview]) || "").trim(),
        speaker: String(firstNonEmptyText([src.speaker, src.last_speaker, src.lastSpeaker]) || "assistant").trim() || "assistant",
        sender_type: String(firstNonEmptyText([src.sender_type, src.senderType, src.last_sender_type, src.lastSenderType]) || "").trim(),
        sender_name: String(firstNonEmptyText([src.sender_name, src.senderName, src.last_sender_name, src.lastSenderName]) || "").trim(),
        sender_source: String(firstNonEmptyText([src.sender_source, src.senderSource, src.last_sender_source, src.lastSenderSource]) || "").trim(),
        latest_user_msg: String(firstNonEmptyText([src.latest_user_msg, src.latestUserMsg]) || "").trim(),
        latest_ai_msg: String(firstNonEmptyText([src.latest_ai_msg, src.latestAiMsg]) || "").trim(),
        error: String(firstNonEmptyText([src.error, src.last_error, src.lastError]) || "").trim(),
        run_count: Math.max(0, Number(firstNonEmptyText([src.run_count, src.runCount, 0])) || 0),
      };
    }

    function getSessionLatestRunSummary(session) {
      const s = (session && typeof session === "object") ? session : {};
      return normalizeLatestRunSummary(s.latest_run_summary || s.latestRunSummary || null);
    }

    function getSessionDisplayState(session) {
      const s = (session && typeof session === "object") ? session : {};
      const raw = firstNonEmptyText([
        s.session_display_state,
        s.sessionDisplayState,
      ]);
      const runtimeState = getSessionRuntimeState(s);
      const rawState = normalizeSessionDisplayState(raw, "");
      const runtimeDisplay = normalizeSessionDisplayState(runtimeState.display_state, "idle");
      const latestRunSummary = getSessionLatestRunSummary(s);
      const latestStatus = normalizeSessionDisplayState(latestRunSummary.status, "");
      const isActiveLike = (one) => (
        one === "running"
        || one === "queued"
        || one === "retry_waiting"
        || one === "external_busy"
      );

      // 运行时显式态优先，避免旧的 session_display_state 把已恢复/已中断会话继续显示成处理中。
      if (runtimeDisplay === "error" || isActiveLike(runtimeDisplay)) return runtimeDisplay;

      if (isExplicitIdleRuntimeState(runtimeState)) {
        if (isActiveLike(rawState)) {
          if (latestStatus === "done" || latestStatus === "error") return latestStatus;
          return "idle";
        }
        if (rawState === "done" || rawState === "error") return rawState;
        if (latestStatus === "done" || latestStatus === "error") return latestStatus;
        return "idle";
      }

      if (rawState) return rawState;
      if (latestStatus === "done" || latestStatus === "error") return latestStatus;
      return runtimeDisplay;
    }

    function getSessionDisplayReason(session) {
      const s = (session && typeof session === "object") ? session : {};
      return String(firstNonEmptyText([s.session_display_reason, s.sessionDisplayReason]) || "").trim();
    }

    function isLatestRunSummaryTerminal(summary) {
      const latest = normalizeLatestRunSummary(summary);
      return latest.status === "done" || latest.status === "error";
    }

    function latestRunSummaryUpdatedAt(session) {
      return String(getSessionLatestRunSummary(session).updated_at || "").trim();
    }
