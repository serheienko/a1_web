// lib/cv/data.ts -- всё, что нужно PDF-резюме, одним объектом (28.10.2026).
// Собирается из того же профиля, что и страница /u/<username>: email и
// телефон попадают сюда, только если человек сам открыл их в профиле
// (lib/a1/user-mappers.ts). Пустые блоки просто не рисуются.
import sharp from "sharp";
import QRCode from "qrcode";
import { fetchUserByUsername, fetchUserRawByUsername } from "@/lib/a1/users";
import { fetchHobbyLabels } from "@/lib/a1/datasets";
import { translateHobbyItem } from "@/lib/pill-translations";
import { formatLanguageNameIn } from "@/lib/format";
import { pickDefaultCatAvatar } from "@/lib/avatars";
import { findGithubLogin, verifiedGithubLogin } from "@/lib/github/core";
import { getGithubSummary } from "@/lib/github/fetch";
import { findStackoverflowId, verifiedStackoverflowId } from "@/lib/stackoverflow/core";
import { getStackoverflowSummary } from "@/lib/stackoverflow/fetch";
import { findDribbbleLogin, sanitizeDribbbleSnapshot, verifiedDribbbleLogin } from "@/lib/dribbble/core";
import { detectCvLang, type CvLang } from "@/lib/cv/detect-lang";
import { CV_LOCALE_TAG } from "@/lib/cv/i18n";

const SITE_URL = "https://jobs.a1appp.com";

export type CvExperience = { company: string; description: string | null; start: number | null; end: number | null; current: boolean };
export type CvData = {
  lang: CvLang;
  name: string;
  role: string;
  photo: string; // data:URL (PNG/JPEG)
  location: string | null;
  profileUrl: string;
  profileHost: string;
  qr: string; // data:URL PNG
  voiceUrl: string | null;
  email: string | null;
  phone: string | null;
  links: { label: string; url: string }[];
  years: number | null;
  about: string | null;
  experience: CvExperience[];
  education: string[];
  skills: { name: string; level: number }[];
  languages: { name: string; level: number }[];
  hobbies: string[];
  favorites: { books: string[]; movies: string[]; games: string[] };
  github: { login: string; url: string; total: number; levels: number[][] } | null;
  dribbble: { url: string; shots: number; images: string[] } | null;
  stackoverflow: { url: string; reputation: number; gold: number; silver: number; bronze: number; tags: string[] } | null;
};

async function imageAsDataUrl(url: string | null, w: number, h: number, fit: "cover" | "contain" = "cover"): Promise<string | null> {
  if (!url) return null;
  try {
    const abs = url.startsWith("http") ? url : `${SITE_URL}${url}`;
    const res = await fetch(abs, { signal: AbortSignal.timeout(7000) });
    if (!res.ok) return null;
    const out = await sharp(Buffer.from(await res.arrayBuffer()))
      .resize(w, h, { fit, background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 86 })
      .toBuffer();
    return `data:image/jpeg;base64,${out.toString("base64")}`;
  } catch {
    return null;
  }
}

function year(s: string | null): number | null {
  if (!s) return null;
  const t = Date.parse(s);
  if (!Number.isNaN(t)) return new Date(t).getUTCFullYear();
  const m = /(19|20)\d{2}/.exec(s);
  return m ? Number(m[0]) : null;
}

function linkLabel(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    const path = u.pathname.replace(/\/+$/, "");
    if (host === "t.me" || host === "telegram.me") return "@" + path.slice(1);
    return (host + path).slice(0, 40);
  } catch {
    return url.slice(0, 40);
  }
}

export type CvBuildResult = { status: "ok"; data: CvData } | { status: "not_found" };

