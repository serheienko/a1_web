// components/add-contact-button.tsx
//
// Aleksandr, 2026-08-31: "давай где-то что-то накидаешь... одну кнопку
// пока, типа вот на профилях: добавить в контакты. И именно на профиле
// человека" — first-pass UI for app/api/contacts/add/route.ts, which
// existed as backend-only until now (see that route's own comment).
// Explicitly a rough sketch per his framing, not a final design.
//
// 2026-08-31, live feedback on the first pass ("Кнопка слишком большая,
// сделай наверное только иконку и сделай возможность при повторном тапе
// убрать из контактов"): dropped the pill/label — same icon-only, h-8 w-8
// circular-button treatment components/edit-profile-button.tsx already
// uses right next to it on this same page — and made it a real toggle
// backed by app/api/contacts/remove/route.ts (new alongside this change;
// see that route's own comment on why its method name isn't independently
// confirmed the way add/route.ts's now is).
//
// Mirrors components/edit-profile-button.tsx's whoami-gating trick
// (app/u/[username]/page.tsx is a server component that never reads the
// visitor's own session, so "is this MY profile" can only be answered
// client-side) but with the opposite condition: renders nothing for the
// profile's own owner, and nothing for a signed-out visitor — only shows
// up when a signed-in visitor is looking at SOMEONE ELSE's profile.
"use client";

import { useEffect, useState } from "react";
import { LOCALES, LOCALE_CLASS, type Locale } from "@/components/t";
import type { Contact } from "@/lib/a1/schemas";

type StringKey = "add" | "remove" | "error";

const STRINGS: Record<StringKey, Record<Locale, string>> = {
  add: {
    uk: "Додати в контакти", en: "Add to contacts", ru: "Добавить в контакты",
    de: "Zu Kontakten hinzufügen", es: "Añadir a contactos", fr: "Ajouter aux contacts",
    pl: "Dodaj do kontaktów", ptBR: "Adicionar aos contatos", zh: "添加到联系人",
  },
  remove: {
    uk: "Прибрати з контактів", en: "Remove from contacts", ru: "Убрать из контактов",
    de: "Aus Kontakten entfernen", es: "Quitar de contactos", fr: "Retirer des contacts",
    pl: "Usuń z kontaktów", ptBR: "Remover dos contatos", zh: "从联系人中移除",
  },
  error: {
    uk: "Не вдалося. Спробуйте ще раз", en: "Failed — try again", ru: "Не удалось. Попробуйте ещё раз",
    de: "Fehlgeschlagen — erneut versuchen", es: "Error — inténtalo de nuevo", fr: "Échec — réessayez",
    pl: "Nie udało się — spróbuj ponownie", ptBR: "Falhou — tente novamente", zh: "失败，请重试",
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

function PersonAddIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21c0-4 3.1-6 7-6s7 2 7 6" />
      <path d="M19 8v6M16 11h6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

// "in contacts" state, shown on hover/focus instead of the checkmark so
// the icon itself hints at what tapping again will do — same idea as a
// filled-heart-that-becomes-outline-on-hover toggle.
function PersonRemoveIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21c0-4 3.1-6 7-6s7 2 7 6" />
      <path d="M16 11h6" />
    </svg>
  );
}

type Status = "loading-initial" | "idle" | "added" | "busy" | "error-add" | "error-remove";

// `profileUserId` is the profile-being-viewed's raw backend `_id` — page.tsx
// already resolves this for the "posts by this author" section
// (fetchUserRawByUsername), so it's threaded through as a prop rather than
// this component re-fetching it. Pass `null` when it isn't available (the
// UserHidden variant carries no id) and this renders nothing, same as the
// not-signed-in / own-profile cases below.
export function AddContactButton({
  username,
  profileUserId,
  className,
}: {
  username: string;
  profileUserId: string | null;
  className?: string;
}) {
  const lang = useActiveLocale();
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<Status>("loading-initial");
  const [contactId, setContactId] = useState<string | null>(null);
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/account/whoami")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data?.ok) return;
        // Signed in AND looking at someone else's profile.
        if (data.username && data.username !== username) setVisible(true);
      })
      .catch(() => {
        // Signed out, or the call failed — no button.
      });
    return () => {
      cancelled = true;
    };
  }, [username]);

  // Resolve whether this profile is already a contact, so a revisit shows
  // the correct toggle state instead of always starting from "Add" (which
  // would silently duplicate the contact on the next tap). Runs regardless
  // of `visible` — cheap, and avoids a second gating effect — but only
  // matters once `visible` is true.
  useEffect(() => {
    if (!profileUserId) {
      setStatus("idle");
      return;
    }
    let cancelled = false;
    fetch("/api/contacts/list")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (!data?.ok) {
          setStatus("idle");
          return;
        }
        const existing = (data.contacts as Contact[] | undefined)?.find((c) => c.user === profileUserId);
        if (existing) {
          setContactId(existing._id);
          setStatus("added");
        } else {
          setStatus("idle");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("idle");
      });
    return () => {
      cancelled = true;
    };
  }, [profileUserId]);

  if (!visible || !profileUserId || status === "loading-initial") return null;

  const isAdded = status === "added" || status === "error-remove";

  async function handleClick() {
    if (status === "busy") return;
    if (isAdded) {
      if (!contactId) return;
      setStatus("busy");
      try {
        const res = await fetch("/api/contacts/remove", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contactId }),
        });
        const data = await res.json().catch(() => null);
        if (data?.ok) {
          setContactId(null);
          setStatus("idle");
        } else {
          setStatus("error-remove");
        }
      } catch {
        setStatus("error-remove");
      }
      return;
    }

    setStatus("busy");
    try {
      const res = await fetch("/api/contacts/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: profileUserId }),
      });
      const data = await res.json().catch(() => null);
      if (data?.ok) {
        setContactId(data.contact?._id ?? null);
        setStatus("added");
      } else {
        setStatus("error-add");
      }
    } catch {
      setStatus("error-add");
    }
  }

  const isError = status === "error-add" || status === "error-remove";
  const label = isError ? STRINGS.error[lang] : isAdded ? STRINGS.remove[lang] : STRINGS.add[lang];
  const showRemoveIcon = isAdded && hovering;

  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      disabled={status === "busy"}
      aria-label={label}
      aria-pressed={isAdded}
      title={label}
      className={
        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition disabled:cursor-default disabled:opacity-60 " +
        (isError
          ? "border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
          : isAdded
            ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-red-50 hover:border-red-300 hover:text-red-600 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-red-900/20 dark:hover:border-red-700 dark:hover:text-red-400"
            : "border-neutral-300 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800") +
        " " +
        (className ?? "")
      }
    >
      {isAdded ? (showRemoveIcon ? <PersonRemoveIcon /> : <CheckIcon />) : <PersonAddIcon />}
    </button>
  );
}
