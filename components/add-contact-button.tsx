// components/add-contact-button.tsx
//
// Aleksandr, 2026-08-31: "давай где-то что-то накидаешь... одну кнопку
// пока, типа вот на профилях: добавить в контакты. И именно на профиле
// человека" — first-pass UI for app/api/contacts/add/route.ts, which
// existed as backend-only until now (see that route's own comment).
// Explicitly a rough sketch per his framing, not a final design.
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

type StringKey = "add" | "added" | "error";

const STRINGS: Record<StringKey, Record<Locale, string>> = {
  add: {
    uk: "Додати в контакти", en: "Add to contacts", ru: "Добавить в контакты",
    de: "Zu Kontakten hinzufügen", es: "Añadir a contactos", fr: "Ajouter aux contacts",
    pl: "Dodaj do kontaktów", ptBR: "Adicionar aos contatos", zh: "添加到联系人",
  },
  added: {
    uk: "Додано", en: "Added", ru: "Добавлено", de: "Hinzugefügt", es: "Añadido",
    fr: "Ajouté", pl: "Dodano", ptBR: "Adicionado", zh: "已添加",
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
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21c0-4 3.1-6 7-6s7 2 7 6" />
      <path d="M19 8v6M16 11h6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

type Status = "idle" | "loading" | "added" | "error";

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
  const [status, setStatus] = useState<Status>("idle");

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

  if (!visible || !profileUserId) return null;

  async function handleClick() {
    setStatus("loading");
    try {
      const res = await fetch("/api/contacts/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: profileUserId }),
      });
      const data = await res.json().catch(() => null);
      setStatus(data?.ok ? "added" : "error");
    } catch {
      setStatus("error");
    }
  }

  const label = status === "added" ? STRINGS.added[lang] : status === "error" ? STRINGS.error[lang] : STRINGS.add[lang];

  return (
    <button
      type="button"
      onClick={status === "idle" || status === "error" ? handleClick : undefined}
      disabled={status === "loading" || status === "added"}
      aria-label={label}
      title={label}
      className={
        "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition disabled:cursor-default " +
        (status === "added"
          ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
          : status === "error"
            ? "border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
            : "border-neutral-300 text-neutral-600 hover:bg-neutral-100 disabled:opacity-60 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800") +
        " " +
        (className ?? "")
      }
    >
      {status === "added" ? <CheckIcon /> : <PersonAddIcon />}
      {label}
    </button>
  );
}
