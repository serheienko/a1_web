// components/alpha-member-badge.tsx
//
// 08.10.2026 (Александр): «на сайте… просто будет значок. У нас появится
// значок возле имени, типа консерва. При нажатии на неё будет всплывать
// поп-ап, точно так же, как в приложении… бегущая строка… написано, что это
// альфа-мембер, чтобы другие понимали, что это за хреновина, и что её можно
// купить». Значок = статичный кадр (webp, лёгкий); в попапе — живая анимация.
//
// 09.10.2026 (Александр: «ты только сделал альфу, а другие функции, там,
// бегущую строку…») — как в приложении:
//   • чужая банка -> его СВОЯ бегущая строка (profileTitle; если пусто — что
//     такое Alpha), «<Имя> — учасник клубу A1 Alpha», цены, «Приєднатися»;
//   • своя банка -> панель «как мысль из банки»: поле бегущей строки (до 80
//     знаков, без ссылок, зелёная ✓ появляется, когда текст изменён, ✕ —
//     очистить) и 25 банок + 25 рыб, выбор сохраняется сразу.
"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlphaPaywall, startAlphaMusic } from "@/components/alpha-paywall";
import { LottiePlayer } from "@/components/lottie-player";
import { useAlphaMe } from "@/components/alpha-search";
import {
  ALPHA_BADGE_EVENT,
  ALPHA_TITLE_MAX,
  alphaEmojiPath,
  alphaTitleHasLink,
  type AlphaBadgeChange,
  type AlphaMember,
} from "@/lib/alpha/member";
import { TIER_PRICES, formatUsd, guessCountry, tierForCountry } from "@/lib/premium/pricing";
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
  club: { uk: "{n} — учасник клубу A1 Alpha", en: "{n} is a member of the A1 Alpha club", ru: "{n} — участник клуба A1 Alpha", de: "{n} ist Mitglied im A1 Alpha Club", es: "{n} es miembro del club A1 Alpha", fr: "{n} est membre du club A1 Alpha", pl: "{n} jest członkiem klubu A1 Alpha", ptBR: "{n} é membro do clube A1 Alpha", zh: "{n} 是 A1 Alpha 俱乐部成员" },
  joinLine: { uk: "Приєднуйтесь — і у Вас теж буде свій значок і статус", en: "Join and get your own badge and status too", ru: "Присоединяйтесь — и у Вас тоже будет свой значок и статус", de: "Treten Sie bei und erhalten Sie Ihr eigenes Abzeichen und Ihren Status", es: "Únase y tenga también su propia insignia y estado", fr: "Rejoignez-nous pour avoir votre propre badge et statut", pl: "Dołącz i miej własną odznakę i status", ptBR: "Entre e tenha também seu próprio selo e status", zh: "加入后您也会拥有自己的徽章和状态" },
  m1: { uk: "1 міс", en: "1 mo", ru: "1 мес", de: "1 Mon.", es: "1 mes", fr: "1 mois", pl: "1 mies.", ptBR: "1 mês", zh: "1 个月" },
  m3: { uk: "3 міс", en: "3 mo", ru: "3 мес", de: "3 Mon.", es: "3 meses", fr: "3 mois", pl: "3 mies.", ptBR: "3 meses", zh: "3 个月" },
  m12: { uk: "12 міс", en: "12 mo", ru: "12 мес", de: "12 Mon.", es: "12 meses", fr: "12 mois", pl: "12 mies.", ptBR: "12 meses", zh: "12 个月" },
  perMonth: { uk: "/міс", en: "/mo", ru: "/мес", de: "/Mon.", es: "/mes", fr: "/mois", pl: "/mies.", ptBR: "/mês", zh: "/月" },
  join: { uk: "Приєднатися до Alpha", en: "Join Alpha", ru: "Присоединиться к Alpha", de: "Alpha beitreten", es: "Unirse a Alpha", fr: "Rejoindre Alpha", pl: "Dołącz do Alpha", ptBR: "Entrar no Alpha", zh: "加入 Alpha" },
  close: { uk: "Закрити", en: "Close", ru: "Закрыть", de: "Schließen", es: "Cerrar", fr: "Fermer", pl: "Zamknij", ptBR: "Fechar", zh: "关闭" },
  titleHint: { uk: "Назва компанії, настрій чи думки", en: "Company name, mood or your thoughts", ru: "Название компании, настроение или мысли", de: "Firmenname, Stimmung oder Gedanken", es: "Empresa, estado de ánimo o ideas", fr: "Entreprise, humeur ou pensées", pl: "Nazwa firmy, nastrój lub myśli", ptBR: "Empresa, humor ou pensamentos", zh: "公司名称、心情或想法" },
  noLinks: { uk: "Посилання в статусі не можна", en: "Links are not allowed in the title", ru: "Ссылки в статусе нельзя", de: "Links sind im Titel nicht erlaubt", es: "No se permiten enlaces", fr: "Les liens ne sont pas autorisés", pl: "Linki w statusie są niedozwolone", ptBR: "Links não são permitidos", zh: "状态中不能包含链接" },
  saveError: { uk: "Не вдалося зберегти. Спробуйте ще раз", en: "Could not save. Please try again", ru: "Не удалось сохранить. Попробуйте ещё раз", de: "Speichern fehlgeschlagen. Bitte erneut versuchen", es: "No se pudo guardar. Inténtelo de nuevo", fr: "Échec de l’enregistrement. Réessayez", pl: "Nie udało się zapisać. Spróbuj ponownie", ptBR: "Não foi possível salvar. Tente novamente", zh: "保存失败，请重试" },
  saved: { uk: "Статус оновлено", en: "Title updated", ru: "Статус обновлён", de: "Titel aktualisiert", es: "Estado actualizado", fr: "Statut mis à jour", pl: "Status zaktualizowany", ptBR: "Status atualizado", zh: "状态已更新" },
  save: { uk: "Зберегти", en: "Save", ru: "Сохранить", de: "Speichern", es: "Guardar", fr: "Enregistrer", pl: "Zapisz", ptBR: "Salvar", zh: "保存" },
  clear: { uk: "Очистити", en: "Clear", ru: "Очистить", de: "Leeren", es: "Borrar", fr: "Effacer", pl: "Wyczyść", ptBR: "Limpar", zh: "清除" },
  until: { uk: "Alpha активна до {d}", en: "Alpha is active until {d}", ru: "Alpha активна до {d}", de: "Alpha aktiv bis {d}", es: "Alpha activa hasta {d}", fr: "Alpha active jusqu’au {d}", pl: "Alpha aktywna do {d}", ptBR: "Alpha ativo até {d}", zh: "Alpha 有效期至 {d}" },
} satisfies Record<string, T9>;

