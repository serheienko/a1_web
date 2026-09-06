"use client";

// components/chat/media-picker-panel.tsx
//
// Block 1 (Aleksandr, 2026-09-06: "Да, делаем всё сразу" -- GIFs +
// Stickers + Emoji built together, not staged, per his reference
// screenshots -- a three-way segmented control at the bottom (Stickers
// is the default/starting tab), a close/collapse arrow, search on the
// GIF and Emoji tabs, a mood-icon quick-filter row on GIF, a standard
// category row on Emoji, and the sticker tab's own header showing a
// recent/clock icon + the active pack's thumb + its name -- see
// STICKERS_AND_REACTIONS_PLAN.md for the full reference-screenshot
// breakdown this was built against.
//
// Picking a sticker or GIF calls onSendMedia and closes the panel
// (matches the reference: tapping a sticker/GIF sends it immediately,
// there's no separate "attach then Send" step for these, unlike
// photos/files). Picking an emoji calls onPickEmoji and stays open, so
// several emoji can be inserted into the draft in a row -- closing on
// every tap would make multi-emoji messages tedious.
import { useEffect, useMemo, useRef, useState } from "react";
import { authFetch } from "@/lib/auth-fetch";
import { EMOJI_CATEGORIES } from "@/lib/a1/emoji-data";
import { buildMediaProxyUrl } from "@/lib/a1/media-proxy";
import type { MediaDocument } from "@/lib/a1/schemas";
import {
  isRealMediaDocument,
  isRealStickerset,
  type Stickerset,
} from "@/lib/a1/media-panel-schemas";
import { TgsSticker } from "./tgs-sticker";

type Tab = "gifs" | "stickers" | "emoji";

// Quick-filter row on the GIF tab (reference screenshot: a row of mood
// icons above the results grid) -- each just fires a canned search
// term, there's no backend "mood" concept to key off of.
const MOOD_QUERIES: { icon: string; q: string }[] = [
  { icon: "😂", q: "laugh" },
  { icon: "😍", q: "love" },
  { icon: "😢", q: "cry" },
  { icon: "😡", q: "angry" },
  { icon: "👍", q: "thumbs up" },
  { icon: "🎉", q: "celebrate" },
  { icon: "😴", q: "sleepy" },
  { icon: "🙄", q: "eyeroll" },
];

function StickerChipFallback({ size }: { size: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-[12px] bg-black/5 dark:bg-white/10"
      style={{ width: size, height: size }}
    >
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="text-[#989aa6]" aria-hidden="true">
        <circle cx="12" cy="12" r="8.5" />
        <path d="M9 10.2h.01M15 10.2h.01" />
        <path d="M8.7 14.2c1.9 1.6 4.7 1.6 6.6 0" />
      </svg>
    </div>
  );
}

