// components/post-context-menu.tsx
//
// 09.10.2026 (Александр: «при нажатии правой кнопкой на все посты —
// подходящие (совпадения Alpha) и самые обычные — показывай поп-ап как в
// приложении… по дизайну такой же, как меню «⋯» на странице поста, с
// анимациями при наведении, и всё функциональное»).
// Пункты — как в приложении (post_card.dart, долгое нажатие): Коментар,
// Повідомлення, Зберегти, Позначити, Копіювати, Поділитися, Поскаржитись.
//
// Один обработчик на весь сайт (смонтирован в app/layout.tsx): карточка
// поста помечает себя data-post-menu и данными поста, остальное здесь.
"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { authFetch } from "@/lib/auth-fetch";
import { useActiveLocale } from "@/lib/use-active-locale";
import { ReportModal } from "@/components/report-modal";
import { ShareTargetModal, type ShareTarget } from "@/components/share-target-modal";
import { isFoldedPost, toggleFoldedPost } from "@/components/foldable-article";

type T9 = { uk: string; en: string; ru: string; de: string; es: string; fr: string; pl: string; ptBR: string; zh: string };
const S = {
  comment: { uk: "Коментар", en: "Comment", ru: "Комментарий", de: "Kommentar", es: "Comentario", fr: "Commentaire", pl: "Komentarz", ptBR: "Comentário", zh: "评论" },
  message: { uk: "Повідомлення", en: "Message", ru: "Сообщение", de: "Nachricht", es: "Mensaje", fr: "Message", pl: "Wiadomość", ptBR: "Mensagem", zh: "私信" },
  save: { uk: "Зберегти", en: "Save", ru: "Сохранить", de: "Speichern", es: "Guardar", fr: "Enregistrer", pl: "Zapisz", ptBR: "Salvar", zh: "收藏" },
  saved: { uk: "Збережено", en: "Saved", ru: "Сохранено", de: "Gespeichert", es: "Guardado", fr: "Enregistré", pl: "Zapisano", ptBR: "Salvo", zh: "已收藏" },
  mark: { uk: "Позначити", en: "Mark", ru: "Пометить", de: "Markieren", es: "Marcar", fr: "Marquer", pl: "Oznacz", ptBR: "Marcar", zh: "标记" },
  unmark: { uk: "Зняти позначку", en: "Unmark", ru: "Снять пометку", de: "Markierung entfernen", es: "Quitar marca", fr: "Retirer le marquage", pl: "Usuń oznaczenie", ptBR: "Remover marca", zh: "取消标记" },
  unsaved: { uk: "Прибрано зі збережених", en: "Removed from saved", ru: "Убрано из сохранённых", de: "Aus Gespeichert entfernt", es: "Quitado de guardados", fr: "Retiré des enregistrés", pl: "Usunięto z zapisanych", ptBR: "Removido dos salvos", zh: "已取消收藏" },
  copy: { uk: "Копіювати", en: "Copy", ru: "Копировать", de: "Kopieren", es: "Copiar", fr: "Copier", pl: "Kopiuj", ptBR: "Copiar", zh: "复制" },
  copied: { uk: "Скопійовано", en: "Copied", ru: "Скопировано", de: "Kopiert", es: "Copiado", fr: "Copié", pl: "Skopiowano", ptBR: "Copiado", zh: "已复制" },
  share: { uk: "Поділитися", en: "Share", ru: "Поделиться", de: "Teilen", es: "Compartir", fr: "Partager", pl: "Udostępnij", ptBR: "Compartilhar", zh: "分享" },
  report: { uk: "Поскаржитись", en: "Report", ru: "Пожаловаться", de: "Melden", es: "Denunciar", fr: "Signaler", pl: "Zgłoś", ptBR: "Denunciar", zh: "举报" },
  failed: { uk: "Не вдалося. Спробуйте ще раз", en: "Something went wrong. Try again", ru: "Не удалось. Попробуйте ещё раз", de: "Fehlgeschlagen. Bitte erneut versuchen", es: "No se pudo. Inténtelo de nuevo", fr: "Échec. Réessayez", pl: "Nie udało się. Spróbuj ponownie", ptBR: "Falhou. Tente de novo", zh: "失败，请重试" },
} satisfies Record<string, T9>;

type PostData = {
  id: string;
  href: string;
  title: string;
  text: string;
  authorId: string | null;
  authorName: string | null;
  authorUsername: string | null;
  authorAvatar: string | null;
};

