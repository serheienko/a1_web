// components/alpha-for-you.tsx
//
// 09.10.2026 (вечер, Александр): Alpha-поиск у участника -- одно поле, без
// фильтров и без вопросов, пока человек ищет. На главной под полем:
//  * поле пустое -> «Для Вас»: что Alpha помнит (2-3 чипа «Що / Де /
//    Гроші», тап -- выключить/включить части, ✎ -- рассказать заново) и
//    совпадения. Каждый заход -- свежая выдача (в пределах 5 минут -- та же,
//    без лишних запросов), новые вакансии помечены «Нове» + строка
//    «N нові з минулого разу». Alpha ещё ничего не знает -- одна строка
//    «Розкажіть Alpha про себе».
//  * что-то набрано -> блок «Люди і компанії» над вакансиями: имя
//    (traffband) -- люди сначала, 3 строки + «Усі»; запрос про работу
//    (flutter remote) -- люди свёрнуты в одну строку над лентой.
// Для всех остальных -- ничего: компонент молчит (участник ли, спрашивает
// /api/alpha/me, а он на проде выключен флагом PREMIUM_PREVIEW).
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AlphaPaywall } from "@/components/alpha-paywall";
import { ALPHA_PORTRAIT_EVENT, openAlphaAsk } from "@/components/alpha-ask";
import { looksLikeJobQuery, useAlphaMe } from "@/components/alpha-search";
import { CachedAvatar } from "@/components/cached-avatar";
import { BLUR_DATA_URL } from "@/lib/blur-placeholder";
import { pickDefaultCatAvatar } from "@/lib/avatars";
import { useActiveLocale } from "@/lib/use-active-locale";
import type { AlphaMatch, AlphaPortrait } from "@/lib/alpha/types";
import type { UserSearchHit } from "@/app/api/users/search/route";

type L = "uk" | "en" | "ru";
const lk = (lang: string): L => (lang === "uk" || lang === "ru" ? lang : "en");

const T = {
  forYou: { uk: "Для Вас", ru: "Для Вас", en: "For you" },
  what: { uk: "Що", ru: "Что", en: "What" },
  where: { uk: "Де", ru: "Где", en: "Where" },
  money: { uk: "Гроші", ru: "Деньги", en: "Money" },
  add: { uk: "+ Додати", ru: "+ Добавить", en: "+ Add" },
  addPh: { uk: "React, Kotlin, Figma…", ru: "React, Kotlin, Figma…", en: "React, Kotlin, Figma…" },
  retell: { uk: "Розповісти заново", ru: "Рассказать заново", en: "Tell again" },
  isNew: { uk: "Нове", ru: "Новое", en: "New" },
  newLine: { uk: "{n} нові з минулого разу", ru: "{n} новых с прошлого раза", en: "{n} new since last time" },
  none: {
    uk: "Поки нічого не підходить достатньо добре. Спробуйте вимкнути щось у чипах.",
    ru: "Пока ничего не подходит достаточно хорошо. Попробуйте выключить что-то в чипах.",
    en: "Nothing fits well enough yet. Try switching something off in the chips.",
  },
  allOff: { uk: "Увімкніть хоча б один пункт.", ru: "Включите хотя бы один пункт.", en: "Switch on at least one item." },
  more: { uk: "Показати ще", ru: "Показать ещё", en: "Show more" },
  tell: {
    uk: "Розкажіть Alpha про себе — підберу точніше",
    ru: "Расскажите Alpha о себе — подберу точнее",
    en: "Tell Alpha about yourself — better matches",
  },
  people: { uk: "Люди і компанії", ru: "Люди и компании", en: "People and companies" },
  all: { uk: "Усі ({n})", ru: "Все ({n})", en: "All ({n})" },
  less: { uk: "Згорнути", ru: "Свернуть", en: "Less" },
  similar: { uk: "Схожі люди і компанії · {n}", ru: "Похожие люди и компании · {n}", en: "Matching people and companies · {n}" },
  failed: { uk: "Не вдалося завантажити. Ще раз", ru: "Не удалось загрузить. Ещё раз", en: "Couldn't load. Retry" },
  remote: { uk: "віддалено", ru: "удалённо", en: "remote" },
  office: { uk: "офіс", ru: "офис", en: "office" },
  hybrid: { uk: "гібрид", ru: "гибрид", en: "hybrid" },
  from: { uk: "від", ru: "от", en: "from" },
  upTo: { uk: "до", ru: "до", en: "up to" },
} as const;

