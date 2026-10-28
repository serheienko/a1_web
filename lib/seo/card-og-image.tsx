// lib/seo/card-og-image.tsx
//
// 28.10.2026 (Александр: «ссылки на посты и группы снаружи должны выглядеть
// информативно и симпатично, как профиль»). Картинка-превью для ссылок на
// вакансию (/jobs/...), на пост «шукаю роботу» (/talents/...) и на
// приглашение в группу (/join/...). До этого у вакансии был голый
// фиолетовый фон с названием, а у группы -- общая картинка сайта.
//
// Тот же вид, что у профиля (lib/seo/profile-og-image.tsx): фирменный
// градиент A1, сверху белый логотип и адрес, на нём белая карточка. В
// карточке картинка слева (логотип компании -- квадрат со скруглением,
// человек или группа -- круг), справа заголовок, над ним кто это, ниже
// строка фактов (зарплата, город, удалённо, участники) и главные теги.
// Текстов интерфейса почти нет: одна картинка на все 9 языков.

import { ImageResponse } from "next/og";
import { loadCommissioner, OG_IMAGE_SIZE } from "@/lib/seo/og-image";
import { clip, initials, loadAvatar, loadLogo } from "@/lib/seo/profile-og-image";

const ACCENT = "#335EF7";
const BRAND_GRADIENT = "linear-gradient(135deg, #335EF7 0%, #6B4DFF 52%, #C830FF 100%)";

export type CardFact = { kind: "money" | "pin" | "remote" | "people"; text: string };

export type CardOgParams = {
  /** Адрес под логотипом A1, без https://. */
  handle: string;
  /** Кто: компания, автор, «Група». Пусто -- не рисуем. */
  eyebrow: string | null;
  title: string;
  /** Логотип/фото: относительный (/api/media/...) или абсолютный адрес. */
  pictureUrl: string | null;
  pictureShape: "square" | "circle";
  /** Из чего рисовать букву, если картинки нет. */
  pictureName: string;
  facts: CardFact[];
  chips: string[];
};

