"use client";

// components/track-view.tsx
//
// 11.10.2026. Отмечает, что страницу вакансии открыли (см. lib/track.ts).
// Ничего не рисует. Нужен затем, чтобы у переходов и клеймов был
// знаменатель: «из скольких просмотров вышел один переход».
//
// Считается один раз на вкладку: перезагрузка и «назад» счётчик не крутят.

import { useEffect } from "react";
import { trackViewOnce } from "@/lib/track";

export function TrackView({ company, post }: { company?: string | null; post?: string | null }) {
  useEffect(() => {
    trackViewOnce(post || company || "page", { company, post });
  }, [company, post]);
  return null;
}
