// components/chat/forward-picker-modal.tsx
//
// Forward feature (2026-09-05, Aleksandr: "И переслать, можешь пока
// просто поресерчить, что у нас в коде и собрать... Ну типа это форвард
// обычный. Но у нас там должна быть UI-ка ещё симпатичная"). The target
// picker for "Переслати" in message-actions-menu.tsx -- modeled directly
// on contacts-picker-modal.tsx's own structure (search field +
// scrollable list, same skeleton-row loading convention). Data source:
// GET /api/chats/list, the SAME route the chat list page itself already
// uses (no new backend route needed).
//
// 2026-09-05 follow-up (bug-tracker: "Давай добавим... возможность
// делать это большому кол-во пользователей, т.е. добавить мультивыбор")
// -- this used to be single-tap-and-close (a straight 1:1 port of the
// mobile app's own sendForwardedMessage, which only takes one `userId:
// String` per call, no list). Aleksandr explicitly asked for multi-
// select past that mobile contract, so this is now a genuine web-only
// enhancement: checkbox rows (same picked-set + bottom-Send convention
// contacts-picker-modal.tsx already established) instead of tap-to-
// send, with the actual fan-out to N chats handled by the caller
// (app/chats/[chatId]/page.tsx's handleForwardSend) looping the SAME
// single-target POST /api/chats/send call once per picked chat --
// still N ordinary forwarded messages under the hood, never a batch
// backend call that doesn't exist.
"use client";

import { useEffect, useMemo, useState } from "react";
import { authFetch } from "@/lib/auth-fetch";
import { CachedAvatar } from "@/components/cached-avatar";
import { BLUR_DATA_URL } from "@/lib/blur-placeholder";
import { T, type Locale } from "@/components/t";
import { SearchIcon } from "@/components/search-icon";

type ForwardChatRow = {
  id: string;
  title: string;
  avatarUrl: string;
  avatarBlurDataUrl: string | null;
};

type LoadState = "loading" | "signed-out" | "error" | "ready";

export type ForwardRowStatus = "sending" | "done" | "failed";

