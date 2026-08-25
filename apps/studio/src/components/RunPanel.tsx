"use client";

import type { ObservationPacket } from "@machina/core";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getStudioClient } from "@/lib/machina-client";
import { useProjectSnapshot } from "@/lib/project-store-context";
import { AnalyzeTab } from "@/run/AnalyzeTab";
import { PossessPanel } from "@/run/PossessPanel";
import { StanceBar } from "@/run/StanceBar";
import { legalPossessTargets, type Stance } from "@/run/stance";

type RunPanelProps = {
  onError: (message: string) => void;
};

export function RunPanel({ onError }: RunPanelProps) {
  const store = useProjectSnapshot();
  const [runId, setRunId] = useState<string | null>(null);
  const [turn, setTurn] = useState(0);
  const [stance, setStanceState] = useState<Stance>({ mode: "watch" });
  const [busy, setBusy] = useState(false);
  const [paused, setPaused] = useState(false);
  const [packet, setPacket] = useState<ObservationPacket | null>(null);

  const possessTargets = useMemo(
    () => legalPossessTargets(store.getProject(), store.getSelectedNodeId()),
    [store],
  );
  const possessNodeId = stance.nodeId ?? possessTargets[0];

  useEffect(() => {
    const client = getStudioClient();
    return client.subscribe((msg) => {
      if (msg.type === "possess-wait") {
        setPacket(msg.packet);
      } else if (msg.type === "turn") {
        setTurn(msg.turn);
      } else if (msg.type === "error") {
        onError(msg.message);
      }
    });
  }, [onError]);

  const start = useCallback(async () => {
    const client = getStudioClient();
    setBusy(true);
    try {
      const compiled = await client.compile(store.getProject());
      if (!compiled.ok) {
        onError(compiled.errors.map((error) => error.message).join(" "));
        return;
      }
      const result = await client.startRun({ project: store.getProject(), seed: 7 });
      setRunId(result.id);
      setTurn(0);
      setPaused(false);
      setPacket(null);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Could not reach runtime.");
    } finally {
      setBusy(false);
    }
  }, [onError, store]);

  const step = useCallback(async () => {
    if (!runId) {
      return;
    }
    const client = getStudioClient();
    setBusy(true);
    try {
      const result = await client.step(runId);
      setTurn(result.turn);
      setPaused(false);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Step failed.");
    } finally {
      setBusy(false);
    }
  }, [onError, runId]);

  const pause = useCallback(async () => {
    if (!runId) {
      return;
    }
    try {
      await getStudioClient().pause(runId);
      setPaused(true);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Pause failed.");
    }
  }, [onError, runId]);

  const rewind = useCallback(
    async (nextTurn: number) => {
      if (!runId) {
        return;
      }
      const client = getStudioClient();
      try {
        await client.rewind(runId, nextTurn);
        const status = await client.getRun(runId);
        setTurn(status.turn);
      } catch (error) {
        onError(error instanceof Error ? error.message : "Rewind failed.");
      }
    },
    [onError, runId],
  );

  const changeStance = useCallback(
    async (next: Stance) => {
      const withTarget =
        next.mode === "possess"
          ? { ...next, nodeId: next.nodeId ?? possessTargets[0] }
          : next;
      setStanceState(withTarget);
      if (withTarget.mode !== "possess") {
        setPacket(null);
      }
      if (!runId) {
        return;
      }
      try {
        await getStudioClient().setStance(runId, withTarget.mode, withTarget.nodeId);
      } catch (error) {
        onError(error instanceof Error ? error.message : "Stance update failed.");
      }
    },
    [onError, possessTargets, runId],
  );

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
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 text-sm text-neutral-200">
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
        <span className="text-neutral-400">Turn {turn}</span>
      </div>

      <StanceBar stance={stance} onChange={(next) => void changeStance(next)} />

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
