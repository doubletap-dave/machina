"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { PortDef } from "@machina/core";

type MachinaNodeData = {
  label: string;
  ports: Record<string, PortDef>;
};

export function MachinaFlowNode({ data }: NodeProps) {
  const nodeData = data as MachinaNodeData;
  const portEntries = Object.entries(nodeData.ports);

  return (
    <div className="min-w-40 rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 shadow-lg">
      <div className="mb-2 font-medium">{nodeData.label}</div>
      <div className="space-y-1">
        {portEntries.map(([key, port]) => (
          <div key={key} className="relative flex items-center justify-between text-xs text-neutral-400">
            {port.dir === "in" ? (
              <>
                <Handle
                  id={key}
                  type="target"
                  position={Position.Left}
                  className="!h-2 !w-2 !border-neutral-500 !bg-neutral-300"
                />
                <span className="pl-3">{port.label}</span>
              </>
            ) : (
              <>
                <span className="pr-3">{port.label}</span>
                <Handle
                  id={key}
                  type="source"
                  position={Position.Right}
                  className="!h-2 !w-2 !border-neutral-500 !bg-neutral-300"
                />
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
