import { useCallback, useRef, useState } from "react";
import type { Connection, Edge } from "@xyflow/react";
import type { MachinaNode } from "@machina/core";
import type { NodeRegistry } from "@machina/node-sdk";
import {
  activeTypeFromConnection,
  connectionLineStyleFor,
  endConnectHighlight,
  startConnectHighlight,
} from "./connect-highlight.ts";
import { isValidMachinaConnection } from "./is-valid-connection.ts";

export function useConnectHighlight(registry: NodeRegistry, nodes: MachinaNode[]) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [activePortType, setActivePortType] = useState<string | undefined>();

  const isValidConnection = useCallback(
    (connection: Connection | Edge) =>
      isValidMachinaConnection({
        registry,
        nodes,
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle ?? null,
        targetHandle: connection.targetHandle ?? null,
      }),
    [nodes, registry],
  );

  const onConnectStart = useCallback(
    (_: unknown, params: { nodeId: string | null; handleId: string | null }) => {
      const type = activeTypeFromConnection(registry, nodes, params.nodeId, params.handleId);
      startConnectHighlight(canvasRef.current, type);
      setActivePortType(type);
    },
    [nodes, registry],
  );

  const onConnectEnd = useCallback(() => {
    endConnectHighlight(canvasRef.current);
    setActivePortType(undefined);
  }, []);

  return {
    canvasRef,
    activePortType,
    connectionLineStyle: connectionLineStyleFor(activePortType),
    isValidConnection,
    onConnectStart,
    onConnectEnd,
  };
}
