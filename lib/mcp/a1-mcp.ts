// lib/mcp/a1-mcp.ts
//
// 16.10.2026 (Александр: «A1 в ИИ-ассистенте», решения в проекте claude/mcp-a1-reshenie-2026-10-16.md).
// Простой MCP-сервер (протокол «разъёма» для ИИ-ассистентов: Claude, ChatGPT и др.) без внешних пакетов.
// Версия 1: ТОЛЬКО поиск вакансий, публично, бесплатный режим -- не больше 5 результатов, без подбора
// под профиль. Отклики, чаты и создание вакансий НЕ предоставляются сознательно (ботов-откликальщиков
// не хотим). Вход, профиль и Premium -- следующим шагом.
if (typeof window !== "undefined") {
  throw new Error("[lib/mcp/a1-mcp] imported from the browser — this must stay server-only");
}

import { allIndexedPosts } from "@/lib/a1/facts-index";
import type { WebPost } from "@/types/web-post";

const SITE = "https://jobs.a1appp.com";
const FREE_LIMIT = 5;
const PROTOCOL = "2025-03-26";

const TOOLS = [
  {
    name: "search_jobs",
    title: "Search A1 IT jobs",
    annotations: { title: "Search A1 IT jobs", readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    description:
      "Read-only search of IT job vacancies on A1 (jobs.a1appp.com): mostly Ukraine plus remote jobs worldwide. " +
      `Returns up to ${FREE_LIMIT} newest matches with title, company, location, salary when known, and a link to the vacancy page. ` +
      "Does not apply to jobs, send messages or create vacancies.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Free text: role, technology, company, e.g. 'flutter', 'QA', 'product manager'." },
        country: { type: "string", description: "Country name or 2-letter code, e.g. 'UA', 'Poland'. Optional." },
        remote_only: { type: "boolean", description: "Only remote vacancies." },
        limit: { type: "integer", minimum: 1, maximum: FREE_LIMIT, description: `How many results (max ${FREE_LIMIT} in free mode).` },
      },
    },
  },
];

const norm = (s: string) => s.toLowerCase().normalize("NFKC");

function haystack(p: WebPost): string {
  return norm(
    [p.title, p.author.name, p.location?.display ?? "", ...(p.tags ?? []), ...p.categories.map((c) => c.label)].join(" "),
  );
}

function fmtSalary(p: WebPost): string {
  const s = p.salary;
  if (!s || (!s.min && !s.max)) return "";
  const range = s.min && s.max ? `${s.min}–${s.max}` : String(s.min || s.max);
  return `${range} ${s.currency}/${s.period === "YEAR" ? "year" : "month"}`;
}

async function searchJobs(args: Record<string, unknown>): Promise<string> {
  const q = typeof args.query === "string" ? norm(args.query.trim()) : "";
  const country = typeof args.country === "string" ? norm(args.country.trim()) : "";
  const remoteOnly = args.remote_only === true;
  const limit = Math.min(FREE_LIMIT, Math.max(1, Number.isFinite(Number(args.limit)) ? Math.floor(Number(args.limit)) : FREE_LIMIT));

  const all = (await allIndexedPosts()).filter((p) => p.kind === "hiring");
  const words = q.split(/\s+/).filter(Boolean);
  const hits = all
    .filter((p) => {
      if (remoteOnly && !p.isRemote) return false;
      if (country) {
        const loc = norm(`${p.location?.country ?? ""} ${p.location?.display ?? ""}`);
        if (!loc.includes(country)) return false;
      }
      if (words.length) {
        const h = haystack(p);
        if (!words.every((w) => h.includes(w))) return false;
      }
      return true;
    })
    .sort((a, b) => (b.sourcePublishedAt ?? b.publishedAt).getTime() - (a.sourcePublishedAt ?? a.publishedAt).getTime());

  if (!hits.length) {
    return `No vacancies found on A1 for this search. Try broader words. Browse all: ${SITE}/jobs`;
  }
  const rows = hits.slice(0, limit).map((p, i) => {
    const bits = [p.author.name, p.location?.display, p.isRemote ? "remote" : "", fmtSalary(p)].filter(Boolean).join(" · ");
    return `${i + 1}. ${p.title}\n   ${bits}\n   ${SITE}/jobs/${p.slug}`;
  });
  return (
    `Found ${hits.length} on A1, showing ${rows.length} newest:\n\n${rows.join("\n\n")}\n\n` +
    "Applications are made by the person on the vacancy page on A1. Full search and profile matching are part of A1 Premium in the A1 app."
  );
}

type Rpc = { jsonrpc?: string; id?: string | number | null; method?: string; params?: Record<string, unknown> };
export type RpcReply = { jsonrpc: "2.0"; id: string | number | null; result?: unknown; error?: { code: number; message: string } } | null;

export async function handleRpc(msg: Rpc): Promise<RpcReply> {
  const id = msg.id ?? null;
  const isNotification = msg.id === undefined;
  const ok = (result: unknown): RpcReply => (isNotification ? null : { jsonrpc: "2.0", id, result });
  const fail = (code: number, message: string): RpcReply => (isNotification ? null : { jsonrpc: "2.0", id, error: { code, message } });

  switch (msg.method) {
    case "initialize":
      return ok({
        protocolVersion: PROTOCOL,
        capabilities: { tools: {} },
        serverInfo: { name: "a1-jobs", version: "1.0.0" },
        instructions: "A1 is an IT job board. This server offers read-only vacancy search.",
      });
    case "ping":
      return ok({});
    case "tools/list":
      return ok({ tools: TOOLS });
    case "tools/call": {
      const name = msg.params?.name;
      const args = (msg.params?.arguments ?? {}) as Record<string, unknown>;
      if (name !== "search_jobs") return fail(-32602, "Unknown tool");
      try {
        return ok({ content: [{ type: "text", text: await searchJobs(args) }] });
      } catch {
        return ok({ isError: true, content: [{ type: "text", text: "A1 search is temporarily unavailable. Try again later." }] });
      }
    }
    default:
      return isNotification ? null : fail(-32601, "Method not found");
  }
}

// Простой лимит запросов с одного адреса: не больше 40 за 10 минут (в памяти одного процесса).
const hits = new Map<string, number[]>();
export function rateLimited(ip: string): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < 600_000);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) for (const k of hits.keys()) { if (!(hits.get(k) ?? []).some((t) => now - t < 600_000)) hits.delete(k); }
  return arr.length > 40;
}
