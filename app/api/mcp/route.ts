// app/api/mcp/route.ts
//
// 16.10.2026: MCP-сервер A1 для ИИ-ассистентов (https://jobs.a1appp.com/api/mcp). Подробности и
// ограничения -- lib/mcp/a1-mcp.ts. Только POST (JSON-RPC), без состояния.
import { NextResponse } from "next/server";
import { handleRpc, rateLimited, type RpcReply } from "@/lib/mcp/a1-mcp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type, mcp-protocol-version, mcp-session-id, accept",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export function GET() {
  return NextResponse.json({ error: "POST JSON-RPC only" }, { status: 405, headers: { ...CORS, allow: "POST" } });
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json({ jsonrpc: "2.0", id: null, error: { code: -32000, message: "Too many requests" } }, { status: 429, headers: CORS });
  }
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, { status: 400, headers: CORS });
  }
  if (Array.isArray(body)) {
    const out = (await Promise.all(body.slice(0, 20).map((m) => handleRpc(m)))).filter((r): r is NonNullable<RpcReply> => r !== null);
    return out.length ? NextResponse.json(out, { headers: CORS }) : new NextResponse(null, { status: 202, headers: CORS });
  }
  const reply = await handleRpc(body);
  return reply ? NextResponse.json(reply, { headers: CORS }) : new NextResponse(null, { status: 202, headers: CORS });
}
