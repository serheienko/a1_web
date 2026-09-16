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
import { MediaPickerPanel } from "@/components/chat/media-picker-panel";
import { CommentContextMenu } from "@/components/comment-context-menu";
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

type Me = { userId: string | null; username: string | null; name: string; avatarUrl: string | null };

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

function Avatar({ url, seed, className = "h-7 w-7" }: { url: string | null; seed: string; className?: string }) {
  const src = url ? avatarSourceUrl(url) : pickDefaultCatAvatar(seed);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={36}
      height={36}
      loading="lazy"
      decoding="async"
      className={`${className} shrink-0 rounded-full bg-neutral-100 object-cover dark:bg-neutral-800`}
    />
  );
}

// Кот из шапки поля ввода -- в приложении это та же иконка, по которой
// открываются наліпки, гифки и емодзі. Контур, а не заливка: рядом с
// текстовым полем сплошная фигура перетягивала бы на себя внимание.
function StickerCatIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4.5 9.5 3.2 4.6a.5.5 0 0 1 .76-.54L7.9 6.6" />
      <path d="M19.5 9.5l1.3-4.9a.5.5 0 0 0-.76-.54L16.1 6.6" />
      <path d="M4.5 12.4a7.5 7.5 0 0 1 15 0v2.1a7.5 7.5 0 0 1-15 0z" />
      <path d="M9.3 12.2h.01M14.7 12.2h.01" />
      <path d="M10.8 15.6a1.7 1.7 0 0 0 2.4 0" />
    </svg>
  );
}

