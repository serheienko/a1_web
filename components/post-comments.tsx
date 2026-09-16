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
// с аватаркой и именем.
//
// 2026-09-16, по второму заходу Александра: комментарии НЕ живут в
// странице. На странице только заголовок со счётчиком и одна строка --
// последний комментарий рядом с аватаркой, как в свёрнутой панели
// приложения. Нажатие открывает окно: на телефоне шторка снизу, которую
// можно стянуть вниз пальцем, на компьютере окно по центру с крестиком.
// Причина простая и его словами: «может у нас сто будет, двести
// комментариев, как мы их поместим?» -- страница вакансии не должна
// расти вместе с обсуждением.
//
// Разметка окна при этом присутствует ВСЕГДА, просто скрыта. Иначе
// комментариев не увидел бы поисковик -- а он и есть причина, по
// которой их вообще показывают гостю: текст вакансий у нас чужой,
// спарсенный, и комментарии -- единственное на странице, чего нет у
// источника.
//
// Блок целиком скрыт, когда комментариев нет и гость не вошёл: под
// почти двумя тысячами вакансий пустая строка выглядела бы поломкой.
//
// 2026-09-16, третий заход Александра: «повтори всю механику мини-чатов,
// ничего не придумывая». Меню по правой кнопке -- больше не своё, а
// ровно MessageActionsMenu из чатов (components/chat/message-actions-
// menu.tsx): без затемнения страницы, ряд реакций по ширине карточки,
// стрелка разворачивает полный список эмодзи, удаление -- той же
// модалкой DeleteMessageConfirmDialog. Своя копия успела разъехаться с
// оригиналом по всем трём пунктам, которые он и перечислил; здесь
// передаётся только список нужных строк (rows) -- переслать комментарий
// или закрепить его бэкенду нечем.

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { MediaPickerPanel } from "@/components/chat/media-picker-panel";
import { TgsSticker } from "@/components/chat/tgs-sticker";
import {
  isStickerMediaDocument,
  isVideoMediaDocument,
  isImageMediaDocument,
  messageDocumentMedia,
} from "@/lib/a1/chat-schemas";
import { getStableMediaProxyUrl } from "@/lib/a1/stable-media-url";
import { strippedPreviewDataUrl, decodeStickerPathPreview } from "@/lib/a1/media-proxy";
import type { MediaDocument } from "@/lib/a1/schemas";
import { ChatCatFieldIcon } from "@/components/chat/icons";
import { SEND_BUTTON_CLASS, SendArrowIcon } from "@/components/chat/send-button";
import {
  MessageActionsMenu,
  DeleteMessageConfirmDialog,
  ReactionsBar,
  ReplyIcon,
  EditComposeBar,
  ReplyComposeBar,
  MessageReplyQuote,
} from "@/components/chat/message-actions-menu";
import Link from "next/link";
import { assignPeerNameColors } from "@/lib/peer-name-color";
import { T, LOCALES, LOCALE_CLASS, LOCALE_VISIBILITY_CLASS, type Locale } from "@/components/t";
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

// Тот же приём, что у components/mini-chat-window.tsx: страница
// многоязычная через классы на <html> (см. компонент T), а меню из
// чатов хочет одну конкретную локаль -- читаем ту, что сейчас активна.
// Меню открывается только по жесту, к этому моменту класс уже на месте.
function useActiveLocale(): Locale {
  const [lang, setLang] = useState<Locale>("uk");
  useEffect(() => {
    const root = document.documentElement;
    const active = LOCALES.find((l) => root.classList.contains(LOCALE_CLASS[l]));
    if (active) setLang(active);
  }, []);
  return lang;
}

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

// Что показывать вместо текста, когда комментарий -- одна наліпка или
// гифка: в свёрнутой строке, в цитате ответа и в поле ввода.
function CommentPreview({ comment }: { comment: WebComment }) {
  if (!comment.mediaOnly) return <>{comment.text}</>;
  if (comment.media.some(isVideoMediaDocument)) return <>GIF</>;
  return (
    <T
      uk="Наліпка" en="Sticker" ru="Стикер" de="Sticker" es="Sticker"
      fr="Sticker" pl="Naklejka" ptBR="Figurinha" zh="贴纸"
    />
  );
}

// Наліпки и гифки рисуются ровно теми же средствами, что в чатах:
// TgsSticker (распаковка tgs + Lottie) для наліпки, зацикленное видео
// без звука для гифки. Ссылка -- getStableMediaProxyUrl, а не
// buildMediaProxyUrl: бэкенд выдаёт документу новый fileReference почти
// на каждый ответ, и меняющийся src заставлял бы браузер грузить
// картинку заново (см. шапку lib/a1/stable-media-url.ts).
function CommentMedia({ media, mine }: { media: WebComment["media"]; mine: boolean }) {
  if (media.length === 0) return null;
  return (
    <div className={`flex flex-col gap-1 ${mine ? "items-end" : "items-start"}`}>
      {media.map((doc) =>
        isStickerMediaDocument(doc) ? (
          <TgsSticker
            key={doc._id}
            src={getStableMediaProxyUrl(doc)}
            size={112}
            previewUrl={strippedPreviewDataUrl(doc)}
            pathPreview={decodeStickerPathPreview(doc)}
            fallback={
              <span className="text-[14px] text-neutral-400 dark:text-neutral-500">
                <T uk="Наліпка" en="Sticker" ru="Стикер" de="Sticker" es="Sticker" fr="Sticker" pl="Naklejka" ptBR="Figurinha" zh="贴纸" />
              </span>
            }
          />
        ) : isVideoMediaDocument(doc) ? (
          <video
            key={doc._id}
            src={getStableMediaProxyUrl(doc)}
            autoPlay
            muted
            loop
            playsInline
            className="max-h-48 max-w-[220px] rounded-xl bg-black object-cover"
          />
        ) : isImageMediaDocument(doc) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={doc._id} src={getStableMediaProxyUrl(doc)} alt="" className="max-h-48 max-w-[220px] rounded-xl object-cover" />
        ) : null,
      )}
    </div>
  );
}

