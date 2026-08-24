import type { AgentAction, ObservationPacket } from "@machina/core";
import {
  Annotation,
  END,
  MemorySaver,
  START,
  StateGraph,
  type CompiledStateGraph,
} from "@langchain/langgraph";
import type { BaseCheckpointSaver } from "@langchain/langgraph-checkpoint";
import { createAgentCheckpointer } from "./checkpointer.ts";

export type Usage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

export type ThinkResult = { action: AgentAction; usage: Usage };

export type AgentRuntime = {
  think(packet: ObservationPacket, threadId: string): Promise<ThinkResult>;
  possessWait(
    packet: ObservationPacket,
    threadId: string,
  ): Promise<{
    status: "interrupted";
    packet: ObservationPacket;
    legalActions: string[];
  }>;
  resumePossess(threadId: string, action: AgentAction): Promise<ThinkResult>;
};

const AgentState = Annotation.Root({
  packet: Annotation<ObservationPacket>,
  action: Annotation<AgentAction>,
  usage: Annotation<Usage>,
});

type AgentStateType = typeof AgentState.State;

type Invoker = (
  packet: ObservationPacket,
) => Promise<{ action: AgentAction; usage: Usage }>;

export function compileAgentGraph(
  nodeId: string,
  invoker: Invoker,
  checkpointer?: BaseCheckpointSaver,
): CompiledStateGraph<AgentStateType, Partial<AgentStateType>, string> {
  const decide = async (state: AgentStateType) => {
    const result = await invoker(state.packet);
    return { action: result.action, usage: result.usage };
  };

  return new StateGraph(AgentState)
    .addNode("decide", decide)
    .addEdge(START, "decide")
    .addEdge("decide", END)
    .compile({
      checkpointer: checkpointer ?? new MemorySaver(),
    });
}

const zeroUsage: Usage = {
  inputTokens: 0,
  outputTokens: 0,
  totalTokens: 0,
};

export function createAgentRuntime(opts: {
  nodeId: string;
  invoker: Invoker;
  checkpointer?: BaseCheckpointSaver;
}): AgentRuntime {
  const graph = compileAgentGraph(opts.nodeId, opts.invoker, opts.checkpointer);
  const possessPackets = new Map<string, ObservationPacket>();

  return {
    async think(packet, threadId) {
      const result = await graph.invoke(
        { packet },
        { configurable: { thread_id: threadId } },
      );
      return { action: result.action, usage: result.usage };
    },

    async possessWait(packet, threadId) {
      possessPackets.set(threadId, packet);
      return {
        status: "interrupted",
        packet,
        legalActions: packet.legalActions,
      };
    },

    async resumePossess(threadId, action) {
      possessPackets.delete(threadId);
      return { action, usage: zeroUsage };
    },
  };
}

export { createAgentCheckpointer };
