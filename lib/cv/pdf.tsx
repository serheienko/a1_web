// lib/cv/pdf.tsx -- PDF-резюме из профиля A1 (28.10.2026).
//
// Дизайн утверждён Александром на холсте «A1 CV и баннер профиля»: шапка
// с фирменным градиентом, фото, контакты-ссылки (кликаются в PDF), QR на
// живой профиль; плитки GitHub (квадратики активности) / Dribbble (превью
// работ) / Stack Overflow (медали и теги); слева о себе, опыт таймлайном,
// образование, любимое; справа навыки с процентами (бегунок в профиле),
// языки точками, захоплення; внизу «Створено в A1» и адрес профиля.
// Пустой блок не рисуем. Длинный профиль переносится на вторую страницу
// (низ страницы повторяется на каждой).
//
// Рисуем через @react-pdf/renderer, без браузера на сервере. Шрифт
// Commissioner лежит в assets/cv-fonts (TTF). Для китайского берём Noto Sans SC
// с Google Fonts только под нужные символы (как OG-картинки).

import path from "node:path";
import os from "node:os";
import { promises as fs } from "node:fs";
import sharp from "sharp";
import { Document, Page, View, Text, Image, Link, Font, Svg, Defs, LinearGradient, Stop, Rect, Path, renderToBuffer } from "@react-pdf/renderer";
import type { CvData } from "@/lib/cv/data";
import { cvText, yearsText } from "@/lib/cv/i18n";

const FONT_DIR = path.join(process.cwd(), "assets", "cv-fonts");
let fontsReady = false;
function registerFonts() {
  if (fontsReady) return;
  Font.register({
    family: "Commissioner",
    fonts: [
      { src: path.join(FONT_DIR, "Commissioner_400Regular.ttf"), fontWeight: 400 },
      { src: path.join(FONT_DIR, "Commissioner_500Medium.ttf"), fontWeight: 500 },
      { src: path.join(FONT_DIR, "Commissioner_600SemiBold.ttf"), fontWeight: 600 },
      { src: path.join(FONT_DIR, "Commissioner_700Bold.ttf"), fontWeight: 700 },
      { src: path.join(FONT_DIR, "Commissioner_800ExtraBold.ttf"), fontWeight: 800 },
    ],
  });
  // Переносы слов по слогам react-pdf делает по-английски и рвёт украинские слова -- выключаем.
  Font.registerHyphenationCallback((word) => [word]);
  fontsReady = true;
}

/** Китайский: подмножество Noto Sans SC под текст резюме, во временный файл. */
async function cjkFamily(text: string): Promise<string | null> {
  try {
    const chars = Array.from(new Set(Array.from(text))).join("");
    const css = await fetch(`https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@500&text=${encodeURIComponent(chars)}`, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 6.1) AppleWebKit/534.34 (KHTML, like Gecko) PhantomJS/1.9.7 Safari/534.34" },
      signal: AbortSignal.timeout(8000),
    }).then((r) => r.text());
    const url = css.match(/src: url\(([^)]+)\)/)?.[1];
    if (!url) return null;
    const ab: ArrayBuffer = await fetch(url, { signal: AbortSignal.timeout(8000) }).then((r) => r.arrayBuffer());
    const buf = Buffer.from(new Uint8Array(ab));
    const file = path.join(os.tmpdir(), `cv-cjk-${buf.length}-${Date.now()}.ttf`);
    await fs.writeFile(file, buf);
    const family = `NotoSC-${buf.length}`;
    Font.register({ family, src: file });
    return family;
  } catch {
    return null;
  }
}

let logoCache: { blue: string; white: string } | null = null;
async function logos() {
  if (logoCache) return logoCache;
  const read = async (name: string) => {
    const svg = await fs.readFile(path.join(process.cwd(), "public", "brand", name));
    const png = await sharp(svg, { density: 300 }).resize({ height: 120 }).png().toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  };
  logoCache = { blue: await read("a1-logo-blue.svg"), white: await read("a1-logo-white.svg") };
  return logoCache;
}

const ACCENT = "#335EF7";
const INK = "#141A33";
const BODY = "#2B3150";
const MUTED = "#5A6180";
const LINE = "#E2E6F5";
const HEAT = ["#EDF0FA", "#C7D2FB", "#8FA3F8", ACCENT, "#2840B8"];

function H2({ children }: { children: string }) {
  return <Text style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.9, textTransform: "uppercase", color: ACCENT, marginBottom: 7 }}>{children}</Text>;
}

function Chip({ children, light }: { children: string; light?: boolean }) {
  return (
    <Text
      style={{
        fontSize: 9.4,
        fontWeight: light ? 500 : 600,
        paddingVertical: 3.5,
        paddingHorizontal: 8,
        borderRadius: 999,
        backgroundColor: light ? "rgba(255,255,255,0.18)" : "#EEF1FE",
        color: light ? "#FFFFFF" : "#2840B8",
      }}
    >
      {children}
    </Text>
  );
}

