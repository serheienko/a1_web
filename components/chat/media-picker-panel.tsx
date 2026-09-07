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
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { authFetch } from "@/lib/auth-fetch";
import { EMOJI_CATEGORIES } from "@/lib/a1/emoji-data";
import { buildMediaProxyUrl, strippedPreviewDataUrl } from "@/lib/a1/media-proxy";
import { getStableMediaProxyUrl } from "@/lib/a1/stable-media-url";
import type { MediaDocument } from "@/lib/a1/schemas";
import { type Stickerset } from "@/lib/a1/media-panel-schemas";
import { getStickerSets, getRecentStickers, bumpRecentSticker, hasCachedStickerData } from "@/lib/a1/sticker-sets-cache";
import { TgsSticker } from "./tgs-sticker";

type Tab = "gifs" | "stickers" | "emoji";

// Fix Tracker (2026-09-06/07, "не влезла модалка в чатах" + "надо чтобы
// модалка стикеров по расположению показывась так же как и меню которое
// высплывает при наведении на скрепку") -- this panel used to render
// nested inside its own trigger button's wrapper div, positioned via
// plain CSS (`absolute bottom-full right-0 mb-2`, page.tsx's own call
// site). That anchors the panel's RIGHT edge to the trigger's right
// edge -- fine as long as the trigger sits flush against the actual
// screen edge (true for the paperclip attach-menu, which anchors LEFT
// off the leftmost icon in the composer row), but the sticker/GIF/emoji
// trigger (the cat icon) sits further right in that same row, with the
// reminder bell/mic/send button still to its right -- so a fixed
// 340px-wide panel anchored off THAT narrower trigger overflowed clean
// off the left edge of the viewport on any phone-width screen (live
// screenshot: "Недавние" clipped to "едавние" at x=0). Same root class
// of bug message-actions-menu.tsx and forward-preview-menu.tsx already
// solve for their own popups: measure the real anchor + viewport once
// at open time and clamp, rather than trusting a CSS corner anchor to
// always have room. PANEL_WIDTH/PANEL_HEIGHT mirror this panel's own
// fixed h-[420px] w-[340px] card size.
const PANEL_WIDTH = 340;
const PANEL_HEIGHT = 420;
const VIEWPORT_MARGIN = 12;

// Fix Tracker: GIF grid showed broken-image icons for every result.
// Root cause -- media.globalSearch's previewUrls (media-server,
// media.globalSearch.ts) come from the klipy GIF provider as short .mp4
// clips, not actual GIF/raster images (confirmed live: every request in
// the browser network tab for a "GIF" result was a 200 to a
// static.klipy.com/.../*.mp4 URL) -- an <img> can't decode video, so it
// silently fails to the browser's broken-image icon. The one non-video
// case is the backend's own USER_PHOTO_FALLBACK (a real static image),
// so branch on the URL's extension rather than assuming every preview is
// one or the other.
function isVideoPreviewUrl(url: string): boolean {
  // Fix Tracker (order 63, 2026-09-07): previewUrls now come back
  // wrapped as /api/chats/gifs/proxy?u=<encoded original klipy URL>
  // (see that API route + its search-route caller for why), so the
  // real extension to sniff lives inside the `u` query param, not
  // necessarily at the very end of this string anymore -- a klipy URL
  // with its own query string (a signed token, say) would put more
  // encoded characters after ".mp4" and silently break the old
  // end-of-string check. Unwrap first when this is our own proxy URL;
  // fall back to testing the raw string as before for anything else
  // (the panel's one non-video case, USER_PHOTO_FALLBACK, never goes
  // through the proxy).
  try {
    const parsed = new URL(url, "http://localhost");
    if (parsed.pathname === "/api/chats/gifs/proxy") {
      const inner = parsed.searchParams.get("u");
      if (inner) return /\.(mp4|webm|mov)(\?|$)/i.test(inner);
    }
  } catch {
    // not a parseable URL (relative or malformed) -- fall through
  }
  return /\.(mp4|webm|mov)(\?|$)/i.test(url);
}

