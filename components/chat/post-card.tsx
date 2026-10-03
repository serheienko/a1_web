"use client";

// components/chat/post-card.tsx
//
// Карточка вакансии в сообщении (волна 4B), как post_share_message.dart в
// приложении: компания с аватаром, заголовок, место / удалённо / зарплата.
// Нажатие открывает вакансию на сайте. Если поста уже нет (удалён) --
// карточка не рисуется.
import { useEffect, useState } from "react";
import Link from "next/link";
import { CachedAvatar } from "@/components/cached-avatar";
import { BLUR_DATA_URL } from "@/lib/blur-placeholder";
import { pickDefaultCatAvatar } from "@/lib/avatars";
import { authFetch } from "@/lib/auth-fetch";
import type { PostCardData } from "@/app/api/posts/card/route";

const memo = new Map<string, PostCardData | null>();
const inflight = new Map<string, Promise<PostCardData | null>>();

function load(id: string): Promise<PostCardData | null> {
  if (memo.has(id)) return Promise.resolve(memo.get(id) ?? null);
  let p = inflight.get(id);
  if (!p) {
    p = authFetch(`/api/posts/card?id=${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then((d: { ok?: boolean; card?: PostCardData | null } | null) => {
        const card = d && d.ok ? (d.card ?? null) : null;
        if (d && d.ok) memo.set(id, card);
        return card;
      })
      .catch(() => null)
      .finally(() => inflight.delete(id));
    inflight.set(id, p);
  }
  return p;
}

const REMOTE: Record<string, string> = { uk: "Віддалено", ru: "Удалённо", en: "Remote", de: "Remote", es: "Remoto", fr: "À distance", pl: "Zdalnie", ptBR: "Remoto", zh: "远程" };

export function PostCard({ postId, mine, lang }: { postId: string; mine: boolean; lang: string }) {
  const [card, setCard] = useState<PostCardData | null | undefined>(memo.has(postId) ? memo.get(postId) : undefined);
  useEffect(() => {
    let cancelled = false;
    void load(postId).then((c) => !cancelled && setCard(c));
    return () => {
      cancelled = true;
    };
  }, [postId]);
  if (!card) return null;
  const meta = [card.place, card.remote ? (REMOTE[lang] ?? REMOTE.en) : null, card.salary].filter(Boolean).join(" · ");
  return (
    <Link
      href={card.href}
      data-testid="post-card"
      onClick={(e) => e.stopPropagation()}
      className={`mb-1 block min-w-[240px] max-w-[320px] rounded-xl p-2.5 no-underline ${
        mine ? "bg-white/15 text-white" : "bg-[#335ef7]/[0.07] text-[#262a34] dark:bg-white/[0.07] dark:text-white"
      }`}
    >
      <div className="flex items-center gap-2">
        <CachedAvatar
          src={card.avatarUrl ?? pickDefaultCatAvatar(card.id)}
          blurDataURL={BLUR_DATA_URL}
          size={26}
          className="h-[26px] w-[26px] shrink-0 rounded-full object-cover"
        />
        <span className={`truncate text-[13px] font-semibold ${mine ? "text-white" : "text-[#335ef7] dark:text-[#0c8ce9]"}`}>{card.company}</span>
      </div>
      <div className="mt-1.5 line-clamp-3 text-[15px] font-semibold leading-[1.25]">{card.title}</div>
      {meta && <div className={`mt-1 line-clamp-2 text-[12.5px] ${mine ? "text-white/80" : "text-[#989aa6] dark:text-[#adafbb]"}`}>{meta}</div>}
    </Link>
  );
}
