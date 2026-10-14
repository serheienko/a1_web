// components/shtab-metrics.tsx
//
// 14.10.2026 (Александр: «смотреть в небольшом окне штаба наши важные метрики»). Окно «Метрики» в
// штабе: посетители, откуда пришли, ключевые действия (регистрации, клики в стор, отклики) и «Перші 250».
// Цифры сайта -- из Umami (lib/metrics/umami.ts, кеш на час), места акции -- из lib/first250/store.ts.
// Полная картина (воронка, удержание, пути) -- в самой Umami, ссылка внизу окна.
import { umamiSummary, type UmamiPeriod } from "@/lib/metrics/umami";
import { takenCount, totalSeats } from "@/lib/first250/store";

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
.shm-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}
@media (max-width:640px){.shm-row{grid-template-columns:1fr}}
.shm-box{border:1px solid var(--row);border-radius:12px;padding:10px 12px}
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

function bounce(p: UmamiPeriod): string {
  return p.visits ? `${Math.round((p.bounces / p.visits) * 100)}%` : "—";
}

function avgTime(p: UmamiPeriod): string {
  if (!p.visits || !p.totaltime) return "—";
  const s = Math.round(p.totaltime / Math.max(1, p.visits));
  return s >= 60 ? `${Math.floor(s / 60)} мин ${s % 60} с` : `${s} с`;
}

const EVENTS: { keys: string[]; label: string }[] = [
  { keys: ["signup"], label: "Регистрации" },
  { keys: ["signin"], label: "Входы" },
  { keys: ["store_ios", "store_android", "download_page_click"], label: "Клики «скачать приложение»" },
  { keys: ["apply", "external"], label: "Отклики и переходы на сайт компании" },
  { keys: ["claim_done"], label: "Компании забрали профиль" },
  { keys: ["first250_claim"], label: "Забрали место «Перші 250»" },
];

function refName(x: string): string {
  if (!x) return "напрямую";
  return x.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
}

export async function ShtabMetrics() {
  const [u, taken] = await Promise.all([umamiSummary(), takenCount().catch(() => 0)]);
  const total = totalSeats();
  const seatsPct = Math.min(100, Math.round((taken / total) * 100));

  return (
    <section className="shm">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="shm-head">
        <h2>📈 Метрики сайта</h2>
        <span className="shm-sub">{u.ok ? "за последние 7 дней · обновляется раз в час" : "Umami"}</span>
      </div>

      {u.ok ? (
        <>
          <div className="shm-grid">
            <div className="shm-k">
              <b>{n(u.today.visitors)}</b>
              <span>посетителей сегодня</span>
            </div>
            <div className="shm-k">
              <b>
                {n(u.week.visitors)}
                {delta(u.week.visitors, u.prevWeek.visitors)}
              </b>
              <span>посетителей за 7 дней</span>
            </div>
            <div className="shm-k">
              <b>{n(u.week.pageviews)}</b>
              <span>просмотров страниц</span>
            </div>
            <div className="shm-k">
              <b>{bounce(u.week)}</b>
              <span>ушли сразу (1 страница)</span>
            </div>
            <div className="shm-k">
              <b>{avgTime(u.week)}</b>
              <span>в среднем на сайте</span>
            </div>
          </div>

          <div className="shm-row">
            <div className="shm-box">
              <h3>Откуда пришли</h3>
              {u.referrers.length ? (
                u.referrers.map((r) => (
                  <div className="shm-li" key={r.x}>
                    <em>{refName(r.x)}</em>
                    <b>{n(r.y)}</b>
                  </div>
                ))
              ) : (
                <div className="shm-li"><em>пока нет данных</em></div>
              )}
            </div>
            <div className="shm-box">
              <h3>Что сделали</h3>
              {EVENTS.map((e) => (
                <div className="shm-li" key={e.label}>
                  <em>{e.label}</em>
                  <b>{n(e.keys.reduce((s, k) => s + (u.events[k] ?? 0), 0))}</b>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="shm-note">
          {u.reason === "not_configured"
            ? "Umami ещё не подключена к штабу: нужна ссылка «Поделиться» (Share URL) из настроек сайта в Umami → переменная UMAMI_SHARE_ID."
            : `Umami сейчас не ответила (${u.detail ?? "ошибка"}), попробуем снова через 5 минут.`}
        </div>
      )}

      <div className="shm-box" style={{ marginTop: 10 }}>
        <h3>
          🎁 Перші 250: {n(taken)} из {n(total)}
        </h3>
        <div className="shm-bar">
          <div style={{ width: `${Math.max(2, seatsPct)}%` }} />
        </div>
      </div>

      <div className="shm-note">
        Воронка, удержание и пути по сайту — в{" "}
        <a href="https://umami-production-e14b.up.railway.app" target="_blank" rel="noopener">
          Umami
        </a>{" "}
        (Отчёты → Воронка / Удержание). Список «Перші 250» — <a href="/admin/first250">здесь</a>.
      </div>
    </section>
  );
}
