// components/chat/photo-viewer.tsx
//
// 2026-09-03 (Aleksandr, 3 screenshots of a native full-screen photo
// viewer: "в чатах сделай так, чтобы фотографии можно было открывать
// крупным"): full-screen lightbox for chat image attachments -- side
// prev/next nav (web-specific placement, beside the photo rather than
// overlapping it, per Aleksandr's own "не в самой фотке, а ... по
// бокам"), a bottom row of 4 round buttons (back / share / delete /
// "•••" more), the "•••" menu (Show in chat / Reply / Save / Delete),
// a delete-for-me-only confirm popup, and a fading "X of Y" counter
// (flashes on navigation, holds ~2s, fades out -- not a permanently
// pinned number, per Aleksandr's own "она загорается и через... две
// секунды потухает").
//
// One real backend constraint worth calling out: chat-server has no
// "delete one attachment off a message" primitive -- messages.
// deleteMessages (app/api/chats/delete/route.ts) only takes message
// ids, always `revoke: false` (delete-for-me only, Aleksandr's explicit
// scope correction -- no "delete for everyone" branch exists here at
// all). Deleting "this photo" deletes the WHOLE message it came from,
// same as the reference app. The parent page owns the actual
// messages[] state; this component only asks it to delete a message id
// (onDelete) and reacts to its own `images` prop shrinking afterward.
//
// Reply is intentionally minimal here -- Aleksandr: "Я тоже UI ответов
// на сообщения чуть позже скину" -- onReply just closes the viewer and
// focuses the compose box; no reply-to-message UI exists yet anywhere
// else in this file either, so this doesn't get ahead of that.
"use client";

import { useEffect, useRef, useState } from "react";
import { T, type Locale } from "@/components/t";
import { MEDIA_BLUR_STYLE } from "@/lib/blur-placeholder";

export type ChatViewerImage = {
  // doc._id only needs to be unique WITHIN a message (every other id in
  // this chat data is chat-scoped, not global -- see lib/a1/
  // chat-schemas.ts's own header), so the viewer's real identity per
  // image is the messageId+docId pair, not docId alone.
  key: string;
  docId: string;
  url: string;
  downloadUrl: string;
  fileName: string;
  messageId: number;
  senderLabel: string;
  dateMs: number;
};

type Props = {
  lang: Locale;
  images: ChatViewerImage[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  onShowInChat: (messageId: number) => void;
  onReply: (messageId: number) => void;
  onDelete: (messageId: number) => Promise<void>;
};

const TIME_FMT = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" });

function formatTimestamp(ms: number): string {
  if (!ms) return "";
  try {
    return TIME_FMT.format(new Date(ms));
  } catch {
    return "";
  }
}

function CloseIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ShareIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrashIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-9 0 1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MoreIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
    </svg>
  );
}

