export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Комментарии новости/события для клиента (страницы статические, список
// в HTML не вшит). Читать может любой, как и под вакансиями.
import { NextRequest, NextResponse } from "next/server";
import { readThread } from "@/lib/comments/site-store";
import { keyOf, toWire } from "@/lib/comments/site-comments";

export async function GET(request: NextRequest) {
  const key = keyOf(request.nextUrl.searchParams.get("key"));
  if (!key) return NextResponse.json({ ok: false, message: "bad_input" }, { status: 400 });
  const thread = await readThread(key.kind, key.slug);
  if (!thread) return NextResponse.json({ ok: false, message: "storage" }, { status: 502 });
  return NextResponse.json({ ok: true, comments: thread.items.slice(-200).map(toWire) });
}
