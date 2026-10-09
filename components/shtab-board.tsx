// components/shtab-board.tsx
//
// 09.10.2026: этаж штаба -- комнаты, у каждого агента лампочка и три строки
// («отработал сегодня», что сделал, когда следующий запуск). Макет:
// https://claude.ai/artifact/Xj66gApEJLieLpXH8mHquH
import { loadPulses } from "@/lib/a1/shtab-store";
import { ROOMS, LAMP_COLOR, describeAgent, kyivMinutes, sameKyivDay, formatKyivTime, type AgentView, type Lamp } from "@/lib/a1/shtab-agents";
import { ShtabRefresh } from "@/components/shtab-refresh";
import { ShtabClock, type ClockRun, type ClockTick } from "@/components/shtab-clock";

const CSS = `
.sh{--bg:#0f1216;--panel:#171b21;--line:#ffffff1f;--mut:#9aa39a;background:var(--bg);color:#e8ebe4;min-height:100vh}
.sh *{box-sizing:border-box}
.sh-wrap{max-width:1240px;margin:0 auto;padding:28px 16px 64px;display:flex;flex-direction:column;gap:24px}
.sh-eyebrow{font:600 12px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.14em;text-transform:uppercase;color:#e8b43c}
.sh h1{margin:6px 0 6px;font-size:36px;line-height:1.1;font-weight:800}
.sh-sub{font-size:15px;color:var(--mut);max-width:640px;line-height:1.5}
.sh-top{display:flex;flex-wrap:wrap;gap:20px;align-items:flex-end;justify-content:space-between}
.sh-counters{display:flex;flex-wrap:wrap;gap:10px}
.sh-c{display:flex;align-items:center;gap:10px;padding:10px 14px;border:1px solid var(--line);border-radius:12px;background:var(--panel)}
.sh-c b{font-size:26px;line-height:1}
.sh-c span{font-size:13px;color:var(--mut)}
.sh-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:20px}
.sh-room{border:1px solid var(--line);border-radius:18px;background-color:var(--panel);background-image:linear-gradient(#ffffff08 1px,transparent 1px),linear-gradient(90deg,#ffffff08 1px,transparent 1px);background-size:28px 28px;padding:20px;display:flex;flex-direction:column;gap:16px}
.sh-wide{grid-column:span 2}
@media (max-width:760px){.sh-wide{grid-column:span 1}}
.sh-room h2{margin:0;font-size:20px;font-weight:800}
.sh-room header{display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap}
.sh-where{font:400 12px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;color:#8b948b}
.sh-desks{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px}
.sh-desk{border:1px solid #ffffff22;border-radius:14px;background:var(--bg);padding:14px;display:flex;flex-direction:column;gap:10px}
.sh-row{display:flex;align-items:center;gap:12px}
.sh-ava{width:44px;height:44px;border-radius:12px;background:#1d2229;display:flex;align-items:center;justify-content:center;flex:none}
.sh-name{font-size:16px;font-weight:800;line-height:1.2}
.sh-nick{font-size:12px;font-weight:400;color:#7d867d}
.sh-role{font-size:12.5px;color:var(--mut);line-height:1.35}
.sh-lamp{width:12px;height:12px;border-radius:50%;flex:none;margin-left:auto}
.sh-pulse{animation:shpl 1.6s ease-in-out infinite}
.sh-warn{animation:shwp 2s ease-in-out infinite}
@keyframes shpl{0%,100%{box-shadow:0 0 0 0 #3ddc8466}50%{box-shadow:0 0 0 7px #3ddc8400}}
@keyframes shwp{0%,100%{box-shadow:0 0 0 0 #ff6b5e66}50%{box-shadow:0 0 0 7px #ff6b5e00}}
.sh-state{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;font-size:12.5px;font-weight:700}
.sh-next{font:400 11.5px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;color:#8b948b;font-weight:400}
.sh-last{font-size:12.5px;color:#c4cbc2;line-height:1.4;border-top:1px dashed var(--line);padding-top:8px;min-height:2.6em}
.sh-legend{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px}
.sh-card{border:1px solid var(--line);border-radius:18px;background:var(--panel);padding:20px;display:flex;flex-direction:column;gap:10px}
.sh-card h3{margin:0;font-size:17px;font-weight:800}
.sh-li{display:flex;gap:12px;align-items:flex-start;font-size:14px;line-height:1.45}
.sh-li .sh-lamp{margin:4px 0 0}
.sh-sched{display:grid;grid-template-columns:minmax(280px,380px) 1fr;gap:24px;align-items:start}
@media (max-width:900px){.sh-sched{grid-template-columns:1fr}}
.sh-tablewrap{overflow-x:auto}
.sh-swipe{display:none;color:#8b948b;font-size:12px;margin:0 0 6px}
@media (max-width:760px){.sh-swipe{display:block}}
.sh-table{width:100%;border-collapse:collapse;font-size:13px;min-width:640px}
.sh-table th{text-align:left;font-weight:600;color:#8b948b;font-size:12px;padding:6px 8px;border-bottom:1px solid var(--line)}
.sh-table td{padding:9px 8px;border-bottom:1px solid #ffffff10;vertical-align:top;line-height:1.4}
.sh-n{font:600 12px/1 ui-monospace,Menlo,monospace;color:#8b948b}
.sh-key{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:12px;color:var(--mut)}
.sh-key i{display:inline-block;width:14px;height:6px;border-radius:3px;margin-right:6px;vertical-align:middle}
@media (prefers-reduced-motion:reduce){.sh-pulse,.sh-warn{animation:none}}
`;

