import { NextResponse } from "next/server";
import { addFromLibrary } from "@/kinds/kind-library";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  try {
    return NextResponse.json(await addFromLibrary(id));
  } catch {
    return NextResponse.json({ message: "Kind not in the library." }, { status: 404 });
  }
}
