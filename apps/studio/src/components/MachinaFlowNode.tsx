"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { PortDef } from "@machina/core";
import { portLanguage } from "@machina/ui";
import { PortSymbol } from "@/canvas/port-symbol";

type MachinaNodeData = {
  label: string;
  ports: Record<string, PortDef>;
};

export function MachinaFlowNode({ data }: NodeProps) {
  const nodeData = data as MachinaNodeData;
  const portEntries = Object.entries(nodeData.ports);

  return (
    <div
      data-machina-node
      className="min-w-40 rounded border px-3 py-2 text-sm shadow-lg"
      style={{
        background: "var(--machina-node-fill)",
        borderColor: "var(--machina-node-stroke)",
        color: "var(--machina-text)",
      }}
    >
      <div className="mb-2 font-medium">{nodeData.label}</div>
      <div className="space-y-1">
        {portEntries.map(([key, port]) => (
          <div key={key} className="relative flex items-center justify-between text-xs" style={{ color: "var(--machina-text-muted)" }}>
            {port.dir === "in" ? (
              <>
                <PortHandle handleId={key} port={port} />
                <span className="pl-3">{port.label}</span>
              </>
            ) : (
              <>
                <span className="pr-3">{port.label}</span>
                <PortHandle handleId={key} port={port} />
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function PortHandle({ handleId, port }: { handleId: string; port: PortDef }) {
  const lang = portLanguage(port.type);
  return (
    <Handle
      id={handleId}
      type={port.dir === "in" ? "target" : "source"}
      position={port.dir === "in" ? Position.Left : Position.Right}
      title={lang.label}
      aria-label={lang.label}
      data-port-type={port.type}
      className="!flex !h-3.5 !w-3.5 !items-center !justify-center"
      style={{ backgroundColor: lang.color, borderColor: lang.color }}
    >
      <PortSymbol id={lang.symbol} />
    </Handle>
  );
}
