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
  const [attachUploading, setAttachUploading] = useState(false);
  const [attachErrored, setAttachErrored] = useState(false);

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
    if (!text || sending) return;
    setSending(true);
    setDraft("");
    try {
      const res = await authFetch("/api/chats/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chatId: target.routeParam, text }),
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
    if (attachUploading) return;
    setAttachUploading(true);
    setAttachErrored(false);
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
      const sendRes = await authFetch("/api/chats/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chatId: target.routeParam, media: [{ fileReference }] }),
      });
      const sendData = await sendRes.json().catch(() => null);
      if (sendData?.ok && sendData.message) {
        setMessages((prev) => [...prev, sendData.message as ChatMessage]);
      } else {
        throw new Error("send_failed");
      }
    } catch {
      setAttachErrored(true);
      window.setTimeout(() => setAttachErrored(false), 2200);
    } finally {
      setAttachUploading(false);
    }
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
        <div className="min-w-0 flex-1 truncate text-[14px] font-medium text-[#262a34] dark:text-white">{target.title || "—"}</div>
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
          <p className="mt-4 text-center text-[12.5px] text-[#989aa6] dark:text-[#8d8d93]">…</p>
        )}
        {messages.map((msg) => {
          const mine = myUserId !== null && msg.fromId === myUserId;
          const text = extractMessageText(msg);
          if (!text) return null;
          return (
            <div key={msg._id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-1.5 text-[13.5px] leading-snug ${
                  mine
                    ? "rounded-br-sm bg-[#335ef7] text-white dark:bg-[#0c8ce9]"
                    : "rounded-bl-sm bg-[#f2f2f7] text-[#262a34] dark:bg-neutral-800 dark:text-white"
                }`}
              >
                <div className="whitespace-pre-wrap break-words">{text}</div>
                {mine && (
                  <div className="mt-0.5 flex justify-end">
                    <MessageTicks state={messageTickState(msg, peerReadMaxId)} className="h-[7px] w-3 text-white/80" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex shrink-0 items-end gap-2 border-t border-neutral-100 px-2.5 py-2 dark:border-neutral-800">
        {/* 2026-09-02 (Aleksandr, "Sofia Benett" screenshot: "надо
            добавить скрепку слева, а кота поставить справа как в
            обычных чатах") -- paperclip now leads the row, cat icon
            moved inside the pill's own trailing edge, matching
            app/chats/[chatId]/page.tsx's own compose bar order. */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={attachUploading}
          aria-label="Attach"
          title={attachErrored ? "Failed -- try again" : "Attach"}
          className={
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition disabled:opacity-40 " +
            (attachErrored
              ? "text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
              : "text-neutral-400 hover:bg-black/5 hover:text-neutral-600 dark:text-[#8d8d93] dark:hover:bg-white/10 dark:hover:text-neutral-200")
          }
        >
          {attachUploading ? (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.25" />
              <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          ) : (
            <ChatPaperclipGlyph className="h-4 w-4" />
          )}
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
        <div className="group flex min-h-[36px] flex-1 items-center gap-1.5 rounded-full bg-[#f2f2f7] px-3 py-1.5 dark:bg-[#1c1c1e]">
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
            className="max-h-24 min-h-[18px] flex-1 resize-none bg-transparent text-[13.5px] leading-[18px] text-[#262a34] outline-none placeholder:text-[#989aa6] dark:text-white"
          />
          <ChatCatFieldIcon className="h-4 w-4 shrink-0 text-neutral-400 dark:text-[#adafbb]" />
        </div>
        <button
          type="button"
          onClick={handleSend}
          disabled={!draft.trim() || sending}
          aria-label="Send"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#335ef7] text-white transition hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:hover:brightness-100 dark:bg-[#0c8ce9]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 12h15M13 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>,
    document.body,
  );
}
