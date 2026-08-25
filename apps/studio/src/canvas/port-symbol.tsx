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
    >
      {glyph(id)}
    </svg>
  );
}

function glyph(id: PortSymbolId): ReactNode {
  switch (id) {
    case "disk":
      return <circle cx="5" cy="5" r="3.5" fill="currentColor" />;
    case "ring":
      return <circle cx="5" cy="5" r="3.25" fill="none" stroke="currentColor" strokeWidth={STROKE} />;
    case "triangle":
      return <polygon points="5,1.4 8.9,8.6 1.1,8.6" fill="currentColor" />;
    case "plus":
      return (
        <>
          <rect x="4.15" y="1.4" width="1.7" height="7.2" fill="currentColor" />
          <rect x="1.4" y="4.15" width="7.2" height="1.7" fill="currentColor" />
        </>
      );
    case "chevron":
      return <polygon points="2,1.6 8.2,5 2,8.4 2,6.4 5.4,5 2,3.6" fill="currentColor" />;
    case "square":
      return <rect x="1.8" y="1.8" width="6.4" height="6.4" fill="currentColor" />;
    case "hex":
      return <polygon points="5,1.2 8.6,3.1 8.6,6.9 5,8.8 1.4,6.9 1.4,3.1" fill="currentColor" />;
    case "diamond":
      return <polygon points="5,1.2 8.8,5 5,8.8 1.2,5" fill="currentColor" />;
    case "bar":
      return <rect x="1.3" y="3.9" width="7.4" height="2.2" fill="currentColor" />;
    case "double-ring":
      return (
        <>
          <circle cx="5" cy="5" r="3.6" fill="none" stroke="currentColor" strokeWidth={STROKE} />
          <circle cx="5" cy="5" r="1.7" fill="none" stroke="currentColor" strokeWidth={STROKE} />
        </>
      );
    case "wedge":
      return <polygon points="5,5 8.7,2.1 8.7,7.9" fill="currentColor" />;
    case "square-ring":
      return (
        <rect
          x="1.9"
          y="1.9"
          width="6.2"
          height="6.2"
          fill="none"
          stroke="currentColor"
          strokeWidth={STROKE}
        />
      );
    case "notch":
      return <polygon points="1.7,1.7 8.3,1.7 8.3,8.3 1.7,8.3 1.7,6.2 3.6,5 1.7,3.8" fill="currentColor" />;
    default: {
      const _never: never = id;
      return _never;
    }
  }
}
