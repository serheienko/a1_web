// components/alpha-wallet.tsx
//
// 09.10.2026 (Александр: «ты только сделал альфу, а другие функции…»):
// Wallet как в приложении (styled_wallet_modal_item.dart) -- стеклянное окно
// с тремя плитками:
//   • «Подарувати Alpha» -> выбрать контакт -> окно подарка (оплата ещё не
//     подключена: «Скоро»);
//   • «Купити Alpha»     -> окно Alpha (тарифы);
//   • «Закріпити пост»   -> 50% прозрачности, пока закрепов нет.
// Только на тестовой копии сайта (меню показывает пункт при alpha.enabled).
"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { LottiePlayer } from "@/components/lottie-player";
import { AlphaFeatureGrid, AlphaPaywall, CanVideo, PlanCard, alphaText, startAlphaMusic } from "@/components/alpha-paywall";
import { ContactsPickerModal, type PickedContact } from "@/components/chat/contacts-picker-modal";
import { TIER_PRICES, formatUsd, guessCountry, tierForCountry } from "@/lib/premium/pricing";
import { backdropDismiss } from "@/lib/use-backdrop-dismiss";
import type { Locale } from "@/components/t";

type L = Record<"uk" | "ru" | "en", string>;
const W = {
  wallet: { uk: "Гаманець", ru: "Кошелёк", en: "Wallet" },
  gift: { uk: "Подарувати Alpha", ru: "Подарить Alpha", en: "Gift Alpha" },
  buy: { uk: "Купити Alpha", ru: "Купить Alpha", en: "Buy Alpha" },
  pin: { uk: "Закріпити пост", ru: "Закрепить пост", en: "Pin Post" },
  soonPin: { uk: "Незабаром", ru: "Скоро", en: "Soon" },
  giftTitle: { uk: "Подарувати A1 Alpha", ru: "Подарить A1 Alpha", en: "Gift A1 Alpha" },
  giftSub: { uk: "Подаруйте {n} всі можливості A1 Alpha", ru: "Подарите {n} все возможности A1 Alpha", en: "Give {n} everything in A1 Alpha" },
  friend: { uk: "другу", ru: "другу", en: "a friend" },
  giftFor: { uk: "Подарувати за {p}", ru: "Подарить за {p}", en: "Gift for {p}" },
  m1: { uk: "1 місяць", ru: "1 месяц", en: "1 month" },
  m3: { uk: "3 місяці", ru: "3 месяца", en: "3 months" },
  m12: { uk: "12 місяців", ru: "12 месяцев", en: "12 months" },
  soon: { uk: "Оплата ще підключається — подарунки скоро будуть доступні", ru: "Оплата ещё подключается — подарки скоро будут доступны", en: "Payments are being connected — gifts are coming soon" },
  close: { uk: "Закрити", ru: "Закрыть", en: "Close" },
} satisfies Record<string, L>;

function tr(lang: Locale, v: L): string {
  return lang === "uk" || lang === "ru" ? v[lang] : v.en;
}

export function WalletIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-wallet-shake" aria-hidden="true">
      <path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h14a2 2 0 0 1 2 2v3" />
      <path d="M3 5v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3" />
      <path d="M17 12h4v4h-4a2 2 0 0 1 0-4Z" />
    </svg>
  );
}

function Tile({ src, title, selected, disabled, badge, still, onClick }: { src: string; title: string; selected?: boolean; disabled?: boolean; badge?: string; still?: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      aria-disabled={disabled}
      className={`group flex min-w-0 flex-1 flex-col items-center gap-2 ${disabled ? "cursor-default opacity-50" : ""}`}
    >
      <span
        className={`relative grid h-[120px] w-full place-items-center rounded-[14px] bg-white shadow-[0_4px_18px_rgba(51,94,247,0.2)] transition dark:bg-[#2a2a2e] dark:shadow-none ${selected ? "ring-2 ring-[#335ef7]" : ""} ${disabled ? "" : "group-hover:-translate-y-0.5"}`}
      >
        <LottiePlayer src={src} size={96} placeholder={false} still={still} />
        {badge && <span className="absolute right-1.5 top-1.5 rounded-full bg-neutral-900/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">{badge}</span>}
      </span>
      <span className="text-center text-[13px] font-semibold leading-tight text-neutral-900 dark:text-white">{title}</span>
    </button>
  );
}

