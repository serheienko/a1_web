// components/chat/shared-panel.tsx
//
// 2026-09-30 (Александр: «Спільне» в чате -- медіа, посилання, файли, голос
// одного человека, «всё по-правильному»: скелетон, маленькие пачки).
//
// Как грузится (оптимизация -- главное требование):
//   * ничего не запрашивается, пока панель закрыта;
//   * открыта вкладка -> одна пачка (30) ТОЛЬКО её типа, фильтр делает
//     сервер (/api/chats/shared -> messages.search);
//   * следующая пачка -- когда пользователь докрутил до конца списка
//     (IntersectionObserver на невидимом «якоре» внизу);
//   * вкладки, которые не открывали, не грузятся вообще; уже загруженная
//     вкладка не перезапрашивается при возврате на неё;
//   * серверный флаг грубее, чем вкладка (документ может быть стикером или
//     GIF), поэтому лишнее отсеивается здесь, а если после отсева пачка
//     почти пустая -- берём следующую сразу (не больше 4 подряд).
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { authFetch } from "@/lib/auth-fetch";
import { T } from "@/components/t";
import type { Locale } from "@/components/t";
import { ChatFileTypeIcon, fileKindFromName } from "@/components/chat/file-type-icon";
import { getStableMediaProxyUrl } from "@/lib/a1/stable-media-url";
import { buildMediaDownloadUrl } from "@/lib/a1/media-proxy";
import { formatBytes } from "@/lib/format";
import {
  isImageMediaDocument,
  isStickerMediaDocument,
  isVideoMediaDocument,
  isVoiceMediaDocument,
  mediaDocumentBytes,
  mediaDocumentFileName,
  mediaDocumentThumbnail,
  messageDateMs,
  messageDocumentMedia,
  voiceDurationSeconds,
  type ChatMessage,
  type MessageMediaDocument,
} from "@/lib/a1/chat-schemas";

export type SharedKind = "photos" | "links" | "files" | "voices";
type Kind = SharedKind;
const KINDS: Kind[] = ["photos", "links", "files", "voices"];

type ItemBase = { key: string; msgId: string; ms: number; chat: string | null };
type Item =
  | (ItemBase & { kind: "photos"; doc: MessageMediaDocument })
  | (ItemBase & { kind: "files"; doc: MessageMediaDocument })
  | (ItemBase & { kind: "voices"; doc: MessageMediaDocument })
  | (ItemBase & { kind: "links"; url: string });

type TabState = {
  items: Item[];
  next: string | null;
  hasMore: boolean;
  loading: boolean;
  started: boolean;
  failed: boolean;
};

const EMPTY: TabState = { items: [], next: null, hasMore: true, loading: false, started: false, failed: false };
const MIN_PER_PAGE = 12;
const MAX_PAGES_PER_CALL = 4;

/** Ссылки из дерева entities (учитывая вложенные обёртки). */
function collectUrls(nodes: unknown, out: string[]) {
  if (!Array.isArray(nodes)) return;
  for (const n of nodes) {
    if (!n || typeof n !== "object") continue;
    const e = n as { object?: string; text?: string; url?: string; entities?: unknown };
    if (e.object === "entity-url" && typeof e.text === "string") out.push(e.text);
    else if (e.object === "entity-text-url" && typeof e.url === "string") out.push(e.url);
    if (e.entities) collectUrls(e.entities, out);
  }
}

function itemsOf(kind: Kind, msgs: ChatMessage[]): Item[] {
  const out: Item[] = [];
  for (const m of msgs) {
    const ms = messageDateMs(m);
    const chat = m.peerTo && m.peerTo.object === "peer-chat" ? m.peerTo.chat : null;
    if (kind === "links") {
      const urls: string[] = [];
      collectUrls(m.entities, urls);
      urls.forEach((url, i) => out.push({ kind, key: `${m._id}:${i}`, msgId: m._id, url, ms, chat }));
      continue;
    }
    for (const doc of messageDocumentMedia(m)) {
      const sticker = isStickerMediaDocument(doc);
      const image = isImageMediaDocument(doc);
      const video = isVideoMediaDocument(doc);
      const voice = isVoiceMediaDocument(doc);
      if (kind === "photos" && image && !sticker && !video) out.push({ kind, key: doc._id, msgId: m._id, doc, ms, chat });
      if (kind === "voices" && voice) out.push({ kind, key: doc._id, msgId: m._id, doc, ms, chat });
      if (kind === "files" && !image && !video && !voice && !sticker) out.push({ kind, key: doc._id, msgId: m._id, doc, ms, chat });
    }
  }
  return out;
}

