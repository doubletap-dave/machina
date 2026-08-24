import { machinaError, type MachinaError } from "./errors.ts";
import type { PortDef } from "./ports.ts";

export function matchPorts(source: PortDef, target: PortDef): MachinaError | null {
  if (source.dir !== "out" || target.dir !== "in") {
    return machinaError("PORT_DIRECTION", "These ports don't speak the same language.");
  }
  if (source.type !== target.type) {
    if (source.type === "RESOURCE" && target.type === "PERSONALITY") {
      return machinaError(
        "PORT_TYPE_MISMATCH",
        "A resource can't shape a personality. Attach it to a nation or an economy.",
      );
    }
    return machinaError("PORT_TYPE_MISMATCH", "These ports don't speak the same language.");
  }
  return null;
}
