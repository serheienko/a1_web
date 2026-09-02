// components/profile-action-row.tsx
//
// 2026-09-01 (Aleksandr, 3 screenshots from the native app: someone
// else's profile with a row of 4 buttons -- add contact / share /
// message / "•••" -- and that "•••" opening Save/Mute/Block): "тебе
// ещё скину визуал... я хочу, чтобы ты поставил вот этот блок кнопок
// у нас [в веб-профиле]... у нас сейчас есть возле, например, Sabrina
// Sofia Bennett, там где зелёная иконка добавить пользователя, мы её
// убираем и вместо неё ставим вот этот ряд из четырёх кнопок." Master
// plan agreed live before building this: Mute/Block are UI-only stubs
// for now (no backend endpoint exists anywhere in this app or PLAN.md
// for either -- confirmed by search, not assumed), and unlike the
// native app's own "•••" (icons on the right), this follows the web's
// own newer convention -- icons on the LEFT of each row, same as
// post-viewer-menu.tsx already does.
//
// 2026-09-02 (2 screenshots, Sofia Bennett's profile, Aleksandr:
// "Сделай, чтобы иконка чатів в профілях тепер відкривала чат з ними"):
// Message is no longer a stub -- openChat() below mirrors app/contacts/
// page.tsx's own openChat() exactly (same POST /api/chats/open, same
// flash-red-on-failure convention), scoped to this component's own
// profileUserId prop.
//
// Replaces components/add-contact-button.tsx's standalone corner badge
// entirely (app/u/[username]/page.tsx no longer mounts that component)
// -- this row's own first button reimplements the exact same
// contacts.addContact/removeContact toggle inline instead. Sits as its
// own full-width row between the occupation/location line and
// <ProfileTabs>, matching the native screenshot's own stacking order
// (avatar/name -> role/location -> this row -> Про мене/Дописи tabs).
// If that turns out to look cramped once live, the agreed fallback is
// to push ProfileTabs and the "+" create-post FAB further down -- not
// attempted preemptively here, only if the plain insertion reads badly.
//
// Four equal cells (`grid grid-cols-4`, same convention app/my-activity/
// page.tsx's own 3-tab pill switcher just established) rather than the
// mobile screenshot's exact native chrome -- icon-only, no visible
// labels (aria-label/title carry the accessible name), first cell
// filled `bg-accent` as the primary CTA, the other three the same
// neutral bordered-white style post-viewer-menu.tsx's own "•••" trigger
// already uses.
//
// Save reuses the exact shared favorites system app/api/favorites/
// {add,remove,users}/route.ts already expose for "Збережені
// користувачі" (favorites.addFavorites/deleteFavorites already routes
// a USER_ID-prefixed id to UserService -- see add/route.ts's own
// comment) -- saving someone from their profile here is the same
// action, and now shows up in /my-activity's "Збережені користувачі"
// tab too, closing the loop that route's own header comment left open
// ("сохранённых пользователей еще сделаем, в профиле будут кнопки").
//
// The "added to contacts" visual state (white/bordered pill, checkmark
// that swaps to a remove icon on hover -- the same interaction
// components/add-contact-button.tsx's own comment already worked out
// live) is now final: Aleksandr sent the promised reference screenshot
// (2026-09-01, the app's own profile for "Anna Bond") showing the
// "added" badge as a circled checkmark, not a bare checkmark glyph --
// see CheckIcon()'s own comment below. Pill shape/colors already
// matched; only the glyph needed to change.
"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { LOCALES, LOCALE_CLASS, type Locale } from "@/components/t";
import { authFetch } from "@/lib/auth-fetch";
import type { Contact } from "@/lib/a1/schemas";
import { LottiePlayer } from "@/components/lottie-player";

type StringKey =
  | "addContact"
  | "removeContact"
  | "shareProfile"
  | "linkCopied"
  | "message"
  | "menuLabel"
  | "saveProfile"
  | "unsaveProfile"
  | "mute"
  | "block"
  | "actionFailed"
  | "authPromptTitle"
  | "authPromptBody"
  | "signInCta"
  | "cancel";

