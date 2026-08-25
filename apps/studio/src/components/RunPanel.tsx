"use client";

import type { ObservationPacket } from "@machina/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getStudioClient } from "@/lib/machina-client";
import { useProjectSnapshot } from "@/lib/project-store-context";
import { AnalyzeTab } from "@/run/AnalyzeTab";
import { PossessPanel } from "@/run/PossessPanel";
import { legalPossessTargets, type Stance } from "@/run/stance";

type RunPanelProps = {
  onError: (message: string) => void;
  onPausedChange?: (paused: boolean) => void;
  possessRequest?: string | null;
  onPossessConsumed?: () => void;
  stance: Stance;
  onStanceChange: (stance: Stance) => void;
  onTurn?: (turn: number) => void;
};

export function RunPanel({
  onError,
  onPausedChange,
  possessRequest,
  onPossessConsumed,
  stance,
  onStanceChange,
  onTurn,
}: RunPanelProps) {
  const store = useProjectSnapshot();
  const [runId, setRunId] = useState<string | null>(null);
  const [turn, setTurn] = useState(0);
  const [busy, setBusy] = useState(false);
  const [paused, setPaused] = useState(false);
  const [packet, setPacket] = useState<ObservationPacket | null>(null);

  const possessTargets = useMemo(
    () => legalPossessTargets(store.getProject(), store.getSelectedNodeId()),
    [store],
  );
  const possessNodeId = stance.nodeId ?? possessTargets[0];

  const reportPaused = useCallback(
    (next: boolean) => {
      setPaused(next);
      onPausedChange?.(next);
    },
    [onPausedChange],
  );

  const reportTurn = useCallback(
    (next: number) => {
      setTurn(next);
      onTurn?.(next);
    },
    [onTurn],
  );

  useEffect(() => {
    const client = getStudioClient();
    return client.subscribe((msg) => {
      if (msg.type === "possess-wait") {
        setPacket(msg.packet);
      } else if (msg.type === "turn") {
        reportTurn(msg.turn);
      } else if (msg.type === "error") {
        onError(msg.message);
      }
    });
  }, [onError, reportTurn]);

  const start = useCallback(async () => {
    const client = getStudioClient();
    setBusy(true);
    try {
      const compiled = await client.compile(store.getProject(), store.getKinds());
      if (!compiled.ok) {
        onError(compiled.errors.map((error) => error.message).join(" "));
        return;
      }
      const result = await client.startRun({
        project: store.getProject(),
        seed: 7,
        stance: stance.mode,
        possessNodeId,
        kinds: store.getKinds(),
      });
      setRunId(result.id);
      reportTurn(0);
      reportPaused(false);
      setPacket(null);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Could not reach runtime.");
    } finally {
      setBusy(false);
    }
  }, [onError, possessNodeId, reportPaused, reportTurn, stance.mode, store]);

  const step = useCallback(async () => {
    if (!runId) {
      return;
    }
    const client = getStudioClient();
    setBusy(true);
    try {
      const result = await client.step(runId);
      reportTurn(result.turn);
      reportPaused(false);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Step failed.");
    } finally {
      setBusy(false);
    }
  }, [onError, reportPaused, reportTurn, runId]);

  const pause = useCallback(async () => {
    if (!runId) {
      return;
    }
    try {
      await getStudioClient().pause(runId);
      reportPaused(true);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Pause failed.");
    }
  }, [onError, reportPaused, runId]);

  const rewind = useCallback(
    async (nextTurn: number) => {
      if (!runId) {
        return;
      }
      const client = getStudioClient();
      try {
        await client.rewind(runId, nextTurn);
        const status = await client.getRun(runId);
        reportTurn(status.turn);
      } catch (error) {
        onError(error instanceof Error ? error.message : "Rewind failed.");
      }
    },
    [onError, reportTurn, runId],
  );

  useEffect(() => {
    if (stance.mode !== "possess") {
      setPacket(null);
    }
  }, [stance.mode]);

  const prevStance = useRef(stance);
  useEffect(() => {
    const stanceChanged =
      prevStance.current.mode !== stance.mode || prevStance.current.nodeId !== stance.nodeId;
    prevStance.current = stance;
    if (!runId || !stanceChanged) {
      return;
    }
    void getStudioClient()
      .setStance(runId, stance.mode, stance.nodeId)
      .catch((error: unknown) => {
        onError(error instanceof Error ? error.message : "Stance update failed.");
      });
  }, [onError, runId, stance]);

  useEffect(() => {
    if (!possessRequest) {
      return;
    }
    onStanceChange({ mode: "possess", nodeId: possessRequest });
    onPossessConsumed?.();
  }, [onPossessConsumed, onStanceChange, possessRequest]);

  const submitPossessAction = useCallback(
    async (action: string) => {
      if (!runId || !possessNodeId) {
        return;
      }
      try {
        await getStudioClient().submitAction(runId, {
          actorId: possessNodeId,
          type: action,
          params: {},
        });
        setPacket(null);
      } catch (error) {
        onError(error instanceof Error ? error.message : "Possess action failed.");
      }
    },
    [onError, possessNodeId, runId],
  );

  return (
    <div
      className="flex min-h-0 flex-1 flex-col gap-4 p-4 text-sm"
      style={{ color: "var(--machina-text)" }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy}
          className="rounded bg-neutral-200 px-3 py-1 font-medium text-black disabled:opacity-50"
          onClick={() => void start()}
        >
          {runId ? "Restart run" : "Start run"}
        </button>
        <button
          type="button"
          disabled={busy || !runId}
          className="rounded border border-neutral-700 px-3 py-1 disabled:opacity-50"
          onClick={() => void step()}
        >
          Step
        </button>
        <button
          type="button"
          disabled={!runId || paused}
          className="rounded border border-neutral-700 px-3 py-1 disabled:opacity-50"
          onClick={() => void pause()}
        >
          Pause
        </button>
        <span style={{ color: "var(--machina-text-muted)" }}>Turn {turn}</span>
      </div>

      {stance.mode === "possess" && packet ? (
        <PossessPanel
          packet={packet}
          onAction={(action) => void submitPossessAction(action)}
        />
      ) : null}

      <AnalyzeTab maxTurn={turn} turn={turn} onRewind={(next) => void rewind(next)} />
    </div>
  );
}
