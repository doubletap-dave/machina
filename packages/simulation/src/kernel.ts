import type { AgentPacket, MachinaEvent, ObservationPacket } from "@machina/core";
import type { InstrumentMsg } from "./instrument.ts";
import { createRng } from "./rng.ts";
import type { CreateKernelOpts, Kernel, TrueWorldState } from "./types.ts";

type PendingIntervention = {
  path: string;
  value: unknown;
  noticeable: boolean;
};

function cloneState(state: TrueWorldState): TrueWorldState {
  return structuredClone(state);
}

function createInitialState(
  actorIds: string[],
  actorNames?: Record<string, string>,
): TrueWorldState {
  const actors: TrueWorldState["actors"] = {};
  for (const actorId of actorIds) {
    actors[actorId] = { name: actorNames?.[actorId] ?? actorId, resources: { economy: 50 } };
  }
  return { turn: 0, actors };
}

function applyPath(state: TrueWorldState, path: string, value: unknown): void {
  const [root, actorId, resourcesKey, resource] = path.split(".");
  if (root !== "actors" || resourcesKey !== "resources" || !actorId || !resource) {
    throw new Error(`Unsupported intervention path: ${path}`);
  }
  const actor = state.actors[actorId];
  if (!actor) {
    throw new Error(`Unknown actor in path: ${path}`);
  }
  actor.resources[resource] = value as number;
}

function observationNoise(rng: { next(): number }, fog?: number): number {
  const amplitude = 7 * (fog === undefined ? 1 : fog / 50);
  return rng.next() > 0.5 ? amplitude : -amplitude;
}

function buildPacket(
  state: TrueWorldState,
  actorId: string,
  rng: { next(): number },
  packets?: Record<string, AgentPacket>,
  fog?: number,
): ObservationPacket {
  const wired = packets?.[actorId];
  return {
    actorId,
    turn: state.turn,
    observations: [
      {
        attribute: "enemy.economy",
        value: 50 + observationNoise(rng, fog),
        confidence: 0.5,
        ageTurns: 0,
        source: "osint",
      },
    ],
    memory: wired?.memory ?? null,
    goals: wired?.goals ?? null,
    personality: wired?.personality ?? null,
    legalActions: ["wait", "signal"],
  };
}

function emitLog(
  onInstrument: ((msg: InstrumentMsg) => void) | undefined,
  enabled: boolean | undefined,
  record: "event" | "action",
  turn: number,
  payload: unknown,
): void {
  if (!enabled) {
    return;
  }
  onInstrument?.({ type: "log", record, turn, payload });
}

export function createKernel(opts: CreateKernelOpts): Kernel {
  const rng = createRng(opts.seed);
  let state = createInitialState(opts.actorIds, opts.actorNames);
  const snapshots = new Map<number, TrueWorldState>([[0, cloneState(state)]]);
  let pendingIntervention: PendingIntervention | null = null;
  let eventCounter = 0;

  const nextEvent = (turn: number, kind: string, payload: unknown = {}): MachinaEvent => ({
    id: `${turn}-${kind}-${eventCounter++}`,
    turn,
    kind,
    payload,
  });

  return {
    paused: false,

    applyIntervention(payload) {
      if (!this.paused) {
        throw new Error("Pause the world before changing it.");
      }
      pendingIntervention = payload;
    },

    getTruth() {
      return cloneState(state);
    },

    peekPacket(actorId) {
      if (!(actorId in state.actors)) {
        throw new Error(`Unknown actor: ${actorId}`);
      }
      return buildPacket(state, actorId, rng.clone(), opts.packets, opts.fog);
    },

    rewind(turn) {
      const snapshot = snapshots.get(turn);
      if (!snapshot) {
        throw new Error(`No snapshot for turn ${turn}`);
      }
      state = cloneState(snapshot);
      for (const key of [...snapshots.keys()]) {
        if (key > turn) {
          snapshots.delete(key);
        }
      }
    },

    async runTurn() {
      const events: MachinaEvent[] = [];

      if (this.paused && pendingIntervention) {
        applyPath(state, pendingIntervention.path, pendingIntervention.value);
        state.turn += 1;
        const intervention = nextEvent(state.turn, "intervention", {
          path: pendingIntervention.path,
          value: pendingIntervention.value,
          noticeable: pendingIntervention.noticeable,
        });
        events.push(intervention);
        emitLog(opts.onInstrument, opts.logEvents, "event", state.turn, intervention);
        pendingIntervention = null;
        this.paused = false;
      } else {
        state.turn += 1;
      }

      opts.onInstrument?.({ type: "turn", turn: state.turn });

      const tick = nextEvent(state.turn, "tick", {});
      events.push(tick);
      emitLog(opts.onInstrument, opts.logEvents, "event", state.turn, tick);

      for (const actorId of opts.actorIds) {
        opts.onInstrument?.({ type: "node-active", nodeId: actorId });
        opts.onInstrument?.({
          type: "edge-pulse",
          from: actorId,
          to: actorId,
          portType: "OBSERVATION",
        });
        const packet = buildPacket(state, actorId, rng, opts.packets, opts.fog);
        const action = await opts.think({ nodeId: actorId, packet });
        opts.onInstrument?.({
          type: "edge-pulse",
          from: actorId,
          to: actorId,
          portType: "ACTION",
        });
        events.push(nextEvent(state.turn, "action", action));
        emitLog(opts.onInstrument, opts.logActions, "action", state.turn, action);
      }

      const snapshot = cloneState(state);
      snapshots.set(state.turn, snapshot);

      return { events, snapshot };
    },
  };
}
