// components/post-viewer-menu.tsx
//
// 2026-09-01 (Aleksandr, from the mobile app's post-detail action
// sheet: "сделаем так же, как в приложении... снизу сразу под
// аватаром і ім'ям дві кнопки. Одна поки просто буде заглушкою... А
// справа три точки"): the viewer-facing counterpart to
// components/post-owner-menu.tsx — that one renders only on YOUR OWN
// post (Edit/Delete); this one renders only when a signed-in visitor
// is looking at SOMEONE ELSE's post. Two pieces, matching the mobile
// screenshot layout exactly:
//
//   [ Повідомлення ]  [ ••• ]
//
// Left is a pure stub for now (no chats yet — see the button below).
// The "•••" opens a dropdown with, in this exact order (Поскаржитись
// deliberately excluded — "це попозже"):
//   - Додати контакт        — functional (contacts.addContact, already
//                              live in components/add-contact-button.tsx;
//                              this file reimplements the same toggle
//                              inline as a text ROW instead of that
//                              file's icon-only badge, since the two
//                              don't share a layout to factor into one
//                              component without more ceremony than a
//                              ~40-line status machine is worth)
//   - Поділитися контактом   — stub (real chat-drop later)
//   - Зберегти пост          — functional (favorites.addFavorites /
//                              deleteFavorites — see app/api/favorites/
//                              */route.ts; same shared favorites system
//                              a future "Saved users" feature reuses)
//   - Поділитися дописом     — partially functional: does the ONE thing
//                              that's real today (native share sheet if
//                              the browser has one, else copy the link)
//                              since there's no in-app chat drop to
//                              branch to yet either — no submenu until
//                              there's a second real option to pick.
//
// Explicitly no visual distinction between the functional rows and the
// two stubs (Aleksandr: "нет") — every row looks equally live; only the
// click behavior differs.
//
// Visibility gate mirrors components/add-contact-button.tsx's own
// (not this component's sibling post-owner-menu.tsx, which uses a
// separate /api/posts/mine roundtrip): a lightweight /api/account/
// whoami check, shown only when the visitor is signed in AND their own
// username differs from the post author's. Every authenticated fetch in
// this file goes through lib/auth-fetch.ts's authFetch(), not the bare
// fetch() — this same detail page also mounts components/avatar-menu.tsx
// (its own whoami call) and components/post-owner-menu.tsx (its own
// posts/mine call) at the same time, and authFetch is exactly what
// keeps a pile of concurrent authenticated requests here from racing
// each other's session-refresh the way app/contacts/page.tsx once did
// (see lib/auth-fetch.ts's own header comment for the full story).
"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { LOCALES, LOCALE_CLASS, type Locale } from "@/components/t";
import { authFetch } from "@/lib/auth-fetch";
import type { Contact } from "@/lib/a1/schemas";

type StringKey =
  | "message"
  | "menuLabel"
  | "addContact"
  | "removeContact"
  | "shareContact"
  | "savePost"
  | "unsavePost"
  | "sharePost"
  | "linkCopied"
  | "actionFailed";

const STRINGS: Record<StringKey, Record<Locale, string>> = {
  message: { uk: "Повідомлення", en: "Message", ru: "Сообщение", de: "Nachricht", es: "Mensaje", fr: "Message", pl: "Wiadomość", ptBR: "Mensagem", zh: "消息" },
  menuLabel: { uk: "Дії", en: "Actions", ru: "Действия", de: "Aktionen", es: "Acciones", fr: "Actions", pl: "Działania", ptBR: "Ações", zh: "操作" },
  addContact: { uk: "Додати контакт", en: "Add contact", ru: "Добавить контакт", de: "Kontakt hinzufügen", es: "Añadir contacto", fr: "Ajouter un contact", pl: "Dodaj kontakt", ptBR: "Adicionar contato", zh: "添加联系人" },
  removeContact: { uk: "Прибрати з контактів", en: "Remove from contacts", ru: "Убрать из контактов", de: "Aus Kontakten entfernen", es: "Quitar de contactos", fr: "Retirer des contacts", pl: "Usuń z kontaktów", ptBR: "Remover dos contatos", zh: "从联系人中移除" },
  shareContact: { uk: "Поділитися контактом", en: "Share contact", ru: "Поделиться контактом", de: "Kontakt teilen", es: "Compartir contacto", fr: "Partager le contact", pl: "Udostępnij kontakt", ptBR: "Compartilhar contato", zh: "分享联系人" },
  savePost: { uk: "Зберегти пост", en: "Save post", ru: "Сохранить пост", de: "Beitrag speichern", es: "Guardar publicación", fr: "Enregistrer la publication", pl: "Zapisz post", ptBR: "Salvar publicação", zh: "保存帖子" },
  unsavePost: { uk: "Прибрати зі збережених", en: "Remove from saved", ru: "Убрать из сохранённых", de: "Aus Gespeichertem entfernen", es: "Quitar de guardados", fr: "Retirer des enregistrés", pl: "Usuń z zapisanych", ptBR: "Remover dos salvos", zh: "从已保存中移除" },
  sharePost: { uk: "Поділитися дописом", en: "Share post", ru: "Поделиться постом", de: "Beitrag teilen", es: "Compartir publicación", fr: "Partager la publication", pl: "Udostępnij post", ptBR: "Compartilhar publicação", zh: "分享帖子" },
  linkCopied: { uk: "Посилання скопійовано", en: "Link copied", ru: "Ссылка скопирована", de: "Link kopiert", es: "Enlace copiado", fr: "Lien copié", pl: "Link skopiowany", ptBR: "Link copiado", zh: "链接已复制" },
  actionFailed: { uk: "Не вдалося. Спробуйте ще раз", en: "Failed — try again", ru: "Не удалось. Попробуйте ещё раз", de: "Fehlgeschlagen — erneut versuchen", es: "Error — inténtalo de nuevo", fr: "Échec — réessayez", pl: "Nie udało się — spróbuj ponownie", ptBR: "Falhou — tente novamente", zh: "失败，请重试" },
};

