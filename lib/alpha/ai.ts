// lib/alpha/ai.ts
//
// 07.10.2026 (Александр: «не хард лимит... вопросы правильные, по контексту,
// не заготовленные, а в зависимости от ответов пользователя»).
// AI-мозг Alpha: Claude читает весь разговор и текущий портрет, обновляет
// портрет и сам решает, что спросить дальше -- или что уже понял достаточно.
// Включается, как только на сервере есть ANTHROPIC_API_KEY; без ключа (или
// если вызов упал) работает запасной мозг на правилах (brain.ts).

import { EMPTY_PORTRAIT, type AlphaPortrait, type AlphaTurnRequest, type AlphaTurnResponse } from "./types";
import { understoodPct } from "./brain";

const MODEL = process.env.ALPHA_MODEL || "claude-sonnet-4-5";
const SAFETY_CAP = 10;

export function aiEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const LANG_NAME: Record<string, string> = { uk: "Ukrainian", ru: "Russian", en: "English" };

const SYSTEM = `You are Alpha, the search assistant of A1 — a jobs and talent platform. A person describes what they are looking for: a job (role "seeking") or people for their team (role "hiring"). Your job is to understand them well enough to find the most precise matches among live vacancies or profiles, by talking to them briefly.

Each turn you get the conversation so far and the current portrait. Return ONLY a JSON object, no prose, no code fences:
{
  "portrait": {
    "role": "seeking" | "hiring" | null,
    "stack": string[],            // main technologies / profession keywords, canonical names (e.g. "Flutter", "Product Manager")
    "roleText": string | null,    // the position in their words, short
    "level": "junior" | "middle" | "senior" | "lead" | null,
    "format": "remote" | "office" | "hybrid" | "any" | null,
    "money": number | null,       // monthly USD: minimum salary for seeking, budget for hiring
    "dealbreakers": string[],     // hard no's, short lowercase keywords that would exclude a post (e.g. "gambling", "outstaff")
    "wishes": string[],           // soft wishes in their own words, short
    "notes": string[]             // anything else useful for ranking
  },
  "question": null | {
    "text": string,               // ONE short, friendly question in the person's language
    "options": [{"label": string, "value": string}],  // 2–5 quick-reply chips that make sense for THIS question; may be empty
    "allowFree": boolean
  },
  "understood": number            // 0–100: how confident you are you can find precise matches now
}

How to ask:
- Ask about what actually matters for THIS person given what they already said. Never ask about something they already told you, directly or implicitly.
- Build on their last answer: if it was vague, contradictory or surprising, ask about that. If it opened something important (relocation, a specific domain, visa, part-time, a particular company type), follow it.
- There is no fixed number of questions. Keep asking while an answer would noticeably change the search results; stop (question = null) as soon as you can search well. Usually 2–5 questions are enough. Don't interrogate.
- One question per turn. Short. No greetings, no "great!", no emojis.
- Chips: concrete, mutually exclusive answers to your question, in the person's language. Values may equal labels.
- Neutral tone; it works for both job seekers and companies.
- Keep everything the person said; update the portrait cumulatively, never drop earlier facts unless corrected.`;

type Raw = { portrait?: Partial<AlphaPortrait>; question?: { text?: unknown; options?: unknown; allowFree?: unknown } | null; understood?: unknown };

const LEVELS = ["junior", "middle", "senior", "lead"] as const;
const FORMATS = ["remote", "office", "hybrid", "any"] as const;
const strs = (v: unknown, max = 12): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.trim().slice(0, 80)).slice(0, max) : [];

function clean(p: Partial<AlphaPortrait> | undefined, prev: AlphaPortrait): AlphaPortrait {
  if (!p || typeof p !== "object") return prev;
  return {
    role: p.role === "seeking" || p.role === "hiring" ? p.role : prev.role,
    stack: strs(p.stack, 8),
    roleText: typeof p.roleText === "string" && p.roleText.trim() ? p.roleText.trim().slice(0, 80) : null,
    level: LEVELS.includes(p.level as (typeof LEVELS)[number]) ? (p.level as AlphaPortrait["level"]) : null,
    format: FORMATS.includes(p.format as (typeof FORMATS)[number]) ? (p.format as AlphaPortrait["format"]) : null,
    money: typeof p.money === "number" && Number.isFinite(p.money) && p.money > 0 ? Math.round(p.money) : null,
    dealbreakers: strs(p.dealbreakers).map((x) => x.toLowerCase()),
    wishes: strs(p.wishes),
    notes: strs(p.notes, 20),
  };
}

function parseJson(text: string): Raw | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as Raw;
  } catch {
    return null;
  }
}

/** Throws on any failure -- the route then falls back to the rule-based brain. */
export async function alphaTurnAI(req: AlphaTurnRequest): Promise<AlphaTurnResponse> {
  const prev = req.portrait ?? EMPTY_PORTRAIT;
  const history = (req.history ?? []).slice(-30).map((h) => `${h.from === "me" ? "Person" : "Alpha"}: ${h.text.slice(0, 600)}`);
  // The latest message may not be in history yet.
  if (!history.length || !history[history.length - 1]!.endsWith(req.message.slice(0, 600))) history.push(`Person: ${req.message.slice(0, 600)}`);
  const asked = req.asked.length + (req.answering ? 1 : 0);
  const user = [
    `Language for questions and chips: ${LANG_NAME[req.lang] ?? "English"}.`,
    `Questions asked so far: ${asked}.${asked >= SAFETY_CAP - 1 ? " This must be the last turn: return question = null." : ""}`,
    `Current portrait: ${JSON.stringify(prev)}`,
    `Conversation:\n${history.join("\n")}`,
  ].join("\n\n");

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model: MODEL, max_tokens: 900, system: SYSTEM, messages: [{ role: "user", content: user }] }),
    });
    if (!res.ok) throw new Error(`anthropic ${res.status}`);
    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text = (data.content ?? []).filter((c) => c.type === "text").map((c) => c.text ?? "").join("");
    const raw = parseJson(text);
    if (!raw) throw new Error("bad_json");

    const portrait = clean(raw.portrait, prev);
    let question: AlphaTurnResponse["question"] = null;
    const q = raw.question;
    if (q && typeof q.text === "string" && q.text.trim() && asked < SAFETY_CAP) {
      const options = Array.isArray(q.options)
        ? q.options
            .filter((o): o is { label: string; value?: string } => !!o && typeof (o as { label?: unknown }).label === "string")
            .slice(0, 5)
            .map((o) => ({ label: o.label.slice(0, 40), value: (typeof o.value === "string" && o.value ? o.value : o.label).slice(0, 80) }))
        : [];
      question = { slot: "more", text: q.text.trim().slice(0, 300), options, allowFree: q.allowFree !== false || options.length === 0 };
    }
    const understood =
      typeof raw.understood === "number" && Number.isFinite(raw.understood) ? Math.max(0, Math.min(100, Math.round(raw.understood))) : understoodPct(portrait);
    return { portrait, question, step: asked + 2, understood: question ? understood : Math.max(understood, 90) };
  } finally {
    clearTimeout(timer);
  }
}