function Bubble({
  comment,
  mine,
  myUserId,
  onOpenMenu,
  onToggleReaction,
}: {
  comment: WebComment;
  mine: boolean;
  myUserId: string | null;
  onOpenMenu: (comment: WebComment, rect: DOMRect) => void;
  onToggleReaction: (comment: WebComment, emoticon: string) => void;
}) {
  // Долгое нажатие на телефоне и правая кнопка на компьютере -- один и
  // тот же жест «покажи, что можно сделать». Таймер сбрасывается на
  // движении пальца, иначе меню открывалось бы посреди прокрутки.
  const holdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bubbleRef = useRef<HTMLDivElement | null>(null);
  const open = () => {
    const rect = bubbleRef.current?.getBoundingClientRect();
    if (rect) onOpenMenu(comment, rect);
  };
  const handlers = {
    onContextMenu: (e: React.MouseEvent) => {
      e.preventDefault();
      open();
    },
    onTouchStart: () => {
      holdRef.current = setTimeout(open, 450);
    },
    onTouchMove: () => {
      if (holdRef.current) clearTimeout(holdRef.current);
    },
    onTouchEnd: () => {
      if (holdRef.current) clearTimeout(holdRef.current);
    },
  };

  const reactions = comment.reactions.length > 0 && (
    <div className={`mt-1 flex flex-wrap gap-1 ${mine ? "justify-end" : ""}`}>
      {comment.reactions.map((r) => {
        const isMine = !!myUserId && r.by.some((entry) => entry.userId === myUserId);
        return (
          <button
            key={r.emoticon}
            type="button"
            onClick={() => onToggleReaction(comment, r.emoticon)}
            className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[12px] transition ${
              isMine
                ? "border-accent/40 bg-accent/10 text-accent"
                : "border-neutral-200 bg-white text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400"
            }`}
          >
            <span className="text-[13px] leading-none">{r.emoticon}</span>
            {r.by.length > 1 && <span className="tabular-nums">{r.by.length}</span>}
          </button>
        );
      })}
    </div>
  );

  if (mine) {
    return (
      <li className="flex flex-col items-end">
        <div
          ref={bubbleRef}
          {...handlers}
          className="max-w-[80%] cursor-default select-none rounded-2xl rounded-br-md bg-accent px-3.5 py-2 text-white"
        >
          <p className="whitespace-pre-line break-words text-[14px] leading-relaxed">{comment.text}</p>
          <Time date={comment.createdAt} className="mt-0.5 block text-right text-[11px] text-white/70" />
        </div>
        {reactions}
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
    <li className="flex max-w-[85%] gap-2">
      {comment.authorUsername ? (
        <Link href={profileHref(comment.authorUsername)} className="shrink-0 transition-opacity hover:opacity-80">
          <Avatar url={comment.authorAvatarUrl} seed={comment.authorUsername} />
        </Link>
      ) : (
        <Avatar url={comment.authorAvatarUrl} seed={comment.id} />
      )}
      <div className="min-w-0">
      <div
        ref={bubbleRef}
        {...handlers}
        className="min-w-0 max-w-full cursor-default select-none rounded-2xl rounded-bl-md bg-neutral-100 px-3.5 py-2 dark:bg-neutral-800"
      >
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
            {comment.editedAt && (
              <span className="ml-1.5 text-[11px] text-neutral-400 dark:text-neutral-500">
                <T uk="змінено" en="edited" ru="изменено" de="bearbeitet" es="editado" fr="modifié" pl="edytowano" ptBR="editado" zh="已编辑" />
              </span>
            )}
          </p>
        )}
        <Time date={comment.createdAt} className="mt-0.5 block text-[11px] text-neutral-400 dark:text-neutral-500" />
      </div>
      {reactions}
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
  const stickerButtonRef = useRef<HTMLButtonElement | null>(null);
  const [pickerAnchor, setPickerAnchor] = useState<DOMRect | null>(null);
  const [menu, setMenu] = useState<{ comment: WebComment; rect: DOMRect } | null>(null);
  const [editing, setEditing] = useState<WebComment | null>(null);

  useEffect(() => {
    if (!readDisplayCookie()) return;
    setSignedIn(true);
    let cancelled = false;
    fetch("/api/account/whoami")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.ok) return;
        setMe({ userId: data.userId ?? null, username: data.username ?? null, name: data.name ?? "", avatarUrl: data.avatarUrl ?? null });
      })
      .catch(() => {
        // Имя не приехало -- поле ввода всё равно показываем: отправка
        // от него не зависит, сервер знает, кто пишет, по сессии.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const numericId = (comment: WebComment) => {
    const n = Number(comment.id);
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  const myReactionOn = useCallback(
    (comment: WebComment) =>
      comment.reactions.find((r) => !!me?.userId && r.by.some((e) => e.userId === me.userId))?.emoticon ?? null,
    [me],
  );

  // Реакция переключается: повторное нажатие по той же снимает её.
  // Снятие требует вернуть бэкенду ту же запись целиком, включая дату,
  // -- см. app/api/comments/reaction/delete/route.ts.
  const toggleReaction = useCallback(
    async (comment: WebComment, emoticon: string) => {
      const id = numericId(comment);
      if (!id || !me?.userId) return;
      const mineEntry = comment.reactions
        .find((r) => r.emoticon === emoticon)
        ?.by.find((e) => e.userId === me.userId);

      setMenu(null);
      // Показываем сразу, не дожидаясь ответа: реакция -- жест, а не
      // отправка формы, ждать её неприятно. При ошибке возвращаем как
      // было перезагрузкой состояния из ответа сервера не получится,
      // поэтому просто откатываем локально.
      const before = list;
      setList((prev) =>
        prev.map((c) => {
          if (c.id !== comment.id) return c;
          const rest = c.reactions
            .map((r) => ({ ...r, by: r.by.filter((e) => e.userId !== me.userId) }))
            .filter((r) => r.by.length > 0);
          if (mineEntry) return { ...c, reactions: rest };
          const existing = rest.find((r) => r.emoticon === emoticon);
          const stamp = { userId: me.userId!, date: new Date().toISOString() };
          return {
            ...c,
            reactions: existing
              ? rest.map((r) => (r.emoticon === emoticon ? { ...r, by: [...r.by, stamp] } : r))
              : [...rest, { emoticon, by: [stamp] }],
          };
        }),
      );

      try {
        const url = mineEntry ? "/api/comments/reaction/delete" : "/api/comments/reaction/add";
        const body = mineEntry
          ? { postId, commentId: id, emoticon, date: mineEntry.date, userId: me.userId }
          : { postId, commentId: id, emoticon };
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => null);
        if (!data?.ok) throw new Error("reaction_failed");
      } catch {
        setList(before);
      }
    },
    [list, me, postId],
  );

  const removeComment = useCallback(
    async (comment: WebComment) => {
      const id = numericId(comment);
      setMenu(null);
      if (!id) return;
      const before = list;
      setList((prev) => prev.filter((c) => c.id !== comment.id));
      try {
        const res = await fetch("/api/comments/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postId, commentIds: [id] }),
        });
        const data = await res.json().catch(() => null);
        if (!data?.ok) throw new Error("delete_failed");
      } catch {
        setList(before);
        setFailed(true);
      }
    },
    [list, postId],
  );

  const send = useCallback(async () => {
    const value = text.trim();
    if (!value || sending) return;
    setSending(true);
    setFailed(false);
    try {
      // Режим правки: тот же ввод, другой маршрут -- как в приложении,
      // где текст подставляется в то же поле внизу.
      if (editing) {
        const id = Number(editing.id);
        const res = await fetch("/api/comments/edit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postId, commentId: id, text: value }),
        });
        const data = await res.json().catch(() => null);
        if (!data?.ok) throw new Error("edit_failed");
        setList((prev) =>
          prev.map((c) => (c.id === editing.id ? { ...c, text: value, editedAt: new Date() } : c)),
        );
        setEditing(null);
        setText("");
        setSending(false);
        return;
      }
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
  }, [text, sending, postId, me, editing]);

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
              mine={!!me?.userId && comment.authorId === me.userId}
              myUserId={me?.userId ?? null}
              onOpenMenu={(c, rect) => setMenu({ comment: c, rect })}
              onToggleReaction={toggleReaction}
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

      {editing && (
        <div className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-accent/10 px-3 py-1.5 text-[12px] text-accent">
          <span className="truncate">
            <T
              uk="Редагування" en="Editing" ru="Редактирование" de="Bearbeiten" es="Editando"
              fr="Modification" pl="Edycja" ptBR="Editando" zh="编辑中"
            />
            {": "}
            {editing.text}
          </span>
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setText("");
            }}
            className="shrink-0 font-medium underline"
          >
            <T uk="Скасувати" en="Cancel" ru="Отменить" de="Abbrechen" es="Cancelar" fr="Annuler" pl="Anuluj" ptBR="Cancelar" zh="取消" />
          </button>
        </div>
      )}

      {signedIn && (
        <div className="mt-3 flex items-center gap-2">
          {/* Аватарка ровно в высоту поля -- 36px и там и там
              (Александр, 16 сентября). Поэтому items-center, а не
              items-end: при одинаковой высоте выравнивать по низу нечего,
              а при выросшем в несколько строк поле аватарка должна
              оставаться посередине, как в приложении. */}
          <Avatar url={me?.avatarUrl ?? null} seed={me?.username ?? "me"} className="h-9 w-9" />
          <div className="flex min-h-9 min-w-0 flex-1 items-center gap-1 rounded-full border border-neutral-200 bg-white pl-4 pr-1.5 focus-within:border-accent/50 dark:border-neutral-700 dark:bg-neutral-900">
            <textarea
              id={`comment-input-${postId}`}
              ref={inputRef}
              rows={1}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
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
              className="max-h-[120px] min-w-0 flex-1 resize-none self-center bg-transparent py-[7px] text-[14px] leading-[1.45] text-neutral-900 outline-none placeholder:text-neutral-400 dark:text-neutral-50 dark:placeholder:text-neutral-500"
            />
            <button
              ref={stickerButtonRef}
              type="button"
              onClick={() => {
                const rect = stickerButtonRef.current?.getBoundingClientRect();
                if (rect) setPickerAnchor(rect);
              }}
              aria-label="Emoji"
              className="shrink-0 rounded-full p-1 text-neutral-400 transition hover:text-accent dark:text-neutral-500"
            >
              <StickerCatIcon />
            </button>
            {text.trim() && (
              <button
                type="button"
                onClick={() => void send()}
                disabled={sending}
                aria-label="Send"
                className="shrink-0 rounded-full p-1 text-accent transition disabled:opacity-30"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 19V5" />
                  <path d="m5 12 7-7 7 7" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      {menu && (
        <CommentContextMenu
          anchorRect={menu.rect}
          canEdit={!!me?.userId && menu.comment.authorId === me.userId}
          canDelete={!!me?.userId && menu.comment.authorId === me.userId}
          myReaction={myReactionOn(menu.comment)}
          onReact={(emoticon) => void toggleReaction(menu.comment, emoticon)}
          onCopy={() => {
            void navigator.clipboard?.writeText(menu.comment.text);
            setMenu(null);
          }}
          onEdit={() => {
            setEditing(menu.comment);
            setText(menu.comment.text);
            setMenu(null);
            inputRef.current?.focus();
          }}
          onDelete={() => void removeComment(menu.comment)}
          onClose={() => setMenu(null)}
        />
      )}

      {pickerAnchor && (
        // Та же панель, что и в чате -- своя была бы второй такой же.
        // Пока берём из неё только емодзі: они вставляются в текст и
        // отправляются обычным комментарием. Наліпки и гифки требуют,
        // чтобы комментарий умел их ПОКАЗЫВАТЬ, иначе отправленная
        // наліпка появится словом «Наліпка» -- это следующий шаг.
        <MediaPickerPanel
          anchorRect={pickerAnchor}
          initialTab="emoji"
          onClose={() => setPickerAnchor(null)}
          onPickEmoji={(emoji) => {
            setText((prev) => prev + emoji);
            inputRef.current?.focus();
          }}
          onSendMedia={() => setPickerAnchor(null)}
        />
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