function readData(el: HTMLElement): PostData {
  const g = (k: string) => el.getAttribute(`data-post-${k}`);
  return {
    id: g("menu") ?? "",
    href: g("href") ?? "/",
    title: g("title") ?? "",
    text: g("text") ?? "",
    authorId: g("author-id"),
    authorName: g("author-name"),
    authorUsername: g("author-username"),
    authorAvatar: g("author-avatar"),
  };
}

const ITEM =
  "group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-neutral-700 transition hover:bg-accent/10 hover:text-accent disabled:opacity-60 dark:text-neutral-300";

export function PostContextMenuHost() {
  const lang = useActiveLocale();
  const t = (v: T9) => (v as Record<string, string>)[lang] ?? v.en;
  const router = useRouter();
  const [menu, setMenu] = useState<{ x: number; y: number; post: PostData; marked: boolean } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [share, setShare] = useState<ShareTarget | null>(null);
  const [report, setReport] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const panel = useRef<HTMLDivElement | null>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const onContext = (e: MouseEvent) => {
      if (e.shiftKey) return; // Shift + right click: the browser's own menu.
      const card = (e.target as HTMLElement | null)?.closest?.("[data-post-menu]") as HTMLElement | null;
      if (!card) return;
      // Text fields inside a card keep the browser menu (copy / paste).
      if ((e.target as HTMLElement).closest("input,textarea,[contenteditable=true]")) return;
      e.preventDefault();
      const post = readData(card);
      setMenu({ x: e.clientX, y: e.clientY, post, marked: isFoldedPost(post.id) });
    };
    document.addEventListener("contextmenu", onContext);
    return () => document.removeEventListener("contextmenu", onContext);
  }, []);
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    const onDown = (e: MouseEvent) => {
      if (panel.current && !panel.current.contains(e.target as Node)) close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", close, { passive: true });
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", close);
      window.removeEventListener("resize", close);
    };
  }, [menu]);

  function flash(text: string) {
    setToast(text);
    window.setTimeout(() => setToast(null), 1600);
  }
  const signedIn = () => typeof document !== "undefined" && document.cookie.includes("a1_user=");
  const toSignIn = () => router.push(`/sign-in?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
  const absUrl = (href: string) => `${window.location.origin}${href}`;

  async function message(p: PostData) {
    if (!p.authorId) {
      router.push(p.href);
      return;
    }
    if (!signedIn()) return toSignIn();
    try {
      const res = await authFetch("/api/chats/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: p.authorId }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; chatId?: string } | null;
      if (!data?.ok || !data.chatId) throw new Error("open");
      const qs = new URLSearchParams();
      if (p.authorName) qs.set("title", p.authorName);
      if (p.authorAvatar) qs.set("avatar", p.authorAvatar);
      if (p.authorUsername) qs.set("username", p.authorUsername);
      router.push(`/chats/${encodeURIComponent(data.chatId)}${qs.size ? `?${qs}` : ""}`);
    } catch {
      flash(t(S.failed));
    }
  }

  // 10.10.2026 (Александр: «Зберегти пишет, что сохранило, но по факту нет»):
  // «Збережено» говорим только когда пост реально появился в сохранённых
  // (тот же список, что в «Моя активність» и в приложении -- общий на
  // сервере). Повторное нажатие на уже сохранённый -- убирает.
  async function savedIds(): Promise<string[] | null> {
    try {
      const res = await authFetch("/api/favorites/list", { cache: "no-store" });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; postIds?: string[] } | null;
      return data?.ok && Array.isArray(data.postIds) ? data.postIds : null;
    } catch {
      return null;
    }
  }

  async function save(p: PostData) {
    if (!signedIn()) return toSignIn();
    try {
      const before = await savedIds();
      const wasOn = !!before?.includes(p.id);
      const res = await authFetch(wasOn ? "/api/favorites/remove" : "/api/favorites/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: p.id }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean } | null;
      if (!data?.ok) return flash(t(S.failed));
      const after = await savedIds();
      const isOn = !!after?.includes(p.id);
      if (after && isOn === wasOn) return flash(t(S.failed));
      flash(isOn ? t(S.saved) : t(S.unsaved));
      window.dispatchEvent(new Event("a1:favorites"));
    } catch {
      flash(t(S.failed));
    }
  }

  async function copy(p: PostData) {
    const text = [p.title, p.text, absUrl(p.href)].filter(Boolean).join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      flash(t(S.copied));
    } catch {
      flash(t(S.failed));
    }
  }

  function act(fn: () => void) {
    setMenu(null);
    fn();
  }

  const W = 240;
  const H = 7 * 40 + 14;
  const pos = menu
    ? {
        left: Math.max(8, Math.min(menu.x, window.innerWidth - W - 8)),
        top: Math.max(8, menu.y + H > window.innerHeight - 8 ? menu.y - H : menu.y),
        origin: `${menu.x + W > window.innerWidth - 8 ? "right" : "left"} ${menu.y + H > window.innerHeight - 8 ? "bottom" : "top"}`,
      }
    : null;

  if (!mounted) return null;
  return (
    <>
      {menu &&
        pos &&
        createPortal(
          <div
            ref={panel}
            role="menu"
            aria-label={menu.post.title}
            className="animate-popover fixed z-[120] w-60 overflow-hidden rounded-2xl border border-neutral-200 bg-white/95 p-1.5 shadow-[0_18px_50px_rgba(20,20,60,0.22)] backdrop-blur-xl dark:border-neutral-700 dark:bg-neutral-900/95"
            style={{ left: pos.left, top: pos.top, transformOrigin: pos.origin }}
            onContextMenu={(e) => e.preventDefault()}
          >
            <button type="button" role="menuitem" className={ITEM} onClick={() => act(() => router.push(`${menu.post.href}#comments`))}>
              <CommentIcon />
              {t(S.comment)}
            </button>
            <button type="button" role="menuitem" className={ITEM} onClick={() => act(() => void message(menu.post))}>
              <MessageIcon />
              {t(S.message)}
            </button>
            <button type="button" role="menuitem" className={ITEM} onClick={() => act(() => void save(menu.post))}>
              <BookmarkIcon />
              {t(S.save)}
            </button>
            <button
              type="button"
              role="menuitem"
              className={ITEM}
              onClick={() => act(() => toggleFoldedPost(menu.post.id))}
            >
              <FlagIcon />
              {menu.marked ? t(S.unmark) : t(S.mark)}
            </button>
            <button type="button" role="menuitem" className={ITEM} onClick={() => act(() => void copy(menu.post))}>
              <CopyIcon />
              {t(S.copy)}
            </button>
            <button
              type="button"
              role="menuitem"
              className={ITEM}
              onClick={() => act(() => setShare({ kind: "post", title: menu.post.title, url: `https://a1appp.com/postDetails/${menu.post.id}`, postId: menu.post.id }))}
            >
              <ShareIcon />
              {t(S.share)}
            </button>
            <button
              type="button"
              role="menuitem"
              className="group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50 dark:hover:bg-red-950/30"
              onClick={() => act(() => (signedIn() ? setReport(menu.post.id) : toSignIn()))}
            >
              <WarnIcon />
              {t(S.report)}
            </button>
          </div>,
          document.body,
        )}
      {share && createPortal(<ShareTargetModal lang={lang} target={share} onClose={() => setShare(null)} />, document.body)}
      {report && <ReportModal kind="post" targetId={report} onClose={() => setReport(null)} />}
      {toast &&
        createPortal(
          <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[130] flex justify-center px-4">
            <div className="animate-popover rounded-full bg-neutral-900/90 px-4 py-2 text-[13px] font-medium text-white shadow-lg dark:bg-white/90 dark:text-neutral-900">{toast}</div>
          </div>,
          document.body,
        )}
    </>
  );
}

const IC = "h-4 w-4 shrink-0";
function CommentIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${IC} animate-chat-wiggle`} aria-hidden="true">
      <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.8-.9L3 20l1.1-4.2A8.4 8.4 0 1 1 21 11.5z" />
      <path d="M8 10h8M8 13.5h5" />
    </svg>
  );
}
function MessageIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${IC} animate-reply-bounce`} aria-hidden="true">
      <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 20l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z" />
    </svg>
  );
}
function BookmarkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${IC} animate-bookmark-swing`} aria-hidden="true">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}
function FlagIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${IC} animate-bell-ring`} aria-hidden="true">
      <path d="M5 21V4M5 4h11l-2 4 2 4H5" />
    </svg>
  );
}
function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${IC} animate-draft-flip`} aria-hidden="true">
      <rect x="9" y="9" width="11" height="12" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h8" />
    </svg>
  );
}
function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${IC} animate-share-lift`} aria-hidden="true">
      <path d="M12 3v12M7.5 7.5 12 3l4.5 4.5" />
      <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
    </svg>
  );
}
function WarnIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${IC} animate-block-shake`} aria-hidden="true">
      <path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  );
}
