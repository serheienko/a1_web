// app/api/posts/applications/route.ts
//
// 16.10.2026 (Александр: трекер откликов, 4-я вкладка «Мої відгуки» в «Моя активність»).
// Бэкенд: v1/posts.applications / posts.applicationOpened / posts.applicationAnswer
// (aone-api-private, services/post-apply-service/methods/applications.ts).
//
//   GET                               список: { items: [{ post, state, at }], next }
//                                     state: applied (отклик в A1) | opened (открыл вакансию на сайте
//                                     компании, ждём ответа «Так/Ні») | confirmed (ответил «Так»)
//   POST { postId, action: "opened" } человек открыл внешнюю вакансию (кнопка «Відкрити вакансію»)
//   POST { postId, action: "yes"|"no" } ответ на «Ви відгукнулися?»
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession, clearSession, type SessionState } from "@/lib/a1/session";
import { mapPosts } from "@/lib/a1/mappers";
import { generateAvatarBlurDataUrl } from "@/lib/avatar-blur";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATES = ["applied", "opened", "confirmed"] as const;
type State = (typeof STATES)[number];

type ListOutput = {
  items?: { post?: unknown; state?: string; at?: number }[];
  pagination?: { next?: string | null; hasMore?: boolean };
};

const Action = z.object({
  postId: z.string().trim().min(1).max(64),
  action: z.enum(["opened", "yes", "no"]),
});

function done(body: unknown, refreshed: SessionState | null, status = 200) {
  const response = NextResponse.json(body, { status });
  if (refreshed) setSession(response, refreshed);
  return response;
}

function failed(where: string, err: unknown) {
  if (err instanceof NoSessionError) {
    const response = NextResponse.json({ ok: false, message: "not_signed_in" }, { status: 401 });
    clearSession(response);
    return response;
  }
  if (err instanceof A1ApiError) {
    console.error(`[api/posts/applications] ${where} failed:`, err.httpStatus, err.body.slice(0, 300));
  } else {
    console.error(`[api/posts/applications] ${where} unexpected error:`, err);
  }
  return NextResponse.json({ ok: false, message: "failed" }, { status: 502 });
}

export async function GET(request: NextRequest) {
  const next = request.nextUrl.searchParams.get("next") || undefined;
  try {
    const { data, refreshedSession } = await callAsVisitor<ListOutput>("posts.applications", {
      limit: 20,
      ...(next ? { next } : {}),
    });
    const raw = data.items ?? [];
    const mapped = mapPosts(raw.map((i) => i.post));
    // mapPosts пропускает то, что не разобралось, поэтому состояние ищем по id поста.
    const stateById = new Map<string, { state: State; at: number }>();
    for (const i of raw) {
      const id = String((i.post as { _id?: unknown; id?: unknown } | undefined)?._id ?? (i.post as { id?: unknown } | undefined)?.id ?? "");
      const state = STATES.includes(i.state as State) ? (i.state as State) : "applied";
      if (id) stateById.set(id, { state, at: Number(i.at) || 0 });
    }
    const blurs = await Promise.all(mapped.map((p) => generateAvatarBlurDataUrl(p.author.avatarUrl)));
    const items = mapped.map((post, idx) => ({
      post: { ...post, avatarBlurDataUrl: blurs[idx] },
      state: stateById.get(post.id)?.state ?? "applied",
      at: stateById.get(post.id)?.at ?? 0,
    }));
    return done({ ok: true, items, next: data.pagination?.hasMore ? data.pagination.next ?? null : null }, refreshedSession);
  } catch (err) {
    return failed("list", err);
  }
}

export async function POST(request: NextRequest) {
  const parsed = Action.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "invalid_input" }, { status: 400 });
  const { postId, action } = parsed.data;
  try {
    const { data, refreshedSession } =
      action === "opened"
        ? await callAsVisitor<unknown>("posts.applicationOpened", { post: postId })
        : await callAsVisitor<unknown>("posts.applicationAnswer", { post: postId, applied: action === "yes" });
    return done({ ok: data === true }, refreshedSession);
  } catch (err) {
    return failed(action, err);
  }
}
