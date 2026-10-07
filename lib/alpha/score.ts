// lib/alpha/score.ts
//
// Test-environment ranking for Alpha (2026-10-07): takes vacancies from the
// site's own feed and scores them against the portrait with simple rules,
// writing a short "why it fits" for each. Will be replaced by: meaning-based
// search + AI reading the top 30 (see the "Alpha — как работает поиск" doc).

import type { WebPost } from "@/types/web-post";
import type { AlphaMatch, AlphaPortrait } from "./types";

type L = "uk" | "en" | "ru";
const pick = (lang: string): L => (lang === "uk" || lang === "ru" ? lang : "en");

const LEVEL_RE: Record<string, RegExp> = {
  junior: /(junior|джун|trainee|intern|стаж)/i,
  middle: /(middle|мідл|мидл)/i,
  senior: /(senior|сеньйор|сеньор|синьор)/i,
  lead: /(\blead\b|team ?lead|тімлід|тимлид|head of|principal|staff)/i,
};

const DEALBREAKER_RE: Record<string, RegExp> = {
  gambling: /(gambl|casino|казино|igaming|i-gaming|betting|беттінг|беттинг|slot)/i,
  outstaff: /(outstaff|аутстаф)/i,
  crypto: /(crypto|крипт|blockchain|блокчейн|web3|defi)/i,
  calls: /(daily calls|багато дзвінків|много звонков)/i,
};

const T = {
  stack: { uk: "стек збігається", en: "stack matches", ru: "стек совпадает" },
  mentioned: { uk: "згадується", en: "mentions", ru: "упоминается" },
  level: { uk: "рівень", en: "level", ru: "уровень" },
  remote: { uk: "віддалено", en: "remote", ru: "удалённо" },
  salaryOk: { uk: "зарплата від", en: "salary from", ru: "зарплата от" },
  salaryLow: { uk: "зарплата нижча за твою планку", en: "salary below your bar", ru: "зарплата ниже твоей планки" },
  noSalary: { uk: "зарплату не вказано", en: "salary not stated", ru: "зарплата не указана" },
  wishYes: { uk: "є про", en: "mentions", ru: "есть про" },
  wishUnknown: { uk: "не сказано", en: "not mentioned", ru: "не сказано" },
};

function salaryMonthlyUsd(p: WebPost): number | null {
  const s = p.salary;
  if (!s || (s.min == null && s.max == null)) return null;
  const v = (s.max ?? s.min)!;
  const monthly = s.period === "YEAR" ? v / 12 : v;
  const cur = s.currency.toUpperCase();
  const RATES: Record<string, number> = { USD: 1, EUR: 1.08, GBP: 1.27, UAH: 1 / 41, PLN: 0.25, SEK: 0.095, NOK: 0.093, DKK: 0.145, CHF: 1.13, CAD: 0.73, AUD: 0.66, CZK: 0.043 };
  const rate = RATES[cur];
  if (rate == null) return null; // unknown currency: don't pretend we know
  return Math.round(monthly * rate);
}

function salaryLabel(p: WebPost): string | null {
  const s = p.salary;
  if (!s || (s.min == null && s.max == null)) return null;
  const sym = s.currency.toUpperCase() === "USD" ? "$" : s.currency.toUpperCase() === "EUR" ? "€" : `${s.currency} `;
  const r = [s.min, s.max].filter((x) => x != null).map((x) => `${sym}${x!.toLocaleString("en-US")}`).join("–");
  return r;
}

/** Key word from a wish sentence to look for in the post ("собаки", "pets"). */
function wishKeywords(w: string): string[] {
  return w
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .filter((x) => x.length >= 5 && !/(люблю|хочу|щоб|чтобы|важливо|важно|бажано|желательно|коли|когда|which|would|prefer|where|there)/.test(x))
    .map((x) => x.slice(0, Math.max(5, x.length - 2))) // crude stem
    .slice(0, 3);
}

export function scorePosts(posts: WebPost[], portrait: AlphaPortrait, lang: string): AlphaMatch[] {
  const l = pick(lang);
  const out: AlphaMatch[] = [];
  for (const p of posts) {
    const title = p.title;
    const body = `${p.title}\n${p.contentText}\n${p.tags.join(" ")}`;
    let score = 50;
    const reasons: string[] = [];

    // Stack / role
    const hits = portrait.stack.filter((s) => new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(body));
    const inTitle = portrait.stack.some((s) => title.toLowerCase().includes(s.toLowerCase()));
    if (portrait.stack.length) {
      if (hits.length === 0) continue; // nothing in common -- not a match at all
      score += inTitle ? 20 : -6;
      reasons.push(inTitle ? `${hits.slice(0, 3).join(", ")} — ${T.stack[l]}` : `${T.mentioned[l]} ${hits.slice(0, 2).join(", ")}`);
    }

    // Level
    if (portrait.level) {
      const want = LEVEL_RE[portrait.level];
      const other = Object.entries(LEVEL_RE).some(([k, re]) => k !== portrait.level && re.test(title));
      if (want?.test(title)) {
        score += 12;
        reasons.push(`${T.level[l]} ${portrait.level.charAt(0).toUpperCase()}${portrait.level.slice(1)}`);
      } else if (other) score -= 15;
    }

    // Format
    if (portrait.format === "remote") {
      if (p.isRemote || /(remote|віддален|удален)/i.test(title)) {
        score += 8;
        reasons.push(T.remote[l]);
      } else score -= 10;
    }

    // Money
    const usd = salaryMonthlyUsd(p);
    if (portrait.money != null) {
      if (usd == null) reasons.push(T.noSalary[l]);
      else if (portrait.role !== "hiring" && usd >= portrait.money) {
        score += 10;
        reasons.push(`${T.salaryOk[l]} $${portrait.money.toLocaleString("en-US")}`);
      } else if (portrait.role !== "hiring") {
        score -= 15;
        reasons.push(T.salaryLow[l]);
      }
    }

    // Dealbreakers -- hard no
    if (portrait.dealbreakers.some((d) => DEALBREAKER_RE[d]?.test(body))) continue;

    // Soft wishes -- honest about unknowns
    for (const w of portrait.wishes.slice(0, 3)) {
      if (/(віддален|удален|remote|офіс\b|офис\b|\bбез\b|\$|роботу|работу)/i.test(w) && !/(люблю|подоба|нрав|love)/i.test(w)) continue;
      const keys = wishKeywords(w);
      if (!keys.length) continue;
      const phrase = w.replace(/^(я\s+)?(дуже\s+|очень\s+)?(люблю|хочу|хотілося б|хотелось бы|бажано|желательно|важливо|важно)(,|\s)+(коли|когда|щоб|чтобы)?\s*/i, "").slice(0, 32);
      const found = keys.find((k) => body.toLowerCase().includes(k));
      if (found) {
        score += 6;
        reasons.push(`✓ ${phrase}`);
      } else reasons.push(`${T.wishUnknown[l]}: ${phrase}`);
    }

    out.push({
      id: p.id,
      slug: p.slug,
      title,
      company: p.author?.name ?? "",
      salary: salaryLabel(p),
      remote: p.isRemote,
      score: Math.max(40, Math.min(98, score)),
      reasons: reasons.slice(0, 4),
      locked: false,
    });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 10);
}
