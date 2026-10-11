"use client";

// components/site-comments.tsx
//
// 11.10.2026 (Александр: «комменты под новостями и событиями, идентичный UI
// как под постами»). Те же PostComments, что и на странице вакансии; отличие
// -- откуда приходят данные: страницы новостей и событий статические, поэтому
// список подгружается с клиента, а маршруты и склад -- свои
// (/api/site-comments, lib/comments/site-store.ts).

import { useEffect, useState } from "react";
import { PostComments } from "@/components/post-comments";
import type { WebComment } from "@/lib/a1/comments";

type Wire = Omit<WebComment, "createdAt" | "editedAt"> & { createdAt: string; editedAt: string | null };

export function SiteComments({ kind, slug }: { kind: "news" | "event"; slug: string }) {
  const postId = `${kind}:${slug}`;
  const [comments, setComments] = useState<WebComment[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/site-comments/list?key=${encodeURIComponent(postId)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { ok?: boolean; comments?: Wire[] } | null) => {
        if (cancelled) return;
        const rows = data?.ok && Array.isArray(data.comments) ? data.comments : [];
        setComments(
          rows.map((c) => ({
            ...c,
            createdAt: new Date(c.createdAt),
            editedAt: c.editedAt ? new Date(c.editedAt) : null,
          })),
        );
      })
      .catch(() => {
        if (!cancelled) setComments([]);
      });
    return () => {
      cancelled = true;
    };
  }, [postId]);

  if (comments === null) return null;
  return <PostComments comments={comments} postId={postId} api="/api/site-comments" />;
}