const FLOW = "linear-gradient(100deg,#0148fc 0%,#5a4dff 12.5%,#963fff 25%,#5a4dff 37.5%,#0148fc 50%,#5a4dff 62.5%,#963fff 75%,#5a4dff 87.5%,#0148fc 100%)";

/** Fresh again after this; within it the last result shows at once. */
const FRESH_MS = 5 * 60 * 1000;
const CACHE_KEY = "alpha_for_you_cache";
const SEEN_KEY = "alpha_for_you_seen";
const OFF_KEY = "alpha_for_you_off";
const SHOWN = 5;

function read<T>(store: "local" | "session", key: string): T | null {
  try {
    const s = store === "local" ? window.localStorage : window.sessionStorage;
    const raw = s.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function write(store: "local" | "session", key: string, value: unknown) {
  try {
    const s = store === "local" ? window.localStorage : window.sessionStorage;
    s.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode -- fine */
  }
}

/** The portrait as items: [key, label]. */
function portraitItems(p: AlphaPortrait, l: L): { what: [string, string][]; where: [string, string][]; money: [string, string][] } {
  const what: [string, string][] = p.stack.map((s) => [`stack:${s}`, s]);
  if (p.level) what.push(["level", p.level.charAt(0).toUpperCase() + p.level.slice(1)]);
  const f = p.format;
  const where: [string, string][] = f === "remote" || f === "office" || f === "hybrid" ? [["format", T[f][l]]] : [];
  const money: [string, string][] = [];
  if (p.money != null && p.money > 0) {
    const k = p.money >= 1000 ? `$${Math.round(p.money / 100) / 10}k` : `$${p.money}`;
    money.push(["money", `${p.role === "hiring" ? T.upTo[l] : T.from[l]} ${k}`]);
  }
  return { what, where, money };
}

/** The saved portrait with the switched-off items taken out. */
function effective(p: AlphaPortrait, off: Set<string>): AlphaPortrait {
  return {
    ...p,
    stack: p.stack.filter((s) => !off.has(`stack:${s}`)),
    level: off.has("level") ? null : p.level,
    format: off.has("format") ? null : p.format,
    money: off.has("money") ? null : p.money,
  };
}

type Cache = { at: number; portrait: AlphaPortrait | null; matches: AlphaMatch[]; fresh: string[]; unknown: boolean };

async function searchAlpha(lang: string, portrait: AlphaPortrait | null, remember = true): Promise<{ matches: AlphaMatch[]; portrait: AlphaPortrait | null } | "unknown"> {
  const res = await fetch("/api/alpha/search", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ lang, ...(portrait ? { portrait } : {}), ...(remember ? {} : { remember: false }) }),
  });
  if (res.status === 404 && !portrait) return "unknown";
  if (!res.ok) throw new Error(`alpha search ${res.status}`);
  const d = (await res.json()) as { matches?: AlphaMatch[]; portrait?: AlphaPortrait | null };
  return { matches: d.matches ?? [], portrait: d.portrait ?? null };
}

/** Which matches are new since the last look; remembers them all as seen. */
function markSeen(matches: AlphaMatch[]): string[] {
  const seen = new Set(read<string[]>("local", SEEN_KEY) ?? []);
  const ids = matches.filter((m) => !m.locked && m.id).map((m) => m.id);
  const fresh = seen.size === 0 ? [] : ids.filter((id) => !seen.has(id));
  write("local", SEEN_KEY, [...ids, ...[...seen].filter((id) => !ids.includes(id))].slice(0, 300));
  return fresh;
}

/** The whole block under the search box on the main page. */
export function AlphaHomeBlock({ query }: { query?: string }) {
  const me = useAlphaMe();
  if (!me.member) return null;
  const q = (query ?? "").trim();
  return q ? <AlphaPeople key={q} query={q} /> : <AlphaForYou />;
}

