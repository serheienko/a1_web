// components/site-footer.tsx
//
// 14.10.2026 (Александр: «надо сделать подвал на все страницы, нормальный,
// полноценный, симпатичный… главное — логотипы download iOS и Google Play и
// QR-код… может, дублирование пунктов из „•••“… по цвету — градиентный,
// не чисто белый/серый, и так же в тёмной теме»).
//
// Что внутри и почему:
//   * слева -- логотип, одна фраза о продукте, кнопки App Store / Google
//     Play и QR (QR только на десктопе: с компьютера поставить приложение
//     не с чего, это мостик на телефон; на телефоне хватает кнопок);
//   * три колонки ссылок: вакансии по формату (это ещё и перелинковка на
//     посадочные для поиска), разделы сайта -- те же, что в меню «•••»
//     (новости, события, статистика, игра) плюс фахівці, карта и блог, и
//     «A1» -- приложение, телеграм-бот, сравнение с Djinni/DOU, условия;
//   * внизу -- копирайт.
// Фон -- лёгкий градиент из фирменного синего в фиолетовый поверх цвета
// страницы, в тёмной теме -- тот же приём на почти чёрном. Сверху тонкая
// градиентная линия вместо серой границы.
//
// Серверный компонент: ссылки и тексты попадают в HTML (для поиска это
// внутренние ссылки с каждой страницы). Девять языков -- приёмом
// components/t.tsx. Где подвал не нужен (полноэкранные чаты, игра,
// /download со своим оформлением) -- решает components/site-footer-gate.tsx.

import Link from "next/link";
import type { ReactNode } from "react";
import type { Locale } from "@/components/t";
import { T } from "@/components/t";
import { AppQr } from "@/components/app-qr";
import { StoreBadges } from "@/components/store-badges";

type Txt = Record<Locale, string>;

function L(uk: string, en: string, ru: string, rest: Omit<Txt, "uk" | "en" | "ru">): Txt {
  return { uk, en, ru, ...rest };
}

type Item = { href: string; label: Txt; external?: boolean };

const JOBS: Item[] = [
  { href: "/", label: L("Усі вакансії", "All jobs", "Все вакансии", { de: "Alle Jobs", es: "Todas las ofertas", fr: "Toutes les offres", pl: "Wszystkie oferty", ptBR: "Todas as vagas", zh: "全部职位" }) },
  { href: "/jobs/remote", label: L("Віддалено", "Remote", "Удалённо", { de: "Remote", es: "En remoto", fr: "À distance", pl: "Zdalnie", ptBR: "Remoto", zh: "远程" }) },
  { href: "/jobs/hybrid", label: L("Гібрид", "Hybrid", "Гибрид", { de: "Hybrid", es: "Híbrido", fr: "Hybride", pl: "Hybrydowo", ptBR: "Híbrido", zh: "混合办公" }) },
  { href: "/jobs/office", label: L("В офісі", "On-site", "В офисе", { de: "Vor Ort", es: "Presencial", fr: "Sur site", pl: "Stacjonarnie", ptBR: "Presencial", zh: "坐班" }) },
  { href: "/jobs/catalog", label: L("Каталог вакансій", "Job catalog", "Каталог вакансий", { de: "Job-Katalog", es: "Catálogo de empleos", fr: "Catalogue des offres", pl: "Katalog ofert", ptBR: "Catálogo de vagas", zh: "职位目录" }) },
  { href: "/talents", label: L("Фахівці", "Talents", "Специалисты", { de: "Fachkräfte", es: "Profesionales", fr: "Talents", pl: "Specjaliści", ptBR: "Profissionais", zh: "人才" }) },
];

const EXPLORE: Item[] = [
  { href: "/news", label: L("IT новини", "IT News", "IT новости", { de: "IT-News", es: "Noticias IT", fr: "Actus IT", pl: "Wiadomości IT", ptBR: "Notícias de TI", zh: "IT 新闻" }) },
  { href: "/events", label: L("Події", "Events", "События", { de: "Events", es: "Eventos", fr: "Événements", pl: "Wydarzenia", ptBR: "Eventos", zh: "活动" }) },
  { href: "/stats", label: L("A1 Stats", "A1 Stats", "A1 Stats", { de: "A1 Stats", es: "A1 Stats", fr: "A1 Stats", pl: "A1 Stats", ptBR: "A1 Stats", zh: "A1 Stats" }) },
  { href: "/map", label: L("Карта IT", "IT map", "Карта IT", { de: "IT-Karte", es: "Mapa IT", fr: "Carte IT", pl: "Mapa IT", ptBR: "Mapa de TI", zh: "IT 地图" }) },
  { href: "/blog", label: L("Блог", "Blog", "Блог", { de: "Blog", es: "Blog", fr: "Blog", pl: "Blog", ptBR: "Blog", zh: "博客" }) },
  { href: "/game", label: L("Гра A1 Run", "A1 Run game", "Игра A1 Run", { de: "Spiel A1 Run", es: "Juego A1 Run", fr: "Jeu A1 Run", pl: "Gra A1 Run", ptBR: "Jogo A1 Run", zh: "A1 Run 游戏" }) },
];

