"use client";

// components/post-comments.tsx
//
// Комментарии под вакансией. 2026-09-16.
//
// Клиентский компонент, но список приезжает ГОТОВЫМ из серверного
// рендера (см. app/jobs/[slug]/page.tsx -> fetchPostComments). Клиентским
// он стал ровно ради двух вещей, которые сервер знать не может: кто
// сейчас вошёл (чтобы показать поле ввода и подсветить свои
// комментарии) и отправка без перезагрузки. Разметка при этом всё равно
// уезжает в HTML -- Next рендерит клиентские компоненты на сервере
// тоже, -- поэтому комментарии видит и поисковик, ради чего всё и
// затевалось.
//
// Вид -- как в приложении: свои пузыри справа синим, чужие слева серым
// с аватаркой и именем (Александр, 16 сентября: «делай пузырями, мне
// нра»).
//
// Блок целиком скрыт, когда комментариев нет и гость не вошёл: под
// почти двумя тысячами вакансий пустой заголовок выглядел бы поломкой.
// Вошедшему поле ввода показывается всегда, даже под пустой вакансией --
// иначе первый комментарий физически некому оставить.

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { T, LOCALES, LOCALE_VISIBILITY_CLASS } from "@/components/t";
import { formatRelativeTime } from "@/lib/format";
import { avatarSourceUrl } from "@/lib/avatar-source";
import { pickDefaultCatAvatar } from "@/lib/avatars";
import { profileHref } from "@/lib/profile-href";
import { DISPLAY_COOKIE } from "@/lib/a1/session-constants";
import type { WebComment } from "@/lib/a1/comments";