export function MediaPickerPanel({
  onClose,
  onPickEmoji,
  onSendMedia,
}: {
  onClose: () => void;
  onPickEmoji: (emoji: string) => void;
  onSendMedia: (doc: MediaDocument) => void;
}) {
  // Stickers is the reference screenshots' default/starting tab.
  const [tab, setTab] = useState<Tab>("stickers");

  const [sets, setSets] = useState<Stickerset[] | null>(null);
  const [recent, setRecent] = useState<MediaDocument[]>([]);
  const [activeSetId, setActiveSetId] = useState<string | "recent" | null>(null);
  const [stickersLoading, setStickersLoading] = useState(false);
  const fetchedStickersRef = useRef(false);

  const [gifQuery, setGifQuery] = useState("");
  const [gifItems, setGifItems] = useState<MediaDocument[]>([]);
  const [gifPreviewUrls, setGifPreviewUrls] = useState<Record<string, string>>({});
  const [gifLoading, setGifLoading] = useState(false);
  const gifSearchSeqRef = useRef(0);

  const [emojiQuery, setEmojiQuery] = useState("");
  const [emojiCategory, setEmojiCategory] = useState(EMOJI_CATEGORIES[0]?.key ?? "smileys");

  // authFetch (not plain fetch) -- both these routes go through
  // callAsVisitor, and lib/auth-fetch.ts's own header comment documents
  // a real race hit elsewhere in this app when two authenticated
  // requests fire at once with an expired access token: both redeem the
  // same single-use refresh token, the loser gets logged out. Firing
  // both in Promise.all below is exactly that shape, so both go through
  // authFetch's shared queue instead of bare fetch.
  useEffect(() => {
    if (tab !== "stickers" || fetchedStickersRef.current) return;
    fetchedStickersRef.current = true;
    setStickersLoading(true);
    Promise.all([
      authFetch("/api/chats/stickers/sets")
        .then((r) => r.json())
        .catch(() => null),
      authFetch("/api/chats/stickers/recent")
        .then((r) => r.json())
        .catch(() => null),
    ])
      .then(([setsData, recentData]) => {
        const realSets: Stickerset[] = Array.isArray(setsData?.sets) ? setsData.sets.filter(isRealStickerset) : [];
        const realRecent: MediaDocument[] = Array.isArray(recentData?.stickers)
          ? recentData.stickers.filter(isRealMediaDocument)
          : [];
        setSets(realSets);
        setRecent(realRecent);
        setActiveSetId(realRecent.length > 0 ? "recent" : (realSets[0]?._id ?? null));
      })
      .finally(() => setStickersLoading(false));
  }, [tab]);

  useEffect(() => {
    if (tab !== "gifs") return;
    const seq = ++gifSearchSeqRef.current;
    setGifLoading(true);
    const handle = setTimeout(
      () => {
        const qs = new URLSearchParams({ q: gifQuery });
        authFetch(`/api/chats/gifs/search?${qs.toString()}`)
          .then((r) => r.json())
          .then((data) => {
            if (gifSearchSeqRef.current !== seq) return;
            setGifItems(Array.isArray(data?.items) ? data.items : []);
            setGifPreviewUrls(data?.previewUrls && typeof data.previewUrls === "object" ? data.previewUrls : {});
          })
          .catch(() => {
            if (gifSearchSeqRef.current !== seq) return;
            setGifItems([]);
            setGifPreviewUrls({});
          })
          .finally(() => {
            if (gifSearchSeqRef.current === seq) setGifLoading(false);
          });
      },
      gifQuery ? 350 : 0,
    );
    return () => clearTimeout(handle);
  }, [tab, gifQuery]);

  const activeSet = activeSetId && activeSetId !== "recent" ? (sets ?? []).find((s) => s._id === activeSetId) : null;
  const activeStickers: MediaDocument[] = activeSetId === "recent" ? recent : (activeSet?.documents ?? []);
  const activeStickerHeaderTitle = activeSetId === "recent" ? "Недавние" : (activeSet?.title ?? "");
  const activeStickerHeaderThumb = activeSetId === "recent" ? null : activeSet?.thumb ?? null;

  // Emoji search: no per-emoji keyword text (see lib/a1/emoji-data.ts's
  // own scope-cut comment), so a non-empty query matches by CATEGORY
  // label instead -- typing "живот" finds "Животные" -- and falls back
  // to the active category's own emoji when nothing matches, so the
  // grid is never left empty from a query with no hits.
  const visibleEmojis = useMemo(() => {
    const q = emojiQuery.trim().toLowerCase();
    if (!q) return EMOJI_CATEGORIES.find((c) => c.key === emojiCategory)?.emojis ?? [];
    const matchingCats = EMOJI_CATEGORIES.filter((c) => c.labelRu.toLowerCase().includes(q));
    if (matchingCats.length === 0) return EMOJI_CATEGORIES.find((c) => c.key === emojiCategory)?.emojis ?? [];
    return matchingCats.flatMap((c) => c.emojis);
  }, [emojiQuery, emojiCategory]);

  return (
    <div
      className="animate-popover-up flex h-[420px] w-[340px] max-w-[92vw] flex-col overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-neutral-900"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Close/collapse arrow -- reference screenshots show it top-right. */}
      <div className="flex shrink-0 items-center justify-between border-b border-black/5 px-3 py-2 dark:border-white/10">
        <span className="flex min-w-0 items-center gap-1.5">
          {tab === "stickers" && activeSetId === "recent" && <span className="text-[13px]">🕐</span>}
          {tab === "stickers" && activeStickerHeaderThumb && (
            <img src={buildMediaProxyUrl(activeStickerHeaderThumb)} alt="" className="h-4 w-4 shrink-0 rounded-full object-cover" />
          )}
          <span className="truncate text-[13px] font-semibold text-[#262a34] dark:text-white">
            {tab === "stickers" ? activeStickerHeaderTitle : tab === "gifs" ? "GIF" : "Emoji"}
          </span>
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[#989aa6] transition hover:bg-black/5 hover:text-[#262a34] dark:hover:bg-white/10 dark:hover:text-white"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>

      {tab === "gifs" && (
        <div className="flex shrink-0 flex-col gap-2 px-3 pt-2">
          <input
            type="text"
            value={gifQuery}
            onChange={(e) => setGifQuery(e.target.value)}
            placeholder="Поиск GIF"
            className="w-full rounded-full bg-black/5 px-3 py-1.5 text-[13px] text-[#262a34] outline-none placeholder:text-[#989aa6] dark:bg-white/10 dark:text-white"
          />
          <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {MOOD_QUERIES.map((m) => (
              <button
                key={m.q}
                type="button"
                onClick={() => setGifQuery(m.q)}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[16px] transition ${
                  gifQuery === m.q ? "bg-[#335ef7]/15 dark:bg-[#0c8ce9]/20" : "bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15"
                }`}
              >
                {m.icon}
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === "emoji" && (
        <div className="flex shrink-0 flex-col gap-2 px-3 pt-2">
          <input
            type="text"
            value={emojiQuery}
            onChange={(e) => setEmojiQuery(e.target.value)}
            placeholder="Поиск эмодзи"
            className="w-full rounded-full bg-black/5 px-3 py-1.5 text-[13px] text-[#262a34] outline-none placeholder:text-[#989aa6] dark:bg-white/10 dark:text-white"
          />
          <div className="flex gap-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {EMOJI_CATEGORIES.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => {
                  setEmojiCategory(c.key);
                  setEmojiQuery("");
                }}
                title={c.labelRu}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[16px] transition ${
                  emojiCategory === c.key && !emojiQuery ? "bg-[#335ef7]/15 dark:bg-[#0c8ce9]/20" : "bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15"
                }`}
              >
                {c.icon}
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === "stickers" && (
        <div className="flex shrink-0 gap-1.5 overflow-x-auto px-3 pt-2 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {recent.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveSetId("recent")}
              aria-label="Recent"
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[15px] transition ${
                activeSetId === "recent" ? "bg-[#335ef7]/15 dark:bg-[#0c8ce9]/20" : "bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15"
              }`}
            >
              🕐
            </button>
          )}
          {(sets ?? []).map((s) => (
            <button
              key={s._id}
              type="button"
              onClick={() => setActiveSetId(s._id)}
              title={s.title}
              className={`flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full transition ${
                activeSetId === s._id ? "ring-2 ring-[#335ef7] dark:ring-[#0c8ce9]" : "bg-black/5 dark:bg-white/10"
              }`}
            >
              {s.thumb ? (
                <img src={buildMediaProxyUrl(s.thumb)} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-[13px] font-semibold text-[#262a34] dark:text-white">{s.title.charAt(0)}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Content grid -- the only part that scrolls. */}
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        {tab === "stickers" &&
          (stickersLoading ? (
            <div className="flex h-full items-center justify-center text-[13px] text-[#989aa6]">Загрузка...</div>
          ) : activeStickers.length === 0 ? (
            <div className="flex h-full items-center justify-center text-[13px] text-[#989aa6]">Нет стикеров</div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {activeStickers.map((doc) => (
                <button
                  key={doc._id}
                  type="button"
                  onClick={() => onSendMedia(doc)}
                  className="flex items-center justify-center rounded-[12px] p-1 transition hover:bg-black/5 dark:hover:bg-white/10"
                >
                  <TgsSticker src={buildMediaProxyUrl(doc)} size={64} fallback={<StickerChipFallback size={64} />} />
                </button>
              ))}
            </div>
          ))}

        {tab === "gifs" &&
          (gifLoading ? (
            <div className="flex h-full items-center justify-center text-[13px] text-[#989aa6]">Загрузка...</div>
          ) : gifItems.length === 0 ? (
            <div className="flex h-full items-center justify-center text-[13px] text-[#989aa6]">Ничего не найдено</div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {gifItems.map((doc) => (
                <button
                  key={doc._id}
                  type="button"
                  onClick={() => onSendMedia(doc)}
                  className="aspect-video overflow-hidden rounded-[12px] bg-black/5 transition hover:opacity-85 dark:bg-white/10"
                >
                  <img
                    src={gifPreviewUrls[doc._id] ?? buildMediaProxyUrl(doc)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          ))}

        {tab === "emoji" && (
          <div className="grid grid-cols-8 gap-1">
            {visibleEmojis.map((emoji, idx) => (
              <button
                key={`${emoji}-${idx}`}
                type="button"
                onClick={() => onPickEmoji(emoji)}
                className="flex h-9 w-9 items-center justify-center rounded-[10px] text-[20px] leading-none transition hover:bg-black/5 dark:hover:bg-white/10"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bottom segmented control -- reference screenshots' three-way
          GIFs/Stickers/Emoji toggle. */}
      <div className="flex shrink-0 items-center gap-1 border-t border-black/5 p-1.5 dark:border-white/10">
        {(
          [
            { key: "gifs" as const, label: "GIF" },
            { key: "stickers" as const, label: "Стикеры" },
            { key: "emoji" as const, label: "Emoji" },
          ]
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-xl py-1.5 text-[12px] font-semibold transition ${
              tab === t.key
                ? "bg-[#335ef7] text-white dark:bg-[#0c8ce9]"
                : "text-[#989aa6] hover:bg-black/5 dark:hover:bg-white/10"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
