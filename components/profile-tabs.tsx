// components/profile-tabs.tsx
//
// Aleksandr, 2026-08-30, correcting §6.41's first pass (which just
// appended a "Пости" section under Favorites): "должны быть просто две
// кнопки, как у нас в мобильном приложении... первая — это bio, а
// второе — посты." A small client component purely for the tab switch
// -- app/u/[username]/page.tsx stays a server component (SEO, one round
// trip per profile) and passes both tab bodies in fully server-rendered,
// already fetched; this only toggles which one is visible. `hidden`
// rather than an unmount-on-switch so nothing here needs a second
// client-side fetch or loses scroll position when switching back.
"use client";

import { useState, type ReactNode } from "react";
import { T } from "@/components/t";

export function ProfileTabs({
  bio,
  posts,
  postsCount,
}: {
  bio: ReactNode;
  posts: ReactNode;
  postsCount: number;
}) {
  const [tab, setTab] = useState<"bio" | "posts">("bio");

  return (
    <div className="mt-6">
      <div className="flex gap-1 rounded-full bg-neutral-100 p-1 dark:bg-neutral-800">
        <button
          type="button"
          onClick={() => setTab("bio")}
          aria-pressed={tab === "bio"}
          className={
            "flex-1 rounded-full py-2 text-sm font-medium transition " +
            (tab === "bio"
              ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-neutral-50"
              : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200")
          }
        >
          <T uk="Про мене" en="Bio" ru="О себе" de="Bio" es="Bio" fr="Bio" pl="Bio" ptBR="Bio" zh="简介" />
        </button>
        <button
          type="button"
          onClick={() => setTab("posts")}
          aria-pressed={tab === "posts"}
          className={
            "flex-1 rounded-full py-2 text-sm font-medium transition " +
            (tab === "posts"
              ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-neutral-50"
              : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200")
          }
        >
          <T uk="Пости" en="Posts" ru="Посты" de="Beiträge" es="Publicaciones" fr="Publications" pl="Posty" ptBR="Publicações" zh="帖子" />
          {postsCount > 0 ? ` (${postsCount})` : ""}
        </button>
      </div>

      <div hidden={tab !== "bio"}>{bio}</div>
      <div hidden={tab !== "posts"}>{posts}</div>
    </div>
  );
}
