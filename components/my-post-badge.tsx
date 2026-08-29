// components/my-post-badge.tsx
//
// Aleksandr, 2026-08-29 (screenshot of a feed card, confused that its
// avatar didn't match his nav avatar): the mismatch itself is expected
// -- components/post-card.tsx's cat fallback seeds off post.author.
// username/name while components/avatar-menu.tsx's nav button seeds off
// the visitor's email (see that file's own 2026-08-29 comment); same
// account, two different deterministic cat picks, not a second account.
// Rather than trying to make every avatar match everywhere (would need
// a real "get my profile" endpoint this app doesn't have yet), the fix
// he actually asked for: "надо куда-то добавить значок на карточке,
// типа что это мой пост... у нас в мобильном приложении это
// отображается таким маленьким человечком возле имени" -- a small badge
// next to the author name that says "this one's yours" regardless of
// which cat is showing.
//
// Client component by necessity, same reasoning as components/
// post-owner-menu.tsx: there's no shared identity field between the
// visitor's session and a post's public author to compare server-side
// without forcing the feed pages into dynamic rendering, so this checks
// /api/posts/mine client-side instead (renders nothing until that
// resolves, and nothing at all for a signed-out visitor or someone
// else's post).
//
// One shared fetch for every badge on the page, not one each -- a feed
// page can have dozens of PostCards mounted at once, and they'd
// otherwise all hit /api/posts/mine independently on first paint.
"use client";

import { useEffect, useState } from "react";
import { LOCALES, LOCALE_CLASS, type Locale } from "@/components/t";

type StringKey = "mine";

const STRINGS: Record<StringKey, Record<Locale, string>> = {
  mine: {
    uk: "Це ваш пост", en: "This is your post", ru: "Это ваш пост", de: "Das ist Ihr Beitrag",
    es: "Esta es tu publicación", fr: "C'est votre publication", pl: "To Twój post",
    ptBR: "Esta é sua publicação", zh: "这是您的帖子",
  },
};

function useActiveLocale(): Locale {
  const [lang, setLang] = useState<Locale>("uk");
  useEffect(() => {
    const root = document.documentElement;
    const active = LOCALES.find((l) => root.classList.contains(LOCALE_CLASS[l]));
    if (active) setLang(active);
  }, []);
  return lang;
}

let minePostIdsPromise: Promise<Set<string>> | null = null;
function loadMinePostIds(): Promise<Set<string>> {
  if (!minePostIdsPromise) {
    minePostIdsPromise = fetch("/api/posts/mine")
      .then((r) => r.json())
      .then((data) => new Set<string>(data?.ok ? (data.posts as { id: string }[]).map((p) => p.id) : []))
      .catch(() => new Set<string>());
  }
  return minePostIdsPromise;
}

function PersonBadgeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-2.5 w-2.5" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" />
    </svg>
  );
}

export function MyPostBadge({ postId }: { postId: string }) {
  const lang = useActiveLocale();
  const [mine, setMine] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadMinePostIds().then((ids) => {
      if (!cancelled && ids.has(postId)) setMine(true);
    });
    return () => {
      cancelled = true;
    };
  }, [postId]);

  if (!mine) return null;

  return (
    <span
      title={STRINGS.mine[lang]}
      aria-label={STRINGS.mine[lang]}
      className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent text-white"
    >
      <PersonBadgeIcon />
    </span>
  );
}
