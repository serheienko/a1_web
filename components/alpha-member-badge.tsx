// components/alpha-member-badge.tsx
//
// 08.10.2026 (Александр): «на сайте… просто будет значок. У нас появится
// значок возле имени, типа консерва. При нажатии на неё будет всплывать
// поп-ап, точно так же, как в приложении… бегущая строка… написано, что это
// альфа-мембер, чтобы другие понимали, что это за хреновина, и что её можно
// купить». Значок = статичный кадр (webp, лёгкий); в попапе — живая анимация.
"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlphaPaywall, startAlphaMusic } from "@/components/alpha-paywall";
import { LottiePlayer } from "@/components/lottie-player";
import { alphaEmojiPath, type AlphaMember } from "@/lib/alpha/member";
import { useActiveLocale } from "@/lib/use-active-locale";

type T9 = { uk: string; en: string; ru: string; de: string; es: string; fr: string; pl: string; ptBR: string; zh: string };
const S = {
  member: { uk: "Учасник Alpha", en: "Alpha member", ru: "Участник Alpha", de: "Alpha-Mitglied", es: "Miembro de Alpha", fr: "Membre Alpha", pl: "Członek Alpha", ptBR: "Membro Alpha", zh: "Alpha 会员" },
  marquee: {
    uk: "Alpha шукає роботу за Вас  ✦  ставить кілька запитань і показує найточніші збіги  ✦  щодня надсилає нові в чат  ✦  медіа в чатах без ліміту",
    en: "Alpha finds the job for you  ✦  asks a few questions and shows the closest matches  ✦  sends new ones to chat every day  ✦  no media limits in chats",
    ru: "Alpha ищет работу за Вас  ✦  задаёт пару вопросов и показывает самые точные совпадения  ✦  каждый день присылает новые в чат  ✦  медиа в чатах без лимита",
    de: "Alpha findet den Job für Sie  ✦  stellt ein paar Fragen und zeigt die besten Treffer  ✦  schickt täglich neue in den Chat  ✦  Medien im Chat ohne Limit",
    es: "Alpha busca trabajo por usted  ✦  hace unas preguntas y muestra las coincidencias más exactas  ✦  envía nuevas al chat cada día  ✦  multimedia sin límite",
    fr: "Alpha trouve le poste pour vous  ✦  pose quelques questions et montre les meilleures correspondances  ✦  envoie les nouvelles chaque jour  ✦  médias illimités",
    pl: "Alpha szuka pracy za Ciebie  ✦  zadaje kilka pytań i pokazuje najlepsze dopasowania  ✦  codziennie wysyła nowe na czat  ✦  media bez limitu",
    ptBR: "O Alpha procura vaga por você  ✦  faz algumas perguntas e mostra os resultados mais exatos  ✦  envia novos no chat todo dia  ✦  mídia sem limite",
    zh: "Alpha 为您找工作  ✦  问几个问题并展示最精准的匹配  ✦  每天在聊天中推送新的  ✦  聊天媒体不限量",
  },
  join: { uk: "Приєднатися до Alpha", en: "Join Alpha", ru: "Присоединиться к Alpha", de: "Alpha beitreten", es: "Unirse a Alpha", fr: "Rejoindre Alpha", pl: "Dołącz do Alpha", ptBR: "Entrar no Alpha", zh: "加入 Alpha" },
  close: { uk: "Закрити", en: "Close", ru: "Закрыть", de: "Schließen", es: "Cerrar", fr: "Fermer", pl: "Zamknij", ptBR: "Fechar", zh: "关闭" },
} satisfies Record<string, T9>;

export function AlphaMemberBadge({
  member,
  name,
  size = 18,
  className = "",
}: {
  member: AlphaMember | null | undefined;
  name: string;
  size?: number;
  className?: string;
}) {
  const locale = useActiveLocale();
  const t = (v: T9) => (v as Record<string, string>)[locale] ?? v.en;
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(false);
  const [paywall, setPaywall] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const r = requestAnimationFrame(() => setShown(true));
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(r);
      document.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!member) return null;
  const base = alphaEmojiPath(member.emojiId);

  function close() {
    setShown(false);
    window.setTimeout(() => setOpen(false), 220);
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        aria-label={t(S.member)}
        title={t(S.member)}
        className={`relative z-10 inline-flex shrink-0 items-center justify-center align-middle transition hover:scale-110 ${className}`}
        style={{ width: size, height: size }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${base}.webp`} alt="" width={size} height={size} className="h-full w-full object-contain" />
      </button>

      {mounted &&
        open &&
        createPortal(
          <div
            className={`fixed inset-0 z-[210] flex items-end justify-center bg-black/40 backdrop-blur-[4px] transition-opacity duration-200 sm:items-center sm:p-4 ${shown ? "opacity-100" : "opacity-0"}`}
            onClick={close}
          >
            <style>{`@keyframes alphaMarq{from{transform:translateX(0)}to{transform:translateX(-50%)}}.alpha-marq{animation:alphaMarq 22s linear infinite}@media (prefers-reduced-motion:reduce){.alpha-marq{animation:none}}`}</style>
            <div
              role="dialog"
              aria-modal="true"
              aria-label={t(S.member)}
              onClick={(e) => e.stopPropagation()}
              className={`relative w-full max-w-[400px] rounded-t-[28px] bg-white px-6 pb-7 pt-6 text-center shadow-2xl transition duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] sm:rounded-[28px] dark:bg-[#1c1c24] ${shown ? "translate-y-0 opacity-100 sm:scale-100" : "translate-y-6 opacity-0 sm:scale-[0.97]"}`}
            >
              <button
                type="button"
                onClick={close}
                aria-label={t(S.close)}
                className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full text-neutral-400 transition hover:bg-black/5 hover:text-neutral-700 dark:hover:bg-white/10 dark:hover:text-white"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
              <div className="mx-auto grid h-[112px] w-[112px] place-items-center">
                <LottiePlayer src={`${base}.json`} size={112} />
              </div>
              <div className="mt-2 truncate text-[20px] font-bold text-neutral-900 dark:text-white">{name}</div>
              <div className="mt-1.5 inline-flex rounded-full bg-gradient-to-r from-[#0148fc]/10 to-[#963fff]/15 px-3 py-1 dark:from-[#0c8ce9]/15 dark:to-[#9a5cff]/20">
                <span className="bg-gradient-to-r from-[#0148fc] to-[#963fff] bg-clip-text text-[13px] font-bold text-transparent dark:from-[#0c8ce9] dark:to-[#b08cff]">
                  {t(S.member)}
                </span>
              </div>
              <div className="relative mt-4 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
                <div className="alpha-marq flex w-max whitespace-nowrap text-[15px] font-medium text-neutral-500 dark:text-neutral-400">
                  <span className="pr-10">{t(S.marquee)}</span>
                  <span className="pr-10" aria-hidden="true">{t(S.marquee)}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  close();
                  startAlphaMusic();
                  setPaywall(true);
                }}
                className="mt-6 h-[52px] w-full rounded-2xl bg-gradient-to-r from-[#0148fc] via-[#5a4dff] to-[#963fff] text-[17px] font-bold text-white shadow-[0_10px_24px_rgba(90,80,255,0.3)] transition hover:-translate-y-0.5 dark:from-[#0c8ce9] dark:via-[#4f86ff] dark:to-[#9a5cff]"
              >
                {t(S.join)}
              </button>
            </div>
          </div>,
          document.body,
        )}
      {mounted && createPortal(<AlphaPaywall open={paywall} onClose={() => setPaywall(false)} onActivate={() => setPaywall(false)} />, document.body)}
    </>
  );
}
