// components/mini-chat-window.tsx
//
// 2026-09-02 (part of "the Facebook one" -- see components/chats-
// flyout.tsx's own header for the full context). This is the actual
// small floating conversation window Messenger-style chat pops open
// once you pick someone from that popover -- a real, working chat
// (poll, read, send, read-ticks) squeezed into a corner widget, not a
// preview.
//
// Deliberately self-contained, same reasoning as chats-flyout.tsx's own
// header: doesn't import anything from app/chats/[chatId]/page.tsx and
// never touches that file. It reuses the exact same already-shipped API
// routes that page already polls (app/api/chats/messages, .../send,
// .../read-state, .../mark-read) and the same lib/a1/chat-schemas.ts
// pure helpers (extractMessages, extractMessageText, messageDateMs,
// messageTickState) -- only the actual React/DOM side (state, polling
// effect, JSX) is a fresh, smaller build, on purpose, so a bug here can
// never be a bug THERE and vice versa.
//
// `target.routeParam` is either a real Chat _id or lib/a1/chat-
// schemas.ts's `u_<userId>` "no chat yet" sentinel -- both work
// completely transparently against every route below (chat-server
// resolves-or-creates the personal chat itself the moment a message
// actually sends, see chat-schemas.ts's own header), so this component
// never needs to know or care which one it has.
"use client";

import Image from "next/image";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { authFetch } from "@/lib/auth-fetch";
import { BLUR_DATA_URL } from "@/lib/blur-placeholder";
import {
  extractMessages,
  extractMessageText,
  messageDateMs,
  messageTickState,
  type ChatMessage,
} from "@/lib/a1/chat-schemas";
import { MessageTicks, ChatCatFieldIcon, ChatPaperclipGlyph } from "@/components/chat/icons";
import type { ChatFlyoutOpenTarget } from "@/components/chats-flyout";

const POLL_MS = 3000;
// Same throttle idea as app/chats/[chatId]/page.tsx's own readStateTick
// -- the peer's read position changes far less often than messages do,
// so this only asks every 2nd poll tick instead of every single one.
const READ_STATE_EVERY = 2;