const STRINGS: Record<StringKey, Record<Locale, string>> = {
  addContact: {
    uk: "Додати в контакти", en: "Add to contacts", ru: "Добавить в контакты",
    de: "Zu Kontakten hinzufügen", es: "Añadir a contactos", fr: "Ajouter aux contacts",
    pl: "Dodaj do kontaktów", ptBR: "Adicionar aos contatos", zh: "添加到联系人",
  },
  removeContact: {
    uk: "Прибрати з контактів", en: "Remove from contacts", ru: "Убрать из контактов",
    de: "Aus Kontakten entfernen", es: "Quitar de contactos", fr: "Retirer des contacts",
    pl: "Usuń z kontaktów", ptBR: "Remover dos contatos", zh: "从联系人中移除",
  },
  shareProfile: {
    uk: "Поділитися профілем", en: "Share profile", ru: "Поделиться профилем",
    de: "Profil teilen", es: "Compartir perfil", fr: "Partager le profil",
    pl: "Udostępnij profil", ptBR: "Compartilhar perfil", zh: "分享资料",
  },
  linkCopied: {
    uk: "Посилання скопійовано", en: "Link copied", ru: "Ссылка скопирована",
    de: "Link kopiert", es: "Enlace copiado", fr: "Lien copié",
    pl: "Link skopiowany", ptBR: "Link copiado", zh: "链接已复制",
  },
  message: { uk: "Повідомлення", en: "Message", ru: "Сообщение", de: "Nachricht", es: "Mensaje", fr: "Message", pl: "Wiadomość", ptBR: "Mensagem", zh: "消息" },
  menuLabel: { uk: "Дії", en: "Actions", ru: "Действия", de: "Aktionen", es: "Acciones", fr: "Actions", pl: "Działania", ptBR: "Ações", zh: "操作" },
  saveProfile: {
    uk: "Зберегти профіль", en: "Save profile", ru: "Сохранить профиль",
    de: "Profil speichern", es: "Guardar perfil", fr: "Enregistrer le profil",
    pl: "Zapisz profil", ptBR: "Salvar perfil", zh: "保存资料",
  },
  unsaveProfile: {
    uk: "Прибрати зі збережених", en: "Remove from saved", ru: "Убрать из сохранённых",
    de: "Aus Gespeichertem entfernen", es: "Quitar de guardados", fr: "Retirer des enregistrés",
    pl: "Usuń z zapisanych", ptBR: "Remover dos salvos", zh: "从已保存中移除",
  },
  // 2026-09-01: UI-only stubs -- there is no mute/block endpoint anywhere
  // in this app, aone-api-private, or PLAN.md (checked, not assumed).
  // Rows are real and clickable so the menu doesn't look broken, but
  // click handlers just close the menu -- see this file's own header
  // comment.
  mute: { uk: "Вимкнути звук", en: "Mute", ru: "Заглушить", de: "Stummschalten", es: "Silenciar", fr: "Mettre en sourdine", pl: "Wycisz", ptBR: "Silenciar", zh: "静音" },
  block: { uk: "Заблокувати", en: "Block", ru: "Заблокировать", de: "Blockieren", es: "Bloquear", fr: "Bloquer", pl: "Zablokuj", ptBR: "Bloquear", zh: "屏蔽" },
  actionFailed: { uk: "Не вдалося. Спробуйте ще раз", en: "Failed — try again", ru: "Не удалось. Попробуйте ещё раз", de: "Fehlgeschlagen — erneut versuchen", es: "Error — inténtalo de nuevo", fr: "Échec — réessayez", pl: "Nie udało się — spróbuj ponownie", ptBR: "Falhou — tente novamente", zh: "失败，请重试" },
  // 2026-09-02 (Aleksandr: "не уводить на страницу, а показывать попап
  // поверх действия" -- NOT a redirect to /sign-in, a popup right over
  // the current page): shown instead of performing the real action when
  // a signed-out visitor taps Add contact / Message / Save -- see
  // authPromptOpen below.
  authPromptTitle: {
    uk: "Увійдіть, щоб продовжити", en: "Sign in to continue", ru: "Войдите, чтобы продолжить",
    de: "Melden Sie sich an, um fortzufahren", es: "Inicia sesión para continuar", fr: "Connectez-vous pour continuer",
    pl: "Zaloguj się, aby kontynuować", ptBR: "Entre para continuar", zh: "登录以继续",
  },
  authPromptBody: {
    uk: "Зареєструйтесь або увійдіть, щоб написати повідомлення, додати в контакти чи зберегти профіль.",
    en: "Sign up or sign in to message, add to contacts, or save this profile.",
    ru: "Зарегистрируйтесь или войдите, чтобы написать сообщение, добавить в контакты или сохранить профиль.",
    de: "Registrieren oder anmelden, um zu schreiben, zu Kontakten hinzuzufügen oder zu speichern.",
    es: "Regístrate o inicia sesión para enviar mensajes, añadir a contactos o guardar este perfil.",
    fr: "Inscrivez-vous ou connectez-vous pour envoyer un message, ajouter aux contacts ou enregistrer ce profil.",
    pl: "Zarejestruj się lub zaloguj, aby napisać wiadomość, dodać do kontaktów lub zapisać profil.",
    ptBR: "Cadastre-se ou entre para enviar mensagem, adicionar aos contatos ou salvar o perfil.",
    zh: "注册或登录即可发消息、添加联系人或保存此资料。",
  },
  signInCta: {
    uk: "Увійти або зареєструватися", en: "Sign in or sign up", ru: "Войти или зарегистрироваться",
    de: "Anmelden oder registrieren", es: "Iniciar sesión o registrarse", fr: "Se connecter ou s'inscrire",
    pl: "Zaloguj się lub zarejestruj", ptBR: "Entrar ou cadastrar-se", zh: "登录或注册",
  },
  cancel: {
    uk: "Скасувати", en: "Cancel", ru: "Отмена", de: "Abbrechen", es: "Cancelar",
    fr: "Annuler", pl: "Anuluj", ptBR: "Cancelar", zh: "取消",
  },
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

// Same PersonAdd/Check/PersonRemove trio components/add-contact-
// button.tsx already uses (idle -> filled "+", added -> checkmark,
// hover-while-added -> a remove icon hinting at the toggle) -- kept
// visually identical to that proven interaction rather than inventing
// a new one, just recolored to fit this row (see the button markup
// below).
function PersonAddIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21c0-4 3.1-6 7-6s7 2 7 6" />
      <path d="M19 8v6M16 11h6" />
    </svg>
  );
}

