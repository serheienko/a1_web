// components/shtab-metrics.tsx
//
// 14.10.2026 (Александр: «смотреть в небольшом окне штаба наши важные метрики»). Окно «Метрики» в
// штабе: ключевые действия (регистрации, клики «скачать», отклики, клейм) и «Перші 250».
//
// 16.10.2026. Раньше цифры брались из Umami -- своей аналитики, которая стояла отдельным сервисом
// на Railway и стоила около четырёх долларов в месяц одной памятью. Её выключили, и окно разделилось
// на две естественные половины:
//   - ПОСЕЩАЕМОСТЬ (сколько людей, откуда пришли, какие страницы) -- бесплатная Cloudflare Web
//     Analytics. Считается на стороне Cloudflare, через который и так идёт сайт; смотреть -- по
//     ссылке внизу окна. Чтобы показывать эти числа прямо здесь, нужен ключ на чтение (Cloudflare:
//     Account Analytics -> Read) в переменной CF_ANALYTICS_TOKEN сервиса jobs-web.
//   - ДЕЙСТВИЯ (нажали «скачать», зарегистрировались, откликнулись, забрали профиль) -- наш
//     собственный счётчик lib/stats/store.ts, куда шлёт маячок lib/track.ts. Их не знает никакая
//     внешняя аналитика: она видит запросы, а не то, что человек нажал.
import { loadStats, type StatEvent, type StatTotals } from "@/lib/stats/store";
import { takenCount, totalSeats } from "@/lib/first250/store";

const CF_ANALYTICS_URL = "https://dash.cloudflare.com/?to=/:account/web-analytics";

const CSS = `
.shm{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:14px 16px;box-shadow:var(--shadow)}
.shm h2{margin:0;font-size:15px;font-weight:800}
.shm-head{display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap}
.shm-sub{font-size:12px;color:var(--dim)}
.shm-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-top:12px}
.shm-k{border:1px solid var(--row);border-radius:12px;padding:10px 12px}
.shm-k b{display:block;font-size:24px;font-weight:800;line-height:1.1;font-variant-numeric:tabular-nums}
.shm-k span{font-size:12px;color:var(--mut)}
.shm-k i{font-style:normal;font-size:12px;font-weight:700;margin-left:6px}
.shm-up{color:#16a34a}.shm-down{color:#dc2626}
.shm-box{border:1px solid var(--row);border-radius:12px;padding:10px 12px;margin-top:10px}
.shm-box h3{margin:0 0 6px;font-size:13px;font-weight:800}
.shm-li{display:flex;justify-content:space-between;gap:8px;font-size:13px;padding:3px 0;border-top:1px dashed var(--row)}
.shm-li:first-of-type{border-top:0}
.shm-li em{font-style:normal;color:var(--soft);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.shm-li b{font-variant-numeric:tabular-nums}
.shm-bar{height:8px;border-radius:99px;background:var(--row);overflow:hidden;margin-top:8px}
.shm-bar>div{height:100%;background:linear-gradient(90deg,#335ef7,#8b5cf6,#22d3ee)}
.shm-note{font-size:12px;color:var(--dim);margin-top:10px}
.shm-note a{color:inherit;text-decoration:underline}
`;

function n(v: number): string {
  return Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function delta(cur: number, prev: number) {
  if (!prev) return null;
  const p = Math.round(((cur - prev) / prev) * 100);
  return <i className={p >= 0 ? "shm-up" : "shm-down"}>{p >= 0 ? "▲" : "▼"} {Math.abs(p)}%</i>;
}

/** Крупные плитки наверху окна: самое важное за неделю. */
const BIG: { keys: StatEvent[]; label: string }[] = [
  { keys: ["signup"], label: "регистраций" },
  { keys: ["apply"], label: "откликов" },
  { keys: ["external"], label: "переходов на сайт компании" },
  { keys: ["claim_done"], label: "компаний забрали профиль" },
];

/** Остальное -- строчками. */
const ROWS: { keys: StatEvent[]; label: string }[] = [
  { keys: ["signin"], label: "Входы" },
  { keys: ["download_click"], label: "Клики «скачать» на странице загрузки" },
  { keys: ["first250_claim"], label: "Забрали место «Перші 250»" },
  { keys: ["claim_open", "claim_sent"], label: "Открыли и отправили форму «це наша компанія»" },
  { keys: ["view"], label: "Просмотры страниц вакансий и компаний" },
];

function sum(totals: StatTotals, keys: StatEvent[]): number {
  return keys.reduce((s, k) => s + (totals[k] ?? 0), 0);
}

export async function ShtabMetrics() {
  // Неделя и предыдущая неделя -- чтобы показать, растём или падаем. Две недели сразу
  // читать нечего: loadStats(14) отдаёт сумму за весь срок, поэтому прошлая неделя --
  // это «две недели минус последняя».
  const [week, fortnight, taken] = await Promise.all([
    loadStats(7).catch(() => null),
    loadStats(14).catch(() => null),
    takenCount().catch(() => 0),
  ]);
  const total = totalSeats();
  const seatsPct = Math.min(100, Math.round((taken / total) * 100));
  const now = week?.totals ?? null;
  const prev =
    week && fortnight
      ? (Object.fromEntries(
          Object.entries(fortnight.totals).map(([k, v]) => [k, Math.max(0, v - (week.totals[k as StatEvent] ?? 0))]),
        ) as StatTotals)
      : null;

  return (
    <section className="shm">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="shm-head">
        <h2>📈 Метрики сайта</h2>
        <span className="shm-sub">{now ? "что сделали за 7 дней · и насколько это больше прошлой недели" : "счётчик"}</span>
      </div>

      {now ? (
        <>
          <div className="shm-grid">
            {BIG.map((b) => (
              <div className="shm-k" key={b.label}>
                <b>
                  {n(sum(now, b.keys))}
                  {prev ? delta(sum(now, b.keys), sum(prev, b.keys)) : null}
                </b>
                <span>{b.label}</span>
              </div>
            ))}
          </div>

          <div className="shm-box">
            <h3>Что ещё делали</h3>
            {ROWS.map((r) => (
              <div className="shm-li" key={r.label}>
                <em>{r.label}</em>
                <b>{n(sum(now, r.keys))}</b>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="shm-note">Счётчик действий сейчас недоступен (хранилище не ответило), попробуем снова через минуту.</div>
      )}

      <div className="shm-box">
        <h3>
          🎁 Перші 250: {n(taken)} из {n(total)}
        </h3>
        <div className="shm-bar">
          <div style={{ width: `${Math.max(2, seatsPct)}%` }} />
        </div>
      </div>

      <div className="shm-note">
        Сколько людей заходило, откуда пришли и какие страницы смотрели —{" "}
        <a href={CF_ANALYTICS_URL} target="_blank" rel="noopener">
          Cloudflare Web Analytics
        </a>{" "}
        (бесплатно, cookie не ставит). Список «Перші 250» — <a href="/admin/first250">здесь</a>.
      </div>
    </section>
  );
}
