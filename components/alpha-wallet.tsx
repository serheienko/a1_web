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
import { AlphaPaywall, startAlphaMusic } from "@/components/alpha-paywall";
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
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
  const [shown, setShown] = useState(false);
  const [plan, setPlan] = useState<"m1" | "m3" | "m12">("m12");
  const [soon, setSoon] = useState(false);
  const [country, setCountry] = useState<string | null>(null);
  const [dark, setDark] = useState(false);
  useEffect(() => {
    setCountry(guessCountry());
    setDark(document.documentElement.classList.contains("dark"));
    const r = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(r);
  }, []);
  const price = TIER_PRICES[tierForCountry(country)];
  const total = plan === "m1" ? price.month : plan === "m3" ? price.quarterTotal : price.yearTotal;
  const name = [to.summary?.fullName ?? "", ""].join("").trim() || `${to.firstName} ${to.lastName}`.trim();
  const plans: { id: "m1" | "m3" | "m12"; label: string; sum: number }[] = [
    { id: "m1", label: tr(lang, W.m1), sum: price.month },
    { id: "m3", label: tr(lang, W.m3), sum: price.quarterTotal },
    { id: "m12", label: tr(lang, W.m12), sum: price.yearTotal },
  ];
  return (
    <div className={`fixed inset-0 z-[215] flex items-end justify-center bg-black/40 p-1.5 transition-opacity duration-200 sm:items-center sm:p-4 ${shown ? "opacity-100" : "opacity-0"}`} {...backdropDismiss(onClose)}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={tr(lang, W.giftTitle)}
        className={`relative w-full max-w-[420px] overflow-hidden rounded-[35px_35px_50px_50px] bg-[#f4f4f9] pb-6 shadow-2xl transition duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] dark:bg-[#1c1c20] ${shown ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"}`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={tr(lang, W.close)}
          className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-black/10 text-white transition hover:bg-black/20"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
        <video
          src={dark ? "/premium/can-dark.mp4" : "/premium/can-light.mp4"}
          poster={dark ? "/premium/can-dark.jpg" : "/premium/can-light.jpg"}
          autoPlay
          loop
          muted
          playsInline
          className="h-[220px] w-full object-cover"
        />
        <div className="px-5">
          <div className="mt-3 text-center text-[22px] font-bold text-neutral-900 dark:text-white">{tr(lang, W.giftTitle)}</div>
          <div className="mt-1 text-center text-[15px] text-neutral-500 dark:text-neutral-400">{tr(lang, W.giftSub).replace("{n}", name || tr(lang, W.friend))}</div>
          <div className="mt-5 flex flex-col gap-2">
            {plans.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPlan(p.id)}
                className={`flex items-center justify-between rounded-2xl border bg-white px-4 py-3 text-left transition dark:bg-[#2a2a2e] ${plan === p.id ? "border-[#5a4dff] ring-1 ring-[#5a4dff]" : "border-transparent"}`}
              >
                <span className="text-[15px] font-semibold text-neutral-900 dark:text-white">{p.label}</span>
                <span className="text-[15px] font-bold text-neutral-900 dark:text-white">{formatUsd(p.sum)}</span>
              </button>
            ))}
          </div>
          {soon && <div className="mt-4 rounded-2xl bg-[#5a4dff]/10 px-4 py-3 text-center text-[14px] font-medium text-[#5a4dff] dark:text-[#b08cff]">{tr(lang, W.soon)}</div>}
          <button
            type="button"
            onClick={() => setSoon(true)}
            className="mt-5 h-[58px] w-full rounded-[30px] bg-gradient-to-r from-[#0148fc] via-[#5a4dff] to-[#963fff] text-[16px] font-bold uppercase tracking-wide text-white shadow-[0_10px_24px_rgba(90,80,255,0.3)] transition hover:-translate-y-0.5"
          >
            {tr(lang, W.giftFor).replace("{p}", formatUsd(total))}
          </button>
        </div>
      </div>
    </div>
  );
}