export function AlphaWallet({ open, lang, onClose }: { open: boolean; lang: Locale; onClose: () => void }) {
  const [shown, setShown] = useState(false);
  const [paywall, setPaywall] = useState(false);
  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState<PickedContact | null>(null);
  const [gift, setGift] = useState<PickedContact | null>(null);
  useEffect(() => {
    if (!open) {
      setShown(false);
      return;
    }
    const r = requestAnimationFrame(() => setShown(true));
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(r);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (typeof document === "undefined") return null;
  return (
    <>
      {open &&
        createPortal(
          <div
            className={`fixed inset-0 z-[205] flex items-end justify-center bg-black/30 px-2 pb-3 transition-opacity duration-200 sm:items-center sm:p-4 ${shown ? "opacity-100" : "opacity-0"}`}
            {...backdropDismiss(onClose)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label={tr(lang, W.wallet)}
              className={`relative w-full max-w-[460px] rounded-[30px] border border-white/60 bg-white/70 px-4 pb-9 pt-6 shadow-[0_0_10px_rgba(0,0,0,0.1)] backdrop-blur-[15px] transition duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] dark:border-white/10 dark:bg-[#1c1c1c]/80 ${shown ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"}`}
            >
              <button
                type="button"
                onClick={onClose}
                aria-label={tr(lang, W.close)}
                className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full text-neutral-400 transition hover:bg-black/5 hover:text-neutral-700 dark:hover:bg-white/10 dark:hover:text-white"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
              <div className="text-center text-[20px] font-bold text-neutral-900 dark:text-white">{tr(lang, W.wallet)}</div>
              <div className="mt-10 flex items-start gap-[15px]">
                <Tile
                  src="/premium/wallet/gift_premium.json"
                  title={tr(lang, W.gift)}
                  onClick={() => {
                    onClose();
                    setPicked(null);
                    setPicking(true);
                  }}
                />
                <Tile
                  src="/premium/wallet/buy_premium.json"
                  title={tr(lang, W.buy)}
                  selected
                  onClick={() => {
                    onClose();
                    startAlphaMusic();
                    setPaywall(true);
                  }}
                />
                {/* 09.10.2026 (Александр): кот закрепа -- статичная картинка, не анимация. */}
                <Tile src="/premium/wallet/pin_post.json" title={tr(lang, W.pin)} disabled still={150} badge={tr(lang, W.soonPin)} onClick={() => {}} />
              </div>
            </div>
          </div>,
          document.body,
        )}
      {picking &&
        createPortal(
          <ContactsPickerModal
            lang={lang}
            pickedUserIds={new Set(picked ? [picked.userId] : [])}
            onToggle={(c) => setPicked((p) => (p?.userId === c.userId ? null : c))}
            onClose={() => setPicking(false)}
            onSend={() => {
              setPicking(false);
              if (picked) setGift(picked);
            }}
            sending={false}
          />,
          document.body,
        )}
      {gift && createPortal(<GiftSheet lang={lang} to={gift} onClose={() => setGift(null)} />, document.body)}
      {createPortal(<AlphaPaywall open={paywall} onClose={() => setPaywall(false)} onActivate={() => setPaywall(false)} />, document.body)}
    </>
  );
}

function GiftSheet({ lang, to, onClose }: { lang: Locale; to: PickedContact; onClose: () => void }) {
  // 09.10.2026 (Александр: «сделать по аналогии с приложением… банку в два раза
  // меньше, на фоне в цвет видео, со всеми описаниями»): как окно Alpha --
  // тот же фон #232330 (цвет видео банки), банка-видео поменьше, название,
  // для кого, тарифы, «Що ще дає Alpha», условия и круглая кнопка подарка.
  const [shown, setShown] = useState(false);
  const [plan, setPlan] = useState<"month" | "quarter" | "year">("year");
  const [soon, setSoon] = useState(false);
  const [country, setCountry] = useState<string | null>(null);
  useEffect(() => {
    setCountry(guessCountry());
    const r = requestAnimationFrame(() => setShown(true));
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(r);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);
  const price = TIER_PRICES[tierForCountry(country)];
  const total = plan === "month" ? price.month : plan === "quarter" ? price.quarterTotal : price.yearTotal;
  const name = (to.summary?.fullName || `${to.firstName} ${to.lastName}`).trim();
  return (
    <div className={`fixed inset-0 z-[215] flex items-end justify-center bg-black/50 p-1.5 backdrop-blur-[3px] transition-opacity duration-200 sm:items-center sm:p-4 ${shown ? "opacity-100" : "opacity-0"}`} {...backdropDismiss(onClose)}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={tr(lang, W.giftTitle)}
        className={`relative flex max-h-[calc(100dvh-12px)] w-full max-w-[460px] flex-col overflow-hidden rounded-[35px_35px_50px_50px] border border-white bg-white text-[#0b0b14] shadow-[0_30px_80px_rgba(20,30,80,0.35)] transition duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] sm:max-h-[calc(100dvh-32px)] dark:border-[#313136] dark:bg-[#232330] dark:text-white ${shown ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"}`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={tr(lang, W.close)}
          className="group absolute right-3.5 top-3.5 z-10 grid h-10 w-10 place-items-center rounded-full text-[#8e8e93] transition duration-200 hover:scale-110 hover:bg-black/5 hover:text-[#3a3a3c] active:scale-95 dark:hover:bg-white/10 dark:hover:text-white"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="transition duration-300 group-hover:rotate-90"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
        <div className="min-h-0 flex-1 overflow-y-auto pb-28">
          <div className="flex justify-center pt-6">
            <div className="relative h-[136px] w-[136px] sm:h-[150px] sm:w-[150px]">
              <CanVideo />
            </div>
          </div>
          <div className="px-5">
            <h2 className="mt-2 text-center text-[28px] font-bold tracking-[-0.02em]">{tr(lang, W.giftTitle)}</h2>
            <p className="mx-auto mt-1.5 max-w-[340px] text-center text-[15px] font-medium text-[#8e8e93]">{tr(lang, W.giftSub).replace("{n}", name || tr(lang, W.friend))}</p>
            <div className="mt-5 grid grid-cols-1 gap-2.5">
              <PlanCard active={plan === "month"} onClick={() => setPlan("month")} title={alphaText("month", lang)} price={formatUsd(price.month)} per={alphaText("perMonth", lang)} />
              <PlanCard active={plan === "quarter"} onClick={() => setPlan("quarter")} title={alphaText("quarter", lang)} badge="−17%" price={formatUsd(price.quarterPerMonth)} per={alphaText("perMonth", lang)} note={`${formatUsd(price.quarterTotal)} ${alphaText("quarterOnce", lang)}`} />
              <PlanCard active={plan === "year"} onClick={() => setPlan("year")} title={alphaText("year", lang)} badge={alphaText("save", lang)} price={formatUsd(price.yearPerMonth)} per={alphaText("perMonth", lang)} note={`${formatUsd(price.yearTotal)} ${alphaText("yearOnce", lang)}`} />
            </div>
            <h3 className="mt-6 text-[20px] font-bold tracking-[-0.02em]">{alphaText("alsoTitle", lang)}</h3>
            <p className="mb-3 mt-1 text-[14px] text-[#6b6b78] dark:text-[#a9a9b8]">{alphaText("alsoSub", lang)}</p>
            <AlphaFeatureGrid lang={lang} />
            <p className="mt-5 text-center text-[11.5px] leading-snug text-[#a0a0aa]">{alphaText("footer", lang)}</p>
          </div>
        </div>
        {/* Мягкое затухание списка под кнопкой, как в приложении. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[130px] bg-gradient-to-b from-white/0 via-white/85 to-white dark:from-[#232330]/0 dark:via-[#232330]/85 dark:to-[#232330]" />
        <div className="absolute inset-x-4 bottom-4">
          {soon && <div className="mb-2 rounded-2xl bg-[#5a4dff]/10 px-4 py-2.5 text-center text-[13.5px] font-medium text-[#5a4dff] backdrop-blur dark:bg-[#5a4dff]/20 dark:text-[#c9bbff]">{tr(lang, W.soon)}</div>}
          <button
            type="button"
            onClick={() => setSoon(true)}
            className="h-[58px] w-full rounded-[30px] bg-gradient-to-r from-[#0148fc] via-[#5a4dff] to-[#963fff] text-[16px] font-bold uppercase tracking-wide text-white shadow-[0_10px_24px_rgba(90,80,255,0.3)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(110,77,255,0.45)] active:scale-[0.99] dark:from-[#0c8ce9] dark:via-[#4f86ff] dark:to-[#9a5cff]"
          >
            {tr(lang, W.giftFor).replace("{p}", formatUsd(total))}
          </button>
        </div>
      </div>
    </div>
  );
}
