// components/apply-link-toast.tsx
//
// 25.10.2026 (Александр: «ссылка на профиль A1 в каждом отклике»). Человек
// жмёт «Відкрити вакансію» и уходит на сайт компании -- в этот же момент
// ссылка на его профиль A1 уже лежит в буфере обмена, а здесь всплывает
// подсказка, куда её вставить. Тогда каждый отклик через нас приносит HR
// ссылку на профиль A1 -- бесплатный канал к компаниям и сама идея
// «профиль вместо резюме».
//
// Вид -- как у components/chat/copy-toast.tsx (тёмная пилюля, та же
// анимация done.json), только шире: две строки и крестик.
//
// Когда показывать. Вакансия открывается в новой вкладке, поэтому на
// компьютере человек тост сначала не видит. Таймер на скрытие стартует
// только тогда, когда вкладка снова видна: вернулся -- подсказка ещё на
// месте. Крестиком закрывается сразу.
//
// Гостю (без профиля) -- вместо этого мягкое «Створи профіль», не чаще
// раза за вкладку (sessionStorage), чтобы не надоедать на каждой вакансии.
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { LottiePlayer } from "@/components/lottie-player";
import type { Locale } from "@/components/t";

const VISIBLE_MS = 9000;

export type ApplyLinkToastState = { trigger: number; kind: "copied" | "guest" };

const S: Record<"copiedTitle" | "copiedHint" | "guestTitle" | "guestHint" | "guestCta" | "close", Record<Locale, string>> = {
  copiedTitle: { uk: "Посилання на твій профіль A1 скопійовано", en: "Your A1 profile link is copied", ru: "Ссылка на твой профиль A1 скопирована", de: "Link zu deinem A1-Profil kopiert", es: "Enlace a tu perfil de A1 copiado", fr: "Lien vers votre profil A1 copié", pl: "Link do Twojego profilu A1 skopiowany", ptBR: "Link do seu perfil A1 copiado", zh: "已复制你的 A1 资料链接" },
  copiedHint: { uk: "Встав його у відгук — у поле Website, Portfolio або LinkedIn", en: "Paste it into your application: the Website, Portfolio or LinkedIn field", ru: "Вставь её в отклик — в поле Website, Portfolio или LinkedIn", de: "Füge ihn in die Bewerbung ein: Feld Website, Portfolio oder LinkedIn", es: "Pégalo en tu candidatura: campo Website, Portfolio o LinkedIn", fr: "Collez-le dans votre candidature : champ Website, Portfolio ou LinkedIn", pl: "Wklej go w aplikacji: pole Website, Portfolio lub LinkedIn", ptBR: "Cole na candidatura: campo Website, Portfolio ou LinkedIn", zh: "粘贴到申请表的 Website、Portfolio 或 LinkedIn 字段" },
  guestTitle: { uk: "Профіль A1 замість резюме", en: "An A1 profile instead of a CV", ru: "Профиль A1 вместо резюме", de: "A1-Profil statt Lebenslauf", es: "Un perfil de A1 en lugar del CV", fr: "Un profil A1 au lieu d'un CV", pl: "Profil A1 zamiast CV", ptBR: "Perfil A1 no lugar do currículo", zh: "用 A1 资料代替简历" },
  guestHint: { uk: "З профілем посилання на нього саме копіюється, щоб додати у відгук", en: "With a profile, its link is copied for you to add to applications", ru: "С профилем ссылка на него сама копируется, чтобы добавить в отклик", de: "Mit Profil wird sein Link automatisch für Bewerbungen kopiert", es: "Con un perfil, su enlace se copia solo para añadirlo a candidaturas", fr: "Avec un profil, son lien est copié pour l'ajouter aux candidatures", pl: "Z profilem link do niego kopiuje się sam do aplikacji", ptBR: "Com um perfil, o link é copiado para você colar nas candidaturas", zh: "有了资料，链接会自动复制，方便附在申请里" },
  guestCta: { uk: "Створити", en: "Create", ru: "Создать", de: "Erstellen", es: "Crear", fr: "Créer", pl: "Utwórz", ptBR: "Criar", zh: "创建" },
  close: { uk: "Закрити", en: "Close", ru: "Закрыть", de: "Schließen", es: "Cerrar", fr: "Fermer", pl: "Zamknij", ptBR: "Fechar", zh: "关闭" },
};

export function ApplyLinkToast({ state, lang }: { state: ApplyLinkToastState | null; lang: Locale }) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!state) return;
    setMounted(true);
    // Кадр между монтированием и open -- иначе CSS нечего анимировать.
    const raf = window.requestAnimationFrame(() => setOpen(true));
    let hide = 0;
    const arm = () => {
      if (document.visibilityState !== "visible" || hide) return;
      hide = window.setTimeout(() => setOpen(false), VISIBLE_MS);
    };
    arm();
    document.addEventListener("visibilitychange", arm);
    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(hide);
      document.removeEventListener("visibilitychange", arm);
    };
  }, [state]);

  // После анимации исчезновения -- убрать из DOM.
  useEffect(() => {
    if (open || !mounted) return;
    const t = window.setTimeout(() => setMounted(false), 300);
    return () => window.clearTimeout(t);
  }, [open, mounted]);

  if (typeof document === "undefined" || !state || !mounted) return null;
  const guest = state.kind === "guest";

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className={`fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+20px)] z-[70] flex justify-center px-4 transition-all duration-300 ease-out ${
        open ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
      }`}
    >
      <div className="flex w-full max-w-md items-center gap-3 rounded-2xl bg-neutral-900/90 py-2.5 pl-3 pr-2 text-white shadow-xl backdrop-blur-sm dark:bg-neutral-800/95">
        {guest ? (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-[15px]">👤</span>
        ) : (
          <LottiePlayer key={state.trigger} src="/animations/done.json" size={32} loop={false} />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold leading-snug">{guest ? S.guestTitle[lang] : S.copiedTitle[lang]}</p>
          <p className="mt-0.5 text-[12.5px] leading-snug text-white/70">{guest ? S.guestHint[lang] : S.copiedHint[lang]}</p>
        </div>
        {guest && (
          <Link
            href="/sign-in"
            onClick={() => setOpen(false)}
            className="shrink-0 rounded-full bg-[#335ef7] px-3.5 py-1.5 text-[13px] font-semibold text-white transition hover:brightness-110 active:scale-95 dark:bg-[#0c8ce9]"
          >
            {S.guestCta[lang]}
          </Link>
        )}
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label={S.close[lang]}
          className="group/close flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white active:scale-90"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4 transition-transform duration-200 ease-out group-hover/close:rotate-90 motion-reduce:transition-none" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
    </div>,
    document.body,
  );
}