function useActiveLocale(): Locale {
  const [lang, setLang] = useState<Locale>("uk");
  useEffect(() => {
    const root = document.documentElement;
    const active = LOCALES.find((l) => root.classList.contains(LOCALE_CLASS[l]));
    if (active) setLang(active);
  }, []);
  return lang;
}

type ToggleStatus = "loading" | "idle" | "on" | "busy" | "error";

function MessageIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function DotsIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden="true">
      <circle cx="4" cy="10" r="1.7" />
      <circle cx="10" cy="10" r="1.7" />
      <circle cx="16" cy="10" r="1.7" />
    </svg>
  );
}

// 2026-09-01 (Aleksandr, dropdown screenshot: "Добавь соответствующие
// иконки левой стороны в эту модалку") — one small leading icon per
// row, same stroke-based style as MessageIcon above. Contact and save
// each swap between two variants to reflect on/off state, matching
// their label swap (add/remove, save/unsave) just above.
function UserPlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 8v6M22 11h-6" />
    </svg>
  );
}

function UserMinusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 11h-6" />
    </svg>
  );
}

function ContactCardIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <circle cx="8" cy="12" r="2" />
      <path d="M14 10h4M14 14h4M5.5 16.3c.6-1 1.7-1.7 2.8-1.7" />
    </svg>
  );
}

function BookmarkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function BookmarkFilledIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function SharePostIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.6 10.6l6.8-3.2M8.6 13.4l6.8 3.2" />
    </svg>
  );
}