function AlphaWindow({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(<AlphaPaywall open={open} onClose={onClose} onActivate={onClose} initialQuery={null} />, document.body);
}

function AlphaForYou() {
  const lang = useActiveLocale();
  const l = lk(String(lang));
  const [state, setState] = useState<Cache | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [off, setOff] = useState<Set<string>>(() => new Set());
  const [matches, setMatches] = useState<AlphaMatch[] | null>(null);
  const [open, setOpen] = useState<"what" | "where" | "money" | null>(null);
  const [adding, setAdding] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [alpha, setAlpha] = useState(false);

  useEffect(() => setOff(new Set(read<string[]>("local", OFF_KEY) ?? [])), []);

  const load = useCallback(
    async (quiet: boolean) => {
      if (!quiet) setLoading(true);
      setFailed(false);
      try {
        const r = await searchAlpha(String(lang), null);
        let next: Cache;
        if (r === "unknown") {
          next = { at: Date.now(), portrait: null, matches: [], fresh: [], unknown: true };
        } else {
          next = { at: Date.now(), portrait: r.portrait, matches: r.matches, fresh: markSeen(r.matches), unknown: false };
        }
        write("session", CACHE_KEY, next);
        setState(next);
        setMatches(null);
      } catch {
        setFailed(true);
      } finally {
        setLoading(false);
      }
    },
    [lang],
  );

  // 09.10.2026: Alpha learned the person in the search box -- load again.
  useEffect(() => {
    const on = () => {
      try {
        sessionStorage.removeItem(CACHE_KEY);
      } catch {}
      void load(false);
    };
    window.addEventListener(ALPHA_PORTRAIT_EVENT, on);
    return () => window.removeEventListener(ALPHA_PORTRAIT_EVENT, on);
  }, [load]);

  // Fresh on every visit; the last result at once when it is recent.
  useEffect(() => {
    const c = read<Cache>("session", CACHE_KEY);
    if (c) {
      setState(c);
      setLoading(false);
      if (Date.now() - c.at >= FRESH_MS) void load(true);
    } else {
      void load(false);
    }
  }, [load]);

  // Switched-off items: search again with what is on (not remembered).
  const p = state?.portrait ?? null;
  useEffect(() => {
    if (!p || off.size === 0) {
      setMatches(null);
      return;
    }
    const eff = effective(p, off);
    if (!eff.stack.length) {
      setMatches([]);
      return;
    }
    let alive = true;
    searchAlpha(String(lang), eff, false)
      .then((r) => alive && r !== "unknown" && setMatches(r.matches))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [p, off, lang]);

  const toggle = (key: string) => {
    setOff((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      write("local", OFF_KEY, [...next]);
      return next;
    });
  };

  const addSkill = async () => {
    const skill = adding.trim();
    if (!skill || !p || p.stack.some((s) => s.toLowerCase() === skill.toLowerCase())) return;
    setAdding("");
    setOpen(null);
    const next = { ...p, stack: [...p.stack, skill] };
    try {
      // Remembered: a skill added here is part of the portrait now.
      await searchAlpha(String(lang), next, true);
    } catch {
      /* the next load will show it */
    }
    await load(true);
  };

  const items = useMemo(() => (p ? portraitItems(p, l) : null), [p, l]);
  const list = (matches ?? state?.matches ?? []).filter((m) => !m.locked);
  const fresh = new Set(state?.fresh ?? []);
  const freshCount = list.filter((m) => fresh.has(m.id)).length;
  const shown = showAll ? list : list.slice(0, SHOWN);

  if (loading) {
    return <div className="my-4 h-24 animate-pulse rounded-2xl bg-black/[0.04] dark:bg-white/[0.06]" aria-busy="true" />;
  }

  return (
    <section className="mb-4 mt-3" aria-label={T.forYou[l]}>
      <style>{`.afy-flow{background-image:${FLOW};background-size:200% 100%}@keyframes afyPen{0%,100%{transform:rotate(0)}30%{transform:rotate(-18deg) translateY(-1px)}60%{transform:rotate(10deg)}}.afy-pen:hover span{animation:afyPen .5s ease-in-out}`}</style>
      {/* 09.10.2026 (Александр): строки «Розкажіть Alpha про себе» в ленте нет --
          Alpha спрашивает прямо в поле поиска (components/alpha-ask.tsx). */}
      {state?.unknown ? null : (
        <>
          <div className="mb-2 flex items-center gap-2">
            <h2 className="text-[17px] font-semibold text-[#335ef7] dark:text-[#9fb2ff]">✦ {T.forYou[l]}</h2>
          </div>
          {items && (
            <div className="relative mb-2 flex flex-wrap gap-1.5">
              {(["what", "where", "money"] as const).map((g) => {
                const its = items[g];
                if (!its.length) return null;
                const on = its.filter(([k]) => !off.has(k)).map(([, label]) => label);
                const labels = on.length ? on : its.map(([, label]) => label);
                const label = labels.slice(0, 3).join(" · ") + (labels.length > 3 ? ` +${labels.length - 3}` : "");
                return (
                  <div key={g} className="relative">
                    <button
                      type="button"
                      onClick={() => setOpen(open === g ? null : g)}
                      className={
                        // 09.10.2026 (Александр): видно, что чип нажимается.
                        "rounded-full px-3 py-1.5 text-[14px] font-semibold transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(90,80,255,0.35)] hover:brightness-110 active:translate-y-0 active:scale-95 " +
                        (on.length ? "afy-flow text-white" : "border border-[#5a4dff]/30 text-[#5a4dff] dark:text-[#b7a6ff]")
                      }
                    >
                      {label}
                    </button>
                    {open === g && (
                      <div className="absolute left-0 top-full z-20 mt-1 w-56 rounded-xl border border-neutral-200 bg-white p-1.5 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
                        <div className="px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-neutral-400">{T[g][l]}</div>
                        {its.map(([k, label]) => (
                          <button
                            key={k}
                            type="button"
                            onClick={() => toggle(k)}
                            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
                          >
                            <span className={"grid h-4 w-4 place-items-center rounded border text-[11px] " + (off.has(k) ? "border-neutral-300" : "border-[#5a4dff] bg-[#5a4dff] text-white")}>
                              {off.has(k) ? "" : "✓"}
                            </span>
                            <span className={off.has(k) ? "text-neutral-400 line-through" : ""}>{label}</span>
                          </button>
                        ))}
                        {g === "what" && (
                          <form
                            className="mt-1 flex gap-1 px-1"
                            onSubmit={(e) => {
                              e.preventDefault();
                              void addSkill();
                            }}
                          >
                            <input
                              value={adding}
                              onChange={(e) => setAdding(e.target.value)}
                              placeholder={T.addPh[l]}
                              className="min-w-0 flex-1 rounded-lg border border-neutral-200 bg-transparent px-2 py-1 text-sm dark:border-neutral-700"
                            />
                            <button type="submit" className="rounded-lg px-2 text-sm font-semibold text-[#335ef7] dark:text-[#9fb2ff]">
                              {T.add[l]}
                            </button>
                          </form>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              <button
                type="button"
                onClick={() => openAlphaAsk()}
                title={T.retell[l]}
                aria-label={T.retell[l]}
                className="afy-pen rounded-full border border-[#5a4dff]/30 px-3 py-1.5 text-[14px] text-[#5a4dff] transition duration-200 hover:-translate-y-0.5 hover:border-[#5a4dff]/60 hover:bg-[#5a4dff]/10 active:scale-95 dark:text-[#b7a6ff]"
              >
                <span className="inline-block">✎</span>
              </button>
            </div>
          )}
          {freshCount > 0 && matches == null && (
            <div className="mb-2 text-[14px] font-semibold text-[#5a4dff] dark:text-[#b7a6ff]">{T.newLine[l].replace("{n}", String(freshCount))}</div>
          )}
          {failed ? (
            <button type="button" onClick={() => void load(false)} className="text-sm font-medium text-[#335ef7] underline">
              {T.failed[l]}
            </button>
          ) : list.length === 0 ? (
            <p className="text-[15px] text-neutral-500">{items && p && !effective(p, off).stack.length ? T.allOff[l] : T.none[l]}</p>
          ) : (
            <div className="flex flex-col gap-2">
              {shown.map((m) => (
                <MatchRow key={m.id} m={m} isNew={matches == null && fresh.has(m.id)} newLabel={T.isNew[l]} />
              ))}
              {list.length > SHOWN && (
                <button type="button" onClick={() => setShowAll((v) => !v)} className="self-start text-sm font-medium text-[#335ef7] dark:text-[#9fb2ff]">
                  {showAll ? T.less[l] : `${T.more[l]} (${list.length - SHOWN})`}
                </button>
              )}
            </div>
          )}
        </>
      )}
      {open && <div className="fixed inset-0 z-10" onClick={() => setOpen(null)} aria-hidden="true" />}
      <AlphaWindow
        open={alpha}
        onClose={() => {
          setAlpha(false);
          // The portrait may have changed in the conversation.
          void load(true);
        }}
      />
    </section>
  );
}

function MatchRow({ m, isNew, newLabel }: { m: AlphaMatch; isNew: boolean; newLabel: string }) {
  const body = (
    <div className="flex items-start gap-3 rounded-[16px] border border-black/[0.07] p-3 transition hover:border-[#335ef7]/40 dark:border-white/10">
      <CachedAvatar
        src={m.avatar ?? pickDefaultCatAvatar(m.company || m.id)}
        blurDataURL={BLUR_DATA_URL}
        size={80}
        className="h-10 w-10 shrink-0 rounded-full object-cover"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {isNew && <span className="afy-flow shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold text-white">{newLabel}</span>}
          <div className="truncate text-[15px] font-bold">{m.title}</div>
        </div>
        <div className="mt-0.5 truncate text-[13px] text-[#6b6b78] dark:text-[#a9a9b8]">{[m.company, m.salary].filter(Boolean).join(" · ")}</div>
        {m.reasons.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {m.reasons.map((r) => (
              <span key={r} className="rounded-full bg-black/[0.04] px-2 py-0.5 text-[12px] text-[#5b5b68] dark:bg-white/[0.07] dark:text-[#c0c0cc]">
                {r}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="afy-flow shrink-0 rounded-full px-2.5 py-1 text-[13px] font-bold text-white">{m.score}%</div>
    </div>
  );
  return m.slug ? <a href={m.slug}>{body}</a> : body;
}

function TellRow({ text, onClick }: { text: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-3 flex w-full items-center gap-2.5 rounded-2xl border border-[#5a4dff]/35 px-4 py-3 text-left text-[15px] font-medium text-[#5a4dff] hover:bg-[#5a4dff]/[0.06] dark:text-[#b7a6ff]"
    >
      <span aria-hidden="true">✦</span>
      {text}
    </button>
  );
}

/** «Люди і компанії» over the posts of a typed query. */
function AlphaPeople({ query }: { query: string }) {
  const lang = useActiveLocale();
  const l = lk(String(lang));
  const [people, setPeople] = useState<UserSearchHit[]>([]);
  const [expanded, setExpanded] = useState(() => !looksLikeJobQuery(query));
  const [all, setAll] = useState(false);
  const [unknown, setUnknown] = useState(false);
  const [alpha, setAlpha] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(`/api/users/search?q=${encodeURIComponent(query)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && d?.ok && setPeople(d.users ?? []))
      .catch(() => {});
    const c = read<Cache>("session", CACHE_KEY);
    setUnknown(c?.unknown === true);
    return () => {
      alive = false;
    };
  }, [query]);

  if (!people.length && !unknown) return null;
  const shown = all ? people : people.slice(0, 3);
  return (
    <section className="mb-3 mt-3" aria-label={T.people[l]}>
      {people.length > 0 &&
        (expanded ? (
          <>
            <div className="mb-1.5 flex items-center justify-between">
              <h2 className="text-[17px] font-semibold text-[#335ef7] dark:text-[#9fb2ff]">{T.people[l]}</h2>
              {people.length > 3 && (
                <button type="button" onClick={() => setAll((v) => !v)} className="text-sm font-medium text-[#335ef7] dark:text-[#9fb2ff]">
                  {all ? T.less[l] : T.all[l].replace("{n}", String(people.length))}
                </button>
              )}
            </div>
            <div className="flex flex-col">
              {shown.map((u) => (
                <a key={u.userId} href={`/u/${u.username}`} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                  <CachedAvatar
                    src={u.avatarUrl ?? pickDefaultCatAvatar(u.username)}
                    blurDataURL={u.avatarBlurDataUrl ?? BLUR_DATA_URL}
                    size={80}
                    className="h-10 w-10 shrink-0 rounded-full object-cover"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium">{u.fullName}</span>
                    <span className="block truncate text-[13px] text-neutral-400">@{u.username}</span>
                  </span>
                </a>
              ))}
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="flex w-full items-center gap-2.5 rounded-2xl bg-[#335ef7]/[0.08] px-4 py-2.5 text-left text-[15px] font-medium text-[#335ef7] dark:text-[#9fb2ff]"
          >
            <span aria-hidden="true">👥</span>
            <span className="flex-1">{T.similar[l].replace("{n}", String(people.length))}</span>
            <span aria-hidden="true">▾</span>
          </button>
        ))}

    </section>
  );
}
