// lib/seo/profile-og-image.tsx
//
// 25.10.2026 (Александр: «профиль как ссылка "обо мне" везде… чтобы
// выглядело прям вау, чтобы люди понимали: A1 -- это бренд»). Личная
// карточка-превью для /u/<ник>: её показывают LinkedIn, Telegram, Slack,
// почта и формы откликов, когда туда вставляют ссылку на профиль. До этого
// у всех профилей была одна общая картинка A1, и по превью нельзя было
// понять, кто этот человек.
//
// Устройство: фирменный градиент A1 во весь кадр (с мягкими кругами), на
// нём белая карточка. В карточке -- крупное фото, имя, должность, строка
// фактов (город, текущая компания, языки) и главные навыки, а если навыков
// нет -- начало «о себе». Цветное кольцо с микрофоном вокруг фото -- только
// у тех, кто записал голосовое интро (как кольцо в приложении).
// GitHub / Dribbble / Stack Overflow на карточку не выносим (Александр,
// 25.10: «у кого-то есть, у кого-то нет»): берём то, что есть у всех. Сверху на градиенте --
// белый логотип A1 и адрес профиля: ссылка продаёт и человека, и A1.
//
// Текстов интерфейса на карточке нет (только имена сервисов, коды языков и
// адрес): одна картинка на все 9 языков, остальное человек написал сам.

import { ImageResponse } from "next/og";
import sharp from "sharp";
import { loadCommissioner, OG_IMAGE_SIZE } from "@/lib/seo/og-image";

const SITE_URL = "https://jobs.a1appp.com";
const ACCENT = "#335EF7";
const BRAND_GRADIENT = "linear-gradient(135deg, #335EF7 0%, #6B4DFF 52%, #C830FF 100%)";
const RING_GRADIENT = "linear-gradient(135deg, #4F71EB 0%, #9B5CFF 50%, #C830FF 100%)";

export type ProfileOgParams = {
  username: string;
  fullName: string;
  /** Должность или заголовок профиля; пусто -- строку не рисуем. */
  title: string | null;
  location: string | null;
  /** Текущая компания (место работы без даты окончания). */
  company: string | null;
  /** Коды или названия языков, как лежат в профиле. */
  languages: string[];
  /** Относительный адрес из профиля (/api/media/...) или абсолютный. */
  avatarUrl: string | null;
  skills: string[];
  /** «О себе»: показываем, только если навыков нет. */
  bio: string | null;
  /** Есть голосовое интро -> цветное кольцо с микрофоном. */
  voiceIntro: boolean;
  /** Для компаний: число открытых вакансий. */
  openJobs: number;
};

// Логотип и фото -- в data:-адреса. Satori (рисует next/og) не понимает webp,
// а медиа-прокси отдаёт фото как есть, поэтому фото всегда перегоняем в PNG.
let logoDataUrl: string | null | undefined;
async function loadLogo(): Promise<string | null> {
  if (logoDataUrl !== undefined) return logoDataUrl;
  try {
    const res = await fetch(`${SITE_URL}/brand/a1-logo-white.svg`);
    if (!res.ok) throw new Error(String(res.status));
    const svg = await res.text();
    logoDataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  } catch {
    logoDataUrl = null;
  }
  return logoDataUrl;
}

