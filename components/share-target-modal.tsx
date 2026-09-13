// components/share-target-modal.tsx
//
// 2026-09-13 (Александр: «поделиться контактом» и «поделиться дописом»
// из меню ⋯ у вакансии). Оба пункта до сих пор были заглушками:
// "Поділитися контактом" не делал ничего, а "Поділитися дописом" умел
// только системное меню/копию ссылки -- отправить во внутренний чат было
// нельзя. Это окно закрывает обе дырки одним экраном.
//
// Форма выбора -- СЕТКА круглых аватарок с поиском, а не список строк,
// как в components/chat/forward-picker-modal.tsx (выбрано вместе с
// Александром через AskUserQuestion: "Новое окно с круглыми аватарками ...
// Сетка из 16–20 круглых аватарок + поиск сверху. Внизу отдельная кнопка
// «поделиться вовне»"). Пересылка внутри чатов остаётся на своём списке:
// там у строки есть превью последнего сообщения и статус отправки, здесь
// же важно с одного взгляда узнать человека в лицо.
//
// Источник получателей -- тот же GET /api/chats/list, что и у пересылки:
// новый маршрут не нужен, и «с кем поделиться» автоматически совпадает с
// тем, с кем уже есть переписка.
//
// Чем именно делимся -- см. ShareTarget ниже. Контакт уходит карточкой
// (media-contact, её рисует components/chat/contact-message-card.tsx),
// допис -- заголовком и ссылкой обычным сообщением: отдельного типа
// «сообщение-вакансия» в чатах пока нет.
"use client";

import { useEffect, useMemo, useState } from "react";
import { authFetch } from "@/lib/auth-fetch";
import { CachedAvatar } from "@/components/cached-avatar";
import { BLUR_DATA_URL } from "@/lib/blur-placeholder";
import { T, type Locale } from "@/components/t";
import { SearchIcon } from "@/components/search-icon";

type ChatRow = {
  id: string;
  title: string;
  avatarUrl: string;
  avatarBlurDataUrl: string | null;
};

export type ShareTarget =
  | {
      kind: "contact";
      /** Чей профиль отправляем. */
      userId: string;
      /** Как его зовут -- и для карточки, и для запасного варианта. */
      name: string;
      /** Ссылка на профиль: запасной вариант, если карточку не примут. */
      profileUrl: string;
    }
  | {
      kind: "post";
      title: string;
      url: string;
    };

type LoadState = "loading" | "signed-out" | "error" | "ready";

// Карточка контакта на бэкенде -- это {userId, phoneNumber, firstName,
// lastName}, и телефона у нас тут НЕТ: /api/users/summaries его намеренно
// не отдаёт (см. её собственный комментарий про безопасность), а у
// компании его чаще всего и вовсе не существует. Поэтому имя режем на
// две части, а телефон уходит пустым -- карточка в чате такую строку
// просто не рисует.
function splitName(full: string): { firstName: string; lastName: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "A1", lastName: "" };
  return { firstName: parts[0]!, lastName: parts.slice(1).join(" ") };
}

