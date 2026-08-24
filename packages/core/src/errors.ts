export type MachinaError = {
  code: string;
  message: string;
  nodeId?: string;
  port?: string;
};

export function machinaError(
  code: string,
  message: string,
  loc?: { nodeId?: string; port?: string },
): MachinaError {
  return { code, message, ...loc };
}
