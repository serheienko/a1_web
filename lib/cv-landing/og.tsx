// lib/cv-landing/og.tsx -- картинка превью ссылки на «CV Builder» (28.10.2026).
// Горизонтальная 1200x630, как любят соцсети и мессенджеры: слева заголовок
// страницы на её языке, справа лист резюме Mr. Kit на том же языке.
import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { ImageResponse } from "next/og";
import { loadCommissioner, OG_IMAGE_SIZE } from "@/lib/seo/og-image";
import { CV_LANDING } from "@/lib/cv-landing/registry";
import type { CvLandingLang } from "@/lib/cv-landing/types";

export async function cvLandingOg(lang: CvLandingLang): Promise<ImageResponse> {
  const c = CV_LANDING[lang];
  const text = c.h1 + c.badges.join("") + "A1 jobs.a1appp.com/cv-builder";
  const [bold, medium, sheet] = await Promise.all([
    loadCommissioner(text, 700),
    loadCommissioner(text, 500),
    fs
      .readFile(path.join(process.cwd(), "public", "cv-builder", `cv-${lang}.webp`))
      .then((b) => sharp(b).resize(420).png().toBuffer())
      .then((b) => `data:image/png;base64,${b.toString("base64")}`)
      .catch(() => null),
  ]);
  const fonts = [
    ...(bold ? [{ name: "Commissioner", data: bold, weight: 700 as const, style: "normal" as const }] : []),
    ...(medium ? [{ name: "Commissioner", data: medium, weight: 500 as const, style: "normal" as const }] : []),
  ];
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "linear-gradient(125deg,#335EF7 0%,#6A4BF5 55%,#A63DF2 100%)", fontFamily: fonts.length ? "Commissioner" : undefined, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: -140, top: -160, width: 520, height: 520, borderRadius: 9999, background: "rgba(255,255,255,0.10)", display: "flex" }} />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 0 0 64px", width: 700, color: "#fff" }}>
          <div style={{ display: "flex", fontSize: 26, fontWeight: 500, opacity: 0.9 }}>A1 · CV Builder</div>
          <div style={{ display: "flex", fontSize: c.h1.length > 60 ? 50 : 58, fontWeight: 700, lineHeight: 1.08, marginTop: 14, letterSpacing: -1 }}>{c.h1}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 30 }}>
            {c.badges.map((b) => (
              <div key={b} style={{ display: "flex", padding: "10px 20px", borderRadius: 9999, background: "rgba(255,255,255,0.18)", fontSize: 24, fontWeight: 500 }}>
                {b}
              </div>
            ))}
          </div>
        </div>
        {sheet ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={sheet} width={400} height={566} style={{ position: "absolute", right: 60, top: 70, width: 400, height: 566, borderRadius: 18, transform: "rotate(4deg)", boxShadow: "0 30px 60px rgba(20,16,80,0.45)" }} />
        ) : null}
      </div>
    ),
    { ...OG_IMAGE_SIZE, fonts },
  );
}