const ABOUT: Item[] = [
  { href: "/download", label: L("Завантажити додаток", "Get the app", "Скачать приложение", { de: "App holen", es: "Descargar la app", fr: "Télécharger l'app", pl: "Pobierz aplikację", ptBR: "Baixar o app", zh: "下载应用" }) },
  { href: "https://t.me/a1jobs_bot", external: true, label: L("Telegram-бот вакансій", "Telegram job bot", "Telegram-бот вакансий", { de: "Telegram-Jobbot", es: "Bot de empleos en Telegram", fr: "Bot d'offres Telegram", pl: "Bot ofert w Telegramie", ptBR: "Bot de vagas no Telegram", zh: "Telegram 职位机器人" }) },
  { href: "/terms", label: L("Умови використання", "Terms of use", "Условия использования", { de: "Nutzungsbedingungen", es: "Condiciones de uso", fr: "Conditions d'utilisation", pl: "Regulamin", ptBR: "Termos de uso", zh: "使用条款" }) },
];

const HEAD = {
  jobs: L("Робота", "Jobs", "Работа", { de: "Jobs", es: "Empleo", fr: "Emploi", pl: "Praca", ptBR: "Vagas", zh: "工作" }),
  explore: L("Розділи", "Explore", "Разделы", { de: "Entdecken", es: "Explorar", fr: "Explorer", pl: "Odkrywaj", ptBR: "Explorar", zh: "探索" }),
  about: L("A1", "A1", "A1", { de: "A1", es: "A1", fr: "A1", pl: "A1", ptBR: "A1", zh: "A1" }),
  tagline: L(
    "Робота та фахівці в IT — в один дотик. Вакансії з усього світу й прямий чат із компаніями.",
    "IT jobs and talent in one tap. Jobs from around the world and direct chat with companies.",
    "Работа и специалисты в IT — в одно касание. Вакансии со всего мира и прямой чат с компаниями.",
    {
      de: "IT-Jobs und Fachkräfte mit einem Tipp. Jobs aus aller Welt und direkter Chat mit Unternehmen.",
      es: "Empleo y talento IT en un toque. Ofertas de todo el mundo y chat directo con empresas.",
      fr: "Emplois et talents IT en un geste. Des offres du monde entier et un chat direct avec les entreprises.",
      pl: "Praca i specjaliści IT jednym dotknięciem. Oferty z całego świata i bezpośredni czat z firmami.",
      ptBR: "Vagas e talentos de TI em um toque. Vagas do mundo todo e chat direto com empresas.",
      zh: "一键连接 IT 工作与人才。全球职位，与公司直接沟通。",
    },
  ),
  app: L("Додаток A1", "The A1 app", "Приложение A1", { de: "Die A1-App", es: "La app A1", fr: "L'app A1", pl: "Aplikacja A1", ptBR: "O app A1", zh: "A1 应用" }),
  qr: L(
    "Наведіть камеру телефона — відкриється ваш магазин",
    "Point your phone camera — it opens the right store",
    "Наведите камеру телефона — откроется ваш магазин",
    {
      de: "Mit der Handykamera scannen – der passende Store öffnet sich",
      es: "Apunta con la cámara del móvil: se abre tu tienda",
      fr: "Visez avec l'appareil photo : votre store s'ouvre",
      pl: "Skieruj aparat telefonu — otworzy się właściwy sklep",
      ptBR: "Aponte a câmera do celular — abre a loja certa",
      zh: "用手机相机扫码，自动打开对应应用商店",
    },
  ),
  support1: L("Підтримай", "Support", "Поддержи", { de: "Unterstütze", es: "Apoya a", fr: "Soutenez", pl: "Wesprzyj", ptBR: "Apoie a", zh: "支持" }),
  support2: L("Україну", "Ukraine", "Украину", { de: "die Ukraine", es: "Ucrania", fr: "l'Ukraine", pl: "Ukrainę", ptBR: "Ucrânia", zh: "乌克兰" }),
};