function FactIcon({ kind }: { kind: CardFact["kind"] }) {
  const c = { width: 34, height: 34, viewBox: "0 0 24 24", fill: "none", stroke: "#8A8F98", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (kind === "pin")
    return (
      <svg {...c}>
        <path d="M12 21s-7-6.1-7-11.5a7 7 0 0 1 14 0C19 14.9 12 21 12 21z" />
        <circle cx="12" cy="9.5" r="2.5" />
      </svg>
    );
  if (kind === "remote")
    return (
      <svg {...c}>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" />
      </svg>
    );
  if (kind === "people")
    return (
      <svg {...c}>
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
        <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14.5A6.5 6.5 0 0 1 21.5 20" />
      </svg>
    );
  return (
    <svg {...c}>
      <rect x="2.5" y="6" width="19" height="12" rx="2.5" />
      <circle cx="12" cy="12" r="2.6" />
      <path d="M6 9.5v5M18 9.5v5" />
    </svg>
  );
}

export async function buildCardOgImage(p: CardOgParams): Promise<ImageResponse> {
  const title = clip(p.title, 70);
  const eyebrow = p.eyebrow ? clip(p.eyebrow, 34) : null;
  const facts = p.facts.slice(0, 3).map((f) => ({ ...f, text: clip(f.text, 24) }));
  const chips = p.chips.map((s) => clip(s, 18)).filter(Boolean).slice(0, 4);
  const allText = [title, eyebrow ?? "", p.handle, initials(p.pictureName), ...facts.map((f) => f.text), ...chips].join("");
  const [bold, medium, picture, logo] = await Promise.all([
    loadCommissioner(allText, 700),
    loadCommissioner(allText, 500),
    loadAvatar(p.pictureUrl),
    loadLogo(),
  ]);
  const fonts = [
    ...(bold ? [{ name: "Commissioner", data: bold, weight: 700 as const, style: "normal" as const }] : []),
    ...(medium ? [{ name: "Commissioner", data: medium, weight: 500 as const, style: "normal" as const }] : []),
  ];
  const fontFamily = fonts.length ? "Commissioner" : undefined;
  const titleSize = title.length > 46 ? 50 : title.length > 28 ? 58 : 66;
  const radius = p.pictureShape === "circle" ? 9999 : 40;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: BRAND_GRADIENT, fontFamily, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", left: -120, bottom: -260, width: 620, height: 620, borderRadius: 9999, background: "rgba(255,255,255,0.08)", display: "flex" }} />
        <div style={{ position: "absolute", right: -90, top: -150, width: 420, height: 420, borderRadius: 9999, background: "rgba(255,255,255,0.10)", display: "flex" }} />

        <div style={{ display: "flex", alignItems: "center", gap: 18, padding: "30px 56px 0" }}>
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} width={66} height={48} style={{ width: 66, height: 48 }} />
          ) : (
            <div style={{ display: "flex", fontSize: 38, fontWeight: 700, color: "#fff" }}>A1</div>
          )}
          <div style={{ display: "flex", width: 2, height: 30, background: "rgba(255,255,255,0.35)" }} />
          <div style={{ display: "flex", fontSize: 31, fontWeight: 500, color: "rgba(255,255,255,0.95)" }}>{clip(p.handle, 44)}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", margin: "22px 40px 40px", flex: 1, background: "#FFFFFF", borderRadius: 40, boxShadow: "0 24px 60px rgba(20, 12, 70, 0.28)", padding: "0 52px", justifyContent: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
            <div style={{ display: "flex", width: 196, height: 196, flexShrink: 0, borderRadius: radius, background: "#F1F2F6", border: "2px solid #ECEEF3", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              {picture ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={picture} width={192} height={192} style={{ width: 192, height: 192, objectFit: "cover", borderRadius: radius }} />
              ) : (
                <div style={{ display: "flex", width: 192, height: 192, borderRadius: radius, background: BRAND_GRADIENT, alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 76, fontWeight: 700 }}>
                  {initials(p.pictureName)}
                </div>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
              {eyebrow && <div style={{ display: "flex", fontSize: 36, fontWeight: 700, color: ACCENT, marginBottom: 8 }}>{eyebrow}</div>}
              <div style={{ display: "flex", fontSize: titleSize, fontWeight: 700, color: "#111111", lineHeight: 1.08, letterSpacing: -1 }}>{title}</div>
              {facts.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", columnGap: 30, rowGap: 6, marginTop: 18, fontSize: 34, fontWeight: 500, color: "#52525B" }}>
                  {facts.map((f) => (
                    <div key={f.kind + f.text} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <FactIcon kind={f.kind} />
                      <span>{f.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {chips.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 30, maxHeight: 70, overflow: "hidden" }}>
              {chips.map((s) => (
                <div key={s} style={{ display: "flex", alignItems: "center", padding: "12px 26px", borderRadius: 9999, background: "rgba(51, 94, 247, 0.09)", color: ACCENT, fontSize: 32, fontWeight: 500 }}>
                  {s}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    ),
    { ...OG_IMAGE_SIZE, fonts },
  );
}

const CURRENCY: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", UAH: "₴", PLN: "zł" };

function num(n: number): string {
  return n >= 10000 ? `${Math.round(n / 1000)}k` : n.toLocaleString("en-US").replace(/,/g, " ");
}

/** «$3 000–5 000», «від $4k» не пишем (это текст интерфейса): «$4k+». */
export function salaryText(s: { min: number | null; max: number | null; currency: string } | null): string | null {
  if (!s || (s.min == null && s.max == null)) return null;
  const sym = CURRENCY[s.currency?.toUpperCase()] ?? `${s.currency} `;
  if (s.min != null && s.max != null && s.min !== s.max) return `${sym}${num(s.min)}–${num(s.max)}`;
  const one = s.min ?? s.max!;
  return s.min != null && s.max == null ? `${sym}${num(one)}+` : `${sym}${num(one)}`;
}

/** Карточка для вакансии (hiring) и поста «шукаю роботу» (seeking). */
export function cardParamsForPost(post: import("@/types/web-post").WebPost, handle: string): CardOgParams {
  const hiring = post.kind === "hiring";
  const anon = post.author.isAnonymous;
  const facts: CardFact[] = [];
  const money = salaryText(post.salary);
  if (money) facts.push({ kind: "money", text: money });
  const place = post.location?.city || post.location?.display || "";
  if (place) facts.push({ kind: "pin", text: place });
  if (post.isRemote) facts.push({ kind: "remote", text: "Remote" });
  const firstImage = post.images[0]?.url ?? null;
  return {
    handle,
    eyebrow: anon ? null : post.author.name,
    title: post.title,
    // Вакансия: логотип компании (аватар автора-компании), если нет --
    // первое фото поста. Кандидат: его фото.
    pictureUrl: anon ? null : post.author.avatarUrl ?? (hiring ? firstImage : null),
    pictureShape: hiring ? "square" : "circle",
    pictureName: anon ? post.title : post.author.name,
    facts,
    chips: post.tags,
  };
}