// --- who am I (asked only when a badge is tapped) ---------------------------
let whoami: Promise<string | null> | null = null;
function myUsername(): Promise<string | null> {
  if (typeof document !== "undefined" && !document.cookie.includes("a1_user=")) return Promise.resolve(null);
  whoami ??= fetch("/api/account/whoami", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .then((d: { ok?: boolean; username?: string } | null) => (d?.ok && d.username ? d.username : null))
    .catch(() => null);
  return whoami;
}

const titles = new Map<string, Promise<string | null>>();
function loadTitle(username: string): Promise<string | null> {
  let p = titles.get(username);
  if (!p) {
    p = fetch(`/api/alpha/badge?username=${encodeURIComponent(username)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { title: null }))
      .then((d: { title?: string | null }) => d.title ?? null)
      .catch(() => null);
    titles.set(username, p);
  }
  return p;
}

function announce(change: AlphaBadgeChange) {
  if (change.title !== undefined) titles.set(change.username, Promise.resolve(change.title));
  window.dispatchEvent(new CustomEvent<AlphaBadgeChange>(ALPHA_BADGE_EVENT, { detail: change }));
}

export function AlphaMemberBadge({
  member,
  name,
  username,
  title,
  size = 18,
  className = "",
  animate = false,
}: {
  member: AlphaMember | null | undefined;
  name: string;
  /** Lets the badge tell «my own can» from someone else's and load their running line. */
  username?: string | null;
  /** The running line when the page already has it (profile page). */
  title?: string | null;
  size?: number;
  className?: string;
  /** 09.10.2026 (Александр): в профиле банка крутится нон-стоп (как в приложении);
   *  в ленте -- статичный кадр, чтобы десятки анимаций не грузили список. */
  animate?: boolean;
}) {
  const locale = useActiveLocale();
  const t = (v: T9) => (v as Record<string, string>)[locale] ?? v.en;
  const [mode, setMode] = useState<null | "sheet" | "panel" | "hover">(null);
  // 09.10.2026 (Александр: «при наведении на банку открывался этот поп-ап»):
  // на компьютере наведение открывает своё окно банки, а у чужой -- карточку.
  // Окно, открытое наведением, закрывается, когда мышь ушла (если в нём
  // ничего не начали делать -- тогда остаётся до клика мимо или Esc).
  const [byHover, setByHover] = useState(false);
  const hoverTimer = useRef<number | null>(null);
  const leaveTimer = useRef<number | null>(null);
  const sticky = useRef(false);
  const [shown, setShown] = useState(false);
  const [paywall, setPaywall] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [emojiId, setEmojiId] = useState<number | null>(null);
  const [line, setLine] = useState<string | null | undefined>(title);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const btn = useRef<HTMLButtonElement>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => setLine(title), [title]);
  useEffect(() => {
    if (!username) return;
    const on = (e: Event) => {
      const d = (e as CustomEvent<AlphaBadgeChange>).detail;
      if (d.username !== username) return;
      if (d.emojiId !== undefined) setEmojiId(d.emojiId);
      if (d.title !== undefined) setLine(d.title);
    };
    window.addEventListener(ALPHA_BADGE_EVENT, on);
    return () => window.removeEventListener(ALPHA_BADGE_EVENT, on);
  }, [username]);
  useEffect(() => {
    if (!mode) return;
    const r = requestAnimationFrame(() => setShown(true));
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(r);
      document.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  if (!member) return null;
  const current = emojiId ?? member.emojiId;
  const base = alphaEmojiPath(current);

  function close() {
    setShown(false);
    setByHover(false);
    sticky.current = false;
    window.setTimeout(() => setMode(null), 220);
  }

  async function open(hover = false) {
    setAnchor(btn.current?.getBoundingClientRect() ?? null);
    sticky.current = false;
    setByHover(hover);
    const me = username ? await myUsername() : null;
    if (me && username && me.toLowerCase() === username.toLowerCase()) {
      if (line === undefined) setLine(await loadTitle(username));
      setMode("panel");
      return;
    }
    setMode(hover ? "hover" : "sheet");
    if (line === undefined && username) void loadTitle(username).then(setLine);
  }

  const canHover = () => typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  function hoverIn() {
    if (leaveTimer.current) window.clearTimeout(leaveTimer.current);
    leaveTimer.current = null;
    if (mode || !canHover()) return;
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => void open(true), 220);
  }
  function hoverOut() {
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    hoverTimer.current = null;
    if (!byHover || sticky.current) return;
    if (leaveTimer.current) window.clearTimeout(leaveTimer.current);
    leaveTimer.current = window.setTimeout(() => {
      if (!sticky.current) close();
    }, 350);
  }

  return (
    <>
      <button
        ref={btn}
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (mode === "hover") {
            // A click on the hovered can: the full window (prices, Join).
            setMode("sheet");
            setByHover(false);
            return;
          }
          if (mode === "panel") {
            sticky.current = true;
            return;
          }
          void open();
        }}
        onMouseEnter={hoverIn}
        onMouseLeave={hoverOut}
        aria-label={t(S.member)}
        data-alpha-badge=""
        className={`relative z-10 inline-flex shrink-0 items-center justify-center align-middle transition hover:scale-110 ${className}`}
        style={{ width: size, height: size }}
      >
        {animate ? (
          <LottiePlayer key={base} src={`${base}.json`} size={size} placeholder={false} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`${base}.webp`} alt="" width={size} height={size} className="h-full w-full object-contain" />
        )}
      </button>

      {mounted &&
        mode === "sheet" &&
        createPortal(
          <MemberSheet
            t={t}
            name={name}
            base={base}
            line={line ?? null}
            shown={shown}
            onClose={close}
            onJoin={() => {
              close();
              startAlphaMusic();
              setPaywall(true);
            }}
          />,
          document.body,
        )}
      {mounted &&
        mode === "hover" &&
        anchor &&
        createPortal(
          <HoverCard
            t={t}
            name={name}
            base={base}
            line={line ?? null}
            anchor={anchor}
            shown={shown}
            onEnter={hoverIn}
            onLeave={hoverOut}
            onJoin={() => {
              close();
              startAlphaMusic();
              setPaywall(true);
            }}
          />,
          document.body,
        )}
      {mounted &&
        mode === "panel" &&
        username &&
        createPortal(
          <OwnPanel
            t={t}
            locale={locale}
            anchor={anchor}
            shown={shown}
            until={member.until}
            emojiId={current}
            title={line ?? ""}
            onClose={close}
            hover={byHover}
            onEnter={hoverIn}
            onLeave={hoverOut}
            onUse={() => {
              sticky.current = true;
            }}
            onEmoji={(id) => {
              setEmojiId(id);
              announce({ username, emojiId: id });
            }}
            onTitle={(text) => {
              setLine(text || null);
              announce({ username, title: text || null });
            }}
          />,
          document.body,
        )}
      {mounted && createPortal(<AlphaPaywall open={paywall} onClose={() => setPaywall(false)} onActivate={() => setPaywall(false)} />, document.body)}
    </>
  );
}

// --- someone else's can --------------------------------------------------------
function MemberSheet({
  t,
  name,
  base,
  line,
  shown,
  onClose,
  onJoin,
}: {
  t: (v: T9) => string;
  name: string;
  base: string;
  line: string | null;
  shown: boolean;
  onClose: () => void;
  onJoin: () => void;
}) {
  const me = useAlphaMe(true);
  const [country, setCountry] = useState<string | null>(null);
  useEffect(() => setCountry(guessCountry()), []);
  const price = TIER_PRICES[tierForCountry(country)];
  const text = line?.trim() || t(S.marquee);
  // A short own line would look lonely running alone -- repeat it.
  const run = text.length < 40 ? `${text}  ✦  ${text}  ✦  ${text}` : text;
  const plans: [T9, number][] = [
    [S.m1, price.month],
    [S.m3, price.quarterPerMonth],
    [S.m12, price.yearPerMonth],
  ];
  return (
    <div
      className={`fixed inset-0 z-[210] flex items-end justify-center bg-black/40 backdrop-blur-[4px] transition-opacity duration-200 sm:items-center sm:p-4 ${shown ? "opacity-100" : "opacity-0"}`}
      onClick={onClose}
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
          onClick={onClose}
          aria-label={t(S.close)}
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full text-neutral-400 transition hover:bg-black/5 hover:text-neutral-700 dark:hover:bg-white/10 dark:hover:text-white"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
        <div className="mx-auto grid h-[112px] w-[112px] place-items-center">
          <LottiePlayer src={`${base}.json`} size={112} />
        </div>
        {/* The person's own running line -- like the app's field-shaped pill. */}
        <div className="relative mt-3 h-[46px] overflow-hidden rounded-full border border-black/[0.06] bg-neutral-50 [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)] dark:border-white/10 dark:bg-white/[0.06]">
          <div className="alpha-marq flex h-full w-max items-center whitespace-nowrap text-[15px] font-medium text-neutral-800 dark:text-neutral-100">
            <span className="pr-12">{run}</span>
            <span className="pr-12" aria-hidden="true">{run}</span>
          </div>
        </div>
        <div className="mt-3 text-[15px] font-semibold text-neutral-900 dark:text-white">{t(S.club).replace("{n}", name)}</div>
        {!me.member && (
          <>
            <div className="mt-1 text-[13px] text-neutral-500 dark:text-neutral-400">{t(S.joinLine)}</div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {plans.map(([label, usd], i) => (
                <div
                  key={i}
                  className={`rounded-2xl border px-2 py-2.5 ${i === 2 ? "border-[#5a4dff] bg-[#5a4dff]/[0.06] dark:border-[#9a5cff]" : "border-black/[0.08] dark:border-white/10"}`}
                >
                  <div className="text-[12px] text-neutral-500 dark:text-neutral-400">{t(label)}</div>
                  <div className="mt-0.5 text-[15px] font-bold text-neutral-900 dark:text-white">
                    {formatUsd(usd)}
                    <span className="text-[11px] font-medium text-neutral-500">{t(S.perMonth)}</span>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={onJoin}
              className="mt-5 h-[52px] w-full rounded-2xl bg-gradient-to-r from-[#0148fc] via-[#5a4dff] to-[#963fff] text-[17px] font-bold text-white shadow-[0_10px_24px_rgba(90,80,255,0.3)] transition hover:-translate-y-0.5 dark:from-[#0c8ce9] dark:via-[#4f86ff] dark:to-[#9a5cff]"
            >
              {t(S.join)}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// --- someone else's can, hovered (computer) -----------------------------------
function HoverCard({
  t,
  name,
  base,
  line,
  anchor,
  shown,
  onEnter,
  onLeave,
  onJoin,
}: {
  t: (v: T9) => string;
  name: string;
  base: string;
  line: string | null;
  anchor: DOMRect;
  shown: boolean;
  onEnter: () => void;
  onLeave: () => void;
  onJoin: () => void;
}) {
  const me = useAlphaMe(true);
  const [country, setCountry] = useState<string | null>(null);
  useEffect(() => setCountry(guessCountry()), []);
  const price = TIER_PRICES[tierForCountry(country)];
  const text = line?.trim() || t(S.marquee);
  const run = text.length < 40 ? `${text}  ✦  ${text}  ✦  ${text}` : text;
  const W = 320;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
  const ax = anchor.left + anchor.width / 2;
  const left = Math.max(10, Math.min(ax - W / 2, vw - W - 10));
  return (
    <div
      role="dialog"
      aria-label={t(S.member)}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className={`fixed z-[210] rounded-[24px] border border-black/[0.06] bg-white/95 p-4 text-center shadow-[0_18px_50px_rgba(30,30,90,0.25)] backdrop-blur-xl transition duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] dark:border-white/10 dark:bg-[#1c1c24]/95 ${shown ? "translate-y-0 scale-100 opacity-100" : "-translate-y-1 scale-95 opacity-0"}`}
      style={{ left, top: anchor.bottom + 10, width: W, transformOrigin: `${ax - left}px 0` }}
    >
      <style>{`@keyframes alphaMarq{from{transform:translateX(0)}to{transform:translateX(-50%)}}.alpha-marq{animation:alphaMarq 22s linear infinite}@media (prefers-reduced-motion:reduce){.alpha-marq{animation:none}}`}</style>
      <div className="mx-auto grid h-[72px] w-[72px] place-items-center">
        <LottiePlayer src={`${base}.json`} size={72} placeholder={false} />
      </div>
      <div className="relative mt-2 h-[38px] overflow-hidden rounded-full border border-black/[0.06] bg-neutral-50 [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)] dark:border-white/10 dark:bg-white/[0.06]">
        <div className="alpha-marq flex h-full w-max items-center whitespace-nowrap text-[14px] font-medium text-neutral-800 dark:text-neutral-100">
          <span className="pr-12">{run}</span>
          <span className="pr-12" aria-hidden="true">{run}</span>
        </div>
      </div>
      <div className="mt-2.5 text-[14px] font-semibold text-neutral-900 dark:text-white">{t(S.club).replace("{n}", name)}</div>
      {!me.member && (
        <>
          <div className="mt-0.5 text-[12.5px] text-neutral-500 dark:text-neutral-400">{t(S.joinLine)}</div>
          <button
            type="button"
            onClick={onJoin}
            className="mt-3 h-11 w-full rounded-2xl bg-gradient-to-r from-[#0148fc] via-[#5a4dff] to-[#963fff] text-[15px] font-bold text-white shadow-[0_8px_20px_rgba(90,80,255,0.3)] transition hover:-translate-y-0.5 dark:from-[#0c8ce9] dark:via-[#4f86ff] dark:to-[#9a5cff]"
          >
            {t(S.join)} · {formatUsd(price.yearPerMonth)}
            {t(S.perMonth)}
          </button>
        </>
      )}
    </div>
  );
}

// --- my own can: running line + 50 cans/fishes ------------------------------
function OwnPanel({
  t,
  locale,
  anchor,
  shown,
  until,
  emojiId,
  title,
  onClose,
  onEmoji,
  onTitle,
  hover = false,
  onEnter,
  onLeave,
  onUse,
}: {
  t: (v: T9) => string;
  locale: string;
  anchor: DOMRect | null;
  shown: boolean;
  until: number;
  emojiId: number;
  title: string;
  onClose: () => void;
  onEmoji: (id: number) => void;
  onTitle: (text: string) => void;
  /** Opened by hovering the can: no dimming, closes when the mouse leaves. */
  hover?: boolean;
  onEnter?: () => void;
  onLeave?: () => void;
  /** Something was typed or picked -- the window stays open. */
  onUse?: () => void;
}) {
  const [text, setText] = useState(title);
  const [saved, setSaved] = useState(title);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [selected, setSelected] = useState(emojiId);
  const changed = text.trim() !== saved.trim();
  useEffect(() => {
    if (!hover) return;
    const onDown = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      if (!el.closest?.("[data-alpha-own-panel]") && !el.closest?.("[data-alpha-badge]")) onClose();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [hover, onClose]);

  async function post(body: { emojiId?: number; title?: string | null }): Promise<boolean> {
    try {
      const r = await fetch("/api/alpha/badge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      return r.ok;
    } catch {
      return false;
    }
  }

  async function pick(id: number) {
    if (id === selected) return;
    const prev = selected;
    setSelected(id);
    onEmoji(id);
    if (!(await post({ emojiId: id }))) {
      setSelected(prev);
      onEmoji(prev);
      setError(t(S.saveError));
    }
  }

  async function saveTitle() {
    if (saving || !changed) return;
    const clean = text.trim();
    if (alphaTitleHasLink(clean)) {
      setError(t(S.noLinks));
      return;
    }
    setSaving(true);
    setError(null);
    const ok = await post({ title: clean || null });
    setSaving(false);
    if (!ok) {
      setError(t(S.saveError));
      return;
    }
    setSaved(clean);
    onTitle(clean);
    setToast(t(S.saved));
    window.setTimeout(() => setToast(null), 1400);
  }

  // Card under the can (like a thought bubble); full width on phones.
  const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const W = Math.min(380, vw - 20);
  const ax = anchor ? anchor.left + anchor.width / 2 : vw / 2;
  const top = Math.min((anchor?.bottom ?? 100) + 22, vh - 300);
  const left = Math.max(10, Math.min(ax - W / 2, vw - W - 10));
  const height = Math.max(260, Math.min(460, vh - top - 16));
  const date = new Date(until * 1000).toLocaleDateString(locale === "ptBR" ? "pt-BR" : locale, { day: "2-digit", month: "2-digit", year: "numeric" });
  const card = "bg-white/85 dark:bg-[#1c1c1e]/90";

  return (
    <div
      className={`fixed inset-0 z-[210] transition-opacity duration-200 ${hover ? "pointer-events-none bg-transparent" : "bg-black/30"} ${shown ? "opacity-100" : "opacity-0"}`}
      onClick={onClose}
    >
      {anchor && (
        <>
          <span className={`absolute h-[7px] w-[7px] rounded-full ${card}`} style={{ left: ax - 4, top: anchor.bottom + 1 }} />
          <span className={`absolute h-[13px] w-[13px] rounded-full ${card}`} style={{ left: ax - 16, top: anchor.bottom + 8 }} />
        </>
      )}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t(S.member)}
        data-alpha-own-panel=""
        onClick={(e) => e.stopPropagation()}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        onPointerDown={onUse}
        onKeyDown={onUse}
        className={`pointer-events-auto absolute flex flex-col overflow-hidden rounded-[26px] border border-white px-2.5 pt-4 shadow-2xl backdrop-blur-xl transition duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] dark:border-[#313136] ${card} ${shown ? "scale-100 opacity-100" : "scale-[0.6] opacity-0"}`}
        style={{ left, top, width: W, height, transformOrigin: `${ax - left}px -20px` }}
      >
        <div className="flex items-center px-1.5">
          <div className="relative min-w-0 flex-1">
            <input
              autoFocus
              value={text}
              maxLength={ALPHA_TITLE_MAX}
              placeholder={t(S.titleHint)}
              onChange={(e) => {
                setText(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && void saveTitle()}
              className="h-11 w-full rounded-full border border-black/[0.06] bg-white/90 pl-4 pr-9 text-[15px] text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-[#5a4dff]/50 dark:border-white/10 dark:bg-[#2c2c2e] dark:text-white"
            />
            {text && (
              <button
                type="button"
                aria-label={t(S.clear)}
                onClick={() => setText("")}
                className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full bg-neutral-300/70 text-white transition hover:bg-neutral-400 dark:bg-white/20"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            )}
          </div>
          {/* 09.10.2026 (Александр: «кнопка справа подвисает, когда удаляешь до
              прежнего состояния»): прячется целиком -- место под ней вместе
              с отступом сжимается до нуля, ничего не торчит справа. */}
          <div className={`shrink-0 overflow-hidden transition-all duration-200 ${changed ? "ml-2 w-10 opacity-100" : "pointer-events-none ml-0 w-0 opacity-0"}`}>
          <button
            type="button"
            aria-label={t(S.save)}
            onClick={() => void saveTitle()}
            disabled={!changed || saving}
            tabIndex={changed ? 0 : -1}
            className={`grid h-10 w-10 place-items-center rounded-full bg-[#23C280] text-white transition-transform duration-200 ${changed ? "scale-100" : "scale-50"}`}
          >
            {saving ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
            )}
          </button>
          </div>
        </div>
        <div className="flex min-h-[22px] items-center justify-between px-3 pt-1 text-[12px]">
          <span className={error ? "text-red-500" : toast ? "text-[#23C280]" : "text-neutral-400"}>{error ?? toast ?? t(S.until).replace("{d}", date)}</span>
          <span className="tabular-nums text-neutral-400">{text.length}/{ALPHA_TITLE_MAX}</span>
        </div>
        <div className="-mx-2.5 mt-1 grid flex-1 grid-cols-5 content-start gap-1 overflow-y-auto px-2.5 pb-3 [mask-image:linear-gradient(180deg,#000_88%,transparent)]">
          {Array.from({ length: 50 }, (_, i) => i + 1).map((id) => {
            const on = id === selected;
            return (
              <button
                key={id}
                type="button"
                onClick={() => void pick(id)}
                aria-pressed={on}
                className={`grid aspect-square place-items-center rounded-[14px] p-1.5 transition ${on ? "bg-black/[0.07] dark:bg-white/[0.14]" : "hover:bg-black/[0.04] dark:hover:bg-white/[0.07]"}`}
              >
                {/* 09.10.2026 (Александр: «надо, чтобы все банки крутились»): как в
                    приложении -- все 50 нон-стоп. */}
                <LottiePlayer src={`${alphaEmojiPath(id)}.json`} size={52} placeholder={false} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
