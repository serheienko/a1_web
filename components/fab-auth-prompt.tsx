// components/fab-auth-prompt.tsx
//
// 2026-09-02 (Aleksandr: "В незалогиненых тоже показывай модалку на обе
// кнопки и не уводи со страницы. В этом случае лучше показать модалку
// прямо над кнопками, чтобы место клика было не далеко и не надо было
// водить мышкой") -- components/chats-fab.tsx and components/create-
// post-fab.tsx both used to send a signed-out visitor away from the
// page entirely: ChatsFab was a plain `<Link href="/chats">` with no
// auth check at all, and CreatePostFab did `window.location.href =
// "/sign-in?reason=create-post"`. Both replaced with this: a small
// popover anchored right above the FAB stack, instead of components/
// profile-action-row.tsx's own full-screen centered `authPromptOpen`
// dialog -- that one's fine when it opens from content the visitor was
// already reading mid-page, but these two buttons live pinned in the
// bottom-right corner, so popping a dialog up in the screen's center
// would put it far from where the visitor's hand already is.
//
// Same copy shape as that dialog (title/body/CTA/cancel + the cat-blink
// animation), just restyled as a compact anchored card with a pointer
// tail instead of a full-screen dialog, and with a `signInHref` prop so
// each FAB can keep routing to its own existing `?reason=` notice on
// /sign-in (create-post keeps its dedicated copy; chats reuses the
// generic profile-action one -- there's no meaningfully different
// notice needed for "wanted to open chats" once you're signed out).
//
// 2026-09-02 (Aleksandr: "давай не будем уходить на новую страницу при
// регистрации, а... мы тут же просто будем увеличивать высоту этого
// попапа и добавим все элементы, которые нам нужны... даже иконка
// [лотти-кота] можно убрать, потому что у нас типа слева логотип A1")
// -- pressing the CTA below used to `router.push(signInHref)` away to
// /sign-in entirely. Now it flips `expanded` instead: the intro copy
// (Lottie/title/body/CTA/cancel) swaps for components/inline-auth-form.
// tsx's own compact form right inside this same card, which just grows
// to fit it -- no navigation, no losing the FAB stack underneath. Reset
// back to the collapsed intro every time the popover closes (`open`
// flips false), so reopening it later starts from the same short pitch
// again rather than resuming mid-form.
"use client";

import { createPortal } from "react-dom";
import { LOCALES, LOCALE_CLASS, type Locale } from "@/components/t";
import { useEffect, useState, type RefObject } from "react";
import { LottiePlayer } from "@/components/lottie-player";
import { InlineAuthForm } from "@/components/inline-auth-form";

type FabAuthPromptStringKey = "title" | "body" | "signInCta" | "cancel";

