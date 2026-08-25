import type { KindManifest } from "./kind-manifest.ts";

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (value !== null && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
      sorted[key] = sortKeys(obj[key]);
    }
    return sorted;
  }
  return value;
}

export function canonicalKindJson(manifest: KindManifest): string {
  return JSON.stringify(sortKeys(manifest));
}

export async function kindHash(manifest: KindManifest): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalKindJson(manifest));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
