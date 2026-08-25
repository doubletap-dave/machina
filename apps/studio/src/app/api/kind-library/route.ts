import { NextResponse } from "next/server";
import type { KindManifest } from "@machina/core";
import { listLibraryKinds, publishKind } from "@/kinds/kind-library";

export async function GET() {
  return NextResponse.json(await listLibraryKinds());
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    manifest: KindManifest;
    overwrite?: boolean;
  };
  const status = await publishKind(body.manifest, { overwrite: body.overwrite });
  return NextResponse.json({ status });
}