export async function buildCvData(username: string, fallbackLang: CvLang, forcedLang: CvLang | null): Promise<CvBuildResult> {
  const [profile, raw] = await Promise.all([fetchUserByUsername(username), fetchUserRawByUsername(username)]);
  if (!profile || !raw || raw.object !== "user") return { status: "not_found" };
  const rawUser = raw as unknown as {
    githubVerifiedLogin?: string | null;
    dribbbleVerified?: { login?: string | null; snapshot?: unknown } | null;
    stackoverflowVerifiedId?: number | null;
  };

  const lang =
    forcedLang ??
    detectCvLang(
      [profile.bio, profile.occupation, ...profile.companies.map((c) => `${c.positionDescription ?? ""} ${c.description ?? ""}`), ...profile.education],
      fallbackLang,
    );
  const tag = CV_LOCALE_TAG[lang];

  const profileUrl = `${SITE_URL}/u/${encodeURIComponent(profile.username)}`;
  const ghLogin = verifiedGithubLogin(profile.links, rawUser.githubVerifiedLogin ?? null) ?? null;
  const soId = verifiedStackoverflowId(profile.links, rawUser.stackoverflowVerifiedId ?? null);
  const drLogin = verifiedDribbbleLogin(profile.links, rawUser.dribbbleVerified?.login ?? null);
  const drSnap = drLogin ? sanitizeDribbbleSnapshot(rawUser.dribbbleVerified?.snapshot) : null;

  const [photo, qr, gh, so, drImages, hobbyLabels] = await Promise.all([
    imageAsDataUrl(profile.avatarUrl ?? pickDefaultCatAvatar(profile.username), 360, 360).then(
      (p) => p ?? imageAsDataUrl(pickDefaultCatAvatar(profile.username), 360, 360),
    ),
    QRCode.toDataURL(profileUrl, { margin: 0, width: 360, color: { dark: "#141A33", light: "#FFFFFF" } }),
    ghLogin ? getGithubSummary(ghLogin, null).catch(() => null) : Promise.resolve(null),
    soId !== null ? getStackoverflowSummary(soId).catch(() => null) : Promise.resolve(null),
    drSnap ? Promise.all(drSnap.shots.slice(0, 3).map((s) => imageAsDataUrl(s.imageUrl, 240, 180))) : Promise.resolve([]),
    profile.hobbies.length ? fetchHobbyLabels().catch(() => null) : Promise.resolve(null),
  ]);

  const now = new Date().getUTCFullYear();
  const experience: CvExperience[] = profile.companies
    .filter((c) => c.name.trim())
    .map((c) => {
      const start = year(c.positionStart);
      const end = year(c.positionEnd);
      return { company: c.name.trim(), description: c.positionDescription?.trim() || null, start, end, current: start !== null && end === null };
    });
  const starts = experience.map((e) => e.start).filter((v): v is number => v !== null);
  const years = starts.length ? Math.max(1, now - Math.min(...starts)) : null;

  const links: { label: string; url: string }[] = [];
  for (const l of profile.links) {
    if (!/^https?:\/\//.test(l.url)) continue;
    // У подтверждённых GitHub / Dribbble / Stack Overflow есть своя плитка -- в шапке их не дублируем.
    if (ghLogin && /github\.com/.test(l.url)) continue;
    if (drSnap && /dribbble\.com/.test(l.url)) continue;
    if (soId !== null && /stackoverflow\.com/.test(l.url)) continue;
    links.push({ label: linkLabel(l.url), url: l.url });
    if (links.length >= 3) break;
  }

  let github: CvData["github"] = null;
  if (gh && gh.status === "ok") {
    const weeks = gh.data.weeks.slice(-22);
    github = {
      login: gh.data.login,
      url: gh.data.htmlUrl,
      total: gh.data.totalContributions,
      levels: weeks.map((w) => w.days.map((d) => d.level)),
    };
  }
  const stackoverflow: CvData["stackoverflow"] =
    // 28.10.2026: свежий аккаунт (репутация 1, ни медалей, ни тегов) -- пустая плитка только портит CV, не рисуем.
    so && so.status === "ok" && !(so.data.reputation < 10 && so.data.topTags.length === 0 && so.data.badges.gold + so.data.badges.silver + so.data.badges.bronze === 0)
      ? {
          url: so.data.htmlUrl,
          reputation: so.data.reputation,
          gold: so.data.badges.gold,
          silver: so.data.badges.silver,
          bronze: so.data.badges.bronze,
          tags: so.data.topTags.slice(0, 3).map((t) => t.name),
        }
      : null;
  const dribbble: CvData["dribbble"] = drSnap
    ? { url: drSnap.htmlUrl, shots: drSnap.shotsCount, images: drImages.filter((v): v is string => Boolean(v)) }
    : null;

  const hobbies =
    hobbyLabels && profile.hobbies.length
      ? profile.hobbies
          .map((id) => hobbyLabels.get(id))
          .filter((v): v is { group: string; text: string } => Boolean(v))
          .map(({ group, text }) => translateHobbyItem(group, text, lang))
          .slice(0, 8)
      : [];

  return {
    status: "ok",
    data: {
      lang,
      name: profile.fullName || profile.username,
      role: [profile.occupation, profile.expertise].filter(Boolean).join(" · "),
      photo: photo ?? "",
      location: profile.location?.display || null,
      profileUrl,
      profileHost: profileUrl.replace(/^https:\/\//, ""),
      qr,
      voiceUrl: profile.voiceIntroUrl ? `${profileUrl}?voice=1` : null,
      email: profile.email,
      phone: profile.phone,
      links,
      years,
      about: profile.bio?.trim() || null,
      experience,
      education: profile.education.filter((e) => e.trim()),
      skills: [...profile.skills].sort((a, b) => b.level - a.level).slice(0, 8).map((s) => ({ name: s.value, level: Math.max(0, Math.min(100, s.level)) })),
      languages: profile.languages.map((l) => ({ name: formatLanguageNameIn(l.value, tag), level: Math.max(0, Math.min(5, l.level)) })),
      hobbies,
      favorites: {
        books: profile.favoriteBooks.map((b) => b.title).filter(Boolean).slice(0, 3),
        movies: profile.favoriteMovies.map((m) => m.title).filter(Boolean).slice(0, 3),
        games: profile.favoriteGames.map((g) => g.title).filter(Boolean).slice(0, 3),
      },
      github,
      dribbble,
      stackoverflow,
    },
  };
}