const STRINGS: Record<FabAuthPromptStringKey, Record<Locale, string>> = {
  title: {
    uk: "Увійдіть, щоб продовжити", en: "Sign in to continue", ru: "Войдите, чтобы продолжить",
    de: "Melden Sie sich an, um fortzufahren", es: "Inicia sesión para continuar", fr: "Connectez-vous pour continuer",
    pl: "Zaloguj się, aby kontynuować", ptBR: "Entre para continuar", zh: "登录以继续",
  },
  body: {
    uk: "Зареєструйтесь або увійдіть, щоб продовжити.",
    en: "Sign up or sign in to continue.",
    ru: "Зарегистрируйтесь или войдите, чтобы продолжить.",
    de: "Registrieren oder anmelden, um fortzufahren.",
    es: "Regístrate o inicia sesión para continuar.",
    fr: "Inscrivez-vous ou connectez-vous pour continuer.",
    pl: "Zarejestruj się lub zaloguj, aby kontynuować.",
    ptBR: "Cadastre-se ou entre para continuar.",
    zh: "注册或登录即可继续。",
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

// Sits directly above the FAB stack: components/create-post-fab.tsx's
// button is 56px tall starting at 1.25rem off the bottom, components/
// chats-fab.tsx's own button is 48px tall starting 12px above that --
// so the top edge of that two-button stack sits 1.25rem + 56px + 12px +
// 48px up from the bottom, and this card's own bottom offset adds one
// more 12px gap on top of that.
const FAB_POPOVER_BOTTOM =
  "calc(1.25rem + 56px + 12px + 48px + 12px + env(safe-area-inset-bottom))";

export function FabAuthPrompt({
  open,
  onClose,
  signInHref,
  panelRef,
  onMouseEnter,
  onMouseLeave,
}: {
  open: boolean;
  onClose: () => void;
  /** Where the sign-in CTA routes to -- carries this FAB's own `?reason=` notice. */
  signInHref: string;
  /**
   * 2026-09-02 (Aleksandr: "давай в разлогиненом стейте тоже добавим к
   * этим попапс эффект появления при наведении, без клика на кнопки
   * 'создать пост' и 'чат'"): hover-intent support, additive to the
   * existing click-to-open trigger. This component doesn't own the
   * hover state itself -- lib/use-hover-panel.ts's useHoverPanel does,
   * one instance per FAB in components/chats-fab.tsx / components/
   * create-post-fab.tsx -- it just exposes the card's own DOM node and
   * forwards the enter/leave handlers, the same way every other hover-
   * panel call site in this app (components/avatar-menu.tsx, components/
   * settings-menu.tsx) needs both the trigger AND the panel wired to
   * the SAME handlers so moving the cursor from one to the other never
   * starts the close-delay timer. Portaled to document.body (unlike
   * those two, which nest the panel inside the trigger's own relative
   * wrapper), so it can't rely on one shared wrapping element -- the
   * panel needs its own explicit handlers instead.
   */
  panelRef?: RefObject<HTMLDivElement | null>;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  const lang = useActiveLocale();
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!open) setExpanded(false);
  }, [open]);

  if (!open) return null;

  return createPortal(
    // 2026-09-02 (Aleksandr, screen recording: signed-out, clicking a FAB
    // caused "зацикливание и постоянное мигание" -- the popover opening
    // and closing in a rapid loop, and the trigger icon's own hover
    // animation "колбасило" along with it): this backdrop used to be
    // z-[70], ABOVE the FAB trigger buttons (components/chats-fab.tsx /
    // components/create-post-fab.tsx, both z-40). The instant the
    // popover opened, this full-viewport backdrop became the topmost
    // element under the cursor -- even though the cursor never moved --
    // so the browser fired a real `mouseleave` on the trigger button
    // (it's no longer what's under the pointer). That started this
    // popover's own close-delay timer; once it fired, the backdrop
    // unmounted, the trigger became topmost again, a real `mouseenter`
    // fired, and the popover reopened -- forever, each open/close also
    // replaying the trigger icon's own hover animation (create-post-
    // fab.tsx's rotate, chats-fab.tsx's wiggle). z-30 (below the
    // trigger's z-40, same as components/settings-menu.tsx's own
    // backdrop deliberately sitting below its z-40 nav) fixes the cause
    // structurally: the trigger now stays visually topmost while this
    // popover is open, so hovering it never toggles away from itself.
    // Still well above ordinary page content for outside-click-to-
    // dismiss, and still below this popover's own card (z-[70] below,
    // unchanged -- only the backdrop needed to move).
    <div className="animate-backdrop-in fixed inset-0 z-30" onClick={onClose}>
      <div
        role="alertdialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        ref={panelRef}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className={
          "animate-popover-up fixed right-5 z-[70] max-h-[85vh] overflow-y-auto rounded-2xl bg-white shadow-xl dark:bg-neutral-900 " +
          (expanded ? "w-80 max-w-[calc(100vw-2rem)] p-5" : "w-64 max-w-[calc(100vw-2rem)] p-4")
        }
        style={{ bottom: FAB_POPOVER_BOTTOM }}
      >
        {expanded ? (
          <InlineAuthForm lang={lang} compact />
        ) : (
          <>
            <div className="mb-2 flex justify-center">
              <LottiePlayer src="/animations/cat-blink.json" size={48} />
            </div>
            <p className="text-center text-sm font-semibold text-neutral-900 dark:text-neutral-50">
              {STRINGS.title[lang]}
            </p>
            <p className="mt-1 text-center text-xs text-neutral-500 dark:text-neutral-400">
              {STRINGS.body[lang]}
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="rounded-full bg-accent py-2 text-sm font-bold tracking-wide text-white transition hover:opacity-90"
              >
                {STRINGS.signInCta[lang]}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-neutral-300 py-2 text-xs font-medium text-neutral-600 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                {STRINGS.cancel[lang]}
              </button>
            </div>
          </>
        )}
        {/* Pointer tail aiming down at the FAB stack, same speech-bubble
            trick as any CSS-only callout: a rotated square, same fill
            as the card, half-hidden below its bottom edge. */}
        <div
          className="absolute -bottom-1.5 right-8 h-3 w-3 rotate-45 bg-white dark:bg-neutral-900"
          aria-hidden="true"
        />
      </div>
    </div>,
    document.body,
  );
}