function CheckIcon() {
  // Aleksandr, 2026-09-01: sent a reference screenshot of the app's own
  // "added" button — its badge is a circled checkmark (like iOS's
  // checkmark.circle), not a bare checkmark glyph. Swapping the icon to
  // match; this is the definitive visual for the "contactAdded" cell
  // below (was a placeholder pending exactly this reference).
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.3l2.6 2.6L16 9" />
    </svg>
  );
}

function PersonRemoveIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21c0-4 3.1-6 7-6s7 2 7 6" />
      <path d="M16 11h6" />
    </svg>
  );
}

function ShareIcon() {
  // Aleksandr, 2026-09-01, screenshot of this row's own Share button in
  // the app: it's the iOS "square and arrow up" glyph, not the 3-node
  // share-nodes icon this used to borrow from post-viewer-menu.tsx's
  // SharePostIcon. Swapped to match.
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
      <path d="M12 15V3" />
      <path d="M7.5 7.5 12 3l4.5 4.5" />
      <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
    </svg>
  );
}

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

function MuteIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
      <path d="M11 5 6 9H3v6h3l5 4V5z" />
      <path d="M16 9l5 6M21 9l-5 6" />
    </svg>
  );
}

function BlockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M5.5 5.5l13 13" />
    </svg>
  );
}

