// lib/a1/shtab-agents.ts
//
// 09.10.2026: список агентов штаба и расчёт «отработал / ждёт / пропустил».
// Список ведём руками здесь (public-репозиторий, секретов нет): комната,
// имя, что делает, расписание по UTC и откуда берём пульс.
//
// Как решаем про лампочку (нужна Александру одна четкая картина --
// «не отвалились, по графику сработают»):
//   работает     -- пульс «working» свежий (не старше 6 часов)
//   отработал    -- последний запуск закончился «ok» после последнего слота по расписанию
//   ошибка       -- запуск закончился «error», или «working» висит дольше 6 часов
//   ждёт         -- последний слот ещё свежий (в пределах «льготы»), отчёта пока нет
//   пропустил    -- слот прошёл больше «льготы» назад, а отчёта за него нет
//   нет данных   -- у агента ещё не подключён пульс
//   не нанят     -- агента ещё нет

import type { PulseRecord, PulseSnapshot } from "./shtab-store";

export type Slot = { h: number; m: number };

export type AgentDef = {
  id: string;
  /** Понятное имя: что делает и где. */
  name: string;
  /** Прежнее «кличка»-имя, мелко рядом с понятным. */
  nick?: string;
  role: string;
  /** Расписание, UTC. Пусто -- «всегда на месте» или вручную. */
  slots: Slot[];
  /** Сколько минут после слота агенту дано до «пропустил». */
  graceMin: number;
  /** pulse -- шлёт отметки; none -- пока нет; planned -- ещё не создан; manual -- запускается вручную */
  kind: "pulse" | "none" | "planned" | "manual";
  note?: string;
  /** Номер в очереди внутри комнаты (запуск по порядку). */
  order?: number;
  /** Дневной лимит публикаций (запасное значение; живое приходит с пульсом). */
  limit?: number | null;
  /** Откуда берёт вакансии, по-человечески. */
  sources?: string;
};

export type RoomDef = { id: string; name: string; where: string; color: string; wide?: boolean; agents: AgentDef[] };

const DAILY_07: Slot[] = [{ h: 7, m: 0 }];
// Конкистадор идёт по порядку, на весь прогон уходит несколько часов.
const KONK_GRACE = 360;

