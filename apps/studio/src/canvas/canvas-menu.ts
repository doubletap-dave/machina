import { useCallback, useState, type MouseEvent } from "react";
import type { Edge, Node } from "@xyflow/react";
import type { MachinaNode } from "@machina/core";
import type { CanvasContextMenuTarget } from "@/components/CanvasContextMenu";

export type OpenCanvasMenu = {
  target: CanvasContextMenuTarget;
  x: number;
  y: number;
};

export function useCanvasMenu(nodes: MachinaNode[]) {
  const [menu, setMenu] = useState<OpenCanvasMenu | null>(null);
  const closeMenu = useCallback(() => setMenu(null), []);

  const onPaneContextMenu = useCallback((event: MouseEvent) => {
    event.preventDefault();
    setMenu(null);
  }, []);

  const onNodeContextMenu = useCallback(
    (event: MouseEvent, node: Node) => {
      event.preventDefault();
      const machina = nodes.find((candidate) => candidate.id === node.id);
      if (!machina) {
        return;
      }
      setMenu({
        target: { type: "node", id: node.id, nodeKind: machina.kind },
        x: event.clientX,
        y: event.clientY,
      });
    },
    [nodes],
  );

  const onEdgeContextMenu = useCallback((event: MouseEvent, edge: Edge) => {
    event.preventDefault();
    setMenu({
      target: { type: "edge", id: edge.id },
      x: event.clientX,
      y: event.clientY,
    });
  }, []);

  return { menu, closeMenu, onPaneContextMenu, onNodeContextMenu, onEdgeContextMenu };
}
