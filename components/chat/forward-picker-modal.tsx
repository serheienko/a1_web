// components/chat/forward-picker-modal.tsx
//
// Forward feature (2026-09-05, Aleksandr: "И переслать, можешь пока
// просто поресерчить, что у нас в коде и собрать... Ну типа это форвард
// обычный. Но у нас там должна быть UI-ка ещё симпатичная"). The target
// picker for "Переслати" in message-actions-menu.tsx -- modeled
// directly on contacts-picker-modal.tsx's own structure (search field +
// scrollable list, same skeleton-row loading convention) but a single-
// tap-and-close list rather than that modal's multi-pick + bottom Send
// button: Telegram's own forward sheet supports picking several chats
// at once, but the mobile app's own sendForwardedMessage only ever
// forwards to ONE peer per call (`userId: String`, not a list) -- this
// stays a straight 1:1 port of that, not an enhancement past it. Data
// source: GET /api/chats/list, the SAME route the chat list page itself
// already uses (no new backend route needed).
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

export function ForwardPickerModal({
  lang,
  onClose,
  onPick,
  sendingChatId,
  failed,
}: {
  lang: Locale;
  onClose: () => void;
  // Fires once per tap on a row; the caller (app/chats/[chatId]/
  // page.tsx's handleForwardMessage) owns the actual send + closing
  // this modal on success, same division of responsibility contacts-
  // picker-modal.tsx's own onSend already has.
  onPick: (chatId: string) => void;
  // Set while a forward to this specific chat id is in flight -- rows
  // besides it stay tappable (nothing here stops picking a SECOND
  // target while the first is still sending) except during that one
  // row's own spinner.
  sendingChatId: string | null;
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
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="flex h-[min(32rem,80vh)] w-full max-w-sm flex-col rounded-2xl bg-white shadow-xl dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
            <T uk="Переслати" en="Forward to" ru="Переслать" de="Weiterleiten an" es="Reenviar a" fr="Transférer à" pl="Prześlij do" ptBR="Encaminhar para" zh="转发给" />
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50"
          >
            ×
          </button>
        </div>

        {failed && (
          <p className="px-5 pt-2 text-[13px] text-red-500 dark:text-red-400">
            <T
              uk="Не вдалося переслати. Спробуйте ще раз." en="Couldn't forward. Try again."
              ru="Не удалось переслать. Попробуйте ещё раз." de="Weiterleiten fehlgeschlagen. Versuch es erneut."
              es="No se pudo reenviar. Inténtalo de nuevo." fr="Échec du transfert. Réessayez."
              pl="Nie udało się przesłać. Spróbuj ponownie." ptBR="Não foi possível encaminhar. Tente novamente."
              zh="转发失败，请重试。"
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
              const rowSending = sendingChatId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  disabled={sendingChatId !== null}
                  onClick={() => onPick(c.id)}
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
                  {rowSending && (
                    <svg className="h-4 w-4 shrink-0 animate-spin text-[#335ef7] dark:text-[#0c8ce9]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
                      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                  )}
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
}