export const ROOMS: RoomDef[] = [
  {
    id: "konk",
    name: "Сбор вакансий по регионам",
    where: "Конкистадор · Railway · каждый день 07:00 UTC",
    color: "#e8b43c",
    wide: true,
    agents: [
      { id: "world", name: "Мир · топ-компании", nick: "Мировой", role: "Вакансии IT-компаний мира: ATS-ленты и фиды", slots: DAILY_07, graceMin: KONK_GRACE, order: 1, limit: null, sources: "Ленты вакансий топ-компаний мира (Greenhouse, Lever, Ashby, Workday и др.). Без дневного лимита: публикует все новые.", kind: "pulse" },
      { id: "jobico", name: "Jobico · лента", nick: "Jobico", role: "Лента jobico.io, кнопка ведёт на вакансию", slots: DAILY_07, graceMin: KONK_GRACE, order: 2, limit: null, sources: "Лента jobico.io (с их разрешения, с пересказом). Без дневного лимита.", kind: "pulse" },
      { id: "euro", name: "Европа", nick: "Европеец", role: "IT-вакансии Европы из многих источников", slots: DAILY_07, graceMin: KONK_GRACE, order: 3, limit: 1200, sources: "Workable (8 стран в день по кругу), EURES, Германия, Швеция, Болгария, Чехия, Польша и др.", kind: "pulse" },
      { id: "us", name: "США", nick: "Американец", role: "IT-вакансии США", slots: DAILY_07, graceMin: KONK_GRACE, order: 4, limit: 400, sources: "Workable США, 317 стартапов YC, 115 работодателей Workday, удалёнка Himalayas и Jobicy.", kind: "pulse" },
      { id: "af", name: "Африка", nick: "Африканец", role: "IT-вакансии Африки", slots: DAILY_07, graceMin: KONK_GRACE, order: 5, limit: 300, sources: "Workable из кеша GitHub (24 страны) и ленты 31 африканской компании.", kind: "pulse" },
      { id: "lat", name: "Латинская Америка", nick: "Латам", role: "IT-вакансии Латинской Америки", slots: DAILY_07, graceMin: KONK_GRACE, order: 6, limit: 300, sources: "Workable из кеша GitHub, 17 стран Латинской Америки (без Бразилии и Мексики).", kind: "pulse" },
      { id: "as", name: "Азия и Залив", nick: "Азиат", role: "IT-вакансии Азии, Залива и Казахстана", slots: DAILY_07, graceMin: KONK_GRACE, order: 7, limit: 300, sources: "Workable из кеша GitHub, 31 страна: Азия, Залив, Казахстан.", kind: "pulse" },
      { id: "ua", name: "Украина · ATS-ленты", nick: "Казак 2", role: "IT-вакансии Украины из лент компаний", slots: DAILY_07, graceMin: KONK_GRACE, order: 8, limit: 300, sources: "Ленты украинских компаний, Workable Украина, удалёнка для Украины.", kind: "pulse" },
    ],
  },
  {
    id: "kazak",
    name: "Украина: DOU и отправка в Google",
    where: "Railway · 07:20 и 15:20 UTC",
    color: "#4aa3ff",
    agents: [
      { id: "kazak", name: "Украина · DOU", nick: "Казак", role: "Вакансии с DOU, дважды в день", slots: [{ h: 7, m: 20 }, { h: 15, m: 20 }], graceMin: 120, kind: "none", note: "Пульс идёт в старую таблицу; на новый штаб ещё не подключён." },
      { id: "postman", name: "Отправка в Google", nick: "Почтальон", role: "Отправляет адреса вакансий в Google для индекса", slots: [], graceMin: 0, kind: "none", note: "Квота Google 200 в день, очередь около 23 тысяч адресов." },
    ],
  },
  {
    id: "harvest",
    name: "Подвоз вакансий Workable",
    where: "GitHub Actions · 03:23 UTC",
    color: "#b58cff",
    agents: [
      { id: "harvest", name: "Кеш Workable", nick: "Сборщик", role: "Собирает вакансии Workable и кладёт в кеш", slots: [{ h: 3, m: 23 }], graceMin: 120, kind: "none", note: "Африка, Латам, Азия по очереди; кеш кладёт в репозиторий." },
    ],
  },
  {
    id: "site",
    name: "Сайт и приложение",
    where: "Railway · работают всегда",
    color: "#3ddc84",
    wide: true,
    agents: [
      { id: "site", name: "Сайт", role: "jobs.a1appp.com", slots: [], graceMin: 0, kind: "none" },
      { id: "site-premium", name: "Сайт Premium", role: "jobs-web-premium", slots: [], graceMin: 0, kind: "none" },
      { id: "api", name: "API", role: "api-service и api-gateway", slots: [], graceMin: 0, kind: "none" },
      { id: "chat", name: "Чат", role: "chat-service и chat-web", slots: [], graceMin: 0, kind: "none" },
      { id: "notify", name: "Уведомления", role: "notify-service", slots: [], graceMin: 0, kind: "none" },
      { id: "media", name: "Медиа", role: "media-service", slots: [], graceMin: 0, kind: "none" },
      { id: "umami", name: "Аналитика", role: "Umami", slots: [], graceMin: 0, kind: "none" },
    ],
  },
  {
    id: "bots",
    name: "Боты, новости, база разработчиков",
    where: "разное",
    color: "#ff8fb8",
    agents: [
      { id: "tgbot", name: "Бот подписок", nick: "Бот-пингер", role: "Telegram: присылает новые вакансии по фильтру", slots: [], graceMin: 0, kind: "none" },
      { id: "news", name: "Редакция новостей", nick: "Редакція A1", role: "Пишет «IT новини» для сайта", slots: [], graceMin: 0, kind: "planned", note: "Раздел на сайте есть, автора-агента ещё нет." },
      { id: "hunter", name: "Сбор разработчиков", nick: "Охотник", role: "База разработчиков: GitHub, LinkedIn, Telegram", slots: [], graceMin: 0, kind: "manual", note: "Пока запускается вручную." },
    ],
  },
];

export const KNOWN_AGENT_IDS = new Set(ROOMS.flatMap((r) => r.agents.map((a) => a.id)));

export type Lamp = "work" | "done" | "wait" | "error" | "missed" | "nodata" | "planned" | "manual";

export type AgentView = {
  def: AgentDef;
  lamp: Lamp;
  label: string;
  /** Что случилось в последний раз (коротко, по-человечески). */
  last: string;
  /** Когда следующий запуск. */
  next: string;
};

const WORKING_STALE_MS = 6 * 3600_000;

/** Последний слот по расписанию, не позже now. */
function lastSlot(slots: Slot[], now: Date): Date | null {
  let best: Date | null = null;
  for (const dayShift of [0, -1]) {
    for (const s of slots) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + dayShift, s.h, s.m));
      if (d.getTime() <= now.getTime() && (!best || d.getTime() > best.getTime())) best = d;
    }
  }
  return best;
}

function nextSlot(slots: Slot[], now: Date): Date | null {
  let best: Date | null = null;
  for (const dayShift of [0, 1]) {
    for (const s of slots) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + dayShift, s.h, s.m));
      if (d.getTime() > now.getTime() && (!best || d.getTime() < best.getTime())) best = d;
    }
  }
  return best;
}

const TZ = "Europe/Kyiv";