const LEGEND: { lamp: Lamp; title: string; text: string }[] = [
  { lamp: "done", title: "Зелёная", text: "отработал по графику или работает прямо сейчас" },
  { lamp: "wait", title: "Синяя", text: "ждёт своего времени, всё в порядке" },
  { lamp: "missed", title: "Красная", text: "пропустил запуск, ошибка или завис — нужно посмотреть" },
  { lamp: "manual", title: "Жёлтая", text: "запускается только вручную" },
  { lamp: "nodata", title: "Серая", text: "пульс ещё не подключён или агента ещё нет" },
];

function Lamp({ lamp }: { lamp: Lamp }) {
  const cls = lamp === "work" ? "sh-lamp sh-pulse" : lamp === "error" || lamp === "missed" ? "sh-lamp sh-warn" : "sh-lamp";
  return <span className={cls} style={{ background: LAMP_COLOR[lamp] }} aria-hidden="true" />;
}

function Robot({ color }: { color: string }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="8" width="14" height="11" rx="3" />
      <path d="M12 8V4" />
      <circle cx="12" cy="3.5" r="1" />
      <circle cx="9.5" cy="13" r="1" fill={color} />
      <circle cx="14.5" cy="13" r="1" fill={color} />
      <path d="M3 12v3M21 12v3" />
    </svg>
  );
}

function Desk({ v, color }: { v: AgentView; color: string }) {
  return (
    <div className="sh-desk">
      <div className="sh-row">
        <div className="sh-ava">
          <Robot color={color} />
        </div>
        <div>
          <div className="sh-name">
            {v.def.name}
            {v.def.nick ? <span className="sh-nick"> · {v.def.nick}</span> : null}
          </div>
          <div className="sh-role">{v.def.role}</div>
        </div>
        <Lamp lamp={v.lamp} />
      </div>
      <div className="sh-state">
        <span style={{ color: LAMP_COLOR[v.lamp] }}>{v.label}</span>
        {v.next ? <span className="sh-next">дальше: {v.next}</span> : null}
      </div>
      <div className="sh-last">{v.last || "—"}</div>
    </div>
  );
}

