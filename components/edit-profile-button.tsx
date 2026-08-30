// components/edit-profile-button.tsx
//
// Aleksandr, 2026-08-30 (2 screenshots of his own profile card): "Само
// редактирование кнопкой думаю можно добавить в вот справа от Al Ex к
// правому краю" -- the entry point into the new full profile editor
// (components/profile-editor.tsx). Same whoami-gating trick components/
// profile-tabs.tsx already uses for its own owner-only section:
// app/u/[username]/page.tsx is a server component that deliberately
// never reads the visitor's own session (ISR-vs-dynamic-rendering --
// see components/post-owner-menu.tsx's header comment for the long
// version), so "is this MY profile" can only be answered client-side,
// by comparing /api/account/whoami's username against the profile
// actually being viewed. Renders nothing at all until that resolves,
// and nothing at all for a signed-out visitor or someone else's profile
// -- never a disabled/greyed-out button that would leak "this profile
// belongs to someone" information it shouldn't.
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LOCALES, LOCALE_CLASS, type Locale } from "@/components/t";
import { ProfileEditor } from "@/components/profile-editor";

type StringKey = "editProfile";

const STRINGS: Record<StringKey, Record<Locale, string>> = {
  editProfile: {
    uk: "Редагувати профіль", en: "Edit profile", ru: "Редактировать профиль",
    de: "Profil bearbeiten", es: "Editar perfil", fr: "Modifier le profil",
    pl: "Edytuj profil", ptBR: "Editar perfil", zh: "编辑资料",
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

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  );
}

export function EditProfileButton({ username, className }: { username: string; className?: string }) {
  const lang = useActiveLocale();
  const router = useRouter();
  const [isOwner, setIsOwner] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/account/whoami")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data?.ok && data.username === username) setIsOwner(true);
      })
      .catch(() => {
        // Signed out, or the call failed -- no button, same as before
        // this feature existed.
      });
    return () => {
      cancelled = true;
    };
  }, [username]);

  if (!isOwner) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          "inline-flex items-center gap-1.5 rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-600 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800 " +
          (className ?? "")
        }
      >
        <PencilIcon />
        <span className="hidden sm:inline">{STRINGS.editProfile[lang]}</span>
      </button>
      {open && (
        <ProfileEditor
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            // The public profile above is server-rendered (fetchUserByUsername,
            // revalidate = 60) -- router.refresh() re-runs that fetch against
            // the account.updateProfile write this dialog just made, same
            // convention components/post-owner-menu.tsx already uses after a
            // post edit/delete. "a1:profile-saved" mirrors post-editor.tsx's
            // own "a1:post-saved" event, in case some future component wants
            // to react to a profile save without owning the refresh itself.
            window.dispatchEvent(new Event("a1:profile-saved"));
            router.refresh();
          }}
        />
      )}
    </>
  );
}
