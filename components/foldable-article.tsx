"use client";

// components/foldable-article.tsx
//
// Aleksandr, 30.09.2026: double tap / double click on a feed card turns its
// top-right corner down ("this one interests me"), same as in the app. The
// folded posts are remembered in this browser (localStorage), by post id.
//
// The stretched title link opens the post on the first click, so a click on
// a post link waits FOLD_WINDOW_MS for a possible second click before it
// navigates. Clicks with a modifier key, on the profile links, or on
// anything that is not the post link are left alone.

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

const KEY = "a1_folded_posts";
const EVENT = "a1-folded-posts";
const FOLD_WINDOW_MS = 220;

function readIds(): string[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeIds(ids: string[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    // Private mode etc.: folding still works until the page is closed.
  }
  window.dispatchEvent(new Event(EVENT));
}

export function FoldableArticle({
  postId,
  href,
  className,
  children,
}: {
  postId: string;
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [folded, setFolded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastClick = useRef<{ at: number; x: number; y: number } | null>(null);
  const memory = useRef<string[]>([]);

  useEffect(() => {
    const sync = () => {
      memory.current = readIds();
      setFolded(memory.current.includes(postId));
    };
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [postId]);

  const toggle = useCallback(() => {
    const ids = readIds();
    const next = ids.includes(postId) ? ids.filter((x) => x !== postId) : [...ids, postId];
    memory.current = next;
    setFolded(next.includes(postId));
    writeIds(next);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(12);
  }, [postId]);

  const onClickCapture = (e: React.MouseEvent<HTMLElement>) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const anchor = (e.target as HTMLElement).closest("a");
    if (!anchor || anchor.getAttribute("href") !== href) return;

    e.preventDefault();
    e.stopPropagation();

    const now = Date.now();
    const last = lastClick.current;
    if (last && now - last.at < FOLD_WINDOW_MS && Math.hypot(e.clientX - last.x, e.clientY - last.y) < 40) {
      lastClick.current = null;
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      toggle();
      return;
    }
    lastClick.current = { at: now, x: e.clientX, y: e.clientY };
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      lastClick.current = null;
      router.push(href);
    }, FOLD_WINDOW_MS);
  };

  return (
    <article className={`${className ?? ""} fold-card`} data-folded={folded ? "true" : "false"} onClickCapture={onClickCapture}>
      {children}
      <span aria-hidden="true" className="fold-flap" />
    </article>
  );
}
