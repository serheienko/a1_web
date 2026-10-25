// components/profile-share.tsx
//
// 25.10.2026 (Александр: «профиль как ссылка "обо мне" везде»). Кнопка
// «Поділитися» на СВОЁМ профиле.
//
// Вторая версия в тот же день (Александр, скриншоты с телефона): «кнопку
// лучше маленькой круглой под "редактировать"… должна работать так же, как
// поделиться любым другим профилем: сначала стандартное окно, чтобы делиться
// внутри приложения, а снизу слева вторая кнопка делится наружу. Ещё одно
// доп. окно -- перебор». Поэтому: круглый значок того же вида, что карандаш
// (components/edit-profile-button.tsx), прямо под ним, и по нажатию -- то же
// окно components/share-target-modal.tsx, что у чужого профиля. Итого два
// тапа: «поделиться» и выбор, куда. Своё окно с QR убрано.
//
// Ссылка наружу -- jobs.a1appp.com/u/<ник>: только там живёт личная
// карточка-превью (app/u/[username]/opengraph-image.tsx).
//
// Владельца узнаём как в edit-profile-button.tsx: /api/account/whoami на
// клиенте (страница профиля кешируется и сессию не читает). Пока не ясно --
// ничего не рисуем.
"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Locale } from "@/components/t";
import { ShareTargetModal } from "@/components/share-target-modal";
import { authFetch } from "@/lib/auth-fetch";
import { useActiveLocale } from "@/lib/use-active-locale";

const LABEL: Record<Locale, string> = {
  uk: "Поділитися профілем", en: "Share profile", ru: "Поделиться профилем", de: "Profil teilen",
  es: "Compartir perfil", fr: "Partager le profil", pl: "Udostępnij profil", ptBR: "Compartilhar perfil", zh: "分享资料",
};

export function ProfileShare({
  username,
  userId,
  fullName,
  url,
  className,
}: {
  username: string;
  userId: string;
  fullName: string;
  /** Ссылка на профиль для «поделиться наружу». */
  url: string;
  className?: string;
}) {
  const lang = useActiveLocale();
  const [isOwner, setIsOwner] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    authFetch("/api/account/whoami")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data?.ok && data.username === username) setIsOwner(true);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [username]);

  if (!isOwner) return null;

  return (
    <>
      {/* Тот же значок, что карандаш над ним: тёмный круг с белой обводкой. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={LABEL[lang]}
        title={LABEL[lang]}
        className={
          "group flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-neutral-900/80 text-white shadow-sm transition hover:bg-neutral-900 active:scale-90 dark:border-black " +
          (className ?? "")
        }
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 animate-share-lift" aria-hidden="true">
          <path d="M12 15V3" />
          <path d="M7.5 7.5 12 3l4.5 4.5" />
          <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
        </svg>
      </button>

      {open &&
        createPortal(
          <ShareTargetModal lang={lang} target={{ kind: "contact", userId, name: fullName, profileUrl: url }} onClose={() => setOpen(false)} />,
          document.body,
        )}
    </>
  );
}