export function PostViewerMenu({
  postId,
  authorUserId,
  authorUsername,
  shareUrl,
  shareTitle,
}: {
  postId: string;
  authorUserId: string | null;
  authorUsername: string | null;
  shareUrl: string;
  shareTitle: string;
}) {
  const lang = useActiveLocale();
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);

  // Contact toggle — same shape as components/add-contact-button.tsx's
  // status machine, reimplemented here as a text row (see this file's
  // header comment for why it's not shared as one component).
  const [contactStatus, setContactStatus] = useState<ToggleStatus>("loading");
  const [contactId, setContactId] = useState<string | null>(null);

  // Save-post toggle — same shape, backed by the favorites API instead
  // of contacts.
  const [saveStatus, setSaveStatus] = useState<ToggleStatus>("loading");

  const [shareFeedback, setShareFeedback] = useState(false);

  useEffect(() => {
    let cancelled = false;
    authFetch("/api/account/whoami")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data?.ok) return;
        if (data.username && data.username !== authorUsername) setVisible(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [authorUsername]);

  useEffect(() => {
    if (!authorUserId) {
      setContactStatus("idle");
      return;
    }
    let cancelled = false;
    authFetch("/api/contacts/list")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (!data?.ok) {
          setContactStatus("idle");
          return;
        }
        const existing = (data.contacts as Contact[] | undefined)?.find((c) => c.user === authorUserId);
        if (existing) {
          setContactId(existing._id);
          setContactStatus("on");
        } else {
          setContactStatus("idle");
        }
      })
      .catch(() => {
        if (!cancelled) setContactStatus("idle");
      });
    return () => {
      cancelled = true;
    };
  }, [authorUserId]);

  useEffect(() => {
    let cancelled = false;
    authFetch("/api/favorites/list")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (!data?.ok) {
          setSaveStatus("idle");
          return;
        }
        setSaveStatus((data.postIds as string[] | undefined)?.includes(postId) ? "on" : "idle");
      })
      .catch(() => {
        if (!cancelled) setSaveStatus("idle");
      });
    return () => {
      cancelled = true;
    };
  }, [postId]);

  if (!visible) return null;

  async function toggleContact() {
    if (contactStatus === "busy" || !authorUserId) return;
    if (contactStatus === "on") {
      if (!contactId) return;
      setContactStatus("busy");
      try {
        const res = await authFetch("/api/contacts/remove", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contactId }),
        });
        const data = await res.json().catch(() => null);
        if (data?.ok) {
          setContactId(null);
          setContactStatus("idle");
        } else {
          setContactStatus("error");
        }
      } catch {
        setContactStatus("error");
      }
      return;
    }
    setContactStatus("busy");
    try {
      const res = await authFetch("/api/contacts/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: authorUserId }),
      });
      const data = await res.json().catch(() => null);
      if (data?.ok) {
        setContactId(data.contact?._id ?? null);
        setContactStatus("on");
      } else {
        setContactStatus("error");
      }
    } catch {
      setContactStatus("error");
    }
  }

  async function toggleSave() {
    if (saveStatus === "busy") return;
    const wasOn = saveStatus === "on";
    setSaveStatus("busy");
    try {
      const res = await authFetch(wasOn ? "/api/favorites/remove" : "/api/favorites/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: postId }),
      });
      const data = await res.json().catch(() => null);
      setSaveStatus(data?.ok ? (wasOn ? "idle" : "on") : "error");
    } catch {
      setSaveStatus("error");
    }
  }

  async function sharePost() {
    // Only the "real" half exists yet (external share) — dropping a
    // customized card into a chat is the other branch, once chats
    // exist. Native share sheet first (mobile Safari/Chrome, some
    // desktop browsers), clipboard copy as the universal fallback.
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title: shareTitle, url: shareUrl });
        setOpen(false);
        return;
      } catch {
        // User cancelled the share sheet, or the browser rejected it —
        // fall through to clipboard copy rather than leaving the menu
        // stuck open with no feedback.
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareFeedback(true);
      setTimeout(() => setShareFeedback(false), 2000);
    } catch {
      // Nothing more to fall back to — silently close, same as any
      // other best-effort action in this menu.
    }
    setOpen(false);
  }

  const contactLabel =
    contactStatus === "error" ? STRINGS.actionFailed[lang] : contactStatus === "on" ? STRINGS.removeContact[lang] : STRINGS.addContact[lang];
  const saveLabel =
    saveStatus === "error" ? STRINGS.actionFailed[lang] : saveStatus === "on" ? STRINGS.unsavePost[lang] : STRINGS.savePost[lang];
  const contactIcon = contactStatus === "on" ? <UserMinusIcon /> : <UserPlusIcon />;
  const saveIcon = saveStatus === "on" ? <BookmarkFilledIcon /> : <BookmarkIcon />;

  return (
    <div className="mt-4 flex items-center gap-2">
      <button
        type="button"
        // Pure stub — no chats yet, see this file's header comment.
        onClick={() => {}}
        className="flex flex-1 items-center justify-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-accent transition hover:bg-accent/5 dark:border-neutral-700 dark:bg-neutral-900"
      >
        <MessageIcon />
        {STRINGS.message[lang]}
      </button>

      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={STRINGS.menuLabel[lang]}
          aria-expanded={open}
          className="flex h-[42px] w-[42px] items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500 transition hover:text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-50"
        >
          <DotsIcon />
        </button>

        {open && (
          <>
            {createPortal(
              <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden="true" />,
              document.body,
            )}
            <div className="animate-popover absolute right-0 top-full z-50 mt-2 w-64 max-w-[calc(100vw-2rem)] origin-top-right overflow-hidden rounded-2xl border border-neutral-200 bg-white p-1.5 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
              {authorUserId && (
                <button
                  type="button"
                  onClick={toggleContact}
                  disabled={contactStatus === "busy" || contactStatus === "loading"}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-neutral-700 transition hover:bg-accent/10 hover:text-accent disabled:opacity-60 dark:text-neutral-300"
                >
                  {contactIcon}
                  {contactLabel}
                </button>
              )}
              <button
                type="button"
                // Stub — real chat-drop later, same as the Message button
                // above. Still closes the menu, like every other row.
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-neutral-700 transition hover:bg-accent/10 hover:text-accent dark:text-neutral-300"
              >
                <ContactCardIcon />
                {STRINGS.shareContact[lang]}
              </button>
              <button
                type="button"
                onClick={toggleSave}
                disabled={saveStatus === "busy" || saveStatus === "loading"}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-neutral-700 transition hover:bg-accent/10 hover:text-accent disabled:opacity-60 dark:text-neutral-300"
              >
                {saveIcon}
                {saveLabel}
              </button>
              <button
                type="button"
                onClick={sharePost}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-neutral-700 transition hover:bg-accent/10 hover:text-accent dark:text-neutral-300"
              >
                <SharePostIcon />
                {shareFeedback ? STRINGS.linkCopied[lang] : STRINGS.sharePost[lang]}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