export async function ShtabBoard() {
  const pulses = await loadPulses();
  const now = new Date();
  const rooms = ROOMS.map((r) => ({
    room: r,
    views: r.agents.map((a) => describeAgent(a, pulses[a.id], now)),
  }));

  // Очередь Конкистадора: идут по порядку, тот, кто ещё не начал, стоит за предыдущим.
  const konkViews = rooms.find((r) => r.room.id === "konk")!.views;
  konkViews.forEach((v, i) => {
    if (v.lamp !== "wait" || i === 0) return;
    const ahead = konkViews.slice(0, i).reverse().find((p) => p.lamp === "wait" || p.lamp === "work");
    if (ahead) {
      v.label = "В очереди";
      v.last = `Начнёт, когда закончит «${ahead.def.name}». ${v.last}`.trim();
    }
  });

  const nowMin = kyivMinutes(now);
  const runs: ClockRun[] = [];
  const ticks: ClockTick[] = [];
  const trackOf: Record<string, number> = { konk: 0, kazak: 1, harvest: 2 };
  rooms.forEach(({ room, views }) => {
    const track = trackOf[room.id];
    if (track === undefined) return;
    views.forEach((v) => {
      v.def.slots.forEach((sl) => {
        const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), sl.h, sl.m));
        ticks.push({ track, min: kyivMinutes(d), title: `${v.def.name}: по расписанию ${formatKyivTime(d)}` });
      });
      const rec = pulses[v.def.id];
      if (!rec) return;
      const st = new Date(rec.startedAt);
      if (!sameKyivDay(st, now)) return;
      const en = rec.finishedAt ? new Date(rec.finishedAt) : now;
      const from = kyivMinutes(st);
      const to = sameKyivDay(en, now) ? kyivMinutes(en) : 1440;
      runs.push({
        track,
        fromMin: from,
        toMin: Math.max(to, from),
        color: rec.status === "error" ? LAMP_COLOR.error : LAMP_COLOR.done,
        live: rec.status === "working",
        title: `${v.def.name}: ${formatKyivTime(st)}–${rec.finishedAt ? formatKyivTime(en) : "идёт"}`,
      });
    });
  });
  const nowLabel = formatKyivTime(now);

  const all = rooms.flatMap((r) => r.views);
  const count = (f: (l: Lamp) => boolean) => all.filter((v) => f(v.lamp)).length;
  const counters = [
    { color: LAMP_COLOR.done, n: count((l) => l === "done" || l === "work"), label: "в порядке" },
    { color: LAMP_COLOR.wait, n: count((l) => l === "wait"), label: "ждут запуска" },
    { color: LAMP_COLOR.missed, n: count((l) => l === "missed" || l === "error"), label: "нужен взгляд" },
    { color: LAMP_COLOR.nodata, n: count((l) => l === "nodata" || l === "planned" || l === "manual"), label: "без пульса или вручную" },
  ];
  const stamp = new Intl.DateTimeFormat("ru-RU", { timeZone: "Europe/Kyiv", hour: "2-digit", minute: "2-digit", day: "numeric", month: "long" }).format(now);

  return (
    <main className="sh">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <ShtabRefresh />
      <div className="sh-wrap">
        <div className="sh-top">
          <div>
            <div className="sh-eyebrow">Штаб A1</div>
            <h1>Кто сейчас работает</h1>
            <div className="sh-sub">
              Агенты сами присылают отметку после каждого запуска. Зелёная лампочка — отработал по графику, синяя — ждёт своего времени, красная — пропустил запуск или упал. Время киевское. Обновлено {stamp}, страница обновляется сама.
            </div>
          </div>
          <div className="sh-counters">
            {counters.map((c) => (
              <div className="sh-c" key={c.label}>
                <span className="sh-lamp" style={{ background: c.color, margin: 0 }} aria-hidden="true" />
                <b>{c.n}</b>
                <span>{c.label}</span>
              </div>
            ))}
          </div>
        </div>

        <section className="sh-card" aria-label="Расписание суток">
          <h3>Расписание суток</h3>
          <div className="sh-sched">
            <div>
              <ShtabClock runs={runs} ticks={ticks} nowMin={nowMin} nowLabel={nowLabel} />
              <div className="sh-key">
                <span><i style={{ background: "#e8ebe4" }} />по расписанию</span>
                <span><i style={{ background: LAMP_COLOR.done }} />запуск сегодня</span>
                <span><i style={{ background: LAMP_COLOR.error }} />запуск с ошибкой</span>
                <span><i style={{ background: "#e8b43c" }} />сейчас</span>
              </div>
              <div className="sh-key" style={{ marginTop: 6 }}>
                <span>внешнее кольцо — Конкистадор (10:00), среднее — Казак (10:20 и 18:20), внутреннее — Сборщик Workable (06:23)</span>
              </div>
            </div>
            <p className="sh-swipe">Таблица листается вбок →</p>
            <div className="sh-tablewrap">
              <table className="sh-table">
                <thead>
                  <tr>
                    <th>№</th>
                    <th>Агент</th>
                    <th>Лимит в день</th>
                    <th>Откуда берёт</th>
                    <th>Сегодня</th>
                  </tr>
                </thead>
                <tbody>
                  {konkViews.map((v) => {
                    const rec = pulses[v.def.id];
                    const limit = rec?.limit ?? v.def.limit ?? null;
                    return (
                      <tr key={v.def.id}>
                        <td className="sh-n">{v.def.order}</td>
                        <td>
                          <b>{v.def.name}</b>
                          {v.def.nick ? <span className="sh-nick"> · {v.def.nick}</span> : null}
                        </td>
                        <td>{limit === null ? "без лимита" : `до ${limit}`}</td>
                        <td style={{ color: "#c4cbc2" }}>{v.def.sources}</td>
                        <td>
                          <span style={{ color: LAMP_COLOR[v.lamp], fontWeight: 700 }}>{v.label}</span>
                          <div style={{ color: "#9aa39a" }}>{v.last}</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="sh-sub" style={{ marginTop: 12, fontSize: 13 }}>
                Принцип у всех один: каждый день агент берёт новые вакансии из своих источников, оставляет только IT, отбрасывает старше 6 месяцев, дубли и уже опубликованное, публикует не больше лимита, остальное остаётся на следующий день. Запускаются по очереди, одним общим забегом с 10:00 по Киеву, поэтому последним до вакансий добирается Казак 2.
              </div>
            </div>
          </div>
        </section>

        <div className="sh-grid">
          {rooms.map(({ room, views }) => (
            <section key={room.id} className={`sh-room${room.wide ? " sh-wide" : ""}`}>
              <header>
                <h2 style={{ color: room.color }}>{room.name}</h2>
                <div className="sh-where">{room.where}</div>
              </header>
              <div className="sh-desks">
                {views.map((v) => (
                  <Desk key={v.def.id} v={v} color={room.color} />
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="sh-legend">
          <div className="sh-card">
            <h3>Что значат лампочки</h3>
            {LEGEND.map((l) => (
              <div className="sh-li" key={l.title}>
                <span className="sh-lamp" style={{ background: LAMP_COLOR[l.lamp] }} aria-hidden="true" />
                <div>
                  <b>{l.title}</b>
                  <span style={{ color: "#9aa39a" }}> — {l.text}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="sh-card">
            <h3>Как это работает</h3>
            <div className="sh-li" style={{ color: "#c4cbc2" }}>
              Конкистадор и его восемь агентов присылают отметку в начале и в конце запуска: сколько опубликовано и сколько ошибок. Если время запуска прошло, а отметки нет, лампочка краснеет — значит, агент отвалился.
            </div>
            <div className="sh-li" style={{ color: "#9aa39a" }}>
              Казак, Сборщик Workable и сервисы сайта подключим следующими. Пока у них серая лампочка.
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