function Column({ title, items }: { title: Txt; items: Item[] }) {
  return (
    <div>
      <h2 className="text-[13px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
        <T {...title} />
      </h2>
      <ul className="mt-3 space-y-2.5">
        {items.map((item) => {
          const cls =
            "text-[15px] text-neutral-700 transition-colors hover:text-accent dark:text-neutral-300 dark:hover:text-accent";
          const label: ReactNode = <T {...item.label} />;
          return (
            <li key={item.href}>
              {item.external ? (
                <a href={item.href} target="_blank" rel="noopener" className={cls}>
                  {label}
                </a>
              ) : (
                <Link href={item.href} className={cls}>
                  {label}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="relative isolate mt-16 overflow-hidden border-t border-transparent">
      {/* градиентная линия сверху. 14.10.2026 (Александр: «чтобы она плавно, мягко туда-сюда
          перетекала по цвету, прям вообще не напряжно»): синий -> фиолетовый -> голубой медленно
          едут по линии туда и обратно (.footer-flow в app/globals.css; при «меньше движения» стоит). */}
      <div aria-hidden="true" className="footer-flow absolute inset-x-0 top-0 h-[1.5px]" />
      {/* фон: мягкий синий -> фиолетовый -> голубой поверх цвета страницы, в тёмной теме то же на чёрном.
          14.10.2026 (Александр: «чтобы весь блок плавно переливался из цвета в цвет»): сам градиент
          медленно едет (.footer-bg-flow), а три размытых пятна -- синее, фиолетовое и голубое -- плавают
          каждое в своём ритме (.footer-blob-a/b/c в app/globals.css). При «меньше движения» всё стоит. */}
      <div
        aria-hidden="true"
        className="footer-bg-flow absolute inset-0 -z-10 bg-[linear-gradient(135deg,#eef2ff_0%,#f3efff_25%,#eaf6ff_50%,#f5eefe_75%,#e8efff_100%)] dark:bg-[linear-gradient(135deg,#070b1a_0%,#0f0a1f_25%,#04121c_50%,#120a20_75%,#060d1f_100%)]"
      />
      <div
        aria-hidden="true"
        className="footer-blob-a pointer-events-none absolute -left-24 -top-24 -z-10 h-72 w-72 rounded-full bg-[#335ef7]/20 blur-3xl dark:bg-[#0c8ce9]/25"
      />
      <div
        aria-hidden="true"
        className="footer-blob-b pointer-events-none absolute -bottom-24 right-0 -z-10 h-72 w-96 rounded-full bg-[#8b5cf6]/20 blur-3xl dark:bg-[#8b5cf6]/25"
      />
      <div
        aria-hidden="true"
        className="footer-blob-c pointer-events-none absolute left-1/3 top-1/3 -z-10 h-64 w-80 rounded-full bg-[#22d3ee]/15 blur-3xl dark:bg-[#22d3ee]/15"
      />

      <div className="mx-auto max-w-6xl px-5 pb-36 pt-12 sm:px-8 sm:pb-28 sm:pt-14">
        <div className="grid gap-10 lg:grid-cols-[1.35fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" className="inline-block transition-opacity hover:opacity-80" aria-label="A1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/a1-logo-blue.svg" alt="A1" className="h-8 w-auto dark:hidden" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/a1-logo-white.svg" alt="A1" className="hidden h-8 w-auto dark:block" />
            </Link>
            <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400">
              <T {...HEAD.tagline} />
            </p>

            <div className="mt-6 flex items-center gap-5">
              <div>
                <p className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  <T {...HEAD.app} />
                </p>
                <StoreBadges />
              </div>
            </div>
            <div className="mt-5 hidden items-center gap-4 lg:flex">
              <Link
                href="/download"
                className="shrink-0 rounded-xl bg-white p-1.5 shadow-sm ring-1 ring-black/5 transition hover:scale-[1.03] dark:ring-white/10"
              >
                <AppQr className="h-[92px] w-[92px]" />
              </Link>
              <p className="max-w-[190px] text-[13px] leading-snug text-neutral-500 dark:text-neutral-400">
                <T {...HEAD.qr} />
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-3">
            <Column title={HEAD.jobs} items={JOBS} />
            <Column title={HEAD.explore} items={EXPLORE} />
            <Column title={HEAD.about} items={ABOUT} />
          </div>
        </div>

        {/* 14.10.2026 (Александр, пример — подвал traffband.com): «Support / Ukraine» в две строки,
            второе слово жирным курсивом, рядом флажок вместо сердечка; ведёт на U24 —
            официальную платформу сбора средств Украины. Логотип U24 не рисуем — чужой знак. */}
        <div className="mt-12 flex flex-col gap-6 border-t border-black/5 pt-8 sm:flex-row sm:items-end sm:justify-between dark:border-white/10">
          <a
            href="https://u24.gov.ua/"
            target="_blank"
            rel="noopener"
            title="u24.gov.ua"
            className="group inline-flex w-fit flex-col leading-tight text-neutral-800 transition hover:text-accent dark:text-neutral-100 dark:hover:text-accent"
          >
            <span className="text-[19px] font-normal">
              <T {...HEAD.support1} />
            </span>
            <span className="mt-0.5 flex items-center gap-2.5 text-[23px] font-bold italic tracking-tight">
              <T {...HEAD.support2} />
              <span aria-hidden="true" className="flex h-[18px] w-[26px] flex-col overflow-hidden rounded-[4px] shadow-sm transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
                <span className="h-1/2 bg-[#0057B7]" />
                <span className="h-1/2 bg-[#FFD700]" />
              </span>
            </span>
          </a>
          <div className="flex flex-col gap-1 text-[13px] text-neutral-500 sm:items-end dark:text-neutral-500">
            <span>© {year} A1 · jobs.a1appp.com</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