// Пороги свайпа -- те же числа, что в чатах (app/chats/[chatId]/
// page.tsx): после 56 пикселей жест засчитывается, дальше 72 пузырь не
// едет.
const SWIPE_TRIGGER_DX = 56;
const SWIPE_MAX_DX = 72;

// Значок ответа, который выезжает из-под пузыря: проявляется и
// подрастает ровно по мере протяжки, как в чатах.
function SwipeReplySlot({ dx }: { dx: number }) {
  const progress = Math.min(1, dx / SWIPE_TRIGGER_DX);
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none flex shrink-0 items-center justify-center overflow-hidden ${
        dx > 0 ? "" : "transition-[width] duration-200 ease-out"
      }`}
      style={{ width: dx }}
    >
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#335ef7]/10 text-[#335ef7] dark:bg-white/10 dark:text-[#5b8dff]"
        style={{ opacity: progress, transform: `scale(${0.6 + 0.4 * progress})` }}
      >
        <ReplyIcon className="h-4 w-4" />
      </span>
    </div>
  );
}

function Bubble({
  comment,
  mine,
  myUserId,
  repliedTo,
  nameColors,
  onOpenMenu,
  onToggleReaction,
  onReply,
}: {
  comment: WebComment;
  mine: boolean;
  myUserId: string | null;
  /** Комментарий, на который отвечают, если он есть в загруженном
   *  списке. Бэкенд присылает только его номер -- текст ищется здесь,
   *  ровно как в чате. */
  repliedTo: WebComment | null;
  /** Цвет имени по автору -- см. lib/peer-name-color.ts. */
  nameColors: Map<string, string>;
  onOpenMenu: (comment: WebComment, rect: DOMRect) => void;
  onToggleReaction: (comment: WebComment, emoticon: string) => void;
  /** Свайп влево -- то же действие, что «Відповісти» в меню. */
  onReply: (comment: WebComment) => void;
}) {
  // Долгое нажатие на телефоне и правая кнопка на компьютере -- один и
  // тот же жест «покажи, что можно сделать». Таймер сбрасывается на
  // движении пальца, иначе меню открывалось бы посреди прокрутки.
  const holdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bubbleRef = useRef<HTMLDivElement | null>(null);
  // Свайп влево -- ответ. 2026-09-16, Александр: «на мобильном добавь
  // возможность отвечать на сообщения свайпом влево, так же как в
  // мини-чатах и в обычных чатах». Жест перенесён из app/chats/
  // [chatId]/page.tsx один в один: те же пороги, та же математика, тот
  // же значок, который проявляется и подрастает по мере протяжки.
  // Отличие одно: там состояние жеста лежит НАД списком, потому что
  // список перерисовывается опросом каждые пару секунд и замыкание в
  // разметке сбрасывало бы точку старта; здесь у каждого комментария
  // свой постоянный компонент, и держать это выше незачем.
  const swipeRef = useRef<{ startX: number; startY: number; active: boolean } | null>(null);
  const [swipeDx, setSwipeDx] = useState(0);
  const open = () => {
    const rect = bubbleRef.current?.getBoundingClientRect();
    if (rect) onOpenMenu(comment, rect);
  };
  const handlers = {
    onContextMenu: (e: React.MouseEvent) => {
      e.preventDefault();
      open();
    },
    onTouchStart: (e: React.TouchEvent) => {
      holdRef.current = setTimeout(open, 450);
      if (e.touches.length !== 1) return;
      const t = e.touches[0]!;
      swipeRef.current = { startX: t.clientX, startY: t.clientY, active: false };
    },
    onTouchMove: (e: React.TouchEvent) => {
      if (holdRef.current) clearTimeout(holdRef.current);
      const g = swipeRef.current;
      if (!g || e.touches.length !== 1) return;
      const t = e.touches[0]!;
      const dx = t.clientX - g.startX;
      const dy = t.clientY - g.startY;
      if (!g.active) {
        // Жест считается «нашим» только когда горизонтальное намерение
        // очевидно, и preventDefault не зовётся никогда: иначе он
        // отбирал бы у страницы её собственную вертикальную прокрутку
        // и возврат по краевому свайпу на iOS.
        if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) return;
        g.active = true;
      }
      setSwipeDx(Math.max(0, Math.min(-dx, SWIPE_MAX_DX)));
    },
    onTouchEnd: () => {
      if (holdRef.current) clearTimeout(holdRef.current);
      const g = swipeRef.current;
      swipeRef.current = null;
      if (g?.active && swipeDx >= SWIPE_TRIGGER_DX) onReply(comment);
      setSwipeDx(0);
    },
    onTouchCancel: () => {
      if (holdRef.current) clearTimeout(holdRef.current);
      swipeRef.current = null;
      setSwipeDx(0);
    },
    style: { touchAction: "pan-y" as const },
  };

  const quote = repliedTo ? (
    <MessageReplyQuote
      authorLabel={repliedTo.authorName}
      previewText={<CommentPreview comment={repliedTo} />}
      mine={mine}
      authorColor={nameColors.get(repliedTo.authorId ?? "")}
    />
  ) : null;

  // Чипы реакций -- ТОТ ЖЕ ReactionsBar, что под сообщением в чатах, а
  // не своя вёрстка (2026-09-16, Александр: «реакция должна работать
  // абсолютно идентично, как в чатах и мини-чатах»). Наш список реакций
  // плоский, поэтому разворачивается обратно в ту форму, которую ждёт
  // чат: одна запись на каждого поставившего. Вместо аватарки соседа --
  // число: под вакансией реагирующих сколько угодно и все разные.
  const reactions = (
    <ReactionsBar
      reactions={comment.reactions.flatMap((r) =>
        r.by.map((entry) => ({
          peer: { object: "peer-user" as const, user: entry.userId },
          date: entry.date,
          reaction: { object: "reaction-emoji" as const, emoticon: r.emoticon },
        })),
      )}
      mine={mine}
      myUserId={myUserId}
      showCount
      onToggle={(emoticon) => onToggleReaction(comment, emoticon)}
    />
  );

  if (mine) {
    return (
      <li className="flex flex-col items-end">
        <div className="flex max-w-[80%] items-center justify-end">
        <div
          ref={bubbleRef}
          {...handlers}
          // Наліпка и гифка живут БЕЗ пузыря -- как в чатах: у них своя
          // форма и прозрачный фон, синий прямоугольник вокруг кота
          // выглядел бы наклейкой на наклейке.
          className={`min-w-0 cursor-default select-none ${
            comment.mediaOnly ? "" : "rounded-2xl rounded-br-md bg-accent px-3.5 py-2 text-white"
          }`}
        >
          {quote}
          <CommentMedia media={comment.media} mine />
          {comment.text && (
            <p className="whitespace-pre-line break-words text-[14px] leading-relaxed">{comment.text}</p>
          )}
          {comment.mediaOnly ? (
            <Time date={comment.createdAt} className="mt-1 ml-auto block w-fit rounded-full bg-black/45 px-2 py-0.5 text-[11px] text-white" />
          ) : (
            <Time date={comment.createdAt} className="mt-0.5 block text-right text-[11px] text-white/70" />
          )}
        </div>
        {/* Место, из которого выезжает значок ответа. Для своего пузыря
            ничего двигать не надо: строка прижата вправо, и растущая
            ширина этого блока сама уводит пузырь влево. */}
        <SwipeReplySlot dx={swipeDx} />
        </div>
        {reactions}
      </li>
    );
  }

  // 2026-09-16 (Александр, референс из Telegram: «сверху моё имя, снизу
  // сообщение, на которое я отвечаю, и ещё ниже сам текст») -- имя
  // ПЕРВОЕ, цитата ПОД ним. Было наоборот, и по картинке было не
  // понять, чьи это вообще слова: имя читалось как подпись к цитате.
  const nameColor = nameColors.get(comment.authorId ?? "");
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
      {/* У чужого пузыря строка прижата ВЛЕВО, поэтому растущий блок
          справа сам по себе ничего не сдвинет -- всю пару двигает
          transform, ровно как в чатах. */}
      <div
        className="flex min-w-0 items-center"
        style={{
          transform: swipeDx ? `translateX(-${swipeDx}px)` : undefined,
          transition: swipeDx ? undefined : "transform 200ms ease-out",
        }}
      >
      <div
        ref={bubbleRef}
        {...handlers}
        className={`min-w-0 max-w-full cursor-default select-none ${
          comment.mediaOnly ? "" : "rounded-2xl rounded-bl-md bg-neutral-100 px-3.5 py-2 dark:bg-neutral-800"
        }`}
      >
        <span
          className="block text-[12px] font-semibold text-accent"
          style={nameColor ? { color: nameColor } : undefined}
        >
          {name}
        </span>
        {quote}
        <CommentMedia media={comment.media} mine={false} />
        {comment.mediaOnly ? (
          <Time date={comment.createdAt} className="mt-1 block w-fit rounded-full bg-black/45 px-2 py-0.5 text-[11px] text-white" />
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
        {!comment.mediaOnly && (
          <Time date={comment.createdAt} className="mt-0.5 block text-[11px] text-neutral-400 dark:text-neutral-500" />
        )}
      </div>
      <SwipeReplySlot dx={swipeDx} />
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
  const [menu, setMenu] = useState<{ comment: WebComment; rect: DOMRect; mine: boolean } | null>(null);
  // Удаление -- той же модалкой, что в чатах: сначала подтверждение,
  // потом запрос. Держим и прямоугольник окна, чтобы карточка встала
  // над обсуждением, а не по центру всей страницы.
  const [deleteTarget, setDeleteTarget] = useState<WebComment | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteFailed, setDeleteFailed] = useState(false);
  const windowRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLDivElement | null>(null);
  // Высота композера меняется: появилась цитата ответа -- поле выросло.
  // Лента отступает снизу ровно на неё, иначе последний комментарий
  // навсегда остаётся под плавающим полем ввода и достать его нечем
  // (2026-09-16, Александр, видео с телефона).
  const [composerHeight, setComposerHeight] = useState(64);
  // Кнопка отправки должна быть ровно в высоту поля ввода. Подбирать
  // это число на глаз бесполезно: высота строки зависит от шрифта,
  // который на телефоне может отрисоваться иначе, чем на компьютере
  // (2026-09-16, Александр, скриншот с iPhone: кнопка заметно ниже
  // поля). Поэтому строка ввода измеряется, а кнопка берёт её высоту
  // плюс рамку пилюли -- по пикселю сверху и снизу.
  const inputRowRef = useRef<HTMLDivElement | null>(null);
  const [sendSize, setSendSize] = useState(38);
  const lang = useActiveLocale();
  const [editing, setEditing] = useState<WebComment | null>(null);
  const [replyTo, setReplyTo] = useState<WebComment | null>(null);
  const [open, setOpen] = useState(false);
  // Закрытие -- не мгновенное: окно должно успеть уехать. `closing`
  // держит разметку видимой ещё столько, сколько длится обратная
  // анимация в app/globals.css (2026-09-16, Александр: «появляется
  // супер резко, супер резко исчезает, не прикольно»).
  // `shown` -- это то, что реально анимируется: окно сначала
  // показывается в исходном (сдвинутом и прозрачном) виде, и лишь
  // следующим кадром переключается в конечный, поэтому браузеру есть
  // что проигрывать. Тот же приём в два кадра, что у цитаты в поле
  // ввода выше -- и та же причина, по которой это переход, а не
  // keyframes: разметка окна из DOM не исчезает никогда.
  const [shown, setShown] = useState(false);
  // Столько же, сколько длится обратный переход карточки ниже (220 мс)
  // плюс небольшой запас: если снять окно раньше, чем оно доехало, на
  // телефоне это читается как обрыв.
  const CLOSE_MS = 260;
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!open) return;
    let raf2 = 0;
    const raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => setShown(true));
    });
    return () => {
      window.cancelAnimationFrame(raf1);
      if (raf2) window.cancelAnimationFrame(raf2);
    };
  }, [open]);
  const closeWindow = useCallback(() => {
    if (closeTimerRef.current) return;
    setShown(false);
    closeTimerRef.current = setTimeout(() => {
      setOpen(false);
      closeTimerRef.current = null;
    }, CLOSE_MS);
  }, []);
  const openWindow = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setOpen(true);
  }, []);
  useEffect(() => () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }, []);

  // Пока окно открыто, страница под ним не скроллится. На телефоне без
  // этого палец по ленте прокручивал САМУ ВАКАНСИЮ за окном, а лента
  // стояла на месте -- ровно то, что видно на видео. Одного
  // overflow:hidden на body для Safari мало, поэтому прокрутка вне
  // ленты ещё и отменяется напрямую; слушатель обязательно
  // неpassive -- у React-обработчиков preventDefault здесь не
  // сработал бы.
  useEffect(() => {
    if (!open) return;
    const overlay = overlayRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onTouchMove = (e: TouchEvent) => {
      const scroller = listRef.current;
      const target = e.target as Node | null;
      if (scroller && target && scroller.contains(target)) return;
      e.preventDefault();
    };
    overlay?.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      document.body.style.overflow = previousOverflow;
      overlay?.removeEventListener("touchmove", onTouchMove);
    };
  }, [open]);

  useEffect(() => {
    const el = inputRowRef.current;
    if (!el) return;
    const measure = () => {
      const h = Math.round(el.getBoundingClientRect().height);
      // Ноль -- это «окно сейчас скрыто», а не настоящая высота: в
      // display:none у элемента нет размеров вовсе.
      if (h > 10) setSendSize(h + 2);
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open, signedIn]);

  // Измеряем композер, а не подбираем отступ на глаз: он меняется в
  // высоте вместе с цитатой ответа и правки.
  useEffect(() => {
    const el = composerRef.current;
    if (!el) return;
    const measure = () => setComposerHeight(el.getBoundingClientRect().height);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open, signedIn]);
  // 2026-09-16 (Александр: «у нас в чатах и мини-чатах эта штука,
  // композер, разъезжается наверх анимацией, и когда нажимаешь крестик,
  // съезжается назад... и, по-моему, даже нету этой полосы сверху») --
  // тот же приём grid-template-rows 1fr/0fr, что в обоих чатах: цитата
  // живёт ВНУТРИ той же пилюли, что и поле ввода, и пилюля растёт
  // вверх, а не появляется отдельной карточкой над разделителем.
  // Пара «displayed* + *Grown» нужна, чтобы при закрытии успела
  // проиграться обратная анимация: displayed держит содержимое ещё
  // 200 мс после того, как сам ответ уже сброшен.
  const ROW_COLLAPSE_MS = 200;
  const [displayedReplyTo, setDisplayedReplyTo] = useState<WebComment | null>(null);
  const [replyRowGrown, setReplyRowGrown] = useState(false);
  useEffect(() => {
    if (replyTo) {
      setDisplayedReplyTo(replyTo);
      if (!replyRowGrown) {
        let raf2 = 0;
        const raf1 = window.requestAnimationFrame(() => {
          raf2 = window.requestAnimationFrame(() => setReplyRowGrown(true));
        });
        return () => {
          window.cancelAnimationFrame(raf1);
          if (raf2) window.cancelAnimationFrame(raf2);
        };
      }
      return;
    }
    setReplyRowGrown(false);
    const t = window.setTimeout(() => setDisplayedReplyTo(null), ROW_COLLAPSE_MS);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replyTo]);
  const [displayedEditing, setDisplayedEditing] = useState<WebComment | null>(null);
  const [editRowGrown, setEditRowGrown] = useState(false);
  useEffect(() => {
    if (editing) {
      setDisplayedEditing(editing);
      if (!editRowGrown) {
        let raf2 = 0;
        const raf1 = window.requestAnimationFrame(() => {
          raf2 = window.requestAnimationFrame(() => setEditRowGrown(true));
        });
        return () => {
          window.cancelAnimationFrame(raf1);
          if (raf2) window.cancelAnimationFrame(raf2);
        };
      }
      return;
    }
    setEditRowGrown(false);
    const t = window.setTimeout(() => setDisplayedEditing(null), ROW_COLLAPSE_MS);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);
  // Сдвиг шторки пальцем вниз -- в приложении она так и закрывается.
  const [dragY, setDragY] = useState(0);
  const dragStartRef = useRef<number | null>(null);

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

  // Цвета имён раздаются на всё обсуждение сразу, по порядку
  // комментариев: пока авторов не больше восьми, двух одинаковых
  // цветов не будет (см. lib/peer-name-color.ts).
  const nameColors = useMemo(() => assignPeerNameColors(list.map((c) => c.authorId)), [list]);

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
      if (!id) {
        setDeleteTarget(null);
        return;
      }
      const before = list;
      setDeleting(true);
      setDeleteFailed(false);
      try {
        const res = await fetch("/api/comments/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postId, commentIds: [id] }),
        });
        const data = await res.json().catch(() => null);
        if (!data?.ok) throw new Error("delete_failed");
        setList((prev) => prev.filter((c) => c.id !== comment.id));
        setDeleteTarget(null);
      } catch {
        setList(before);
        setDeleteFailed(true);
      } finally {
        setDeleting(false);
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
        body: JSON.stringify({
          postId,
          text: value,
          ...(replyTo && Number(replyTo.id) > 0 && replyTo.authorId
            ? { replyTo: { commentId: Number(replyTo.id), userId: replyTo.authorId } }
            : {}),
        }),
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
          // 2026-09-16 (Александр, скриншот: «моё сообщение слева и
          // серым»). Было null -- и только что отправленный комментарий
          // до перезагрузки считался ЧУЖИМ: `mine` проверяет именно
          // authorId. Свой id мы знаем, он и подставляется.
          authorId: me?.userId ?? null,
          text: value,
          mediaOnly: false,
          media: [],
          createdAt: new Date(),
          editedAt: null,
          reactions: [],
          replyToId: replyTo?.id ?? null,
        },
      ]);
      setText("");
      setReplyTo(null);
      inputRef.current?.focus();
    } catch {
      setFailed(true);
    } finally {
      setSending(false);
    }
  }, [text, sending, postId, me, editing, replyTo]);

  // Панель наліпок привязана к кнопке-коту, но её положение снимается
  // в момент нажатия -- а сразу после нажатия на телефоне закрывается
  // клавиатура, и композер съезжает вниз на её высоту. Панель при этом
  // оставалась там, где кот был ДО этого, то есть висела высоко над
  // полем (Александр, скриншот). Пока панель открыта, положение кота
  // пере-измеряется: и когда клавиатура уезжает, и когда меняется сам
  // видимый кусок страницы.
  const pickerOpen = pickerAnchor !== null;
  useEffect(() => {
    if (!pickerOpen) return;
    const remeasure = () => {
      const rect = stickerButtonRef.current?.getBoundingClientRect();
      if (rect) setPickerAnchor(rect);
    };
    const settle = setTimeout(remeasure, 350);
    const vv = window.visualViewport;
    vv?.addEventListener("resize", remeasure);
    vv?.addEventListener("scroll", remeasure);
    window.addEventListener("resize", remeasure);
    return () => {
      clearTimeout(settle);
      vv?.removeEventListener("resize", remeasure);
      vv?.removeEventListener("scroll", remeasure);
      window.removeEventListener("resize", remeasure);
    };
  }, [pickerOpen]);

  // Наліпка и гифка отправляются сразу по нажатию в панели -- отдельной
  // кнопки «отправить» у них нет, ровно как в чатах (см. шапку
  // components/chat/media-picker-panel.tsx). От выбранного документа
  // бэкенду нужна только ссылка на файл.
  const sendMedia = useCallback(
    async (doc: MediaDocument) => {
      if (sending) return;
      setSending(true);
      setFailed(false);
      const replyToSend = replyTo;
      setReplyTo(null);
      try {
        const res = await fetch("/api/comments/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            postId,
            media: [{ fileReference: doc.fileReference }],
            ...(replyToSend && Number(replyToSend.id) > 0 && replyToSend.authorId
              ? { replyTo: { commentId: Number(replyToSend.id), userId: replyToSend.authorId } }
              : {}),
          }),
        });
        const data = await res.json().catch(() => null);
        if (!data?.ok) throw new Error("send_failed");
        // Вложение дописываем из ОТВЕТА бэкенда, а не из выбранного в
        // панели документа: в ответе уже лежит тот же документ в том
        // виде, в каком его потом пришлёт и messages.getMessages,
        // вместе со свежей ссылкой на файл.
        const media = data.message ? messageDocumentMedia(data.message) : [];
        setList((prev) => [
          ...prev,
          {
            id: data.message?._id ? String(data.message._id) : `local-${Date.now()}`,
            authorName: me?.name || "",
            authorUsername: me?.username ?? null,
            authorAvatarUrl: me?.avatarUrl ?? null,
            authorId: me?.userId ?? null,
            text: "",
            mediaOnly: media.length > 0,
            media,
            createdAt: new Date(),
            editedAt: null,
            reactions: [],
            replyToId: replyToSend?.id ?? null,
          },
        ]);
      } catch {
        setFailed(true);
      } finally {
        setSending(false);
      }
    },
    [sending, postId, me, replyTo],
  );

  // Ни комментариев, ни вошедшего -- блока нет вовсе.
  if (list.length === 0 && !signedIn) return null;

  const last = list[list.length - 1] ?? null;

  return (
    <section className="mt-10">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
        <T
          uk="Коментарі" en="Comments" ru="Комментарии" de="Kommentare" es="Comentarios"
          fr="Commentaires" pl="Komentarze" ptBR="Comentários" zh="评论"
        />
        {list.length > 0 && <span className="ml-1.5 tabular-nums">{list.length}</span>}
      </h2>

      {/* Свёрнутая строка. В приложении это ровно она: аватарка, а
          рядом -- последний комментарий, если он есть. Нажатие
          открывает окно. Сама страница вакансии при этом не растёт:
          хоть двести комментариев, хоть ни одного -- высота одна. */}
      <button
        type="button"
        onClick={openWindow}
        // `group` -- ради кота справа: анимация в globals.css висит на
        // `.group:hover .animate-chat-wiggle`, без группы-предка она
        // просто никогда не срабатывает (2026-09-16, Александр: «дай
        // коту при наведении его анимацию»).
        className="group mt-3 flex w-full items-center gap-2 text-left"
      >
        <Avatar url={me?.avatarUrl ?? null} seed={me?.username ?? "me"} className="h-9 w-9" />
        <span className="flex min-h-9 min-w-0 flex-1 items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-1.5 text-[14px] dark:border-neutral-700 dark:bg-neutral-900">
          {last ? (
            <>
              <span className="shrink-0 text-[15px] leading-none" aria-hidden="true">
                💬
              </span>
              <span className="truncate text-neutral-700 dark:text-neutral-300">
                <CommentPreview comment={last} />
              </span>
            </>
          ) : (
            <span className="truncate text-neutral-400 dark:text-neutral-500">{PLACEHOLDER}</span>
          )}
          <ChatCatFieldIcon className="ml-auto h-[18px] w-[18px] shrink-0 animate-chat-wiggle text-neutral-400 dark:text-neutral-500" />
        </span>
      </button>

      {/* Окно. В разметке оно ЕСТЬ всегда, просто скрыто -- иначе
          комментариев не увидел бы поисковик, ради чего всё и
          затевалось. На телефоне это шторка снизу, которую можно
          стянуть вниз; на компьютере -- окно по центру. */}
      {/* `hidden` как АТРИБУТ здесь не работал: у элемента есть класс
          `flex`, а он задаёт display и перебивает браузерное правило
          [hidden]{display:none}. То есть окно не пряталось вовсе.
          Теперь прячет сам класс. Разметка при этом остаётся в HTML --
          display:none элемент из документа не удаляет, поисковик его
          видит, ради чего всё и затевалось. */}
      <div
        ref={overlayRef}
        className={`fixed inset-0 z-50 items-end justify-center overscroll-contain sm:items-center ${open ? "flex" : "hidden"}`}
        onClick={closeWindow}
      >
        <div className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ease-out ${shown ? "opacity-100" : "opacity-0"}`} />
        <div
          ref={windowRef}
          onClick={(e) => e.stopPropagation()}
          // Во время перетаскивания пальцем перехода быть не должно:
          // иначе шторка тянется за пальцем с задержкой.
          style={dragY ? { transform: `translateY(${dragY}px)`, transition: "none" } : undefined}
          // 2026-09-16 (Александр, скриншот на тёмной теме: «добавь чуть
          // светлую тень модалке, чтобы чуть отделить от фона») -- у нас
          // тёмная тема это чистый чёрный, и чёрная тень на чёрном фоне
          // не видна в принципе, поэтому окно сливалось со страницей.
          // Тот же приём, что уже стоит на панели мини-чата: к двум
          // обычным тёмным слоям добавлен третий, очень слабый БЕЛЫЙ --
          // на светлом фоне он незаметен, на чёрном даёт ровно то
          // «чуть-чуть», которое отделяет окно от страницы. Плюс
          // тонкая рамка -- она же и есть край окна на самом чёрном.
          className={`relative flex max-h-[85dvh] w-full flex-col rounded-t-2xl border border-neutral-200 bg-white shadow-[0_20px_25px_-5px_rgba(0,0,0,0.15),0_8px_10px_-6px_rgba(0,0,0,0.15),0_16px_48px_-8px_rgba(255,255,255,0.10)] transition-[opacity,transform] dark:border-neutral-800 dark:bg-neutral-950 sm:max-h-[80dvh] sm:max-w-lg sm:rounded-2xl ${
            shown
              ? // Приезжает мягко и с торможением в конце -- та же
                // кривая, что у шторок в приложении.
                "translate-y-0 scale-100 opacity-100 duration-[300ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
              : // Уезжает быстрее, чем приезжает: затянутое закрытие
                // читается как подтормаживание интерфейса.
                "translate-y-full opacity-0 duration-[220ms] ease-in sm:translate-y-3 sm:scale-[0.98]"
          }`}
        >
          {/* Шапка окна. Полоска сверху -- за неё шторка стягивается
              вниз пальцем, как в приложении. */}
          <div
            className="shrink-0 border-b border-neutral-100 px-4 pb-3 pt-2 dark:border-neutral-800"
            onTouchStart={(e) => {
              dragStartRef.current = e.touches[0]?.clientY ?? null;
            }}
            onTouchMove={(e) => {
              const start = dragStartRef.current;
              const y = e.touches[0]?.clientY;
              if (start == null || y == null) return;
              setDragY(Math.max(0, y - start));
            }}
            onTouchEnd={() => {
              if (dragY > 80) closeWindow();
              setDragY(0);
              dragStartRef.current = null;
            }}
          >
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-neutral-200 dark:bg-neutral-700 sm:hidden" />
            <div className="flex items-center justify-between">
              <span className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-50">
                <T
                  uk="Коментарі" en="Comments" ru="Комментарии" de="Kommentare" es="Comentarios"
                  fr="Commentaires" pl="Komentarze" ptBR="Comentários" zh="评论"
                />
                {list.length > 0 && <span className="ml-1.5 tabular-nums font-normal text-neutral-400">{list.length}</span>}
              </span>
              <button
                type="button"
                onClick={closeWindow}
                aria-label="Close"
                className="group -mr-1 rounded-full p-1.5 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="animate-close-spin">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
          </div>

          {/* Лента и композер -- один слой: композер НЕ занимает место в
              колонке, а висит над лентой, и лента уезжает под него
              (2026-09-16, Александр, референс Telegram: «чтобы сообщение
              не полностью зажало чёрную историю, а чтобы там была
              полоска blur-тень, и input field был как будто бы
              поверх»). Поэтому здесь лишний relative-контейнер: он и
              есть система координат для этого «поверх». */}
          <div className="relative flex min-h-0 flex-1 flex-col">
          <div
            ref={listRef}
            style={{ paddingBottom: signedIn ? composerHeight + 12 : 12 }}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-3"
          >
            {list.length > 0 ? (
              <ul className="flex flex-col gap-2.5">
                {list.map((comment) => (
                  <Bubble
                    key={comment.id}
                    comment={comment}
                    mine={!!me?.userId && comment.authorId === me.userId}
                    myUserId={me?.userId ?? null}
                    repliedTo={comment.replyToId ? list.find((c) => c.id === comment.replyToId) ?? null : null}
                    nameColors={nameColors}
                    onOpenMenu={(c, rect) => setMenu({ comment: c, rect, mine: !!me?.userId && c.authorId === me.userId })}
                    onReply={(c) => {
                      setEditing(null);
                      setReplyTo(c);
                      window.requestAnimationFrame(() => inputRef.current?.focus());
                    }}
                    onToggleReaction={toggleReaction}
                  />
                ))}
              </ul>
            ) : (
              <p className="py-8 text-center text-[14px] text-neutral-400 dark:text-neutral-500">
                <T
                  uk="Залиште перший коментар!" en="Be the first to comment!" ru="Оставьте первый комментарий!"
                  de="Schreiben Sie den ersten Kommentar!" es="¡Sé el primero en comentar!"
                  fr="Soyez le premier à commenter !" pl="Dodaj pierwszy komentarz!"
                  ptBR="Seja o primeiro a comentar!" zh="来发表第一条评论吧！"
                />
              </p>
            )}
          </div>

          {/* Ввод */}
          {signedIn && (
            <>
            {/* Полоса-затухание под лентой: размывает и растворяет
                последние сообщения под композером вместо жёсткой
                разделительной черты, которая тут была. Маска гасит и
                сам блюр, иначе его верхний край читался бы той же
                чертой, только мутной. */}
            <div
              aria-hidden="true"
              style={{
                maskImage: "linear-gradient(to top, #000 55%, transparent 100%)",
                WebkitMaskImage: "linear-gradient(to top, #000 55%, transparent 100%)",
              }}
              className="pointer-events-none absolute inset-x-0 bottom-0 h-[104px] bg-gradient-to-t from-white via-white/70 to-transparent backdrop-blur-[10px] dark:from-neutral-950 dark:via-neutral-950/70"
            />
            <div ref={composerRef} className="absolute inset-x-0 bottom-0 px-4 pb-4">
              {/* Ответ и правка живут ВНУТРИ пилюли ввода и
                  разъезжают её вверх -- ровно как в чатах и мини-чатах
                  (components/mini-chat-window.tsx, app/chats/[chatId]/
                  page.tsx): тот же grid-template-rows 1fr/0fr, те же
                  ReplyComposeBar/EditComposeBar с inline. Отдельной
                  карточки над полем и её разделительной полосы больше
                  нет -- это была моя самодеятельность. */}
              <div className="flex items-end gap-2">
                <Avatar url={me?.avatarUrl ?? null} seed={me?.username ?? "me"} className="h-9 w-9" />
                <div className="flex min-w-0 flex-1 flex-col rounded-[18px] border border-neutral-200/80 bg-white/70 backdrop-blur-xl focus-within:border-accent/50 dark:border-white/15 dark:bg-white/[0.06]">
                  {displayedEditing && (
                    <div
                      className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                        editRowGrown ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                      }`}
                    >
                      <div className="overflow-hidden">
                        <EditComposeBar
                          inline
                          previewText={displayedEditing.text}
                          onCancel={() => {
                            setEditing(null);
                            setText("");
                          }}
                        />
                      </div>
                    </div>
                  )}
                  {displayedReplyTo && (
                    <div
                      className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                        replyRowGrown ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                      }`}
                    >
                      <div className="overflow-hidden">
                        <ReplyComposeBar
                          inline
                          authorLabel={displayedReplyTo.authorName}
                          previewText={displayedReplyTo.mediaOnly ? "Наліпка" : displayedReplyTo.text}
                          onRemove={() => setReplyTo(null)}
                        />
                      </div>
                    </div>
                  )}
                  {/* 34, а не 36: у пилюли есть своя рамка в пиксель
                      сверху и снизу, и с min-h-[36px] она выходила 38 --
                      на два пикселя выше кнопки отправки, что и было
                      видно на скриншоте. */}
                  <div ref={inputRowRef} className="flex min-h-[34px] items-center gap-1 pl-4 pr-1.5">
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
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void send();
                        }
                      }}
                      placeholder={PLACEHOLDER}
                      className="chat-textarea-no-scrollbar max-h-[120px] min-w-0 flex-1 resize-none self-center bg-transparent py-[7px] text-[14px] leading-[1.45] text-neutral-900 outline-none placeholder:text-neutral-400 dark:text-neutral-50 dark:placeholder:text-neutral-500"
                    />
                    <button
                      ref={stickerButtonRef}
                      type="button"
                      onClick={() => {
                        const rect = stickerButtonRef.current?.getBoundingClientRect();
                        if (rect) setPickerAnchor(rect);
                      }}
                      aria-label="Emoji"
                      // По центру строки, а не по её низу: пока поле в
                      // одну строку, разницы не видно, а стоило тексту
                      // подрасти -- кот уезжал вниз (Александр, скриншот).
                      className="group flex shrink-0 items-center justify-center self-center rounded-full p-1 text-neutral-400 transition hover:text-accent dark:text-neutral-500"
                    >
                      {/* 20px, как в большом чате: 18 рядом с
                          текстом в 14 выглядели мелко и будто ниже
                          строки (Александр, скриншот). */}
                      <ChatCatFieldIcon className="h-5 w-5 animate-chat-wiggle" />
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void send()}
                  disabled={sending || !text.trim()}
                  aria-label="Send"
                  style={{ height: sendSize, width: text.trim() ? sendSize : 0 }}
                  className={`${SEND_BUTTON_CLASS} overflow-hidden ${
                    text.trim() ? "ml-0 opacity-100" : "-ml-2 opacity-0"
                  }`}
                >
                  <SendArrowIcon />
                </button>
              </div>
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
            </div>
            </>
          )}
          </div>
        </div>
      </div>

      {/* Меню -- то же самое, что в чатах и мини-чатах. Из восьми его
          строк здесь нужны четыре: переслать комментарий, закрепить его
          или поставить напоминание бэкенду нечем, а «вибрати» без
          пакетных действий бессмысленно. Показываются они или нет --
          решает список rows, вёрстка и поведение остаются меню. */}
      {menu && (
        <MessageActionsMenu
          anchorRect={menu.rect}
          mine={menu.mine}
          lang={lang}
          // У наліпки нечего копировать и нечего править -- строки
          // просто не показываются, а не показываются пустышками.
          rows={[
            "reply",
            ...(menu.comment.text ? (["copy"] as const) : []),
            ...(menu.mine && menu.comment.text ? (["edit"] as const) : []),
            "delete",
          ]}
          onClose={() => setMenu(null)}
          myReactionEmoticon={myReactionOn(menu.comment)}
          onReact={(emoticon) => void toggleReaction(menu.comment, emoticon)}
          onReply={() => {
            setEditing(null);
            setReplyTo(menu.comment);
            window.requestAnimationFrame(() => inputRef.current?.focus());
          }}
          onCopy={menu.comment.text ? () => void navigator.clipboard?.writeText(menu.comment.text) : undefined}
          onEdit={
            menu.mine && menu.comment.text
              ? () => {
                  setReplyTo(null);
                  setEditing(menu.comment);
                  setText(menu.comment.text);
                  window.requestAnimationFrame(() => inputRef.current?.focus());
                }
              : undefined
          }
          onDelete={() => {
            setDeleteFailed(false);
            setDeleteTarget(menu.comment);
          }}
        />
      )}

      {/* Подтверждение удаления -- та же карточка, что в чатах, и та же
          привязка к окну обсуждения, что у мини-чата к своей панели:
          иначе она встаёт по центру всей страницы, далеко от того, что
          человек только что нажимал. */}
      {deleteTarget && (
        <DeleteMessageConfirmDialog
          deleting={deleting}
          failed={deleteFailed}
          anchorRect={windowRef.current?.getBoundingClientRect() ?? null}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => void removeComment(deleteTarget)}
        />
      )}

      {pickerAnchor && (
        <MediaPickerPanel
          anchorRect={pickerAnchor}
          initialTab="emoji"
          onClose={() => setPickerAnchor(null)}
          onPickEmoji={(emoji) => {
            setText((prev) => prev + emoji);
            inputRef.current?.focus();
          }}
          onSendMedia={(doc) => {
            setPickerAnchor(null);
            void sendMedia(doc);
          }}
        />
      )}
    </section>
  );
}

// 2026-09-16 (Александр, скриншот свёрнутой строки): вместо серой
// нарисованной иконки-облачка перед последним комментарием -- эмодзи
// 💬. Своя иконка была бледной и терялась рядом с цветной аватаркой.

// Плейсхолдер одной строкой, а не через <T/>: это атрибут, а не
// разметка, и девять спанов в него не положить. Украинский -- язык
// страницы по умолчанию (<html lang="uk">).
const PLACEHOLDER = "Додати коментар";
