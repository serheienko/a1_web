"use client";

// components/chat/thread-parts.tsx
//
// Темы в группах (волна 3, 2026-10-03). Три куска интерфейса, логика как
// в приложении (thread_support.dart), вид -- в стиле сайта:
//  * ThreadStrip -- полоска под сообщением, у которого есть тема: аватарки
//    последних ответивших (или значок чата, пока никто не ответил),
//    «Почати обговорення» / «7 коментарів», точка, если есть новое, шеврон;
//  * ThreadRootCard -- шапка экрана темы: сообщение, под которым она
//    висит, и плашка «Обговорення почалося»;
//  * TopicsModal -- список «Теми» группы.
import { useEffect, useState } from "react";
import { backdropDismiss } from "@/lib/use-backdrop-dismiss";
import { CachedAvatar } from "@/components/cached-avatar";
import { pickDefaultCatAvatar } from "@/lib/avatars";
import { BLUR_DATA_URL } from "@/lib/blur-placeholder";
import { authFetch } from "@/lib/auth-fetch";
import { peerNameColorIndex, peerNameColorVar } from "@/lib/peer-name-color";
import type { GroupLang } from "@/lib/a1/group-chat";
import {
  commentsText,
  rootPreview,
  threadText,
  topicTitle,
  type MessageThreadInfo,
  type ThreadRoot,
} from "@/lib/a1/group-threads";
import type { TopicItem } from "@/app/api/chats/threads/route";

export type ThreadPerson = { name: string; photo: string | null };

function BubbleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.3 8.7 8.7 0 0 1-3.6-.8L3 20l1.2-4.6A8.2 8.2 0 0 1 3.5 11.5 8.5 8.5 0 0 1 12 3a8.5 8.5 0 0 1 9 8.5Z" />
    </svg>
  );
}