function years(e: { start: number | null; end: number | null; current: boolean }, present: string): string {
  if (e.start === null && e.end === null) return "";
  if (e.start !== null && e.current) return `${e.start} – ${present}`;
  if (e.start !== null && e.end !== null) return e.start === e.end ? String(e.start) : `${e.start} – ${e.end}`;
  return String(e.start ?? e.end);
}

function CvDocument({ d, logo, family }: { d: CvData; logo: { blue: string; white: string }; family: string }) {
  const t = (k: Parameters<typeof cvText>[1]) => cvText(d.lang, k);
  const fav = [
    { label: t("books"), items: d.favorites.books },
    { label: t("movies"), items: d.favorites.movies },
    { label: t("games"), items: d.favorites.games },
  ].filter((f) => f.items.length);
  const tiles = [d.github, d.dribbble, d.stackoverflow].filter(Boolean).length;

  return (
    <Document title={`CV ${d.name}`} author={d.name} creator="A1" producer="A1 (jobs.a1appp.com)" language={d.lang}>
      <Page size="A4" style={{ fontFamily: family, color: INK, paddingBottom: 54, backgroundColor: "#FFFFFF" }}>
        {/* Водяной знак */}
        <Image src={logo.blue} fixed style={{ position: "absolute", right: -40, bottom: 40, width: 390, opacity: 0.045, transform: "rotate(-14deg)" }} />

        {/* Шапка */}
        <View style={{ position: "relative", overflow: "hidden", paddingTop: 24, paddingBottom: 21, paddingHorizontal: 33, flexDirection: "row", alignItems: "center" }}>
          <Svg style={{ position: "absolute", top: 0, left: 0 }} width={595} height={400} viewBox="0 0 595 400" preserveAspectRatio="none">
            <Defs>
              <LinearGradient id="g" x1="0" y1="0" x2="1" y2="0.45">
                <Stop offset="0" stopColor={ACCENT} />
                <Stop offset="0.55" stopColor="#6A4BF5" />
                <Stop offset="1" stopColor="#A63DF2" />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="595" height="400" fill="url(#g)" />
          </Svg>
          {d.photo ? (
            <View style={{ width: 107, height: 107, borderRadius: 54, backgroundColor: "rgba(255,255,255,0.9)", padding: 4, marginRight: 20 }}>
              <Image src={d.photo} style={{ width: 99, height: 99, borderRadius: 50, objectFit: "cover" }} />
            </View>
          ) : null}
          <View style={{ flex: 1, color: "#FFFFFF" }}>
            <Text style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: 0.8, textTransform: "uppercase", opacity: 0.85 }}>{t("resumeFrom")}</Text>
            <Text style={{ fontSize: d.name.length > 22 ? 24 : 30, fontWeight: 800, marginTop: 4, lineHeight: 1.08 }}>{d.name}</Text>
            {d.role ? <Text style={{ fontSize: 13.5, fontWeight: 600, marginTop: 4 }}>{d.role}</Text> : null}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              {d.location ? <Chip light>{d.location}</Chip> : null}
              {d.years ? <Chip light>{yearsText(d.lang, d.years)}</Chip> : null}
              {d.voiceUrl ? (
                <Link src={d.voiceUrl} style={{ textDecoration: "none" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 3.5, paddingHorizontal: 8, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.18)" }}>
                    <Svg width={7} height={8} viewBox="0 0 7 8">
                      <Path d="M0 0L7 4L0 8z" fill="#FFFFFF" />
                    </Svg>
                    <Text style={{ fontSize: 9.4, fontWeight: 500, color: "#FFFFFF" }}>{t("listen")}</Text>
                  </View>
                </Link>
              ) : null}
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 7 }}>
              {d.email ? (
                <Link src={`mailto:${d.email}`} style={{ fontSize: 9.4, fontWeight: 600, color: "#FFFFFF", textDecoration: "none" }}>
                  {d.email}
                </Link>
              ) : null}
              {d.phone ? (
                <Link src={`tel:${d.phone.replace(/[^\d+]/g, "")}`} style={{ fontSize: 9.4, fontWeight: 600, color: "#FFFFFF", textDecoration: "none" }}>
                  {d.phone}
                </Link>
              ) : null}
              {d.links.map((l) => (
                <Link key={l.url} src={l.url} style={{ fontSize: 9.4, fontWeight: 600, color: "#FFFFFF", textDecoration: "none" }}>
                  {l.label}
                </Link>
              ))}
            </View>
          </View>
          <Link src={d.profileUrl} style={{ alignItems: "center", marginLeft: 16, textDecoration: "none" }}>
            <View style={{ backgroundColor: "#FFFFFF", borderRadius: 12, padding: 7 }}>
              <Image src={d.qr} style={{ width: 78, height: 78 }} />
            </View>
            <Text style={{ fontSize: 8.2, fontWeight: 600, color: "#FFFFFF", textAlign: "center", marginTop: 5 }}>{t("interactive1")}</Text>
            <Text style={{ fontSize: 8.2, fontWeight: 600, color: "#FFFFFF", textAlign: "center" }}>{t("interactive2")}</Text>
          </Link>
        </View>

        {/* Плитки GitHub / Dribbble / Stack Overflow */}
        {tiles > 0 ? (
          <View style={{ flexDirection: "row", gap: 7.5, paddingTop: 14, paddingHorizontal: 33 }}>
            {d.github ? (
              <Link src={d.github.url} style={{ flex: 1, border: `0.75pt solid ${LINE}`, borderRadius: 12, padding: 10, textDecoration: "none", color: INK }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={{ fontSize: 15, fontWeight: 800 }}>{d.github.total.toLocaleString("en-US").replace(/,/g, " ")}</Text>
                  <Text style={{ fontSize: 8.4, color: MUTED, flex: 1 }}>{`GitHub · ${t("contributions")}`}</Text>
                </View>
                <View style={{ flexDirection: "row", gap: 1.5, marginTop: 7 }}>
                  {d.github.levels.map((week, wi) => (
                    <View key={wi} style={{ gap: 1.5 }}>
                      {week.map((lv, di) => (
                        <View key={di} style={{ width: 5.2, height: 5.2, borderRadius: 1.2, backgroundColor: HEAT[lv] ?? HEAT[0] }} />
                      ))}
                    </View>
                  ))}
                </View>
              </Link>
            ) : null}
            {d.dribbble ? (
              <Link src={d.dribbble.url} style={{ flex: 1, border: `0.75pt solid ${LINE}`, borderRadius: 12, padding: 10, textDecoration: "none", color: INK }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={{ fontSize: 15, fontWeight: 800 }}>{String(d.dribbble.shots)}</Text>
                  <Text style={{ fontSize: 8.4, color: MUTED, flex: 1 }}>{t("dribbbleWorks")}</Text>
                </View>
                {d.dribbble.images.length ? (
                  <View style={{ flexDirection: "row", gap: 4.5, marginTop: 7 }}>
                    {d.dribbble.images.map((src, i) => (
                      <Image key={i} src={src} style={{ flex: 1, height: 46, borderRadius: 6, objectFit: "cover" }} />
                    ))}
                  </View>
                ) : null}
              </Link>
            ) : null}
            {d.stackoverflow ? (
              <Link src={d.stackoverflow.url} style={{ flex: 1, border: `0.75pt solid ${LINE}`, borderRadius: 12, padding: 10, textDecoration: "none", color: INK }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={{ fontSize: 15, fontWeight: 800 }}>{d.stackoverflow.reputation.toLocaleString("en-US").replace(/,/g, " ")}</Text>
                  <Text style={{ fontSize: 8.4, color: MUTED, flex: 1 }}>{t("soReputation")}</Text>
                </View>
                {d.stackoverflow.gold + d.stackoverflow.silver + d.stackoverflow.bronze > 0 ? (
                <View style={{ flexDirection: "row", gap: 9, marginTop: 7 }}>
                  {[
                    ["#E8B400", d.stackoverflow.gold],
                    ["#A9B4C2", d.stackoverflow.silver],
                    ["#C8803F", d.stackoverflow.bronze],
                  ].map(([c, n]) => (
                    <View key={String(c)} style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                      <View style={{ width: 6.8, height: 6.8, borderRadius: 3.4, backgroundColor: String(c) }} />
                      <Text style={{ fontSize: 9, fontWeight: 700 }}>{String(n)}</Text>
                    </View>
                  ))}
                </View>
                ) : null}
                {d.stackoverflow.tags.length ? (
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                    {d.stackoverflow.tags.map((tag) => (
                      <Text key={tag} style={{ fontSize: 8.2, fontWeight: 600, color: "#A34B00", backgroundColor: "#FFF1E6", borderRadius: 4, paddingVertical: 2, paddingHorizontal: 6 }}>
                        {tag}
                      </Text>
                    ))}
                  </View>
                ) : null}
              </Link>
            ) : null}
          </View>
        ) : null}

        {/* Две колонки */}
        <View style={{ flexDirection: "row", gap: 25, paddingTop: 16, paddingHorizontal: 33 }}>
          <View style={{ flex: 1.45, gap: 15 }}>
            {d.about ? (
              <View>
                <H2>{t("about")}</H2>
                <Text style={{ fontSize: 10.5, lineHeight: 1.55, color: BODY }}>{d.about}</Text>
              </View>
            ) : null}
            {d.experience.length ? (
              <View>
                <H2>{t("experience")}</H2>
                {d.experience.map((e, i) => (
                  <View key={i} wrap={false} style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
                    <View style={{ alignItems: "center", width: 22 }}>
                      <View style={{ width: 22, height: 22, borderRadius: 7, backgroundColor: "#F2F4FD", border: `0.75pt solid ${LINE}`, alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ fontSize: 10, fontWeight: 800, color: ACCENT }}>{e.company.slice(0, 1).toUpperCase()}</Text>
                      </View>
                      {i < d.experience.length - 1 ? <View style={{ width: 1.5, flex: 1, backgroundColor: LINE, marginTop: 3 }} /> : null}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 11.3, fontWeight: 700 }}>{e.company}</Text>
                      {years(e, t("present")) ? <Text style={{ fontSize: 9.8, color: MUTED, marginTop: 1.5 }}>{years(e, t("present"))}</Text> : null}
                      {e.description ? <Text style={{ fontSize: 10, lineHeight: 1.5, color: BODY, marginTop: 4 }}>{e.description}</Text> : null}
                    </View>
                  </View>
                ))}
              </View>
            ) : null}
            {d.education.length ? (
              <View>
                <H2>{t("education")}</H2>
                {d.education.map((ed, i) => (
                  <Text key={i} style={{ fontSize: 10.5, fontWeight: 600, marginBottom: 3 }}>
                    {ed}
                  </Text>
                ))}
              </View>
            ) : null}
            {fav.length ? (
              <View wrap={false}>
                <H2>{t("favorites")}</H2>
                {fav.map((f) => (
                  <Text key={f.label} style={{ fontSize: 9.8, lineHeight: 1.5 }}>
                    <Text style={{ color: MUTED }}>{`${f.label}: `}</Text>
                    {f.items.join(", ")}
                  </Text>
                ))}
              </View>
            ) : null}
          </View>

          <View style={{ flex: 1, gap: 15 }}>
            {d.skills.length ? (
              <View>
                <H2>{t("skills")}</H2>
                {d.skills.map((s) => (
                  <View key={s.name} wrap={false} style={{ marginBottom: 7 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", fontSize: 9.8, fontWeight: 600 }}>
                      <Text>{s.name}</Text>
                      <Text style={{ color: MUTED, fontWeight: 500 }}>{`${Math.round(s.level)}%`}</Text>
                    </View>
                    <View style={{ height: 5.2, borderRadius: 3, backgroundColor: "#EDF0FA", marginTop: 3.5 }}>
                      <View style={{ height: 5.2, borderRadius: 3, width: `${Math.max(2, s.level)}%`, backgroundColor: s.level >= 85 ? "#6A4BF5" : ACCENT }} />
                    </View>
                  </View>
                ))}
              </View>
            ) : null}
            {d.languages.length ? (
              <View wrap={false}>
                <H2>{t("languages")}</H2>
                {d.languages.map((l) => (
                  <View key={l.name} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                    <Text style={{ fontSize: 10 }}>{l.name}</Text>
                    <View style={{ flexDirection: "row", gap: 3 }}>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: i <= l.level ? ACCENT : "#DDE2F2" }} />
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            ) : null}
            {d.hobbies.length ? (
              <View wrap={false}>
                <H2>{t("hobbies")}</H2>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4.5 }}>
                  {d.hobbies.map((h) => (
                    <Chip key={h}>{h}</Chip>
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        </View>

        {/* Низ страницы: на каждой странице */}
        <View
          fixed
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            paddingVertical: 12,
            paddingHorizontal: 33,
            borderTop: `0.75pt solid #E8EBF6`,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: "#FFFFFF",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
            <Image src={logo.blue} style={{ height: 16 }} />
            <Text style={{ fontSize: 9.4, color: MUTED }}>{t("createdIn")}</Text>
          </View>
          <Link src={d.profileUrl} style={{ fontSize: 9.4, fontWeight: 600, color: ACCENT, textDecoration: "none" }}>
            {d.profileHost}
          </Link>
        </View>
      </Page>
    </Document>
  );
}

export async function renderCvPdf(d: CvData): Promise<Buffer> {
  registerFonts();
  let family = "Commissioner";
  if (d.lang === "zh" || /[㐀-鿿]/.test(JSON.stringify([d.name, d.role, d.about]))) {
    const allText = JSON.stringify(d).replace(/data:[^"]+/g, "");
    const cjk = await cjkFamily(allText + "–·…%");
    if (cjk) family = cjk;
  }
  const logo = await logos();
  return renderToBuffer(<CvDocument d={d} logo={logo} family={family} />);
}