function ChevronIcon({ direction, className = "h-6 w-6" }: { direction: "left" | "right"; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d={direction === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"}
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShowInChatIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M4 5h16M4 12h16M4 19h10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ReplyIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M9 10 4 14l5 4v-3.2c5.5 0 8.5 1.6 10 4.2-.3-5.6-3.2-9.5-10-10V6l-5 4Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SaveIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 4v11m0 0 4-4m-4 4-4-4M5 17v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const ROUND_BTN =
  "flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20 active:scale-95 disabled:opacity-50 disabled:active:scale-100";

export function ChatPhotoViewer({ lang, images, index, onIndexChange, onClose, onShowInChat, onReply, onDelete }: Props) {
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteFailed, setDeleteFailed] = useState(false);
  // Fading "X of Y" pill -- see this file's own header comment. Flashed
  // on mount (when there's more than one image) and every time `index`
  // changes; held for COUNTER_HOLD_MS then faded out.
  const [counterVisible, setCounterVisible] = useState(images.length > 1);
  const counterTimer = useRef<number | null>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const deleteConfirmRef = useRef<HTMLDivElement>(null);
  const image = images[index];

  useEffect(() => {
    if (images.length <= 1) return;
    setCounterVisible(true);
    if (counterTimer.current) window.clearTimeout(counterTimer.current);
    counterTimer.current = window.setTimeout(() => setCounterVisible(false), 2000);
    return () => {
      if (counterTimer.current) window.clearTimeout(counterTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only the
    // index itself should re-arm the fade timer, not images.length.
  }, [index]);

  // Auto-close the instant the current image's message gets deleted out
  // from under it (onDelete resolving shrinks the parent's `images`
  // array, which re-renders this component with a smaller list) --
  // and clamp `index` back in range for every other shrink too, so a
  // stale index never reads past the end of the new array.
  useEffect(() => {
    if (images.length === 0) {
      onClose();
      return;
    }
    if (index > images.length - 1) {
      onIndexChange(images.length - 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images.length]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (confirmDeleteOpen) setConfirmDeleteOpen(false);
        else if (moreMenuOpen) setMoreMenuOpen(false);
        else onClose();
      } else if (e.key === "ArrowLeft" && index > 0) {
        onIndexChange(index - 1);
      } else if (e.key === "ArrowRight" && index < images.length - 1) {
        onIndexChange(index + 1);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [index, images.length, confirmDeleteOpen, moreMenuOpen, onClose, onIndexChange]);

  useEffect(() => {
    if (!moreMenuOpen) return;
    function onDocClick(e: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setMoreMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [moreMenuOpen]);

  // 2026-09-03 (Aleksandr, screenshot of the confirm as a dimmed
  // centered modal: "сделай тоже прямо над кнопкой и не надо
  // затемнять фон, сделай так же как и show in chat, reply и тд") --
  // same anchored-popover convention as moreMenuOpen above instead of
  // a backdrop modal: closes on an outside click, not while a delete
  // request is actually in flight (same guard the Cancel button uses).
  useEffect(() => {
    if (!confirmDeleteOpen) return;
    function onDocClick(e: MouseEvent) {
      if (deleting) return;
      if (deleteConfirmRef.current && !deleteConfirmRef.current.contains(e.target as Node)) {
        setConfirmDeleteOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [confirmDeleteOpen, deleting]);

  // Body scroll lock while the viewer is open, same convention as this
  // app's other full-screen overlays.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  if (!image) return null;

  async function handleShare() {
    const absoluteUrl = `${window.location.origin}${image!.url}`;
    if (navigator.share) {
      try {
        await navigator.share({ url: absoluteUrl });
      } catch {
        // user cancelled the native share sheet -- not an error.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(absoluteUrl);
    } catch {
      // clipboard permission denied -- silently give up, nothing else
      // to fall back to without adding a whole toast system for this.
    }
  }

  async function handleConfirmDelete() {
    setDeleting(true);
    setDeleteFailed(false);
    try {
      await onDelete(image!.messageId);
      setConfirmDeleteOpen(false);
    } catch {
      setDeleteFailed(true);
    } finally {
      setDeleting(false);
    }
  }

  function handleSave() {
    const a = document.createElement("a");
    a.href = image!.downloadUrl;
    a.download = image!.fileName || "photo";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setMoreMenuOpen(false);
  }

  return (
    <div className="fixed inset-0 z-[75] flex flex-col bg-black/95 backdrop-blur-sm" role="dialog" aria-modal="true">
      {/* Header -- sender name (persistent) + the fading X of Y pill,
          per Aleksandr's own "сверху должно быть имя" / "должна быть
          еще нумерация". */}
      <div className="flex shrink-0 flex-col items-center gap-0.5 px-4 pb-2 pt-[max(env(safe-area-inset-top),1rem)] text-white">
        <span className="max-w-[80%] truncate text-[15px] font-semibold">{image.senderLabel}</span>
        <div className="flex items-center gap-2 text-[12px] text-white/60">
          <span>{formatTimestamp(image.dateMs)}</span>
          {images.length > 1 && (
            <span
              className={`rounded-full bg-white/10 px-2 py-0.5 font-medium text-white/80 transition-opacity duration-500 ${
                counterVisible ? "opacity-100" : "opacity-0"
              }`}
            >
              {index + 1} of {images.length}
            </span>
          )}
        </div>
      </div>

      {/* Photo, with side nav arrows placed beside it (Aleksandr: "не в
          самой фотке, а ... по бокам"), not overlapping the image. */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2">
        {index > 0 && (
          <button
            type="button"
            onClick={() => onIndexChange(index - 1)}
            aria-label="Previous"
            className={`${ROUND_BTN} absolute left-2 top-1/2 z-10 -translate-y-1/2 sm:left-4`}
          >
            <ChevronIcon direction="left" />
          </button>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element -- proxied
            through /api/media, not a next/image-configured remote host. */}
        {/* 2026-09-05 (Aleksandr: "Эти фото тоже подгружай через блюр,
            при открытии просмотра фото в большом формате") -- this
            full-size lightbox <img> painted nothing at all while its
            (much larger, uncached) source loaded, unlike every other
            photo surface in the app (grid thumbnails, avatars) which
            already show MEDIA_BLUR_STYLE's shimmer square underneath
            until the real pixels decode -- same trick here: a loading
            <img> paints no pixels of its own, so the shimmer background
            shows through underneath it. */}
        <img
          key={image.key}
          src={image.url}
          alt=""
          className="max-h-full max-w-full select-none rounded-md object-contain"
          style={MEDIA_BLUR_STYLE}
          draggable={false}
        />
        {index < images.length - 1 && (
          <button
            type="button"
            onClick={() => onIndexChange(index + 1)}
            aria-label="Next"
            className={`${ROUND_BTN} absolute right-2 top-1/2 z-10 -translate-y-1/2 sm:right-4`}
          >
            <ChevronIcon direction="right" />
          </button>
        )}
      </div>

      {/* Bottom bar -- 4 round buttons: back, share, delete, more.
          Delete is deliberately reachable both here AND inside the
          "•••" menu below (Aleksandr's own spec repeats it in both
          places), sharing the same confirm popup. */}
      <div className="relative flex shrink-0 items-center justify-center gap-6 px-4 pb-[max(env(safe-area-inset-bottom),1.25rem)] pt-3">
        <button type="button" onClick={onClose} aria-label="Close" className={`group ${ROUND_BTN}`}>
          <CloseIcon className="h-5 w-5 animate-close-spin" />
        </button>
        <button type="button" onClick={() => void handleShare()} aria-label="Share" className={`group ${ROUND_BTN}`}>
          <ShareIcon className="h-5 w-5 animate-share-lift" />
        </button>
        <div ref={deleteConfirmRef} className="relative">
          <button
            type="button"
            onClick={() => setConfirmDeleteOpen(true)}
            aria-label="Delete"
            className={`group ${ROUND_BTN}`}
          >
            <TrashIcon className="h-5 w-5 animate-trash-wobble" />
          </button>
          {confirmDeleteOpen && (
            <div className="animate-popover-up absolute bottom-full left-1/2 z-10 mb-2 w-72 -translate-x-1/2 rounded-2xl bg-white p-4 shadow-xl dark:bg-neutral-900">
              <h2 className="text-[15px] font-semibold text-[#262a34] dark:text-white">
                <T
                  uk="Видалити фото?" en="Delete photo?" ru="Удалить фото?" de="Foto löschen?"
                  es="¿Eliminar foto?" fr="Supprimer la photo ?" pl="Usunąć zdjęcie?"
                  ptBR="Excluir foto?" zh="删除照片？"
                />
              </h2>
              <p className="mt-1 text-[13px] text-neutral-500 dark:text-neutral-400">
                <T
                  uk="Фото буде видалено лише для вас." en="The photo will be deleted for you only."
                  ru="Фото будет удалено только у вас." de="Das Foto wird nur für dich gelöscht."
                  es="La foto se eliminará solo para ti." fr="La photo ne sera supprimée que pour vous."
                  pl="Zdjęcie zostanie usunięte tylko u Ciebie." ptBR="A foto será excluída só para você."
                  zh="照片将仅对你删除。"
                />
              </p>
              {deleteFailed && (
                <p className="mt-2 text-[13px] text-red-600 dark:text-red-400">
                  <T
                    uk="Не вдалося видалити. Спробуйте ще раз." en="Couldn't delete. Try again."
                    ru="Не удалось удалить. Попробуйте ещё раз." de="Löschen fehlgeschlagen. Versuch es erneut."
                    es="No se pudo eliminar. Inténtalo de nuevo." fr="Échec de la suppression. Réessayez."
                    pl="Nie udało się usunąć. Spróbuj ponownie." ptBR="Não foi possível excluir. Tente novamente."
                    zh="删除失败，请重试。"
                  />
                </p>
              )}
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => setConfirmDeleteOpen(false)}
                  className="rounded-full px-3.5 py-1.5 text-[14px] font-medium text-[#262a34] transition hover:bg-black/5 disabled:opacity-50 dark:text-white dark:hover:bg-white/10"
                >
                  <T uk="Скасувати" en="Cancel" ru="Отмена" de="Abbrechen" es="Cancelar" fr="Annuler" pl="Anuluj" ptBR="Cancelar" zh="取消" />
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => void handleConfirmDelete()}
                  className="rounded-full bg-red-600 px-3.5 py-1.5 text-[14px] font-medium text-white transition hover:bg-red-700 disabled:opacity-60"
                >
                  <T uk="Видалити" en="Delete" ru="Удалить" de="Löschen" es="Eliminar" fr="Supprimer" pl="Usuń" ptBR="Excluir" zh="删除" />
                </button>
              </div>
            </div>
          )}
        </div>
        <div ref={moreMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setMoreMenuOpen((v) => !v)}
            aria-label="More"
            className={`group ${ROUND_BTN}`}
          >
            <MoreIcon className="h-5 w-5 animate-dots-bounce" />
          </button>
          {moreMenuOpen && (
            <div className="animate-popover-up absolute bottom-full right-0 z-10 mb-2 w-52 overflow-hidden rounded-2xl bg-white py-1.5 shadow-xl dark:bg-neutral-900">
              <button
                type="button"
                onClick={() => {
                  setMoreMenuOpen(false);
                  onShowInChat(image!.messageId);
                }}
                className="group flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[14px] font-medium text-[#262a34] transition hover:bg-black/5 dark:text-white dark:hover:bg-white/10"
              >
                <ShowInChatIcon className="h-5 w-5 animate-list-jump text-[#335ef7] dark:text-[#0c8ce9]" />
                <T
                  uk="Показати в чаті" en="Show in chat" ru="Показать в чате" de="Im Chat anzeigen"
                  es="Mostrar en el chat" fr="Afficher dans le chat" pl="Pokaż w czacie"
                  ptBR="Mostrar no chat" zh="在聊天中显示"
                />
              </button>
              <button
                type="button"
                onClick={() => {
                  setMoreMenuOpen(false);
                  onReply(image!.messageId);
                }}
                className="group flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[14px] font-medium text-[#262a34] transition hover:bg-black/5 dark:text-white dark:hover:bg-white/10"
              >
                <ReplyIcon className="h-5 w-5 animate-reply-bounce text-[#335ef7] dark:text-[#0c8ce9]" />
                <T uk="Відповісти" en="Reply" ru="Ответить" de="Antworten" es="Responder" fr="Répondre" pl="Odpowiedz" ptBR="Responder" zh="回复" />
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="group flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[14px] font-medium text-[#262a34] transition hover:bg-black/5 dark:text-white dark:hover:bg-white/10"
              >
                <SaveIcon className="h-5 w-5 animate-save-drop text-[#335ef7] dark:text-[#0c8ce9]" />
                <T uk="Зберегти" en="Save" ru="Сохранить" de="Speichern" es="Guardar" fr="Enregistrer" pl="Zapisz" ptBR="Salvar" zh="保存" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setMoreMenuOpen(false);
                  setConfirmDeleteOpen(true);
                }}
                className="group flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[14px] font-medium text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
              >
                <TrashIcon className="h-5 w-5 animate-trash-wobble" />
                <T uk="Видалити" en="Delete" ru="Удалить" de="Löschen" es="Eliminar" fr="Supprimer" pl="Usuń" ptBR="Excluir" zh="删除" />
              </button>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
