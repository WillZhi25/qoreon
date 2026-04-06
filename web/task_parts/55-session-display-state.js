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

    function normalizeSessionHealthState(raw, fallback = "") {
      const s = String(raw || "").trim().toLowerCase();
      if (s === "healthy" || s === "busy" || s === "blocked" || s === "recovering" || s === "attention") {
        return s;
      }
      return String(fallback || "").trim().toLowerCase();
    }

    function normalizeRunOutcomeState(raw, fallback = "") {
      const s = String(raw || "").trim().toLowerCase();
      if (
        s === "success"
        || s === "interrupted_infra"
        || s === "interrupted_user"
        || s === "failed_config"
        || s === "failed_business"
        || s === "recovered_notice"
      ) {
        return s;
      }
      return String(fallback || "").trim().toLowerCase();
    }

    function normalizeRunErrorClass(raw, fallback = "") {
      const s = String(raw || "").trim().toLowerCase();
      if (
        s === "infra_restart"
        || s === "infra_restart_recovered"
        || s === "session_binding"
        || s === "workspace_permission"
        || s === "cli_path"
      ) {
        return s;
      }
      return String(fallback || "").trim().toLowerCase();
    }

    function normalizeLatestEffectiveRunSummary(raw) {
      const src = (raw && typeof raw === "object") ? raw : {};
      return {
        run_id: String(firstNonEmptyText([src.run_id, src.runId]) || "").trim(),
        outcome_state: normalizeRunOutcomeState(firstNonEmptyText([src.outcome_state, src.outcomeState]), ""),
        preview: String(firstNonEmptyText([src.preview, src.last_preview, src.lastPreview]) || "").trim(),
        created_at: String(firstNonEmptyText([src.created_at, src.createdAt, src.updated_at, src.updatedAt]) || "").trim(),
      };
    }

    function getSessionLatestRunSummary(session) {
      const s = (session && typeof session === "object") ? session : {};
      return normalizeLatestRunSummary(s.latest_run_summary || s.latestRunSummary || null);
    }

    function getSessionHealthState(session) {
      const s = (session && typeof session === "object") ? session : {};
      return normalizeSessionHealthState(
        firstNonEmptyText([s.session_health_state, s.sessionHealthState]),
        ""
      );
    }

    function getSessionLatestEffectiveRunSummary(session) {
      const s = (session && typeof session === "object") ? session : {};
      return normalizeLatestEffectiveRunSummary(
        s.latest_effective_run_summary || s.latestEffectiveRunSummary || null
      );
    }

    function getSessionPrimaryPreviewText(session) {
      const s = (session && typeof session === "object") ? session : {};
      const latestEffectiveRunSummary = getSessionLatestEffectiveRunSummary(s);
      const latestRunSummary = getSessionLatestRunSummary(s);
      const displayState = normalizeSessionDisplayState(getSessionDisplayState(s), "idle");
      const isActiveLike = (
        displayState === "running"
        || displayState === "queued"
        || displayState === "retry_waiting"
        || displayState === "external_busy"
      );
      if (isActiveLike) {
        return String(firstNonEmptyText([
          latestRunSummary.preview,
          s.lastPreview,
          latestEffectiveRunSummary.preview,
        ]) || "").trim();
      }
      return String(firstNonEmptyText([
        latestEffectiveRunSummary.preview,
        s.lastPreview,
        latestRunSummary.preview,
      ]) || "").trim();
    }

    function sessionUsesSyntheticPreviewSender(session, previewText = "") {
      const s = (session && typeof session === "object") ? session : {};
      const latestEffectiveRunSummary = getSessionLatestEffectiveRunSummary(s);
      const latestRunSummary = getSessionLatestRunSummary(s);
      const effectivePreview = String(latestEffectiveRunSummary.preview || "").trim();
      const currentPreview = String(previewText || "").trim();
      if (!effectivePreview) return false;
      if (currentPreview && currentPreview !== effectivePreview) return false;
      const effectiveRunId = String(latestEffectiveRunSummary.run_id || "").trim();
      const latestRunId = String(latestRunSummary.run_id || "").trim();
      const latestSenderType = String(latestRunSummary.sender_type || "").trim().toLowerCase();
      return (
        (effectiveRunId && latestRunId && effectiveRunId !== latestRunId)
        || latestSenderType === "system"
      );
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
      const sessionHealthState = getSessionHealthState(s);
      const latestEffectiveRunSummary = getSessionLatestEffectiveRunSummary(s);
      const latestEffectiveOutcomeState = normalizeRunOutcomeState(latestEffectiveRunSummary.outcome_state, "");
      const latestStatus = normalizeSessionDisplayState(latestRunSummary.status, "");
      const isActiveLike = (one) => (
        one === "running"
        || one === "queued"
        || one === "retry_waiting"
        || one === "external_busy"
      );

      // 运行时显式态优先，避免旧的 session_display_state 把已恢复/已中断会话继续显示成处理中。
      if (runtimeDisplay === "error" || isActiveLike(runtimeDisplay)) return runtimeDisplay;
      if (sessionHealthState === "busy") {
        if (isActiveLike(latestStatus)) return latestStatus;
        return "running";
      }
      if (sessionHealthState === "recovering") return "retry_waiting";
      if (sessionHealthState === "blocked") return "error";
      if (sessionHealthState === "attention") {
        if (latestEffectiveOutcomeState === "interrupted_infra" || latestEffectiveOutcomeState === "interrupted_user") {
          return "interrupted";
        }
        if (latestEffectiveOutcomeState === "failed_config" || latestEffectiveOutcomeState === "failed_business") {
          return "error";
        }
      }

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