// Тот же приём чтения куки, что и в components/create-post-fab.tsx,
// components/chats-fab.tsx и components/avatar-menu.tsx: это НЕ проверка
// прав, а подсказка «показывать ли вошедшему интерфейс». Настоящую
// проверку делает бэкенд на отправке.
function readDisplayCookie(): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${DISPLAY_COOKIE}=([^;]*)`));
  const raw = match?.[1];
  return raw ? decodeURIComponent(raw) : null;
}

type Me = { username: string | null; name: string; avatarUrl: string | null };

function Time({ date, className }: { date: Date; className: string }) {
  // Тот же приём, что у components/locale-format.tsx: все девять
  // вариантов в разметке, видимый выбирает CSS. Своей «текущей локали»
  // у компонента нет и быть не должно -- страница статическая.
  return (
    <span className={className}>
      {LOCALES.map((locale) => (
        <span key={locale} className={LOCALE_VISIBILITY_CLASS[locale]}>
          {formatRelativeTime(date, locale)}
        </span>
      ))}
    </span>
  );
}

function Avatar({ url, seed }: { url: string | null; seed: string }) {
  const src = url ? avatarSourceUrl(url) : pickDefaultCatAvatar(seed);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={28}
      height={28}
      loading="lazy"
      decoding="async"
      className="h-7 w-7 shrink-0 rounded-full bg-neutral-100 object-cover dark:bg-neutral-800"
    />
  );
}

function Bubble({ comment, mine }: { comment: WebComment; mine: boolean }) {
  if (mine) {
    return (
      <li className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-md bg-accent px-3.5 py-2 text-white">
          <p className="whitespace-pre-line break-words text-[14px] leading-relaxed">{comment.text}</p>
          <Time date={comment.createdAt} className="mt-0.5 block text-right text-[11px] text-white/70" />
        </div>
      </li>
    );
  }

  const name = comment.authorUsername ? (
    <Link href={profileHref(comment.authorUsername)} className="hover:underline">
      {comment.authorName}
    </Link>
  ) : (
    comment.authorName
  );

  return (
    <li className="flex gap-2">
      {comment.authorUsername ? (
        <Link href={profileHref(comment.authorUsername)} className="shrink-0 transition-opacity hover:opacity-80">
          <Avatar url={comment.authorAvatarUrl} seed={comment.authorUsername} />
        </Link>
      ) : (
        <Avatar url={comment.authorAvatarUrl} seed={comment.id} />
      )}
      <div className="min-w-0 max-w-[80%] rounded-2xl rounded-bl-md bg-neutral-100 px-3.5 py-2 dark:bg-neutral-800">
        <span className="block text-[12px] font-medium text-accent">{name}</span>
        {comment.mediaOnly ? (
          <p className="text-[14px] italic text-neutral-400 dark:text-neutral-500">
            <T
              uk="Наліпка" en="Sticker" ru="Стикер" de="Sticker" es="Sticker"
              fr="Sticker" pl="Naklejka" ptBR="Figurinha" zh="贴纸"
            />
          </p>
        ) : (
          <p className="whitespace-pre-line break-words text-[14px] leading-relaxed text-neutral-800 dark:text-neutral-200">
            {comment.text}
          </p>
        )}
        <Time date={comment.createdAt} className="mt-0.5 block text-[11px] text-neutral-400 dark:text-neutral-500" />
      </div>
    </li>
  );
}

export function PostComments({ comments, postId }: { comments: WebComment[]; postId: string }) {
  const [list, setList] = useState<WebComment[]>(comments);
  const [me, setMe] = useState<Me | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!readDisplayCookie()) return;
    setSignedIn(true);
    let cancelled = false;
    fetch("/api/account/whoami")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.ok) return;
        setMe({ username: data.username ?? null, name: data.name ?? "", avatarUrl: data.avatarUrl ?? null });
      })
      .catch(() => {
        // Имя не приехало -- поле ввода всё равно показываем: отправка
        // от него не зависит, сервер знает, кто пишет, по сессии.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const send = useCallback(async () => {
    const value = text.trim();
    if (!value || sending) return;
    setSending(true);
    setFailed(false);
    try {
      const res = await fetch("/api/comments/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, text: value }),
      });
      const data = await res.json().catch(() => null);
      if (!data?.ok) throw new Error("send_failed");
      // Дописываем сам, не перезагружая страницу: ответ бэкенда несёт
      // готовое сообщение, но имени автора в нём нет (см. шапку
      // lib/a1/comments.ts) -- своё имя мы и так знаем.
      setList((prev) => [
        ...prev,
        {
          id: data.message?._id ? String(data.message._id) : `local-${Date.now()}`,
          authorName: me?.name || "",
          authorUsername: me?.username ?? null,
          authorAvatarUrl: me?.avatarUrl ?? null,
          authorId: null,
          text: value,
          mediaOnly: false,
          createdAt: new Date(),
          editedAt: null,
          reactions: [],
        },
      ]);
      setText("");
      inputRef.current?.focus();
    } catch {
      setFailed(true);
    } finally {
      setSending(false);
    }
  }, [text, sending, postId, me]);

  // Ни комментариев, ни вошедшего -- блока нет вовсе.
  if (list.length === 0 && !signedIn) return null;

  return (
    <section className="mt-10">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
        <T
          uk="Коментарі" en="Comments" ru="Комментарии" de="Kommentare" es="Comentarios"
          fr="Commentaires" pl="Komentarze" ptBR="Comentários" zh="评论"
        />
        {list.length > 0 && <span className="ml-1.5 tabular-nums">{list.length}</span>}
      </h2>

      {list.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-2.5">
          {list.map((comment) => (
            <Bubble
              key={comment.id}
              comment={comment}
              mine={!!me?.username && comment.authorUsername === me.username}
            />
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-[14px] text-neutral-400 dark:text-neutral-500">
          <T
            uk="Залиште перший коментар!" en="Be the first to comment!" ru="Оставьте первый комментарий!"
            de="Schreiben Sie den ersten Kommentar!" es="¡Sé el primero en comentar!"
            fr="Soyez le premier à commenter !" pl="Dodaj pierwszy komentarz!"
            ptBR="Seja o primeiro a comentar!" zh="来发表第一条评论吧！"
          />
        </p>
      )}

      {signedIn && (
        <div className="mt-3 flex items-end gap-2">
          <Avatar url={me?.avatarUrl ?? null} seed={me?.username ?? "me"} />
          <div className="flex min-w-0 flex-1 items-end gap-1.5 rounded-2xl border border-neutral-200 bg-white px-3 py-1.5 focus-within:border-accent/50 dark:border-neutral-700 dark:bg-neutral-900">
            <textarea
              id={`comment-input-${postId}`}
              ref={inputRef}
              rows={1}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                // Поле растёт под текст, но не выше пяти строк.
                const el = e.target;
                el.style.height = "auto";
                el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
              }}
              onKeyDown={(e) => {
                // Enter отправляет, Shift+Enter переносит строку -- как в
                // чате. На телефоне клавиатура шлёт Enter как перенос,
                // поэтому там работает кнопка справа.
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              placeholder={PLACEHOLDER}
              className="max-h-[120px] min-w-0 flex-1 resize-none bg-transparent py-1 text-[14px] text-neutral-900 outline-none placeholder:text-neutral-400 dark:text-neutral-50 dark:placeholder:text-neutral-500"
            />
            <button
              type="button"
              onClick={() => void send()}
              disabled={!text.trim() || sending}
              aria-label="Send"
              className="mb-0.5 shrink-0 rounded-full p-1 text-accent transition disabled:opacity-30"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 19V5" />
                <path d="m5 12 7-7 7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {failed && (
        <p className="mt-1.5 text-[12px] text-red-500">
          <T
            uk="Не вдалося надіслати. Спробуйте ще раз." en="Could not send. Try again."
            ru="Не удалось отправить. Попробуйте ещё раз." de="Senden fehlgeschlagen. Bitte erneut versuchen."
            es="No se pudo enviar. Inténtalo de nuevo." fr="Envoi impossible. Réessayez."
            pl="Nie udało się wysłać. Spróbuj ponownie." ptBR="Não foi possível enviar. Tente novamente."
            zh="发送失败，请重试。"
          />
        </p>
      )}
    </section>
  );
}

// Плейсхолдер одной строкой, а не через <T/>: это атрибут, а не
// разметка, и девять спанов в него не положить. Украинский -- язык
// страницы по умолчанию (<html lang="uk">).
const PLACEHOLDER = "Додати коментар";
