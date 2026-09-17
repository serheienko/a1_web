// lib/a1/posts.ts
//
// Single-post fetch for detail pages (PLAN.md Phase 2). Uses posts.get,
// the other posts.* endpoint this project touches besides posts.search
// (§0.1). Wrapped in React's cache() so that generateMetadata() and the
// page component — which both need the same post during one request —
// share a single network round trip instead of logging in and fetching
// twice. (Next's automatic fetch memoization only covers GET; every A1
// call is a POST, so this is done by hand.)

import { cache } from "react";
import { call } from "./client";
import { parsePost } from "./schemas";
import { mapPost } from "./mappers";
import type { WebPost } from "@/types/web-post";

/**
 * Fetch one post by id and map it. Returns null if the post is deleted
 * (posts.get's PostEmpty variant — exact shape undocumented, so anything
 * that fails parsePost() is treated the same way), a legacy type, or the
 * publish gate drops it. The caller renders this as "not found" (PLAN.md
 * §3.4: a deleted post should read as gone, never a soft 200).
 */
export const fetchPostById = cache(async function fetchPostById(id: string): Promise<WebPost | null> {
  const raw = await call<unknown>("posts.get", { ids: [id] });
  const first = Array.isArray(raw) ? raw[0] : undefined;
  // ВРЕМЕННАЯ ДИАГНОСТИКА (17.09.2026). На сайте у поста с вопросами к
  // отклику вопросов не видно, хотя в приложении они есть. Надо понять,
  // приходят ли они вообще сервисному аккаунту, которым сайт читает
  // посты, и как называются поля. Пишем ТОЛЬКО форму данных -- ключи и
  // количество, без текста вопросов и без чего-либо про людей. Убрать,
  // как только причина найдена.
  if (first && typeof first === "object") {
    const apply = (first as { apply?: unknown }).apply;
    const questions = apply && typeof apply === "object" ? (apply as { questions?: unknown }).questions : null;
    console.log(
      "[diag apply]",
      JSON.stringify({
        post: id,
        applyPresent: apply !== undefined,
        applyNull: apply === null,
        count: Array.isArray(questions) ? questions.length : null,
        firstItemKeys:
          Array.isArray(questions) && questions[0] && typeof questions[0] === "object"
            ? Object.keys(questions[0] as Record<string, unknown>)
            : null,
      }),
    );
  }
  if (first === undefined) return null;
  const post = parsePost(first);
  if (!post) return null;
  return mapPost(post);
});
