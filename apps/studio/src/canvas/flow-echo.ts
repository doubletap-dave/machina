export function shouldSkipEcho(revision: number, echoRevision: number | null): boolean {
  return echoRevision !== null && revision === echoRevision;
}
