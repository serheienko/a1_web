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
import { profileHref } from "@/lib/profile-href";

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

// 2026-09-02 (Aleksandr, screenshot of this exact button: "Сделай
// анимацию для карандаша при наведении") -- same animate-pencil-write
// keyframe app/globals.css already defines for components/post-owner-
// menu.tsx's own Edit row icon (a little "writing" wiggle), reused here
// rather than duplicated. Needs the button itself to carry `group`
// (added above) since that's what the shared `.group:hover
// .animate-pencil-write` selector hooks onto.
function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 animate-pencil-write" aria-hidden="true">
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
      {/* 2026-08-30, live-testing feedback: "В профілі зроби просто іконку
          олівця, це достатньо" — dropped the text label, kept it as an
          accessible name via aria-label/title instead of visible text.

          2026-08-31, live-testing feedback (mobile screenshot, "с иконками
          редактирования на мобе фигня какая-то вышла"): this outline/no-fill
          style was designed for sitting next to the name text, on the
          page's own background. app/u/[username]/page.tsx's 2026-08-31
          header rework (see that file's own comment) moved this button
          onto the avatar's corner instead, as a badge over a photo -- the
          same treatment components/avatar-edit-button.tsx's pencil badge
          already uses there. Left with its old style, a thin gray outline
          over a photo just reads as a faint, broken-looking ring; this
          copies AvatarEditButton's exact badge classes (solid dark fill,
          white cutout border matching the page background) so the two
          avatar-corner badges look like one consistent design instead of
          two different button styles collided together. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={STRINGS.editProfile[lang]}
        title={STRINGS.editProfile[lang]}
        className={
          "group flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-neutral-900/80 text-white shadow-sm transition hover:bg-neutral-900 dark:border-black " +
          (className ?? "")
        }
      >
        <PencilIcon />
      </button>
      {open && (
        <ProfileEditor
          onClose={() => setOpen(false)}
          onSaved={(newUsername) => {
            setOpen(false);
            // The public profile above is server-rendered (fetchUserByUsername,
            // revalidate = 60) -- router.refresh() re-runs that fetch against
            // the account.updateProfile write this dialog just made, same
            // convention components/post-owner-menu.tsx already uses after a
            // post edit/delete. "a1:profile-saved" mirrors post-editor.tsx's
            // own "a1:post-saved" event, in case some future component wants
            // to react to a profile save without owning the refresh itself.
            window.dispatchEvent(new Event("a1:profile-saved"));
            // 2026-08-31, live report ("После сохранения профиля --
            // страница не найдена"): a save that changes the username
            // makes THIS route's fetchUserByUsername(username) start
            // returning null, so a plain router.refresh() here would just
            // re-run notFound() on the now-stale /u/oldUsername page.
            // Redirect to the new profile URL instead in that case.
            if (newUsername && newUsername !== username) {
              router.replace(profileHref(newUsername));
            } else {
              router.refresh();
            }
          }}
        />
      )}
    </>
  );
}
