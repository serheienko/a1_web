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
import { chatRouteParamForUser } from "@/lib/a1/chat-schemas";
import { pickDefaultCatAvatar } from "@/lib/avatars";
import type { UserSearchHit } from "@/app/api/users/search/route";

type ChatRow = {
  id: string;
  title: string;
  avatarUrl: string;
  avatarBlurDataUrl: string | null;
  // Есть только у строк из списка чатов -- по нему отсеиваются двойники,
  // когда тот же человек приходит ещё и из общего поиска.
  username?: string | null;
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
  // Отдельно от `failed`: та надпись говорит про отправку в чат, а
  // здесь речь про ссылку -- смешивать их значит врать человеку о
  // том, что именно не получилось.
  const [copyFailed, setCopyFailed] = useState(false);
  // 2026-09-13 (Александр: "При поделиься контактом и постом тоже должно
  // искать пользователей global по никам"). Список чатов -- это только
  // те, с кем уже переписывались; поделиться с человеком, которому ещё
  // не писали, было нельзя вовсе. Общий поиск по людям добавляется к
  // тому же списку: отправить можно и в ещё не начатую переписку --
  // адрес "u_<id>" сервер понимает как "личный чат с этим человеком"
  // (lib/a1/chat-schemas.ts, peerForRouteParam).
  const [globalPeople, setGlobalPeople] = useState<ChatRow[]>([]);

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

  // Общий поиск -- только когда что-то набрано: без запроса показывать
  // "всех людей платформы" бессмысленно, там должны быть свои чаты.
  useEffect(() => {
    const q = trimmed;
    if (q.length < 2) {
      setGlobalPeople([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      fetch(`/api/users/search?q=${encodeURIComponent(q)}`)
        .then((res) => res.json())
        .then((data: { ok?: boolean; users?: UserSearchHit[] }) => {
          if (cancelled || !data?.ok) return;
          setGlobalPeople(
            (data.users ?? []).map((u) => ({
              id: chatRouteParamForUser(u.userId),
              title: u.fullName,
              avatarUrl: u.avatarUrl ?? pickDefaultCatAvatar(u.username),
              avatarBlurDataUrl: u.avatarBlurDataUrl,
              username: u.username,
            })),
          );
        })
        .catch(() => {
          if (!cancelled) setGlobalPeople([]);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmed]);

  // Один список вместо двух: человек ищет, кому отправить, и ему всё
  // равно, была ли до этого переписка. Свои чаты идут первыми -- они
  // почти всегда и есть ответ, -- а из общего поиска добавляются только
  // те, кого в списке ещё нет.
  const visible = useMemo(() => {
    const seenUsernames = new Set(
      filtered.map((c) => (c.username ?? "").toLowerCase()).filter(Boolean),
    );
    const seenIds = new Set(filtered.map((c) => c.id));
    return [
      ...filtered,
      ...globalPeople.filter(
        (p) => !seenIds.has(p.id) && !seenUsernames.has((p.username ?? "").toLowerCase()),
      ),
    ];
  }, [filtered, globalPeople]);

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

    if (target.kind === "post") {
      try {
        return await post({ text: `${target.title}\n${target.url}` });
      } catch {
        return false;
      }
    }

    const { firstName, lastName } = splitName(target.name);
    try {
      if (await post({ contacts: [{ userId: target.userId, phoneNumber: "", firstName, lastName }] })) {
        return true;
      }
    } catch {
      // Отдельный try именно вокруг первой попытки: раньше один общий
      // блок глотал и её исключение тоже, и запасной вариант ниже тогда
      // не срабатывал вовсе -- то есть спасал ровно от половины случаев,
      // ради которых был написан.
    }

    // Карточку могли не принять: телефон у неё на бэкенде описан как
    // обязательное поле, и пустая строка теоретически может не пройти
    // проверку. Терять из-за этого сам шаринг незачем -- то же самое
    // уходит обычным сообщением со ссылкой на профиль.
    try {
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
    setCopyFailed(false);
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (e) {
        // 2026-09-13 (Александр, живой скриншот: красное «Не вдалося
        // надіслати» при том, что в чат вообще ничего не отправлялось --
        // в логах сервера за это время ни одного POST на /api/chats/send).
        // Закрыть системное меню -- нормальное действие, а не сбой:
        // браузер отвечает на это AbortError, и раньше мы валились с ним
        // в копирование, которое в Safari после этого уже не разрешено
        // (потеряно подтверждение действия пользователя) и бросало своё
        // исключение -- отсюда и бралась ошибка на ровном месте.
        if (e instanceof DOMException && e.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopyFailed(true);
      setTimeout(() => setCopyFailed(false), 2600);
    }
  }

  const busy = sending;

  // Кнопка слева осталась без подписи, но название ей всё равно нужно --
  // и для подсказки при наведении, и для читалок с экрана.
  const externalShareLabel =
    lang === "uk" ? "Поділитися деінде"
    : lang === "ru" ? "Поделиться вовне"
    : lang === "de" ? "Woanders teilen"
    : lang === "es" ? "Compartir en otra app"
    : lang === "fr" ? "Partager ailleurs"
    : lang === "pl" ? "Udostępnij gdzie indziej"
    : lang === "ptBR" ? "Compartilhar em outro app"
    : lang === "zh" ? "分享到其他应用"
    : "Share elsewhere";

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
          {/* 2026-09-13 (Александр: "Сделай анимацию для крестика
              закрытия при наведении") -- раньше это был голый символ «×»
              без своей области нажатия: попасть по нему было тесно, а на
              наведение он только менял цвет. Теперь это круглая кнопка
              с подложкой, а сам крестик поворачивается на четверть --
              тем же приёмом, что и «+» на плавающей кнопке. */}
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="group/close flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-neutral-400 transition hover:bg-black/5 hover:text-neutral-900 active:scale-90 disabled:cursor-default disabled:opacity-40 dark:hover:bg-white/10 dark:hover:text-neutral-50"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="h-4 w-4 transition-transform duration-200 ease-out group-hover/close:rotate-90 motion-reduce:transition-none"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {copyFailed && (
          <p className="px-5 pt-2 text-[13px] text-red-500 dark:text-red-400">
            <T
              uk="Не вдалося скопіювати посилання" en="Couldn't copy the link"
              ru="Не удалось скопировать ссылку" de="Link konnte nicht kopiert werden"
              es="No se pudo copiar el enlace" fr="Impossible de copier le lien"
              pl="Nie udało się skopiować linku" ptBR="Não foi possível copiar o link"
              zh="无法复制链接"
            />
          </p>
        )}

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
            без прокрутки.

            2026-09-13 (Александр, запись экрана: "Не меняй высоту окна
            при поиске и введении пользователя") -- высота у списка
            фиксированная, а не «по содержимому». Раньше он был flex-1 и
            рос вместе с числом найденных: на каждую набранную букву окно
            дёргалось вверх-вниз. Теперь сколько бы людей ни нашлось --
            один или двадцать -- окно одной и той же высоты, меняется
            только прокрутка внутри. min(...) -- чтобы на невысоком
            экране список не вылезал за пределы окна. */}
        <div className="h-[min(19rem,45vh)] shrink-0 overflow-y-auto px-4 pb-2">
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

          {state === "ready" && visible.length === 0 && (
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

          {state === "ready" && visible.length > 0 && (
            <div className="grid grid-cols-4 gap-x-2 gap-y-4 sm:grid-cols-5">
              {visible.map((c) => {
                const isPicked = picked.has(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggle(c.id)}
                    disabled={busy}
                    aria-pressed={isPicked}
                    // 2026-09-13 (Александр, скриншот окна «Поділитися з»:
                    // "Во всех 'поделиться' сделай какой-то ховер при
                    // наведении на контакт") -- до этого плитка вообще
                    // никак не отзывалась на мышь, и было не понять, что
                    // она нажимается. Подсветка живёт на кнопке, а
                    // аватарка и подпись реагируют через group-hover,
                    // чтобы всё поднималось одним движением.
                    className="group flex cursor-pointer flex-col items-center gap-1.5 rounded-xl px-0.5 py-1.5 outline-none transition hover:bg-neutral-100 focus-visible:bg-neutral-100 disabled:cursor-default disabled:opacity-60 dark:hover:bg-neutral-800 dark:focus-visible:bg-neutral-800"
                  >
                    <span className="relative">
                      <CachedAvatar
                        src={c.avatarUrl}
                        blurDataURL={c.avatarBlurDataUrl ?? BLUR_DATA_URL}
                        size={112}
                        className={
                          "h-14 w-14 rounded-full object-cover transition duration-200 group-hover:scale-105 " +
                          (isPicked
                            ? "ring-2 ring-[#335ef7] ring-offset-2 ring-offset-white dark:ring-[#0c8ce9] dark:ring-offset-neutral-900"
                            : "group-hover:ring-2 group-hover:ring-neutral-300 group-hover:ring-offset-2 group-hover:ring-offset-neutral-100 dark:group-hover:ring-neutral-600 dark:group-hover:ring-offset-neutral-800")
                        }
                      />
                      {isPicked && <CheckBadge />}
                    </span>
                    <span
                      className={
                        // min-h под ДВЕ строки всегда: без него ряд, в
                        // котором попалось длинное название, становится
                        // выше остальных, и сетка идёт волной.
                        "line-clamp-2 min-h-[27px] w-full px-0.5 text-center text-[11.5px] leading-tight transition-colors " +
                        (isPicked
                          ? "font-semibold text-[#335ef7] dark:text-[#0c8ce9]"
                          : "text-neutral-600 group-hover:text-neutral-900 dark:text-neutral-300 dark:group-hover:text-neutral-50")
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
          {/* 2026-09-13 (Александр: «сделай кнопку слева без текста, просто
              иконку поделиться, а "надіслати" просто шире») -- подпись
              съедала треть нижней полосы ради действия, которое и так
              узнаётся по значку. Осталась квадратная кнопка-иконка,
              название ушло в подсказку при наведении и в имя для
              читалок с экрана. Про удачное копирование говорит сама
              иконка, ставшая галочкой: строчки текста для этого больше
              нет. */}
          <button
            type="button"
            onClick={handleExternalShare}
            disabled={busy}
            title={externalShareLabel}
            aria-label={externalShareLabel}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            {copied ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            ) : (
              <ExternalShareIcon className="h-[18px] w-[18px]" />
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
