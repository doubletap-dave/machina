import type { ReactNode } from "react";
import type { PortSymbolId } from "@machina/ui";

const SIZE = 10;
const STROKE = 1.5;

export function PortSymbol({ id }: { id: PortSymbolId }) {
  return (
    <svg
      width={SIZE}
      height={SIZE}
      viewBox="0 0 10 10"
      aria-hidden="true"
      data-port-symbol={id}
      className="pointer-events-none"
      style={{ color: "#171717" }}
    >
      <g fill="none" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round">
        {glyph(id)}
      </g>
    </svg>
  );
}

function glyph(id: PortSymbolId): ReactNode {
  switch (id) {
    case "clock":
      return (
        <>
          <circle cx="5" cy="5" r="3.25" />
          <line x1="5" y1="5" x2="5" y2="2.8" />
          <line x1="5" y1="5" x2="7.15" y2="5.45" />
        </>
      );
    case "eye":
      return (
        <>
          <path d="M1.2 5 Q5 1.7 8.8 5 Q5 8.3 1.2 5Z" />
          <circle cx="5" cy="5" r="0.95" fill="currentColor" stroke="none" />
        </>
      );
    case "play":
      return <polygon points="2.6,1.8 8.5,5 2.6,8.2" fill="currentColor" stroke="none" />;
    case "burst":
      return (
        <>
          <line x1="5" y1="1.3" x2="5" y2="8.7" />
          <line x1="1.3" y1="5" x2="8.7" y2="5" />
          <line x1="2.4" y1="2.4" x2="7.6" y2="7.6" />
          <line x1="7.6" y1="2.4" x2="2.4" y2="7.6" />
        </>
      );
    case "envelope":
      return (
        <>
          <rect x="1.35" y="2.35" width="7.3" height="5.3" />
          <polyline points="1.35,2.35 5,5.7 8.65,2.35" />
        </>
      );
    case "coin":
      return (
        <>
          <circle cx="5" cy="5" r="3.25" />
          <line x1="5" y1="3.05" x2="5" y2="6.95" />
        </>
      );
    case "mask":
      return (
        <>
          <path d="M1.7 3.4 Q5 1.5 8.3 3.4 L8.4 6.1 Q5 8.7 1.6 6.1Z" />
          <circle cx="3.55" cy="4.55" r="0.55" fill="currentColor" stroke="none" />
          <circle cx="6.45" cy="4.55" r="0.55" fill="currentColor" stroke="none" />
          <path d="M3.3 6.25 Q5 7.45 6.7 6.25" />
        </>
      );
    case "flag":
      return (
        <>
          <line x1="2.4" y1="1.5" x2="2.4" y2="8.5" />
          <path d="M2.4 1.7 L8.3 3.35 L2.4 5.1Z" />
        </>
      );
    case "book":
      return (
        <>
          <path d="M5 2.2 L1.7 3.15 L1.7 8.15 L5 7.15Z" />
          <path d="M5 2.2 L8.3 3.15 L8.3 8.15 L5 7.15Z" />
          <line x1="5" y1="2.2" x2="5" y2="7.15" />
        </>
      );
    case "link":
      return (
        <>
          <circle cx="3.55" cy="5" r="2.15" />
          <circle cx="6.45" cy="5" r="2.15" />
        </>
      );
    case "radio":
      return (
        <>
          <rect x="1.55" y="4.55" width="6.9" height="3.55" />
          <line x1="5" y1="4.55" x2="7.25" y2="1.65" />
          <circle cx="7.25" cy="1.65" r="0.45" fill="currentColor" stroke="none" />
        </>
      );
    case "globe":
      return (
        <>
          <circle cx="5" cy="5" r="3.25" />
          <ellipse cx="5" cy="5" rx="1.35" ry="3.25" />
          <line x1="1.75" y1="5" x2="8.25" y2="5" />
        </>
      );
    case "person":
      return (
        <>
          <circle cx="5" cy="2.75" r="1.45" />
          <path d="M2.05 8.55 C2.2 5.7 7.8 5.7 7.95 8.55" />
        </>
      );
    default: {
      const _never: never = id;
      return _never;
    }
  }
}