function fmtTime(d: Date): string {
  return new Intl.DateTimeFormat("ru-RU", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(d);
}

function dayKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
}

function fmtWhen(d: Date, now: Date): string {
  const t = fmtTime(d);
  const today = dayKey(now);
  const yesterday = dayKey(new Date(now.getTime() - 86400_000));
  const tomorrow = dayKey(new Date(now.getTime() + 86400_000));
  const k = dayKey(d);
  if (k === today) return `сегодня в ${t}`;
  if (k === yesterday) return `вчера в ${t}`;
  if (k === tomorrow) return `завтра в ${t}`;
  const date = new Intl.DateTimeFormat("ru-RU", { timeZone: TZ, day: "numeric", month: "long" }).format(d);
  return `${date} в ${t}`;
}

function summary(rec: { published: number | null; errors: number | null; note: string }): string {
  const parts: string[] = [];
  if (rec.published !== null) parts.push(`опубликовано ${rec.published}`);
  if (rec.errors !== null) parts.push(`ошибок ${rec.errors}`);
  if (!parts.length && rec.note) parts.push(rec.note);
  return parts.join(", ");
}

export function describeAgent(def: AgentDef, rec: PulseRecord | undefined, now: Date): AgentView {
  const nextAt = def.slots.length ? nextSlot(def.slots, now) : null;
  const next = nextAt ? fmtWhen(nextAt, now) : def.kind === "manual" ? "вручную" : "";

  if (def.kind === "planned") {
    return { def, lamp: "planned", label: "Ещё не нанят", last: def.note ?? "", next: "" };
  }
  if (def.kind === "manual") {
    return { def, lamp: "manual", label: "Только вручную", last: def.note ?? "", next: "вручную" };
  }
  if (def.kind === "none" || !rec) {
    if (def.kind === "pulse" && !rec) {
      // Пульс подключён, но ни одной отметки ещё не было: красным не пугаем, ждём первого запуска.
      return { def, lamp: "wait", label: "Ждёт первого запуска", last: "Отметок ещё не было.", next };
    }
    return { def, lamp: "nodata", label: "Пульс не подключён", last: def.note ?? "", next };
  }

  const startedMs = Date.parse(rec.startedAt);
  if (rec.status === "working") {
    if (now.getTime() - startedMs > WORKING_STALE_MS) {
      return { def, lamp: "error", label: "Завис?", last: `Начал ${fmtWhen(new Date(startedMs), now)} и не закончил.`, next };
    }
    return { def, lamp: "work", label: "Работает", last: `Начал ${fmtWhen(new Date(startedMs), now)}.`, next };
  }

  const finished = rec.finishedAt ? new Date(rec.finishedAt) : new Date(startedMs);
  const snap: PulseSnapshot = {
    status: rec.status,
    finishedAt: finished.toISOString(),
    published: rec.published,
    errors: rec.errors,
    note: rec.note,
  };
  const detail = summary(snap);
  const slot = def.slots.length ? lastSlot(def.slots, now) : null;
  const sinceSlot = slot && finished.getTime() >= slot.getTime() - 5 * 60_000;

  if (rec.status === "error") {
    return { def, lamp: "error", label: "Ошибка в запуске", last: `${fmtWhen(finished, now)}${detail ? ": " + detail : ""}`, next };
  }
  if (!slot || sinceSlot) {
    const sameDay = dayKey(finished) === dayKey(now);
    return {
      def,
      lamp: "done",
      label: sameDay ? "Отработал сегодня" : "Отработал",
      last: `${fmtWhen(finished, now)}${detail ? ": " + detail : ""}`,
      next,
    };
  }
  const late = now.getTime() - slot.getTime() > def.graceMin * 60_000;
  return late
    ? { def, lamp: "missed", label: "Пропустил запуск", last: `Ожидали ${fmtWhen(slot, now)}. Последний раз: ${fmtWhen(finished, now)}${detail ? ", " + detail : ""}.`, next }
    : { def, lamp: "wait", label: "Ждёт запуска", last: `Последний раз: ${fmtWhen(finished, now)}${detail ? ", " + detail : ""}.`, next };
}

export const LAMP_COLOR: Record<Lamp, string> = {
  work: "#3ddc84",
  done: "#3ddc84",
  wait: "#6ea8ff",
  error: "#ff6b5e",
  missed: "#ff6b5e",
  nodata: "#6b7380",
  planned: "#6b7380",
  manual: "#e8b43c",
};

/** Минуты суток по Киеву (0..1439). */
export function kyivMinutes(d: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(d);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h * 60 + m;
}

/** Тот же календарный день по Киеву? */
export function sameKyivDay(a: Date, b: Date): boolean {
  return dayKey(a) === dayKey(b);
}

export function formatKyivTime(d: Date): string {
  return fmtTime(d);
}
