import type { Metadata, Viewport } from "next";
import { Commissioner } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import Script from "next/script";
import "./globals.css";
import { SiteNav } from "@/components/site-nav";
import { CreatePostFab } from "@/components/create-post-fab";
import { ChatsFab } from "@/components/chats-fab";
import { PostContextMenuHost } from "@/components/post-context-menu";
import { AppPromo } from "@/components/app-promo";
import { ScrollTopFab } from "@/components/scroll-top-fab";
import { VoiceNowPlayingBar } from "@/components/chat/voice-now-playing-bar";
import { MetaPixel } from "@/components/meta-pixel";

// Commissioner: the real typeface used in the Figma mockups (confirmed via
// Inspect on "Feed Preview White", 2026-08-26), not a generic system stack.
// Cyrillic coverage was verified before adopting it — the UI is Russian —
// see the comment block in app/globals.css for the full source note.
const commissioner = Commissioner({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-commissioner",
  display: "swap",
});


// Anti-flash theme script: next/script's `beforeInteractive` strategy is
// the documented way to run something before hydration/paint AND have
// Next guarantee it's hoisted into <head> regardless of where the
// component sits in the tree — a plain <script> placed inside a literal
// <head> tag in the root layout does NOT reliably get that same ordering
// guarantee (confirmed against Next's own docs before using this, not
// assumed). Reads the same localStorage key components/theme-toggle.tsx
// writes; falls back to the OS preference (by setting neither class) when
// nothing's stored yet — matches the @custom-variant in app/globals.css.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("theme");
    var root = document.documentElement;
    if (stored === "dark") root.classList.add("dark");
    else if (stored === "light") root.classList.add("light");
  } catch (e) {}
  // 07.10.2026 (Александр: свой профиль на мобильном сайте ещё
  // показывает 4 пустые кнопки, пока страница оживает). Заглушка ряда
  // кнопок приходит готовой в HTML, а JS, который узнаёт «это мой
  // профиль», на телефоне запускается заметно позже. Поэтому прячем её
  // здесь, ещё до первой отрисовки: components/profile-action-row.tsx
  // помечает заглушку data-actions-for="<ник>", а свой ник браузер
  // помнит с прошлого входа (a1-my-username).
  try {
    var me = localStorage.getItem("a1-my-username");
    if (me) {
      var esc = window.CSS && CSS.escape ? CSS.escape(me) : me.replace(/[^a-zA-Z0-9_.-]/g, "");
      var st = document.createElement("style");
      st.textContent = '[data-actions-for="' + esc + '"]{display:none!important}';
      document.head.appendChild(st);
    }
  } catch (e) {}
})();
`;

// 07.10.2026 (Александр: перед картой в приложении мелькают меню сайта,
// плашка «открыть в приложении» и английский текст). Карта внутри
// приложения (/game-map?app=1): с первой отрисовки -- только размытая
// карта и «Загружаем карту…» на весь экран, тема и язык из приложения.
// Обычный <script> в <head>, а не next/script: тот (beforeInteractive)
// запускается только когда оживает страница, а экран загрузки карты
// приходит раньше и успевает показать меню сайта.
const INAPP_MAP_SCRIPT = `
(function () {
  try {
    var q = new URLSearchParams(location.search);
    if (location.pathname.indexOf("/game-map") !== 0 || q.get("app") !== "1") return;
    var r = document.documentElement;
    r.classList.add("a1-inapp");
    var th = q.get("theme");
    if (th === "dark" || th === "light") { r.classList.remove("dark", "light"); r.classList.add(th); }
    var CLS = { uk: "lang-uk", en: "lang-en", ru: "lang-ru", de: "lang-de", es: "lang-es", fr: "lang-fr", pl: "lang-pl", ptBR: "lang-ptbr", zh: "lang-zh" };
    var l = q.get("lang");
    if (l && CLS[l]) { for (var k in CLS) r.classList.remove(CLS[k]); r.classList.add(CLS[l]); }
    var st = document.createElement("style");
    st.textContent = "html.a1-inapp body{background:#cfd9a6!important}html.a1-inapp.dark body{background:#1c2b3a!important}html.a1-inapp body>*:not(main){display:none!important}html.a1-inapp main{max-width:none!important;padding:0!important}html.a1-inapp main>p{display:none!important}html.a1-inapp .gm2 .gm-load{position:fixed!important;inset:0!important;z-index:2147483002}";
    document.head.appendChild(st);
  } catch (e) {}
})();
`;

// Same anti-flash trick, now for the full 9-language switcher (2026-08-27,
// see components/lang-toggle.tsx and components/t.tsx). Every language —
// including Ukrainian — needs an explicit lang-XX class for its <T/> spans
// to show (components/t.tsx wraps ALL nine locales symmetrically in
// "hidden lang-XX:inline", not just a non-default one), so this always
// ends by setting exactly one such class, clearing any others first
// (the <html> tag below bakes in lang-uk as the no-JS/pre-hydration
// fallback; this script corrects it to the real resolved locale before
// first paint, same guarantee beforeInteractive already gives THEME_INIT_SCRIPT).
//
// Resolution order: (1) an explicit stored choice from LangToggle always
// wins; (2) otherwise, a geo-based default computed from middleware.ts's
// a1_geo cookie (IP-detected, mirrors "хотелось бы, чтобы сайт
// автоматически определял [язык] в зависимости от IP, но при этом выбор
// также оставался" — auto-detect by default, manual pick always
// override-able); (3) unmapped/unknown countries fall back to the site's
// own default. 2026-09-16 (Aleksandr: «можно ли чтобы сайт понимал IP и
// сразу показывал соответствующий язык?» — geo-карта уже работала, а вот
// хвост был неверный): страна вне GEO_DEFAULT больше не получает
// украинский. Порядок теперь такой: сохранённый выбор → страна по IP →
// язык браузера → английский. Украинец в Польше видит украинский,
// американец — английский, и никто из них не упирается в язык, которого
// не знает. <html lang="uk"> в разметке ниже — лишь стартовое значение
// до первой отрисовки, скрипт его тут же уточняет.
//
// Ukraine carve-out (2026-08-27/28, see middleware.ts, quoted precisely
// because the scope matters): "это только касается русского языка в гео
// Украине... все остальные языки... должны показываться как
// переключатель" — geo-ua drops ONLY "ru" from consideration, both as a
// stored choice (even stale localStorage from before this rule existed)
// and as a geo-detected default. It never disables language-switching
// itself — see components/lang-toggle.tsx, which keeps every other
// language selectable for Ukraine-geo visitors.
const LANG_INIT_SCRIPT = `
(function () {
  try {
    var root = document.documentElement;
    var LOCALES = ["uk", "en", "ru", "de", "es", "fr", "pl", "ptBR", "zh"];
    var CLASS_FOR = {
      uk: "lang-uk", en: "lang-en", ru: "lang-ru", de: "lang-de",
      es: "lang-es", fr: "lang-fr", pl: "lang-pl", ptBR: "lang-ptbr", zh: "lang-zh"
    };
    var TAG_FOR = {
      uk: "uk", en: "en", ru: "ru", de: "de", es: "es", fr: "fr",
      pl: "pl", ptBR: "pt-BR", zh: "zh-Hans"
    };

    var match = document.cookie.match(/(?:^|; )a1_geo=([^;]*)/);
    var country = match ? decodeURIComponent(match[1]) : "";
    // 02.10.2026: після переїзду з Vercel на Railway країна за IP більше не
    // приходить (a1_geo порожній) -- правило «в Україні без російської»
    // мовчки перестало працювати. Запасний спосіб -- часовий пояс браузера.
    if (!country) {
      try {
        var tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
        if (["Europe/Kiev", "Europe/Kyiv", "Europe/Uzhgorod", "Europe/Zaporozhye", "Europe/Simferopol"].indexOf(tz) !== -1) country = "UA";
      } catch (e) {}
    }
    var isGeoUa = country === "UA";
    if (isGeoUa) root.classList.add("geo-ua");

    var stored = null;
    try {
      var s = localStorage.getItem("lang");
      if (s && LOCALES.indexOf(s) !== -1) stored = s;
    } catch (e) {}
    // Hard rule, no exceptions: never Russian for a Ukraine-geo visitor,
    // even a choice they made before this rule existed.
    if (isGeoUa && stored === "ru") stored = null;

    // Порядок выбора языка (2026-09-16). Сначала то, что человек уже
    // выбрал сам; потом Украина — у неё правило жёсткое и отдельное;
    // потом язык браузера — он точнее IP говорит, на чём человек читает
    // (украинец в Польше получит украинский, а не польский); потом
    // страна по IP; и только в конце английский.
    // Aleksandr, 16.09.2026: «язык браузера, иначе английский».
    var locale = stored;

    // 07.10.2026: карта внутри приложения -- язык задаёт приложение (?lang=),
    // сразу, а не «Loading the map…», а потом «Загружаем карту…».
    var inAppLang = null;
    try {
      var qq = new URLSearchParams(location.search);
      if (location.pathname.indexOf("/game-map") === 0 && qq.get("app") === "1") {
        var al = qq.get("lang");
        if (al && LOCALES.indexOf(al) !== -1) inAppLang = al;
      }
    } catch (e) {}
    if (inAppLang) locale = inAppLang;

    // Украина: всегда украинский, каким бы ни был браузер. Это то же
    // решение, что и запрет русского выше, — см. middleware.ts.
    if (!locale && isGeoUa) locale = "uk";

    if (!locale) {
      var BY_LANGUAGE = {
        uk: "uk", en: "en", ru: "ru", de: "de", es: "es",
        fr: "fr", pl: "pl", pt: "ptBR", zh: "zh"
      };
      var prefs = (navigator.languages && navigator.languages.length)
        ? navigator.languages
        : [navigator.language || ""];
      for (var p = 0; p < prefs.length && !locale; p++) {
        var tag = String(prefs[p] || "").toLowerCase().split("-")[0];
        if (BY_LANGUAGE[tag]) locale = BY_LANGUAGE[tag];
      }
    }

    if (!locale) {
      var GEO_DEFAULT = {
        UA: "uk",
        DE: "de", AT: "de", CH: "de",
        ES: "es", MX: "es", AR: "es", CO: "es", CL: "es", PE: "es", VE: "es",
        EC: "es", GT: "es", CU: "es", BO: "es", DO: "es", HN: "es", PY: "es",
        SV: "es", NI: "es", CR: "es", PA: "es", UY: "es", PR: "es",
        FR: "fr", BE: "fr",
        PL: "pl",
        BR: "ptBR",
        CN: "zh",
        RU: "ru", BY: "ru", KZ: "ru"
      };
      locale = GEO_DEFAULT[country] || null;
    }

    // Страна не из списка и браузер на чужом языке (Нидерланды, Индия,
    // Турция...): английский, а не украинский, как было раньше.
    if (!locale) locale = "en";
    if (isGeoUa && locale === "ru" && !inAppLang) locale = "uk";
    if (LOCALES.indexOf(locale) === -1) locale = "uk";

    for (var i = 0; i < LOCALES.length; i++) root.classList.remove(CLASS_FOR[LOCALES[i]]);
    root.classList.add(CLASS_FOR[locale]);
    root.lang = TAG_FOR[locale];
  } catch (e) {}
})();
`;

export const metadata: Metadata = {
  // Absolute base for every relative URL in metadata across the app —
  // notably the file-convention opengraph-image.tsx/twitter-image
  // outputs (2026-08-28: added alongside those), which need an absolute
  // <meta property="og:image"> URL to be usable when a link is shared.
  metadataBase: new URL("https://jobs.a1appp.com"),
  title: "A1 Web",
  description: "A1 — вакансии и специалисты из приложения A1, в вебе.",
  // Set GOOGLE_SITE_VERIFICATION in Vercel once you create the Search
  // Console property (Settings -> Ownership verification -> HTML tag ->
  // copy just the `content` value, not the whole tag) — this renders it
  // as <meta name="google-site-verification">. No code change needed
  // after that; omitted entirely if the env var isn't set.
  // Bing Webmaster Tools (1 Oct 2026): ownership via <meta name="msvalidate.01">.
  verification: {
    ...(process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : {}),
    other: { "msvalidate.01": "F9CBD364AC1D6F2C44D52C4B38A8E708" },
  },
};

// Aleksandr, 2026-08-27: header should fog/blur under the iPhone status
// bar/notch like the native app does, instead of a hard white edge —
// needs `viewport-fit=cover` or `env(safe-area-inset-top)` in
// site-nav.tsx's CSS always resolves to 0 and the notch area just shows
// plain page background with nothing painted into it.
export const viewport: Viewport = {
  viewportFit: "cover",
  // 2026-08-28: partial fix for a dark-theme flash on a hard reload
  // (repro'd on video) — this tells the browser BOTH color schemes are
  // supported so its own UA chrome (scrollbars, form controls, the
  // flash-of-white/black before THEME_INIT_SCRIPT above runs) picks
  // whichever matches the OS immediately, instead of always assuming
  // light. Does not fully eliminate the flash for a user with an
  // explicit stored light/dark choice that differs from their OS
  // setting — that needs the class read on the server before first
  // paint, which means reading a cookie in the root layout, which would
  // force server-dynamic rendering and drop ISR site-wide (app/page.tsx,
  // app/talents/page.tsx). Aleksandr: leave it here, don't chase the
  // rest — see PLAN.md's ISR tradeoffs.
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uk" className={commissioner.variable + " lang-uk"}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: INAPP_MAP_SCRIPT }} />
      </head>
      {/* spellCheck on <body> is inherited by every text input, textarea and
          contenteditable on the site: the browser underlines typos and offers
          fixes (right-click on desktop, the keyboard on phones), in the page
          language set on <html lang>. Search, link and picker fields opt out
          with spellCheck={false}; password/e-mail/number inputs are never
          checked by browsers anyway. */}
      <body
        spellCheck
        className="bg-app font-sans text-ink dark:bg-black dark:text-neutral-100"
      >
        <Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <Script id="lang-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: LANG_INIT_SCRIPT }} />
        <SiteNav alpha={process.env.PREMIUM_PREVIEW === "1"} />
        {/* 2026-09-03: cross-page voice-message "now playing" mini-bar --
            mounted globally for the same reason ChatsFab/CreatePostFab
            are (shown/controllable on every route, not just inside the
            chat that started playback) -- see its own header comment
            for the full reasoning and the lib/voice-playback-store.ts
            it reads/drives. Renders nothing (null) whenever nothing's
            playing, so this is a no-op on every page until a voice
            bubble starts a clip. */}
        <VoiceNowPlayingBar />
        {children}
        {/* 2026-08-29: floating "+" create-post button, mounted globally
            here next to <SiteNav/> for the same reason that one is —
            shown on every page, signed in or not (Aleksandr: "С логином
            и без"). See components/create-post-fab.tsx's own comment. */}
        {/* 2026-09-01 (Aleksandr: "хочу еще сделать кнопку чатов над
            кнопкой создать пост, фиксированную"): mounted right after
            CreatePostFab so it sits directly above it -- see
            components/chats-fab.tsx's own comment for the exact offset
            math and why it hides on /chats itself. */}
        {/* 30.09.2026: видео-превью приложения справа от ленты (десктоп) — components/app-promo.tsx */}
        <AppPromo />
        <ChatsFab />
        {/* 09.10.2026: меню по правому клику на постах -- components/post-context-menu.tsx */}
        <PostContextMenuHost />
        <ScrollTopFab />
        <CreatePostFab />
        <Analytics />
        {/* 03.10.2026: пиксель Meta для рекламы — components/meta-pixel.tsx */}
        <MetaPixel />
        {/* Umami (self-hosted on Railway): page views without cookies */}
        <Script
          id="umami"
          src="https://umami-production-e14b.up.railway.app/script.js"
          data-website-id="e76d05a0-d9e0-4e57-8a52-4ee0c93e05db"
          data-domains="jobs.a1appp.com"
          strategy="afterInteractive"
          defer
        />
      </body>
    </html>
  );
}