function Chevron({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

export function ThreadStrip({
  lang,
  thread,
  unread,
  alignEnd,
  personOf,
  onOpen,
}: {
  lang: GroupLang;
  thread: MessageThreadInfo;
  unread: boolean;
  alignEnd: boolean;
  personOf: (id: string) => ThreadPerson | null;
  onOpen: () => void;
}) {
  const faces = thread.repliers.slice(0, 3);
  const label = thread.replies === 0 ? threadText(lang, "startDiscussion") : commentsText(lang, thread.replies);
  return (
    <div className={`mt-1 flex ${alignEnd ? "justify-end" : "justify-start"}`}>
      <button
        type="button"
        onClick={onOpen}
        data-testid="thread-strip"
        className="flex h-10 min-w-[220px] max-w-[330px] items-center gap-2.5 rounded-2xl bg-black/5 px-3 text-left text-[#335ef7] transition hover:bg-black/10 dark:bg-white/10 dark:text-[#0c8ce9] dark:hover:bg-white/15"
      >
        {faces.length === 0 ? (
          <BubbleIcon className="h-[22px] w-[22px] shrink-0" />
        ) : (
          <span className="flex shrink-0 items-center" style={{ width: 22 + (faces.length - 1) * 15 }}>
            <span className="relative block h-[22px]" style={{ width: 22 + (faces.length - 1) * 15 }}>
              {faces
                .map((id, i) => ({ id, i }))
                .reverse()
                .map(({ id, i }) => (
                  <span key={id} className="absolute top-0 block rounded-full ring-2 ring-white dark:ring-[#1c1c1e]" style={{ left: i * 15 }}>
                    <CachedAvatar
                      src={personOf(id)?.photo ?? pickDefaultCatAvatar(id)}
                      blurDataURL={BLUR_DATA_URL}
                      size={22}
                      className="h-[22px] w-[22px] rounded-full object-cover"
                    />
                  </span>
                ))}
            </span>
          </span>
        )}
        <span className="flex min-w-0 flex-1 items-center gap-1.5">
          <span className="truncate text-[14px] font-medium">{label}</span>
          {unread && <span data-testid="thread-strip-unread" className="h-[7px] w-[7px] shrink-0 rounded-full bg-current" />}
        </span>
        <Chevron className="h-4 w-4 shrink-0" />
      </button>
    </div>
  );
}

export function ThreadRootCard({
  lang,
  root,
  authorName,
}: {
  lang: GroupLang;
  root: ThreadRoot | null;
  authorName: string;
}) {
  const text = rootPreview(lang, root);
  return (
    <div className="mb-3" data-testid="thread-root-card">
      <div className="rounded-2xl bg-white/85 px-3.5 py-3 shadow-sm dark:bg-[#1c1c1e]/85">
        <div className="flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-wide text-[#335ef7] dark:text-[#0c8ce9]">
          <BubbleIcon className="h-3.5 w-3.5" />
          {threadText(lang, "topic")}
        </div>
        {authorName && root?.fromId && (
          <div className="mt-1.5 text-[13px] font-semibold" style={{ color: peerNameColorVar(peerNameColorIndex(root.fromId)) }}>
            {authorName}
          </div>
        )}
        <p className="mt-0.5 line-clamp-6 whitespace-pre-line break-words text-[15px] text-[#262a34] dark:text-white">{text || "…"}</p>
      </div>
      <div className="mt-3 flex justify-center">
        <span className="rounded-full bg-black/5 px-3 py-1 text-[13px] text-[#262a34] dark:bg-white/10 dark:text-white">
          {threadText(lang, "discussionStarted")}
        </span>
      </div>
    </div>
  );
}

export function TopicsModal({
  lang,
  groupId,
  personOf,
  onOpen,
  onClose,
}: {
  lang: GroupLang;
  groupId: string;
  personOf: (id: string) => ThreadPerson | null;
  onOpen: (chatId: string) => void;
  onClose: () => void;
}) {
  const [topics, setTopics] = useState<TopicItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    authFetch(`/api/chats/threads?chat=${encodeURIComponent(groupId)}`)
      .then((r) => r.json())
      .then((d: { ok?: boolean; topics?: TopicItem[] } | null) => {
        if (cancelled) return;
        if (d && d.ok && Array.isArray(d.topics)) setTopics(d.topics);
        else setFailed(true);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [groupId]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" {...backdropDismiss(onClose)}>
      <div
        className="flex max-h-[80vh] w-full max-w-sm flex-col overflow-hidden rounded-2xl bg-white p-4 shadow-xl dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
        data-testid="topics-modal"
      >
        <div className="flex items-center justify-between px-1 pb-3">
          <h2 className="text-[18px] font-semibold text-neutral-900 dark:text-neutral-50">{threadText(lang, "topics")}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 hover:bg-black/5 dark:hover:bg-white/10">
            ✕
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {topics === null && !failed && <div className="py-8 text-center text-[13px] text-neutral-400">…</div>}
          {failed && <div className="py-8 text-center text-[13px] text-neutral-400">{threadText(lang, "createFailed")}</div>}
          {topics && topics.length === 0 && <div className="py-8 text-center text-[13px] text-neutral-400">{threadText(lang, "noTopics")}</div>}
          {topics?.map((t) => {
            const author = t.root?.fromId ? personOf(t.root.fromId) : null;
            return (
              <button
                key={t.chatId}
                type="button"
                onClick={() => onOpen(t.chatId)}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition hover:bg-black/5 dark:hover:bg-white/10"
              >
                <CachedAvatar
                  src={author?.photo ?? pickDefaultCatAvatar(t.root?.fromId ?? t.chatId)}
                  blurDataURL={BLUR_DATA_URL}
                  size={40}
                  className="h-10 w-10 shrink-0 rounded-full object-cover"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium text-neutral-900 dark:text-neutral-50">{topicTitle(lang, t.root)}</span>
                  <span className="block truncate text-[12.5px] text-neutral-500 dark:text-neutral-400">
                    {[commentsText(lang, t.replies), t.unread > 0 ? threadText(lang, "newCount", t.unread) : ""].filter(Boolean).join(" · ")}
                  </span>
                </span>
                {t.unread > 0 && <span className="h-2 w-2 shrink-0 rounded-full bg-[#335ef7] dark:bg-[#0c8ce9]" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
