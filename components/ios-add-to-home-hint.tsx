// components/ios-add-to-home-hint.tsx
//
// 2026-09-04 (Aleksandr, after we confirmed web push notifications are
// buildable: "Да, добавь такую подсказку на iOS") -- iOS Safari can
// only ever deliver Web Push to a site the visitor has added to their
// Home Screen; a plain Safari tab can never receive them no matter what
// gets built on the service-worker/backend side -- this is an Apple
// platform restriction, not something code can work around. So instead
// of silently failing to notify iPhone visitors once push ships, this
// nudges them toward the one thing that actually unlocks it. Shown
// once, dismissible, only to iOS Safari visitors who haven't already
// installed the site -- desktop, Android, and already-installed iOS
// visitors never see it.
"use client";

import { useEffect, useState } from "react";
import { T } from "@/components/t";

const DISMISS_KEY = "a1_ios_home_hint_dismissed";

function isIOSDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  // iPadOS 13+ reports its UA as a plain "Macintosh", not "iPad" -- the
  // reliable way to tell it apart from an actual Mac is that a Mac has
  // no touch points and an iPad does.
  const isClassicIOS = /iPhone|iPad|iPod/.test(ua);
  const isIPadOS13Plus = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  return isClassicIOS || isIPadOS13Plus;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  // iOS exposes this as `navigator.standalone` (non-standard, iOS-only);
  // everyone else uses the standard display-mode media query.
  return (
    (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}

export function IosAddToHomeHint() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isIOSDevice() || isStandalone()) return;
    try {
      if (window.localStorage.getItem(DISMISS_KEY)) return;
    } catch {
      // Private-browsing/locked-down localStorage -- fine to just show
      // the hint every visit in that case rather than fail closed.
    }
    setVisible(true);
  }, []);

  if (!visible) return null;

  function dismiss() {
    setVisible(false);
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Same as above -- worst case it shows again next visit.
    }
  }

  return (
    <div className="mt-4 flex items-start gap-3 rounded-2xl border border-black/5 bg-white px-4 py-3 shadow-sm dark:border-white/10 dark:bg-neutral-900">
      <ShareIcon className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
      <p className="flex-1 text-[13px] leading-snug text-[#262a34]/80 dark:text-white/80">
        <T
          uk="Щоб отримувати сповіщення про нові повідомлення, додайте A1 на головний екран: «Поділитися» → «На екран «Домівка»"
          en="To get notified about new messages, add A1 to your Home Screen: Share → “Add to Home Screen”"
          ru="Чтобы получать уведомления о новых сообщениях, добавьте A1 на главный экран: «Поделиться» → «На экран «Домой»"
          de="Damit du Benachrichtigungen über neue Nachrichten bekommst, füge A1 zum Home-Bildschirm hinzu: „Teilen“ → „Zum Home-Bildschirm“"
          es="Para recibir notificaciones de nuevos mensajes, añade A1 a tu pantalla de inicio: Compartir → “Añadir a pantalla de inicio”"
          fr="Pour recevoir les notifications de nouveaux messages, ajoutez A1 à l'écran d'accueil : Partager → « Sur l'écran d'accueil »"
          pl="Aby otrzymywać powiadomienia o nowych wiadomościach, dodaj A1 do ekranu głównego: Udostępnij → „Do ekranu głównego”"
          ptBR="Para receber notificações de novas mensagens, adicione o A1 à Tela de Início: Compartilhar → “Adicionar à Tela de Início”"
          zh="要接收新消息通知，请将 A1 添加到主屏幕：点按“分享”，然后选择“添加到主屏幕”"
        />
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="shrink-0 rounded-full p-1 text-[#989aa6] transition hover:bg-black/5 dark:text-[#8d8d93] dark:hover:bg-white/10"
      >
        <CloseIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

function ShareIcon({ className }: { className?: string }) {
  // iOS's own share-sheet glyph (square with an arrow rising out of the
  // top) -- deliberately the same icon Safari's own share button uses,
  // so the hint visually points at the exact button to tap.
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M12 16V4M12 4l-4 4M12 4l4 4" />
      <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className} aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
