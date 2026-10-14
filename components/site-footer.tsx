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
  { href: "/compare", label: L("A1, Djinni чи DOU", "A1 vs Djinni vs DOU", "A1, Djinni или DOU", { de: "A1 vs. Djinni vs. DOU", es: "A1 vs Djinni vs DOU", fr: "A1, Djinni ou DOU", pl: "A1, Djinni czy DOU", ptBR: "A1, Djinni ou DOU", zh: "A1、Djinni 还是 DOU" }) },
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
  made: L("Зроблено в Україні", "Made in Ukraine", "Сделано в Украине", { de: "Made in Ukraine", es: "Hecho en Ucrania", fr: "Fait en Ukraine", pl: "Zrobione w Ukrainie", ptBR: "Feito na Ucrânia", zh: "乌克兰制造" }),
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
      {/* градиентная линия сверху */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent"
      />
      {/* фон: мягкий синий -> фиолетовый поверх цвета страницы, в тёмной теме то же на чёрном */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(160deg,#eef2ff_0%,#f3efff_45%,#eaf6ff_100%)] dark:bg-[linear-gradient(160deg,#070b1a_0%,#0f0a1f_50%,#04121c_100%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 -top-24 -z-10 h-72 w-72 rounded-full bg-[#335ef7]/15 blur-3xl dark:bg-[#0c8ce9]/20"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 right-0 -z-10 h-72 w-96 rounded-full bg-[#8b5cf6]/15 blur-3xl dark:bg-[#8b5cf6]/20"
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

        <div className="mt-12 flex flex-col gap-2 border-t border-black/5 pt-6 text-[13px] text-neutral-500 sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:text-neutral-500">
          <span>© {year} A1 · jobs.a1appp.com</span>
          <span>
            <T {...HEAD.made} />
          </span>
        </div>
      </div>
    </footer>
  );
}