// 2026-09-02 (Aleksandr, reference screenshot of the native chat's own
// bubbles: "Надо показвать время сообщений, как у нас в чате на
// мобиле") -- same plain toLocaleTimeString formatting components/
// chats-flyout.tsx's own formatTime() already uses, duplicated here
// rather than imported (this file's own header explains why it never
// shares code with that file).
function formatTime(ms: number): string {
  if (!ms) return "";
  try {
    return new Date(ms).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

// 2026-09-02 (Aleksandr, live screenshot: the paperclip button itself
// turning into a spinner -- "Тут не должно показывать загрузку) ее
// надо показывать на медиа, которое отправляется, но кстати картинка
// не отправилась" -- both a UX correction AND a real bug: the old
// version uploaded and sent in one shot with no staged preview, so a
// slow/failed upload had nothing visible to retry and the button's own
// spinner was the only feedback). Now a proper staged attachment,
// mirroring app/chats/[chatId]/page.tsx's own PendingAttachment
// pattern trimmed to a single image: pick -> thumbnail appears
// immediately with a spinner OVER the thumbnail (not the paperclip) ->
// upload finishes -> Send button includes it. The paperclip itself goes
// back to just opening the file picker.
type MiniAttachment = {
  previewUrl: string;
  status: "uploading" | "ready" | "error";
  fileReference?: string;
};

export function MiniChatWindow({ target, onClose }: { target: ChatFlyoutOpenTarget; onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [peerReadMaxId, setPeerReadMaxId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const inFlight = useRef(false);
  const tick = useRef(0);
  const lastMarkedReadId = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachment, setAttachment] = useState<MiniAttachment | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (inFlight.current) return;
      inFlight.current = true;
      try {
        const res = await authFetch(`/api/chats/messages?chat=${encodeURIComponent(target.routeParam)}`);
        if (cancelled) return;
        if (res.status === 401) {
          setLoadState("error");
          return;
        }
        const data = await res.json().catch(() => null);
        if (!data?.ok) {
          setLoadState((prev) => (prev === "ready" ? prev : "error"));
          return;
        }
        const fetched = extractMessages(data.messages ?? []);
        setMessages(fetched);
        setMyUserId(data.myUserId ?? null);
        setLoadState("ready");

        // Mark-read (see app/chats/[chatId]/page.tsx's own commit for
        // the full two-direction read-receipt writeup) -- advances MY
        // OWN read position so the other side's client sees their
        // message as read, same fire-and-forget pattern, duplicated
        // here on purpose (this file's own header explains why).
        if (!document.hidden && fetched.length > 0) {
          const highestId = Math.max(...fetched.map((m) => Number(m._id)).filter((n) => !Number.isNaN(n)));
          if (highestId > lastMarkedReadId.current) {
            lastMarkedReadId.current = highestId;
            authFetch("/api/chats/mark-read", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ chat: target.routeParam, lastMessage: highestId }),
            }).catch(() => {
              lastMarkedReadId.current = 0;
            });
          }
        }

        tick.current += 1;
        if (tick.current % READ_STATE_EVERY === 0) {
          authFetch(`/api/chats/read-state?chat=${encodeURIComponent(target.routeParam)}`)
            .then((r) => r.json())
            .then((d) => {
              if (!cancelled && d?.ok) setPeerReadMaxId(d.peerReadMaxId ?? null);
            })
            .catch(() => {});
        }
      } catch {
        if (!cancelled) setLoadState((prev) => (prev === "ready" ? prev : "error"));
      } finally {
        inFlight.current = false;
      }
    }

    load();
    const timer = window.setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [target.routeParam]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.length]);

  async function handleSend() {
    const text = draft.trim();
    const readyAttachment = attachment && attachment.status === "ready" ? attachment : null;
    if ((!text && !readyAttachment) || sending) return;
    setSending(true);
    setDraft("");
    if (readyAttachment) {
      URL.revokeObjectURL(readyAttachment.previewUrl);
      setAttachment(null);
    }
    try {
      const res = await authFetch("/api/chats/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chatId: target.routeParam,
          text: text || undefined,
          media: readyAttachment?.fileReference ? [{ fileReference: readyAttachment.fileReference }] : undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (data?.ok && data.message) {
        setMessages((prev) => [...prev, data.message as ChatMessage]);
      }
    } catch {
      // Best-effort -- the next poll tick will reconcile either way,
      // same "poll is the source of truth" contract app/chats/[chatId]/
      // page.tsx already runs on.
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  }

  // 2026-09-02 (Aleksandr, "Sofia Benett" screenshot: "надо добавить
  // скрепку слева, а кота поставить справа как в обычных чатах") -- a
  // real paperclip, not just repositioned chrome: mirrors app/chats/
  // [chatId]/page.tsx's own three-step image-attach flow (create -> PUT
  // to the signed URL -> confirm -> fileReference), trimmed down to a
  // single image sent immediately (no staged preview strip -- this
  // window has no room for one). Deliberately skips that page's own
  // compressAttachmentImage() -- a local, non-exported helper there,
  // and this file's own header explains why it never imports from that
  // page -- an uncompressed upload is the one accepted trade-off for
  // staying self-contained.
  async function handleAttach(file: File) {
    if (attachment) URL.revokeObjectURL(attachment.previewUrl);
    const previewUrl = URL.createObjectURL(file);
    setAttachment({ previewUrl, status: "uploading" });
    try {
      const createRes = await authFetch("/api/upload/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mimetype: file.type || "application/octet-stream", bytes: file.size }),
      });
      const createData = await createRes.json().catch(() => null);
      if (!createRes.ok || !createData?.ok || !createData.result?.url) throw new Error("create_failed");
      const { id, url, fields } = createData.result as { id: string; url: string; fields: Record<string, string> };
      const formData = new FormData();
      for (const [key, value] of Object.entries(fields ?? {})) formData.append(key, value);
      formData.append("file", file);
      const uploadRes = await fetch(url, { method: "POST", body: formData });
      if (!uploadRes.ok) throw new Error("upload_failed");
      const confirmRes = await authFetch("/api/upload/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ documentId: id }),
      });
      const confirmData = await confirmRes.json().catch(() => null);
      const fileReference = confirmData?.media?.fileReference as string | undefined;
      if (!confirmRes.ok || !confirmData?.ok || !fileReference) throw new Error("confirm_failed");
      // Guard against a stale response landing after the user already
      // removed/replaced this attachment (compare by previewUrl, the
      // one thing that's stable for this specific pick).
      setAttachment((prev) => (prev && prev.previewUrl === previewUrl ? { ...prev, status: "ready", fileReference } : prev));
    } catch {
      setAttachment((prev) => (prev && prev.previewUrl === previewUrl ? { ...prev, status: "error" } : prev));
    }
  }

  function removeAttachment() {
    if (attachment) URL.revokeObjectURL(attachment.previewUrl);
    setAttachment(null);
  }

  return createPortal(
    <div
      role="dialog"
      aria-label={target.title}
      className="animate-popover-up fixed right-5 z-[70] flex h-[26rem] w-80 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl dark:border-neutral-700 dark:bg-neutral-900"
      style={{ bottom: "calc(1.25rem + 56px + 12px + 48px + 12px + env(safe-area-inset-bottom))" }}
    >
      <div className="flex shrink-0 items-center gap-2.5 border-b border-neutral-100 px-3 py-2.5 dark:border-neutral-800">
        <Image
          src={target.avatarUrl}
          alt=""
          width={32}
          height={32}
          className="h-8 w-8 shrink-0 rounded-full object-cover"
          placeholder="blur"
          blurDataURL={target.avatarBlurDataUrl ?? BLUR_DATA_URL}
          unoptimized
        />
        <div className="min-w-0 flex-1 truncate text-[16px] font-medium text-[#262a34] dark:text-white">{target.title || "—"}</div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-neutral-400 transition hover:bg-black/5 hover:text-neutral-600 dark:hover:bg-white/10 dark:hover:text-neutral-200"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      <div ref={listRef} className="flex-1 space-y-1.5 overflow-y-auto px-3 py-2.5">
        {loadState === "loading" && messages.length === 0 && (
          <p className="mt-4 text-center text-[14.5px] text-[#989aa6] dark:text-[#8d8d93]">…</p>
        )}
        {messages.map((msg) => {
          const mine = myUserId !== null && msg.fromId === myUserId;
          const text = extractMessageText(msg);
          if (!text) return null;
          // 2026-09-02 (Aleksandr, reference screenshot of the native
          // chat's own bubbles: "Надо показвать время сообщений, как у
          // нас в чате на мобиле") -- bubbles here used to carry no
          // timestamp at all (only mine ones got a ticks row). Now every
          // bubble with a real date shows one, ticks stay mine-only.
          const dateMs = messageDateMs(msg);
          return (
            <div key={msg._id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-1.5 text-[15.5px] leading-snug ${
                  mine
                    ? "rounded-br-sm bg-[#335ef7] text-white dark:bg-[#0c8ce9]"
                    : "rounded-bl-sm bg-[#f2f2f7] text-[#262a34] dark:bg-neutral-800 dark:text-white"
                }`}
              >
                <div className="whitespace-pre-wrap break-words">{text}</div>
                {(dateMs > 0 || mine) && (
                  <div
                    className={`mt-0.5 flex items-center justify-end gap-1 text-[12px] ${
                      mine ? "text-white/80" : "text-[#989aa6] dark:text-[#8d8d93]"
                    }`}
                  >
                    {dateMs > 0 && <span>{formatTime(dateMs)}</span>}
                    {mine && <MessageTicks state={messageTickState(msg, peerReadMaxId)} className="h-[7px] w-3" />}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex shrink-0 flex-col gap-2 border-t border-neutral-100 px-2.5 py-2 dark:border-neutral-800">
        {/* 2026-09-02 (Aleksandr, live screenshot: the paperclip button
            itself was showing a spinner -- "Тут не должно показывать
            загрузку) ее надо показывать на медиа, которое отправляется"
            -- staged thumbnail instead, same overlay-spinner/remove-x
            convention app/chats/[chatId]/page.tsx's own attachment strip
            already uses, just a single item instead of an array. */}
        {attachment && (
          <div className="flex justify-start">
            <div className="group relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- a
                  local blob: URL preview, not a next/image remote src. */}
              <img src={attachment.previewUrl} alt="" className="h-16 w-16 rounded-xl object-cover" />
              {attachment.status === "uploading" && (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/30">
                  <svg className="h-5 w-5 animate-spin text-white" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.25" />
                    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </div>
              )}
              {attachment.status === "error" && (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-red-500/70">
                  <span className="text-[12px] font-medium text-white">Failed</span>
                </div>
              )}
              <button
                type="button"
                onClick={removeAttachment}
                aria-label="Remove attachment"
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>
        )}
        <div className="flex items-end gap-2">
          {/* 2026-09-02 (Aleksandr: "надо добавить скрепку слева, а кота
              поставить справа как в обычных чатах" + "надо тут тоже
              анимации при наведении на иконки") -- paperclip leads the
              row (matching app/chats/[chatId]/page.tsx's own compose
              order) and now wiggles on hover via the SAME `group` +
              animate-paperclip-wiggle pair that page's own
              ChatPaperclipButton already uses (app/globals.css). */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending}
            aria-label="Attach"
            className="group flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-400 transition hover:bg-black/5 hover:text-neutral-600 disabled:opacity-40 dark:text-[#8d8d93] dark:hover:bg-white/10 dark:hover:text-neutral-200"
          >
            <ChatPaperclipGlyph className="h-4 w-4 animate-paperclip-wiggle" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void handleAttach(file);
            }}
          />
          <div className="flex min-h-[36px] flex-1 items-center gap-1.5 rounded-full bg-[#f2f2f7] px-3 py-1.5 dark:bg-[#1c1c1e]">
            <textarea
              ref={textareaRef}
              rows={1}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder=""
              // 2026-09-02 (Aleksandr, live screenshot: a Cyrillic "у"'s
              // descender getting clipped by the pill's own bottom edge)
              // -- leading-[18px] on 13.5px text left no room below the
              // baseline for a descender; leading-5 (20px, same value
              // app/chats/[chatId]/page.tsx's own textarea already uses)
              // fixes it. min-h matched to the same 20px so the single-
              // line pill height doesn't visibly jump.
              className="max-h-24 min-h-[20px] flex-1 resize-none bg-transparent text-[15.5px] leading-5 text-[#262a34] outline-none placeholder:text-[#989aa6] dark:text-white"
            />
            {/* group: own small wrapper (not the whole pill, which would
                fire on every keystroke) -- same reasoning app/chats/
                [chatId]/page.tsx's own cat-icon wrapper comment gives.
                This particular glyph has no chat-cat-pupil sub-paths for
                the eye-dart treatment that page's icon supports, so it
                reuses ChatsFab's own generic animate-chat-wiggle
                (rotate+scale) instead -- still a real hover reaction,
                just a different motion. */}
            <div className="group shrink-0">
              <ChatCatFieldIcon className="h-4 w-4 animate-chat-wiggle text-neutral-400 dark:text-[#adafbb]" />
            </div>
          </div>
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || attachment?.status === "uploading" || (!draft.trim() && attachment?.status !== "ready")}
            aria-label="Send"
            className="group flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#335ef7] text-white transition hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:hover:brightness-100 dark:bg-[#0c8ce9]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="animate-send-arrow">
              <path d="M4 12h15M13 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
