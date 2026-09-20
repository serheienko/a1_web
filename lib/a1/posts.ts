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
  if (first === undefined) return null;
  const post = parsePost(first);
  if (!post) return null;
  return mapPost(post);
});

/**
 * Вакансии по списку id, одним запросом, в том же порядке, в каком id пришли.
 *
 * 2026-09-20. Нужен фильтру по стеку: указатель (lib/a1/stack-index.ts) знает
 * только имена подходящих вакансий, и на страницу их нужно ровно двадцать --
 * читать ради этого всю ленту незачем.
 *
 * Пропавшие (удалённые, снятые с публикации, не прошедшие разбор) молча
 * выпадают: страница тогда короче двадцати, и это честнее, чем показать
 * пустую карточку. posts.get и для одной вакансии отдаёт массив -- см.
 * fetchPostById выше.
 */
export async function fetchPostsByIds(ids: string[]): Promise<WebPost[]> {
  if (ids.length === 0) return [];

  const raw = await call<unknown>("posts.get", { ids });
  const items = Array.isArray(raw) ? raw : [];

  const byId = new Map<string, WebPost>();
  for (const item of items) {
    const parsed = parsePost(item);
    if (!parsed) continue;
    const post = mapPost(parsed);
    if (!post) continue; // publish gate / legacy type -- такая же проверка, как в fetchPostById
    byId.set(post.id, post);
  }

  return ids.map((id) => byId.get(id)).filter((post): post is WebPost => post !== undefined);
}