function Spinner({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function ForwardPickerModal({
  lang,
  onClose,
  pickedChatIds,
  onToggle,
  onSend,
  sending,
  rowStatus,
  failed,
}: {
  lang: Locale;
  onClose: () => void;
  // Chats currently checked in this picker -- owned by the caller, same
  // division of responsibility as ContactsPickerModal's own
  // pickedUserIds/onToggle pair.
  pickedChatIds: Set<string>;
  onToggle: (chatId: string) => void;
  // Fires once for the whole picked set; the caller owns looping the
  // actual per-chat send calls and closing this modal once every pick
  // has gone through (see handleForwardSend's own header).
  onSend: () => void;
  sending: boolean;
  // Per-chat outcome while a send round is in flight, so a picked row
  // can show its own spinner/checkmark/error instead of one opaque
  // "sending" state for the whole list -- lets a partial failure (2 of
  // 3 chats went through) read clearly instead of an all-or-nothing
  // banner.
  rowStatus: Record<string, ForwardRowStatus>;
  failed: boolean;
}) {
  const [state, setState] = useState<LoadState>("loading");
  const [chats, setChats] = useState<ForwardChatRow[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    authFetch("/api/chats/list")
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 401) {
          setState("signed-out");
          return;
        }
        const data = await res.json().catch(() => null);
        if (!data?.ok) {
          setState("error");
          return;
        }
        setChats(data.chats ?? []);
        setState("ready");
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const trimmed = query.trim().toLowerCase();
  const filtered = useMemo(
    () => (trimmed ? chats.filter((c) => c.title.toLowerCase().includes(trimmed)) : chats),
    [chats, trimmed],
  );

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" onClick={sending ? undefined : onClose}>
      <div
        className="flex h-[min(32rem,80vh)] w-full max-w-sm flex-col rounded-2xl bg-white shadow-xl dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
            <T uk="Переслати" en="Forward to" ru="Переслать" de="Weiterleiten an" es="Reenviar a" fr="Transférer à" pl="Prześlij do" ptBR="Encaminhar para" zh="转发给" />
            {pickedChatIds.size > 0 && ` (${pickedChatIds.size})`}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            aria-label="Close"
            className="text-neutral-400 hover:text-neutral-900 disabled:opacity-40 dark:hover:text-neutral-50"
          >
            ×
          </button>
        </div>

        {failed && (
          <p className="px-5 pt-2 text-[13px] text-red-500 dark:text-red-400">
            <T
              uk="Не вдалося переслати деяким отримувачам. Спробуйте ще раз." en="Couldn't forward to some recipients. Try again."
              ru="Не удалось переслать некоторым получателям. Попробуйте ещё раз." de="Weiterleiten an einige Empfänger fehlgeschlagen. Versuch es erneut."
              es="No se pudo reenviar a algunos destinatarios. Inténtalo de nuevo." fr="Échec du transfert vers certains destinataires. Réessayez."
              pl="Nie udało się przesłać do niektórych odbiorców. Spróbuj ponownie." ptBR="Não foi possível encaminhar para alguns destinatários. Tente novamente."
              zh="部分接收者转发失败，请重试。"
            />
          </p>
        )}

        <div className="relative px-5 pb-3 pt-3">
          <SearchIcon className="pointer-events-none absolute left-8 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              lang === "uk" ? "Пошук" : lang === "ru" ? "Поиск" : lang === "de" ? "Suche" : lang === "es" ? "Buscar"
              : lang === "fr" ? "Rechercher" : lang === "pl" ? "Szukaj" : lang === "ptBR" ? "Buscar" : lang === "zh" ? "搜索" : "Search"
            }
            className="w-full rounded-full border border-neutral-200 bg-neutral-50 py-2 pl-9 pr-3.5 text-[14px] text-neutral-900 outline-none focus:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {state === "loading" &&
            Array.from({ length: 7 }, (_, i) => (
              <div key={i} className="flex w-full items-center gap-3 rounded-xl px-3 py-2" aria-hidden="true">
                <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-800" />
                <div className="h-[15px] w-2/5 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
              </div>
            ))}
          {state === "error" && (
            <div className="flex items-center justify-center py-10 text-center text-sm text-neutral-500 dark:text-neutral-400">
              <T
                uk="Не вдалося завантажити чати" en="Couldn't load chats" ru="Не удалось загрузить чаты"
                de="Chats konnten nicht geladen werden" es="No se pudieron cargar los chats" fr="Impossible de charger les discussions"
                pl="Nie udało się wczytać czatów" ptBR="Não foi possível carregar os chats" zh="无法加载聊天"
              />
            </div>
          )}
          {state === "ready" && filtered.length === 0 && (
            <div className="flex items-center justify-center py-10 text-center text-sm text-neutral-500 dark:text-neutral-400">
              <T uk="Нічого не знайдено" en="Nothing found" ru="Ничего не найдено" de="Nichts gefunden" es="No se encontró nada" fr="Aucun résultat" pl="Nic nie znaleziono" ptBR="Nada encontrado" zh="未找到任何内容" />
            </div>
          )}
          {state === "ready" &&
            filtered.map((c) => {
              const picked = pickedChatIds.has(c.id);
              const status = rowStatus[c.id];
              return (
                <button
                  key={c.id}
                  type="button"
                  disabled={sending}
                  onClick={() => onToggle(c.id)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-black/[0.03] disabled:opacity-60 dark:hover:bg-white/[0.05]"
                >
                  <CachedAvatar
                    src={c.avatarUrl}
                    blurDataURL={c.avatarBlurDataUrl ?? BLUR_DATA_URL}
                    size={40}
                    className="h-10 w-10 shrink-0 rounded-full object-cover"
                  />
                  <div className="min-w-0 flex-1 truncate text-[15px] font-medium text-neutral-900 dark:text-neutral-50">
                    {c.title || "—"}
                  </div>
                  {status === "sending" ? (
                    <Spinner className="h-4 w-4 shrink-0 animate-spin text-[#335ef7] dark:text-[#0c8ce9]" />
                  ) : status === "failed" ? (
                    <span className="shrink-0 text-[12px] font-medium text-red-500 dark:text-red-400">!</span>
                  ) : status === "done" ? (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#335ef7] text-[12px] text-white dark:bg-[#0c8ce9]">
                      ✓
                    </span>
                  ) : (
                    <div
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[12px] ${
                        picked
                          ? "border-[#335ef7] bg-[#335ef7] text-white dark:border-[#0c8ce9] dark:bg-[#0c8ce9]"
                          : "border-neutral-300 dark:border-neutral-600"
                      }`}
                    >
                      {picked && "✓"}
                    </div>
                  )}
                </button>
              );
            })}
        </div>

        <div className="border-t border-neutral-100 px-4 py-3 dark:border-neutral-800">
          <button
            type="button"
            onClick={onSend}
            disabled={pickedChatIds.size === 0 || sending}
            className="w-full rounded-full bg-[#335ef7] py-2.5 text-sm font-semibold text-white transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:brightness-100 dark:bg-[#0c8ce9]"
          >
            {sending ? (
              <span className="flex items-center justify-center gap-2">
                <Spinner className="h-4 w-4 animate-spin" />
                <T uk="Надсилання…" en="Sending…" ru="Отправка…" de="Wird gesendet…" es="Enviando…" fr="Envoi…" pl="Wysyłanie…" ptBR="Enviando…" zh="发送中…" />
              </span>
            ) : (
              <T uk="Переслати" en="Forward" ru="Переслать" de="Weiterleiten" es="Reenviar" fr="Transférer" pl="Prześlij" ptBR="Encaminhar" zh="转发" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