function CheckBadge() {
  return (
    <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-[#335ef7] dark:border-neutral-900 dark:bg-[#0c8ce9]">
      <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3" aria-hidden="true">
        <path d="M20 6L9 17l-5-5" />
      </svg>
    </span>
  );
}

function ExternalShareIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M12 16V4M12 4L8 8M12 4l4 4" />
      <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function ShareTargetModal({
  lang,
  target,
  onClose,
}: {
  lang: Locale;
  target: ShareTarget;
  onClose: () => void;
}) {
  const [state, setState] = useState<LoadState>("loading");
  const [chats, setChats] = useState<ChatRow[]>([]);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);

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

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !sending) onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, sending]);

  const trimmed = query.trim().toLowerCase();
  const filtered = useMemo(
    () => (trimmed ? chats.filter((c) => c.title.toLowerCase().includes(trimmed)) : chats),
    [chats, trimmed],
  );

  function toggle(id: string) {
    setFailed(false);
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /** Одна отправка. true -- дошло. */
  async function sendToChat(chatId: string): Promise<boolean> {
    async function post(body: Record<string, unknown>) {
      const res = await authFetch("/api/chats/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chatId, ...body }),
      });
      const data = await res.json().catch(() => null);
      return Boolean(res.ok && data?.ok);
    }

    try {
      if (target.kind === "post") {
        return await post({ text: `${target.title}\n${target.url}` });
      }

      const { firstName, lastName } = splitName(target.name);
      const ok = await post({
        contacts: [{ userId: target.userId, phoneNumber: "", firstName, lastName }],
      });
      if (ok) return true;

      // Карточку могли не принять -- у неё на бэкенде телефон описан как
      // обязательное поле, и пустая строка теоретически может не пройти
      // проверку. Терять из-за этого сам шаринг незачем: то же самое
      // уходит обычным сообщением со ссылкой на профиль.
      return await post({ text: `${target.name}\n${target.profileUrl}` });
    } catch {
      return false;
    }
  }

  async function handleSend() {
    if (picked.size === 0 || sending) return;
    setSending(true);
    setFailed(false);
    let anyFailed = false;
    for (const chatId of picked) {
      // Последовательно, а не пачкой: получателей тут единицы, зато
      // сервер не получает веер одновременных отправок.
      // eslint-disable-next-line no-await-in-loop
      const ok = await sendToChat(chatId);
      if (!ok) anyFailed = true;
    }
    setSending(false);
    if (anyFailed) {
      setFailed(true);
      return;
    }
    setSent(true);
    setTimeout(onClose, 700);
  }

  async function handleExternalShare() {
    const url = target.kind === "post" ? target.url : target.profileUrl;
    const title = target.kind === "post" ? target.title : target.name;
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // Человек закрыл системное меню или браузер отказал -- падаем в
        // копию ссылки, как это уже делает components/post-viewer-menu.tsx.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setFailed(true);
    }
  }

  const busy = sending;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" onClick={busy ? undefined : onClose}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-md flex-col rounded-2xl bg-white shadow-xl dark:bg-neutral-900"
      >
        <div className="flex items-center justify-between gap-2 px-5 pt-5">
          <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-neutral-900 dark:text-neutral-50">
            <T uk="Поділитися з" en="Share with" ru="Поделиться с" de="Teilen mit" es="Compartir con" fr="Partager avec" pl="Udostępnij" ptBR="Compartilhar com" zh="分享给" />
            {picked.size > 0 && ` (${picked.size})`}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="shrink-0 text-neutral-400 hover:text-neutral-900 disabled:opacity-40 dark:hover:text-neutral-50"
          >
            ×
          </button>
        </div>

        {failed && (
          <p className="px-5 pt-2 text-[13px] text-red-500 dark:text-red-400">
            <T
              uk="Не вдалося надіслати. Спробуйте ще раз." en="Couldn't send. Try again."
              ru="Не удалось отправить. Попробуйте ещё раз." de="Senden fehlgeschlagen. Versuch es erneut."
              es="No se pudo enviar. Inténtalo de nuevo." fr="Échec de l'envoi. Réessayez."
              pl="Nie udało się wysłać. Spróbuj ponownie." ptBR="Não foi possível enviar. Tente novamente."
              zh="发送失败，请重试。"
            />
          </p>
        )}

        <div className="relative px-5 pb-3 pt-3">
          <SearchIcon className="pointer-events-none absolute left-8 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={busy}
            placeholder={
              lang === "uk" ? "Пошук" : lang === "ru" ? "Поиск" : lang === "de" ? "Suche" : lang === "es" ? "Buscar"
              : lang === "fr" ? "Rechercher" : lang === "pl" ? "Szukaj" : lang === "ptBR" ? "Buscar" : lang === "zh" ? "搜索" : "Search"
            }
            className="w-full rounded-full border border-neutral-200 bg-neutral-50 py-2 pl-9 pr-3.5 text-[14px] text-neutral-900 outline-none focus:border-neutral-300 disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          />
        </div>

        {/* Четыре в ряд на телефоне и пять на широком экране: при высоте
            списка в четыре ряда это те самые 16-20 лиц, которые видно
            без прокрутки. */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2">
          {state === "loading" && (
            <div className="grid grid-cols-4 gap-x-2 gap-y-4 sm:grid-cols-5" aria-hidden="true">
              {Array.from({ length: 10 }, (_, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5">
                  <div className="h-14 w-14 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-800" />
                  <div className="h-3 w-10 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
                </div>
              ))}
            </div>
          )}

          {state === "signed-out" && (
            <div className="flex items-center justify-center py-10 text-center text-sm text-neutral-500 dark:text-neutral-400">
              <T
                uk="Увійдіть, щоб поділитися в чаті" en="Sign in to share in a chat" ru="Войдите, чтобы поделиться в чате"
                de="Melde dich an, um im Chat zu teilen" es="Inicia sesión para compartir en un chat" fr="Connectez-vous pour partager dans une discussion"
                pl="Zaloguj się, aby udostępnić na czacie" ptBR="Entre para compartilhar em um chat" zh="登录后可在聊天中分享"
              />
            </div>
          )}

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
              {chats.length === 0 ? (
                <T
                  uk="Поки немає чатів — поділіться посиланням" en="No chats yet — share a link instead" ru="Пока нет чатов — поделитесь ссылкой"
                  de="Noch keine Chats — teile stattdessen einen Link" es="Aún no hay chats: comparte un enlace" fr="Pas encore de discussions — partagez un lien"
                  pl="Brak czatów — udostępnij link" ptBR="Ainda sem chats — compartilhe um link" zh="暂无聊天 — 可分享链接"
                />
              ) : (
                <T uk="Нічого не знайдено" en="Nothing found" ru="Ничего не найдено" de="Nichts gefunden" es="No se encontró nada" fr="Aucun résultat" pl="Nic nie znaleziono" ptBR="Nada encontrado" zh="未找到任何内容" />
              )}
            </div>
          )}

          {state === "ready" && filtered.length > 0 && (
            <div className="grid grid-cols-4 gap-x-2 gap-y-4 sm:grid-cols-5">
              {filtered.map((c) => {
                const isPicked = picked.has(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggle(c.id)}
                    disabled={busy}
                    aria-pressed={isPicked}
                    className="flex flex-col items-center gap-1.5 rounded-xl py-1 outline-none transition disabled:opacity-60"
                  >
                    <span className="relative">
                      <CachedAvatar
                        src={c.avatarUrl}
                        blurDataURL={c.avatarBlurDataUrl ?? BLUR_DATA_URL}
                        size={112}
                        className={
                          "h-14 w-14 rounded-full object-cover transition " +
                          (isPicked
                            ? "ring-2 ring-[#335ef7] ring-offset-2 ring-offset-white dark:ring-[#0c8ce9] dark:ring-offset-neutral-900"
                            : "")
                        }
                      />
                      {isPicked && <CheckBadge />}
                    </span>
                    <span
                      className={
                        // min-h под ДВЕ строки всегда: без него ряд, в
                        // котором попалось длинное название, становится
                        // выше остальных, и сетка идёт волной.
                        "line-clamp-2 min-h-[27px] w-full px-0.5 text-center text-[11.5px] leading-tight " +
                        (isPicked
                          ? "font-semibold text-[#335ef7] dark:text-[#0c8ce9]"
                          : "text-neutral-600 dark:text-neutral-300")
                      }
                    >
                      {c.title}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-neutral-200 px-5 py-3 dark:border-neutral-800">
          <button
            type="button"
            onClick={handleExternalShare}
            disabled={busy}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-neutral-200 px-3.5 py-2 text-[13px] font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            <ExternalShareIcon className="h-4 w-4" />
            {copied ? (
              <T uk="Скопійовано" en="Copied" ru="Скопировано" de="Kopiert" es="Copiado" fr="Copié" pl="Skopiowano" ptBR="Copiado" zh="已复制" />
            ) : (
              <T uk="Інше" en="Elsewhere" ru="Вовне" de="Woanders" es="En otra app" fr="Ailleurs" pl="Gdzie indziej" ptBR="Em outro app" zh="其他应用" />
            )}
          </button>

          <button
            type="button"
            onClick={handleSend}
            disabled={busy || picked.size === 0 || sent}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#335ef7] px-4 py-2 text-[14px] font-semibold text-white transition hover:brightness-110 disabled:opacity-40 dark:bg-[#0c8ce9]"
          >
            {sending && <Spinner className="h-4 w-4" />}
            {sent ? (
              <T uk="Надіслано" en="Sent" ru="Отправлено" de="Gesendet" es="Enviado" fr="Envoyé" pl="Wysłano" ptBR="Enviado" zh="已发送" />
            ) : (
              <T uk="Надіслати" en="Send" ru="Отправить" de="Senden" es="Enviar" fr="Envoyer" pl="Wyślij" ptBR="Enviar" zh="发送" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