async function loadAvatar(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const abs = url.startsWith("http") ? url : `${SITE_URL}${url}`;
    const res = await fetch(abs, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const png = await sharp(Buffer.from(await res.arrayBuffer()))
      .resize(400, 400, { fit: "cover" })
      .png()
      .toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "A1";
}

function clip(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > max ? t.slice(0, max - 1).trimEnd() + "…" : t;
}

/** «en», «uk-UA», «English» -> «EN», «UK», «English». Коды короче и одинаковы на всех языках. */
function langLabel(v: string): string {
  const t = v.trim();
  if (/^[a-z]{2,3}([-_][a-z]{2,4})?$/i.test(t)) return t.slice(0, 2).toUpperCase();
  return clip(t, 12);
}

function MicBadge() {
  return (
    <svg width="58" height="58" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="12" fill="#fff" />
      <circle cx="12" cy="12" r="9.6" fill="#7B4DFF" />
      <rect x="9.9" y="6.4" width="4.2" height="7.4" rx="2.1" fill="#fff" />
      <path d="M7.9 11.6a4.1 4.1 0 0 0 8.2 0M12 15.8v2" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function Icon({ kind }: { kind: "pin" | "work" | "lang" | "jobs" }) {
  const common = { width: 26, height: 26, viewBox: "0 0 24 24", fill: "none", stroke: "#8A8F98", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (kind === "pin")
    return (
      <svg {...common}>
        <path d="M12 21s-7-6.1-7-11.5a7 7 0 0 1 14 0C19 14.9 12 21 12 21z" />
        <circle cx="12" cy="9.5" r="2.5" />
      </svg>
    );
  if (kind === "lang")
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" />
      </svg>
    );
  return (
    <svg {...common}>
      <rect x="3" y="7" width="18" height="13" rx="2.5" />
      <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" />
      {kind === "jobs" ? <path d="M3 13h18" /> : null}
    </svg>
  );
}

export async function buildProfileOgImage(p: ProfileOgParams): Promise<ImageResponse> {
  const name = clip(p.fullName || p.username, 30);
  const title = p.title ? clip(p.title, 64) : null;
  const facts: { kind: "pin" | "work" | "lang" | "jobs"; text: string }[] = [];
  if (p.location) facts.push({ kind: "pin", text: clip(p.location, 26) });
  if (p.company) facts.push({ kind: "work", text: clip(p.company, 24) });
  if (p.openJobs > 0) facts.push({ kind: "jobs", text: String(p.openJobs) });
  const langs = Array.from(new Set(p.languages.map(langLabel).filter(Boolean))).slice(0, 4);
  if (langs.length) facts.push({ kind: "lang", text: langs.join(" · ") });

  const skills = p.skills.map((s) => clip(s, 20)).filter(Boolean).slice(0, 8);
  const bio = skills.length === 0 && p.bio ? clip(p.bio, 150) : null;
  const handle = `jobs.a1appp.com/u/${p.username}`;

  const allText = [name, title ?? "", handle, initials(p.fullName), ...facts.map((f) => f.text), ...skills, bio ?? ""].join("");
  const [bold, medium, avatar, logo] = await Promise.all([
    loadCommissioner(allText, 700),
    loadCommissioner(allText, 500),
    loadAvatar(p.avatarUrl),
    loadLogo(),
  ]);
  const fonts = [
    ...(bold ? [{ name: "Commissioner", data: bold, weight: 700 as const, style: "normal" as const }] : []),
    ...(medium ? [{ name: "Commissioner", data: medium, weight: 500 as const, style: "normal" as const }] : []),
  ];
  const fontFamily = fonts.length ? "Commissioner" : undefined;
  const nameSize = name.length > 22 ? 54 : 64;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: BRAND_GRADIENT, fontFamily, position: "relative", overflow: "hidden" }}>
        {/* Мягкие круги на градиенте -- глубина без шума. */}
        <div style={{ position: "absolute", left: -120, bottom: -260, width: 620, height: 620, borderRadius: 9999, background: "rgba(255,255,255,0.08)", display: "flex" }} />
        <div style={{ position: "absolute", right: -90, top: -150, width: 420, height: 420, borderRadius: 9999, background: "rgba(255,255,255,0.10)", display: "flex" }} />
        <div style={{ position: "absolute", right: 210, top: 28, width: 70, height: 70, borderRadius: 9999, background: "rgba(255,255,255,0.12)", display: "flex" }} />

        {/* Верхняя полоса: логотип и адрес профиля. */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "30px 56px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} width={58} height={42} style={{ width: 58, height: 42 }} />
            ) : (
              <div style={{ display: "flex", fontSize: 38, fontWeight: 700, color: "#fff" }}>A1</div>
            )}
            <div style={{ display: "flex", width: 2, height: 30, background: "rgba(255,255,255,0.35)" }} />
            <div style={{ display: "flex", fontSize: 25, fontWeight: 500, color: "rgba(255,255,255,0.92)" }}>{handle}</div>
          </div>
        </div>

        {/* Карточка. */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            margin: "26px 48px 48px",
            flex: 1,
            background: "#FFFFFF",
            borderRadius: 40,
            boxShadow: "0 24px 60px rgba(20, 12, 70, 0.28)",
            padding: "0 56px",
            justifyContent: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 46 }}>
            {/* Цветное кольцо и микрофон -- только при голосовом интро; иначе тонкая светлая рамка. */}
            <div style={{ display: "flex", position: "relative", width: 232, height: 232, flexShrink: 0 }}>
              <div style={{ position: "absolute", left: 0, top: 0, width: 232, height: 232, borderRadius: 9999, background: p.voiceIntro ? RING_GRADIENT : "#ECEEF3", display: "flex" }} />
              <div style={{ position: "absolute", left: 8, top: 8, width: 216, height: 216, borderRadius: 9999, background: "#fff", display: "flex" }} />
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatar} width={200} height={200} style={{ position: "absolute", left: 16, top: 16, width: 200, height: 200, borderRadius: 9999, objectFit: "cover" }} />
              ) : (
                <div
                  style={{
                    position: "absolute",
                    left: 16,
                    top: 16,
                    width: 200,
                    height: 200,
                    borderRadius: 9999,
                    background: BRAND_GRADIENT,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontSize: 78,
                    fontWeight: 700,
                  }}
                >
                  {initials(p.fullName)}
                </div>
              )}
              {p.voiceIntro && (
                <div style={{ position: "absolute", right: 6, bottom: 10, display: "flex" }}>
                  <MicBadge />
                </div>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", fontSize: nameSize, fontWeight: 700, color: "#111111", lineHeight: 1.05, letterSpacing: -1 }}>{name}</div>
              {title && (
                <div style={{ display: "flex", fontSize: 31, fontWeight: 500, color: "#3F3F46", marginTop: 14, lineHeight: 1.25 }}>{title}</div>
              )}
              {facts.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 26, marginTop: 18, fontSize: 26, fontWeight: 500, color: "#6B7280" }}>
                  {facts.map((f) => (
                    <div key={f.kind} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <Icon kind={f.kind} />
                      <span>{f.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {skills.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 34, maxHeight: 128, overflow: "hidden" }}>
              {skills.map((s) => (
                <div
                  key={s}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "11px 22px",
                    borderRadius: 9999,
                    background: "rgba(51, 94, 247, 0.09)",
                    color: ACCENT,
                    fontSize: 25,
                    fontWeight: 500,
                  }}
                >
                  {s}
                </div>
              ))}
            </div>
          )}
          {bio && (
            <div style={{ display: "flex", marginTop: 30, fontSize: 27, fontWeight: 500, color: "#52525B", lineHeight: 1.4, borderLeft: "4px solid rgba(51, 94, 247, 0.35)", paddingLeft: 20 }}>{bio}</div>
          )}
        </div>
      </div>
    ),
    { ...OG_IMAGE_SIZE, fonts },
  );
}
