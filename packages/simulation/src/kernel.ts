import type { MachinaEvent, ObservationPacket } from "@machina/core";
import type { InstrumentMsg } from "./instrument.ts";
import { createRng } from "./rng.ts";
import type { Kernel, ThinkFn, TrueWorldState } from "./types.ts";

type PendingIntervention = {
  path: string;
  value: unknown;
  noticeable: boolean;
};

function cloneState(state: TrueWorldState): TrueWorldState {
  return structuredClone(state);
}

function createInitialState(actorIds: string[]): TrueWorldState {
  const actors: TrueWorldState["actors"] = {};
  for (const actorId of actorIds) {
    actors[actorId] = { name: actorId, resources: { economy: 50 } };
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

function buildPacket(
  state: TrueWorldState,
  actorId: string,
  rng: { next(): number },
): ObservationPacket {
  const noise = rng.next() > 0.5 ? 7 : -7;
  return {
    actorId,
    turn: state.turn,
    observations: [
      {
        attribute: "enemy.economy",
        value: 50 + noise,
        confidence: 0.5,
        ageTurns: 0,
        source: "osint",
      },
    ],
    memory: null,
    goals: null,
    personality: null,
    legalActions: ["wait", "signal"],
  };
}

export function createKernel(opts: {
  seed: number;
  actorIds: string[];
  think: ThinkFn;
  onInstrument?: (msg: InstrumentMsg) => void;
}): Kernel {
  const rng = createRng(opts.seed);
  let state = createInitialState(opts.actorIds);
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
      return buildPacket(state, actorId, rng);
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
        events.push(
          nextEvent(state.turn, "intervention", {
            path: pendingIntervention.path,
            value: pendingIntervention.value,
            noticeable: pendingIntervention.noticeable,
          }),
        );
        pendingIntervention = null;
        this.paused = false;
      } else {
        state.turn += 1;
      }

      opts.onInstrument?.({ type: "turn", turn: state.turn });

      events.push(nextEvent(state.turn, "tick", {}));

      for (const actorId of opts.actorIds) {
        opts.onInstrument?.({ type: "node-active", nodeId: actorId });
        opts.onInstrument?.({
          type: "edge-pulse",
          from: actorId,
          to: actorId,
          portType: "OBSERVATION",
        });
        const packet = buildPacket(state, actorId, rng);
        const action = await opts.think({ nodeId: actorId, packet });
        opts.onInstrument?.({
          type: "edge-pulse",
          from: actorId,
          to: actorId,
          portType: "ACTION",
        });
        events.push(nextEvent(state.turn, "action", action));
      }

      const snapshot = cloneState(state);
      snapshots.set(state.turn, snapshot);

      return { events, snapshot };
    },
  };
}