const CELL_BUTTON_CLASS =
  "flex h-11 w-full items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-600 transition hover:text-neutral-900 disabled:cursor-default disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-50";

export function ProfileActionRow({
  username,
  profileUserId,
  shareUrl,
  shareTitle,
  avatarUrl,
}: {
  username: string;
  profileUserId: string | null;
  shareUrl: string;
  shareTitle: string;
  // 2026-09-02: passed through to /chats/[chatId]'s own ?title=&avatar=
  // query params on openChat() below, so the chat header has a name/
  // avatar to show right away instead of "--" (Aleksandr: "возле
  // аватарки нет имени почему-то").
  avatarUrl?: string | null;
}) {
  const lang = useActiveLocale();
  const [viewerStatus, setViewerStatus] = useState<"loading" | "self" | "other" | "anon" | "error">("loading");
  const [menuOpen, setMenuOpen] = useState(false);
  // 2026-09-02: shown over the page (not a /sign-in redirect) when a
  // signed-out visitor taps a real action -- see the JSX at the bottom
  // of this component and the isAnon guards in toggleContact/toggleSave/
  // openChat below.
  const [authPromptOpen, setAuthPromptOpen] = useState(false);

  // 2026-09-02 (Aleksandr, live screenshots of a real profile: "зроби,
  // щоб іконка чатів у профілях тепер відкривала чат з ними") -- same
  // POST /api/chats/open + flash-red-on-failure pattern app/contacts/
  // page.tsx's own openChat() already uses for its per-row chat icon
  // (built 2026-09-01); this is the profile-page equivalent of that
  // same button, just fixed to this one profileUserId instead of taking
  // one per row.
  const router = useRouter();
  const [openingChat, setOpeningChat] = useState(false);
  const [chatErrored, setChatErrored] = useState(false);

  const [contactStatus, setContactStatus] = useState<ToggleStatus>("loading");
  const [contactId, setContactId] = useState<string | null>(null);
  const [contactHovering, setContactHovering] = useState(false);
  // Aleksandr, 2026-09-01, real phone screenshot: after a failed toggle
  // the button got stuck red with no way to remove the contact. Root
  // cause -- "error" used to be a whole extra ToggleStatus value, and
  // toggleContact() only ever took the "remove" branch when contactStatus
  // === "on"; once a failed action pushed status to "error" every future
  // click fell through to the "add" branch even if the contact was (or
  // still was, after a failed *remove*) actually already added, so a
  // failed remove could never be retried. Now "error" is a transient
  // flash on top of the real on/idle status (see flashContactError()
  // below) instead of a status of its own -- the real status never
  // changes on failure, so the next click always retries the same
  // action that just failed.
  const [contactErrored, setContactErrored] = useState(false);

  const [saveStatus, setSaveStatus] = useState<ToggleStatus>("loading");
  // Same fix as contactErrored above -- toggleSave() had the identical
  // bug (wasOn computed from saveStatus === "on", which "error" broke).
  const [saveErrored, setSaveErrored] = useState(false);

  const [shareFeedback, setShareFeedback] = useState(false);

  // 2026-09-02 (Aleksandr: show this row to signed-out visitors too --
  // "можно показывать и когда не залогинен, просто при нажатии на
  // каждую кнопку показывать попап залогиньтесь или зайдите" -- a
  // signed-out click on a real action now routes to /sign-in instead of
  // performing it, same ?reason= pattern components/create-post-fab.tsx
  // already established, rather than hiding the whole row like before.
  // Own profile still hides this row entirely (components/edit-profile-
  // button.tsx covers that case).
  useEffect(() => {
    let cancelled = false;
    authFetch("/api/account/whoami")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (!data?.ok) {
          setViewerStatus("anon");
          return;
        }
        setViewerStatus(data.username && data.username === username ? "self" : "other");
      })
      .catch(() => {
        if (!cancelled) setViewerStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [username]);

  useEffect(() => {
    if (!profileUserId || viewerStatus !== "other") {
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
        const existing = (data.contacts as Contact[] | undefined)?.find((c) => c.user === profileUserId);
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
  }, [profileUserId, viewerStatus]);

  // Initial "already saved" state -- app/api/favorites/users/route.ts's
  // own `id` field is the raw backend _id, same shape profileUserId
  // already is (see that route's comment), so a direct id compare is
  // enough; no separate "is this user favorited" endpoint needed.
  useEffect(() => {
    if (!profileUserId || viewerStatus !== "other") {
      setSaveStatus("idle");
      return;
    }
    let cancelled = false;
    authFetch("/api/favorites/users")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (!data?.ok) {
          setSaveStatus("idle");
          return;
        }
        const saved = (data.users as Array<{ id: string }> | undefined)?.some((u) => u.id === profileUserId);
        setSaveStatus(saved ? "on" : "idle");
      })
      .catch(() => {
        if (!cancelled) setSaveStatus("idle");
      });
    return () => {
      cancelled = true;
    };
  }, [profileUserId, viewerStatus]);

  // 2026-09-02: root cause of the old "silently never renders" bug
  // turned out to be exactly what this row's gating already implied --
  // `visible` stayed false forever for anyone not signed in as a
  // DIFFERENT user, INCLUDING every signed-out visitor, so the row's
  // early "return null" below just never went away for them (confirmed
  // against Vercel's own server logs: this render ran fine on every
  // request server-side, the debug log just never had anything to show
  // since visible was always false there too -- there was no bug in
  // React or hydration, just a permanently-false gate). Aleksandr's
  // call once that was clear: show the row to signed-out visitors too
  // instead of hiding it -- see the effect above and isAnon below.
  if (viewerStatus === "loading" || viewerStatus === "self" || viewerStatus === "error" || !profileUserId) {
    return null;
  }
  const isAnon = viewerStatus === "anon";

  function flashContactError() {
    setContactErrored(true);
    window.setTimeout(() => setContactErrored(false), 2200);
  }

  async function toggleContact() {
    if (isAnon) {
      setAuthPromptOpen(true);
      return;
    }
    if (contactStatus === "busy" || !profileUserId) return;
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
          // Removal failed -- the contact is still there, so stay "on"
          // (not "error") so the next click retries the remove, not add.
          setContactStatus("on");
          flashContactError();
        }
      } catch {
        setContactStatus("on");
        flashContactError();
      }
      return;
    }
    setContactStatus("busy");
    try {
      const res = await authFetch("/api/contacts/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: profileUserId }),
      });
      const data = await res.json().catch(() => null);
      if (data?.ok) {
        setContactId(data.contact?._id ?? null);
        setContactStatus("on");
      } else {
        // Same idea in reverse: stay "idle" so the next click retries add.
        setContactStatus("idle");
        flashContactError();
      }
    } catch {
      setContactStatus("idle");
      flashContactError();
    }
  }

  function flashSaveError() {
    setSaveErrored(true);
    window.setTimeout(() => setSaveErrored(false), 2200);
  }

  async function toggleSave() {
    if (isAnon) {
      setAuthPromptOpen(true);
      return;
    }
    if (saveStatus === "busy" || !profileUserId) return;
    const wasOn = saveStatus === "on";
    setSaveStatus("busy");
    try {
      const res = await authFetch(wasOn ? "/api/favorites/remove" : "/api/favorites/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: profileUserId }),
      });
      const data = await res.json().catch(() => null);
      if (data?.ok) {
        setSaveStatus(wasOn ? "idle" : "on");
      } else {
        // Stay at the real (pre-attempt) status so a retry repeats the
        // same action instead of flipping to the opposite one -- same
        // fix as toggleContact()'s flashContactError() above.
        setSaveStatus(wasOn ? "on" : "idle");
        flashSaveError();
      }
    } catch {
      setSaveStatus(wasOn ? "on" : "idle");
      flashSaveError();
    }
    setMenuOpen(false);
  }

  async function shareProfile() {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title: shareTitle, url: shareUrl });
        return;
      } catch {
        // Cancelled the share sheet, or the browser rejected it — fall
        // through to clipboard copy, same as post-viewer-menu.tsx's
        // sharePost().
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareFeedback(true);
      setTimeout(() => setShareFeedback(false), 2000);
    } catch {
      // Nothing more to fall back to.
    }
  }

  async function openChat() {
    if (isAnon) {
      setAuthPromptOpen(true);
      return;
    }
    if (openingChat || !profileUserId) return;
    setOpeningChat(true);
    try {
      const res = await authFetch("/api/chats/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: profileUserId }),
      });
      const data = await res.json().catch(() => null);
      if (data?.ok && typeof data.chatId === "string") {
        const qs = new URLSearchParams();
        if (shareTitle) qs.set("title", shareTitle);
        if (avatarUrl) qs.set("avatar", avatarUrl);
        const suffix = qs.toString() ? `?${qs.toString()}` : "";
        router.push(`/chats/${data.chatId}${suffix}`);
        return;
      }
      throw new Error("open_failed");
    } catch {
      setChatErrored(true);
      window.setTimeout(() => setChatErrored(false), 2200);
    } finally {
      setOpeningChat(false);
    }
  }

  const contactAdded = contactStatus === "on";
  const contactLabel = contactErrored ? STRINGS.actionFailed[lang] : contactAdded ? STRINGS.removeContact[lang] : STRINGS.addContact[lang];
  const contactShowRemoveIcon = contactAdded && contactHovering && !contactErrored;

  const saveLabel = saveErrored ? STRINGS.actionFailed[lang] : saveStatus === "on" ? STRINGS.unsaveProfile[lang] : STRINGS.saveProfile[lang];
  const saveIcon = saveStatus === "on" ? <BookmarkFilledIcon /> : <BookmarkIcon />;

  return (
    <>
    <div className="mt-4 grid grid-cols-4 gap-2">
      {/* Add/remove contact — the same toggle components/add-contact-
          button.tsx used to run as a standalone corner badge, now the
          primary (accent-filled) cell of this row. "Added" state's
          circled-checkmark badge matches the reference screenshot —
          see this file's own header comment and CheckIcon(). */}
      <button
        type="button"
        onClick={toggleContact}
        onMouseEnter={() => setContactHovering(true)}
        onMouseLeave={() => setContactHovering(false)}
        disabled={contactStatus === "busy" || contactStatus === "loading"}
        aria-label={contactLabel}
        aria-pressed={contactAdded}
        title={contactLabel}
        className={
          "flex h-11 w-full items-center justify-center rounded-full transition disabled:cursor-default disabled:opacity-60 " +
          (contactErrored
            ? "bg-red-600 text-white hover:bg-red-700"
            : contactAdded
              ? "border border-neutral-200 bg-white text-neutral-600 hover:text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-50"
              : "bg-accent text-white hover:bg-accent/90")
        }
      >
        {contactAdded ? (contactShowRemoveIcon ? <PersonRemoveIcon /> : <CheckIcon />) : <PersonAddIcon />}
      </button>

      <button
        type="button"
        onClick={shareProfile}
        aria-label={shareFeedback ? STRINGS.linkCopied[lang] : STRINGS.shareProfile[lang]}
        title={shareFeedback ? STRINGS.linkCopied[lang] : STRINGS.shareProfile[lang]}
        className={CELL_BUTTON_CLASS}
      >
        <ShareIcon />
      </button>

      <button
        type="button"
        onClick={openChat}
        disabled={openingChat}
        aria-label={chatErrored ? STRINGS.actionFailed[lang] : STRINGS.message[lang]}
        title={chatErrored ? STRINGS.actionFailed[lang] : STRINGS.message[lang]}
        className={
          chatErrored
            ? "flex h-11 w-full items-center justify-center rounded-full bg-red-600 text-white transition hover:bg-red-700 disabled:cursor-default disabled:opacity-60"
            : CELL_BUTTON_CLASS
        }
      >
        <MessageIcon />
      </button>

      {/* 2026-09-02 (Aleksandr: "иконку с ·· можно поменять на ту которая
          сейчас для сохранения профіля" -- with Mute/Block hidden for a
          signed-out visitor, right above, the "•••" menu would open to a
          single Save row, which isn't a menu anymore -- just show Save
          directly as this cell's own button instead of a one-item
          dropdown. Signed-in-as-someone-else still gets the real "•••"
          menu (Save + Mute + Block) below. */}
      {isAnon ? (
        <button
          type="button"
          onClick={toggleSave}
          disabled={saveStatus === "busy" || saveStatus === "loading"}
          aria-label={saveLabel}
          title={saveLabel}
          className={CELL_BUTTON_CLASS}
        >
          {saveIcon}
        </button>
      ) : (
      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={STRINGS.menuLabel[lang]}
          aria-expanded={menuOpen}
          className={CELL_BUTTON_CLASS}
        >
          <DotsIcon />
        </button>

        {menuOpen && (
          <>
            {createPortal(
              <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} aria-hidden="true" />,
              document.body,
            )}
            <div className="animate-popover absolute right-0 top-full z-50 mt-2 w-56 max-w-[calc(100vw-2rem)] origin-top-right overflow-hidden rounded-2xl border border-neutral-200 bg-white p-1.5 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
              <button
                type="button"
                onClick={toggleSave}
                disabled={saveStatus === "busy" || saveStatus === "loading"}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-neutral-700 transition hover:bg-accent/10 hover:text-accent disabled:opacity-60 dark:text-neutral-300"
              >
                {saveIcon}
                {saveLabel}
              </button>
              {/* Mute/Block — UI-only stubs, see this file's own header
                  comment on why (no backend endpoint exists for either
                  today). 2026-09-02 (Aleksandr: "в не залогиненом
                  состоянии надо убрать вимкнути звук и заблокувати") --
                  neither makes sense for a signed-out visitor (nothing
                  of theirs to mute/block yet), so both are hidden for
                  isAnon; Save still shows and routes through the same
                  auth popup as the other real actions. */}
              <>
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-neutral-700 transition hover:bg-accent/10 hover:text-accent dark:text-neutral-300"
                >
                  <MuteIcon />
                  {STRINGS.mute[lang]}
                </button>
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  <BlockIcon />
                  {STRINGS.block[lang]}
                </button>
              </>
            </div>
          </>
        )}
      </div>
      )}
    </div>

    {authPromptOpen &&
      createPortal(
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setAuthPromptOpen(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xs rounded-2xl bg-white p-5 shadow-xl dark:bg-neutral-900"
          >
            {/* 2026-09-02 (Aleksandr, uploaded Blink.tgs: "давай в этот попап
                сверху добавим по центру анимацию нашего кота... +-10-20%
                меньше чем аватар") -- decompressed to public/animations/
                cat-blink.json, same lib/weekly-cat-animation.ts pack
                convention. 64px vs. the profile avatar's own 72/112.5px
                (app/u/[username]/page.tsx) lands in that range. The
                animation itself is round with a transparent background,
                so it sits on the card without needing a square frame. */}
            <div className="mb-3 flex justify-center">
              <LottiePlayer src="/animations/cat-blink.json" size={64} />
            </div>
            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">{STRINGS.authPromptTitle[lang]}</p>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{STRINGS.authPromptBody[lang]}</p>
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setAuthPromptOpen(false);
                  router.push("/sign-in?reason=profile-action");
                }}
                className="rounded-full bg-accent py-2.5 text-sm font-bold tracking-wide text-white transition hover:opacity-90"
              >
                {STRINGS.signInCta[lang]}
              </button>
              <button
                type="button"
                onClick={() => setAuthPromptOpen(false)}
                className="rounded-full border border-neutral-300 py-2.5 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                {STRINGS.cancel[lang]}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