const shimmer = "animate-pulse bg-[#e4e4ea] dark:bg-[#2c2c2e]";

function Skeleton({ kind }: { kind: Kind }) {
  if (kind === "photos") {
    return (
      <div className="grid grid-cols-3 gap-0.5" aria-hidden>
        {Array.from({ length: 18 }).map((_, i) => (
          <div key={i} className={`aspect-square ${shimmer}`} />
        ))}
      </div>
    );
  }
  return (
    <div className="space-y-4 px-4 py-2" aria-hidden>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className={`h-11 w-11 shrink-0 ${kind === "voices" ? "rounded-full" : "rounded-xl"} ${shimmer}`} />
          <div className="flex-1 space-y-2">
            <div className={`h-3 rounded-full ${shimmer}`} style={{ width: `${55 + ((i * 17) % 35)}%` }} />
            <div className={`h-2.5 rounded-full ${shimmer}`} style={{ width: `${30 + ((i * 23) % 30)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ kind }: { kind: Kind }) {
  const icon: Record<Kind, string> = {
    photos: "M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm2 11 4-5 3 3.5 2-2.5 3 4",
    links: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
    files: "M7 3h7l5 5v13H7V3Zm7 0v5h5",
    voices: "M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3Zm-7 9a7 7 0 0 0 14 0m-7 7v3",
  };
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-[#989aa6] dark:text-[#8d8d93]">
      <svg viewBox="0 0 24 24" className="h-16 w-16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d={icon[kind]} />
      </svg>
      <span className="text-[17px]">
        <T uk="Немає результатів" en="No results" ru="Нет результатов" de="Keine Ergebnisse" es="Sin resultados" fr="Aucun résultat" pl="Brak wyników" ptBR="Sem resultados" zh="没有结果" />
      </span>
    </div>
  );
}

function VoiceRow({ item, playing, onToggle, where }: { item: Extract<Item, { kind: "voices" }>; playing: boolean; onToggle: () => void; where?: string }) {
  const secs = Math.round(voiceDurationSeconds(item.doc));
  return (
    <button type="button" onClick={onToggle} className="flex w-full items-center gap-3 px-4 py-2 text-left">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#4b63d8] text-white">
        {playing ? (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M7 5h4v14H7zM13 5h4v14h-4z" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-[#1c1c1e] dark:text-white">
          <T uk="Голосове повідомлення" en="Voice message" ru="Голосовое сообщение" de="Sprachnachricht" es="Mensaje de voz" fr="Message vocal" pl="Wiadomość głosowa" ptBR="Mensagem de voz" zh="语音消息" />
        </span>
        <span className="block text-[13px] text-[#989aa6]">
          {where ? `${where} · ` : ""}{Math.floor(secs / 60)}:{String(secs % 60).padStart(2, "0")} · {new Date(item.ms).toLocaleDateString()}
        </span>
      </span>
    </button>
  );
}

export function SharedPanel({
  chatId,
  lang,
  onClose,
  initialTab = "photos",
  chatTitles,
}: {
  /** Без chatId -- поиск по всем чатам (тогда в строках показывается имя чата). */
  chatId?: string;
  lang: Locale;
  onClose: () => void;
  initialTab?: Kind;
  chatTitles?: Record<string, string>;
}) {
  const [tab, setTab] = useState<Kind>(initialTab);
  const where = (it: Item) => (chatId || !it.chat ? "" : (chatTitles?.[it.chat] ?? ""));
  const [tabs, setTabs] = useState<Record<Kind, TabState>>({
    photos: EMPTY, links: EMPTY, files: EMPTY, voices: EMPTY,
  });
  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;
  const sentinel = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingKey, setPlayingKey] = useState<string | null>(null);

  const patch = useCallback((k: Kind, p: Partial<TabState>) => {
    setTabs((prev) => ({ ...prev, [k]: { ...prev[k], ...p } }));
  }, []);

  const loadMore = useCallback(
    async (k: Kind) => {
      const st = tabsRef.current[k];
      if (st.loading || !st.hasMore) return;
      patch(k, { loading: true, started: true, failed: false });
      let items = st.items;
      let next = st.next;
      let hasMore: boolean = st.hasMore;
      let found = 0;
      try {
        for (let page = 0; page < MAX_PAGES_PER_CALL && hasMore; page++) {
          const qs = new URLSearchParams({ kind: k });
          if (chatId) qs.set("chat", chatId);
          if (next) qs.set("next", next);
          const res = await authFetch(`/api/chats/shared?${qs.toString()}`);
          const data = await res.json().catch(() => null);
          if (!data?.ok) throw new Error("fetch_failed");
          const fresh = itemsOf(k, (data.messages ?? []) as ChatMessage[]);
          const seen = new Set(items.map((i) => i.key));
          const add = fresh.filter((i) => !seen.has(i.key));
          items = [...items, ...add];
          found += add.length;
          next = data.next ?? null;
          hasMore = Boolean(data.hasMore && next);
          if (found >= MIN_PER_PAGE) break;
        }
        patch(k, { items, next, hasMore, loading: false });
      } catch {
        patch(k, { items, next, loading: false, failed: true, hasMore: false });
      }
    },
    [chatId, patch],
  );

  // First visit of a tab loads its first page; nothing else is fetched.
  useEffect(() => {
    if (!tabsRef.current[tab].started) void loadMore(tab);
  }, [tab, loadMore]);

  // Next page when the bottom anchor scrolls into view.
  const cur = tabs[tab];
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !cur.started || !cur.hasMore) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) void loadMore(tab);
      },
      { rootMargin: "400px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [tab, cur.started, cur.hasMore, cur.items.length, loadMore]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  const toggleVoice = useCallback(async (item: Extract<Item, { kind: "voices" }>) => {
    if (playingKey === item.key) {
      audioRef.current?.pause();
      setPlayingKey(null);
      return;
    }
    audioRef.current?.pause();
    try {
      const res = await fetch(buildMediaDownloadUrl(item.doc));
      const blob = await res.blob();
      const a = new Audio(URL.createObjectURL(blob));
      a.onended = () => setPlayingKey(null);
      audioRef.current = a;
      setPlayingKey(item.key);
      await a.play();
    } catch {
      setPlayingKey(null);
    }
  }, [playingKey]);

  const labels: Record<Kind, React.ReactNode> = useMemo(
    () => ({
      photos: <T uk="Медіа" en="Media" ru="Медиа" de="Medien" es="Medios" fr="Médias" pl="Media" ptBR="Mídia" zh="媒体" />,
      links: <T uk="Посилання" en="Links" ru="Ссылки" de="Links" es="Enlaces" fr="Liens" pl="Linki" ptBR="Links" zh="链接" />,
      files: <T uk="Файли" en="Files" ru="Файлы" de="Dateien" es="Archivos" fr="Fichiers" pl="Pliki" ptBR="Arquivos" zh="文件" />,
      voices: <T uk="Голос" en="Voice" ru="Голос" de="Sprache" es="Voz" fr="Voix" pl="Głos" ptBR="Voz" zh="语音" />,
    }),
    [],
  );

  void lang;
  const showSkeleton = (!cur.started || cur.loading) && cur.items.length === 0;
  const showEmpty = cur.started && !cur.loading && cur.items.length === 0;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-black/30" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-[420px] flex-col bg-[#f2f2f7] shadow-xl dark:bg-[#000]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-3 pb-2 pt-3">
          <div className="flex flex-1 gap-1 overflow-x-auto rounded-full bg-white p-1 dark:bg-[#1c1c1e]">
            {KINDS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setTab(k)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-[14px] transition ${
                  tab === k ? "bg-[#e5e5ea] font-semibold text-[#4b63d8] dark:bg-[#3a3a3c]" : "text-[#555] dark:text-[#ccc]"
                }`}
              >
                {labels[k]}
              </button>
            ))}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#4b63d8] dark:bg-[#1c1c1e]">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pb-6">
          {showSkeleton && <Skeleton kind={tab} />}
          {showEmpty && <EmptyState kind={tab} />}

          {tab === "photos" && cur.items.length > 0 && (
            <div className="grid grid-cols-3 gap-0.5">
              {cur.items.map((it) =>
                it.kind === "photos" ? (
                  <a key={it.key} href={getStableMediaProxyUrl(it.doc)} target="_blank" rel="noreferrer" className="relative block aspect-square overflow-hidden bg-[#e4e4ea] dark:bg-[#2c2c2e]">
                    {/* eslint-disable-next-line @next/next/no-img-element -- proxied through /api/media */}
                    <img
                      src={getStableMediaProxyUrl(it.doc)}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      style={{ backgroundImage: `url(${mediaDocumentThumbnail(it.doc) ?? ""})`, backgroundSize: "cover" }}
                      className="h-full w-full object-cover"
                    />
                  </a>
                ) : null,
              )}
            </div>
          )}

          {tab === "links" &&
            cur.items.map((it) =>
              it.kind === "links" ? (
                <a key={it.key} href={it.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 px-4 py-2">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[#4b63d8] dark:bg-[#1c1c1e]">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></svg>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold text-[#4b63d8]">{it.url}</span>
                    <span className="block text-[13px] text-[#989aa6]">{where(it) ? `${where(it)} · ` : ""}{new Date(it.ms).toLocaleDateString()}</span>
                  </span>
                </a>
              ) : null,
            )}

          {tab === "files" &&
            cur.items.map((it) => {
              if (it.kind !== "files") return null;
              const name = mediaDocumentFileName(it.doc) || "File";
              const bytes = mediaDocumentBytes(it.doc);
              return (
                <a key={it.key} href={buildMediaDownloadUrl(it.doc, name)} className="flex items-center gap-3 px-4 py-2">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-[#3a3a3c]">
                    <ChatFileTypeIcon kind={fileKindFromName(name, it.doc.mimetype)} className="h-7 w-7" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold text-[#1c1c1e] dark:text-white">{name}</span>
                    <span className="block text-[13px] text-[#989aa6]">
                      {where(it) ? `${where(it)} · ` : ""}
                      {bytes ? `${formatBytes(bytes)} · ` : ""}
                      {new Date(it.ms).toLocaleDateString()}
                    </span>
                  </span>
                </a>
              );
            })}

          {tab === "voices" &&
            cur.items.map((it) =>
              it.kind === "voices" ? (
                <VoiceRow key={it.key} item={it} playing={playingKey === it.key} onToggle={() => void toggleVoice(it)} where={where(it)} />
              ) : null,
            )}

          {/* Small skeleton at the bottom while the next page loads. */}
          {cur.loading && cur.items.length > 0 && (
            <div className="px-4 py-3" aria-hidden>
              <div className={`h-11 rounded-xl ${shimmer}`} />
            </div>
          )}
          {cur.failed && (
            <button type="button" onClick={() => patch(tab, { hasMore: true, failed: false })} className="mx-auto block px-4 py-3 text-[14px] text-[#4b63d8]">
              <T uk="Не вдалося завантажити. Повторити" en="Couldn't load. Retry" ru="Не удалось загрузить. Повторить" de="Laden fehlgeschlagen. Erneut" es="No se pudo cargar. Reintentar" fr="Échec. Réessayer" pl="Nie udało się. Ponów" ptBR="Falha. Tentar de novo" zh="加载失败，重试" />
            </button>
          )}
          <div ref={sentinel} className="h-px" />
        </div>
      </aside>
    </div>
  );
}