// Fix Tracker: "кэшируй GIF" -- gif search results were refetched from
// scratch on every reopen of the panel and every retype of the same
// query, even though klipy results for a given query don't change
// second to second. Module-level (outside the component) so it
// survives the panel itself unmounting -- mediaPanelOpen in
// app/chats/[chatId]/page.tsx conditionally unmounts this whole
// component on close, so a component-local cache (state/ref) would
// have been wiped every time anyway.
const gifSearchCache = new Map<string, { items: MediaDocument[]; previewUrls: Record<string, string> }>();

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

// Fix Tracker: "Назови пак со стикерами MR.KIT а не A1 Business app" --
// the pack's real title comes straight from the backend
// (messages.getAllStickers) and isn't ours to rename, so this maps the
// known raw title to the name Alex wants shown, everywhere else falling
// back to whatever the backend actually sent.
function displayStickerSetTitle(title: string): string {
  return title.trim().toLowerCase() === "a1 business app" ? "MR.KIT" : title;
}

// Fix Tracker (order 77, 2026-09-07, "сломанная иконка (заглушка)
// слева от часов в панели стикеров") -- a pack's own thumb doc can
// itself be an animated sticker (gzipped Lottie .tgs), same format
// app/chats/[chatId]/page.tsx's message bubbles needed TgsSticker for
// instead of a plain <img> (see tgs-sticker.tsx's header comment for
// why <img> can never decode that format). Rendering the category row
// with a raw <img> showed the browser's own broken-image icon for any
// pack whose thumb happens to be animated. This tries <img> first (the
// common case, unchanged) and only falls back to TgsSticker's
// gunzip+lottie-web decode on a load error; if the thumb is neither a
// real image nor a real .tgs (a genuinely dead URL), TgsSticker's own
// fallback prop below still lands on the same first-letter chip as
// before, so nothing regresses to a worse state than today.
function StickerSetIcon({ thumb, letter }: { thumb: MediaDocument | null; letter: string }) {
  const [imgFailed, setImgFailed] = useState(false);
  const fallback = <span className="text-[13px] font-semibold text-[#262a34] dark:text-white">{letter}</span>;

  if (!thumb) return fallback;

  if (!imgFailed) {
    return (
      <img
        src={buildMediaProxyUrl(thumb)}
        alt=""
        className="h-full w-full object-cover"
        onError={() => setImgFailed(true)}
      />
    );
  }

  return <TgsSticker src={buildMediaProxyUrl(thumb)} size={36} fallback={fallback} />;
}

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
  anchorRect,
  onClose,
  onPickEmoji,
  onSendMedia,
  initialTab,
  initialSetId,
}: {
  // Frozen snapshot of the trigger button's getBoundingClientRect() at
  // the moment it was opened (same convention as ForwardPreviewMenu's
  // own anchorRect prop) -- not a live-tracked element, so this only
  // needs to be captured once by the caller, on click.
  anchorRect: DOMRect;
  onClose: () => void;
  onPickEmoji: (emoji: string) => void;
  onSendMedia: (doc: MediaDocument) => void;
  // Fix Tracker (order 71, "открывать стикерпак полностью"): tapping an
  // already-sent sticker in the message list opens this same panel but
  // needs it to land straight on the Stickers tab, showing that
  // sticker's own pack -- rather than always defaulting to whichever
  // pack happened to load first.
  initialTab?: Tab;
  initialSetId?: string;
}) {
  // Stickers is the reference screenshots' default/starting tab.
  const [tab, setTab] = useState<Tab>(initialTab ?? "stickers");

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
  //
  // Fix Tracker (order 79, Aleksandr: "стикеры сейчас не кешируются") --
  // this panel unmounts on close, so `fetchedStickersRef` (still just a
  // per-mount guard against re-running this same effect twice) used to
  // mean a fresh network round-trip on EVERY reopen. getStickerSets()
  // and getRecentStickers() are now module-level singleton caches
  // (lib/a1/sticker-sets-cache.ts) that outlive the panel's own mount,
  // so a reopen within the same page session reuses whatever was
  // already fetched instead of re-requesting both endpoints from
  // scratch, and the loading flag below is skipped entirely on a cache
  // hit -- no skeleton flash (order 68) for data that's already sitting
  // in memory.
  useEffect(() => {
    if (tab !== "stickers" || fetchedStickersRef.current) return;
    fetchedStickersRef.current = true;
    const applyResults = (realSets: Stickerset[], realRecent: MediaDocument[]) => {
      setSets(realSets);
      setRecent(realRecent);
      // initialSetId (order 71) wins when the caller asked to jump
      // straight to a specific pack and it's actually in the list;
      // otherwise same default as before (first pack, else Recent).
      const requestedSet = initialSetId ? realSets.find((s) => s._id === initialSetId) : undefined;
      setActiveSetId(requestedSet?._id ?? realSets[0]?._id ?? (realRecent.length > 0 ? "recent" : null));
    };
    // A cache hit resolves synchronously-ish (Promise.resolve under
    // the hood) but still a tick later than this render -- checking
    // the cache directly here, rather than just waiting for that tick,
    // is what actually skips the loading flag (and its skeleton) for a
    // reopen instead of merely flipping it true-then-false too fast to
    // notice.
    if (!hasCachedStickerData()) setStickersLoading(true);
    Promise.all([getStickerSets(), getRecentStickers()])
      .then(([realSets, realRecent]) => applyResults(realSets, realRecent))
      .finally(() => setStickersLoading(false));
  }, [tab, initialSetId]);

  useEffect(() => {
    if (tab !== "gifs") return;
    // Fix Tracker: "кэшируй GIF" -- a cache hit renders immediately,
    // no spinner/skeleton flash, no network round-trip.
    const cached = gifSearchCache.get(gifQuery);
    if (cached) {
      gifSearchSeqRef.current += 1; // cancel any still-in-flight fetch for a previous query
      setGifItems(cached.items);
      setGifPreviewUrls(cached.previewUrls);
      setGifLoading(false);
      return;
    }
    const seq = ++gifSearchSeqRef.current;
    setGifLoading(true);
    const handle = setTimeout(
      () => {
        const qs = new URLSearchParams({ q: gifQuery });
        authFetch(`/api/chats/gifs/search?${qs.toString()}`)
          .then((r) => r.json())
          .then((data) => {
            if (gifSearchSeqRef.current !== seq) return;
            const items: MediaDocument[] = Array.isArray(data?.items) ? data.items : [];
            const previewUrls: Record<string, string> =
              data?.previewUrls && typeof data.previewUrls === "object" ? data.previewUrls : {};
            gifSearchCache.set(gifQuery, { items, previewUrls });
            setGifItems(items);
            setGifPreviewUrls(previewUrls);
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
  const activeStickerHeaderTitle = activeSetId === "recent" ? "Недавние" : displayStickerSetTitle(activeSet?.title ?? "");

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

  // Measures nothing from the DOM -- the card's own size is fixed
  // (PANEL_WIDTH/PANEL_HEIGHT, modulo the 92vw cap on a narrow phone),
  // so it's computed straight from window dimensions, same idea as
  // ForwardPreviewMenu's single-measurement clamp just without needing
  // a ref'd pre-render pass first. Opens ABOVE-and-left-of the trigger
  // (mirrors the old bottom-full/right-0 CSS intent) but clamped so it
  // never crosses any viewport edge.
  //
  // Fix Tracker (order 69, "не влезла модалка в чатах, надо
  // оптимизировать"): this used to clamp LEFT/WIDTH against the
  // viewport (see this fix's own header comment above PANEL_WIDTH) but
  // still rendered at a hardcoded h-[420px] with no equivalent check on
  // the VERTICAL axis -- on a short viewport (mobile landscape, a phone
  // keyboard open shrinking the visual viewport, a small split-screen
  // window) the panel got pinned to VIEWPORT_MARGIN from the top but
  // stayed 420px tall, overflowing off the bottom edge with nothing to
  // scroll it. `height` is now clamped the same way width already was,
  // and the card's fixed h-[420px] class is replaced with this
  // computed height so a short viewport shrinks the panel instead of
  // letting it run off-screen.
  const [placement, setPlacement] = useState<{ left: number; top: number; width: number; height: number } | null>(null);

  useLayoutEffect(() => {
    const width = Math.min(PANEL_WIDTH, window.innerWidth - VIEWPORT_MARGIN * 2);
    const idealLeft = anchorRect.right - width;
    const left = Math.min(Math.max(idealLeft, VIEWPORT_MARGIN), window.innerWidth - width - VIEWPORT_MARGIN);
    const height = Math.min(PANEL_HEIGHT, window.innerHeight - VIEWPORT_MARGIN * 2);
    const idealTop = anchorRect.top - 8 - height;
    const maxTop = Math.max(VIEWPORT_MARGIN, window.innerHeight - VIEWPORT_MARGIN - height);
    const top = Math.min(Math.max(idealTop, VIEWPORT_MARGIN), maxTop);
    setPlacement({ left, top, width, height });
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorRect]);

  if (typeof document === "undefined" || !placement) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      {/* No dim/blur backdrop -- same "Cupertino menu, no scrim" style
          message-actions-menu.tsx/forward-preview-menu.tsx already use
          for their own popups. Doubles as the outside-click-to-close
          handler instead of page.tsx's old document-mousedown listener
          (which assumed the panel was a DOM child of the trigger's own
          ref -- no longer true now that this renders through a portal). */}
      <div className="absolute inset-0" onClick={onClose} />
      <div
        className="animate-popover-up absolute flex flex-col overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-neutral-900"
        style={{ left: placement.left, top: placement.top, width: placement.width, height: placement.height }}
      >
      {/* Close/collapse arrow -- reference screenshots show it top-right. */}
      <div className="flex shrink-0 items-center justify-between border-b border-black/5 px-3 py-2 dark:border-white/10">
        <span className="flex min-w-0 items-center gap-1.5">
          {tab === "stickers" && activeSetId === "recent" && <span className="text-[13px]">🕐</span>}
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
              title={displayStickerSetTitle(s.title)}
              className={`flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full transition ${
                activeSetId === s._id ? "ring-2 ring-[#335ef7] dark:ring-[#0c8ce9]" : "bg-black/5 dark:bg-white/10"
              }`}
            >
              <StickerSetIcon thumb={s.thumb} letter={displayStickerSetTitle(s.title).charAt(0)} />
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
                  onClick={() => {
                    // Fix Tracker (order 79) -- keeps the Recent cache
                    // (lib/a1/sticker-sets-cache.ts) in sync with what
                    // the user just did, so the NEXT panel open shows
                    // this sticker under Recent without waiting on a
                    // refetch of /api/chats/stickers/recent.
                    bumpRecentSticker(doc);
                    onSendMedia(doc);
                  }}
                  className="flex items-center justify-center rounded-[12px] p-1 transition hover:bg-black/5 dark:hover:bg-white/10"
                >
                  <TgsSticker
                    src={getStableMediaProxyUrl(doc)}
                    size={64}
                    fallback={<StickerChipFallback size={64} />}
                    previewUrl={strippedPreviewDataUrl(doc)}
                  />
                </button>
              ))}
            </div>
          ))}

        {tab === "gifs" &&
          (gifLoading ? (
            // Fix Tracker: "сделай скелетон загрузку для гифок" -- was a
            // single centered "Загрузка..." string; now a grid of
            // pulsing placeholders shaped exactly like the real tiles
            // below (aspect-video, rounded-[12px]), same animate-pulse
            // gray-block language every other loading list in this app
            // already uses (components/chats-flyout.tsx's ChatRowSkeleton
            // etc.) rather than inventing a new loading language here.
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="aspect-video animate-pulse rounded-[12px] bg-black/5 dark:bg-white/10" />
              ))}
            </div>
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
                  {(() => {
                    const previewSrc = gifPreviewUrls[doc._id] ?? buildMediaProxyUrl(doc);
                    return isVideoPreviewUrl(previewSrc) ? (
                      <video
                        src={previewSrc}
                        className="h-full w-full object-cover"
                        autoPlay
                        loop
                        muted
                        playsInline
                      />
                    ) : (
                      <img src={previewSrc} alt="" className="h-full w-full object-cover" />
                    );
                  })()}
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
    </div>,
    document.body,
  );
}
