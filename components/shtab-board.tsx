// components/shtab-board.tsx
//
// 09.10.2026: этаж штаба -- комнаты, у каждого агента лампочка и три строки
// («отработал сегодня», что сделал, когда следующий запуск). Макет:
// https://claude.ai/artifact/Xj66gApEJLieLpXH8mHquH
//
// Правки того же дня (Александр): светлая тема по теме сайта (класс .dark/.light
// на <html> или системная); живое -- наверху; суточные часы и таблица очереди
// спрятаны под кнопку; Украина (DOU + ленты компаний) -- один стол.
import { loadPulses } from "@/lib/a1/shtab-store";
import {
  ALL_AGENTS,
  ROOMS,
  LAMP_COLOR,
  describeAgent,
  describeGroup,
  isSoftError,
  kyivMinutes,
  sameKyivDay,
  formatKyivTime,
  type AgentDef,
  type AgentView,
  type Lamp,
  type Probe,
} from "@/lib/a1/shtab-agents";
import { ShtabRefresh } from "@/components/shtab-refresh";
import { ShtabClock, type ClockRun, type ClockTick } from "@/components/shtab-clock";

const LIGHT = "--bg:#f3f4f0;--panel:#ffffff;--line:#0000001f;--mut:#566057;--txt:#14181c;--dim:#697269;--soft:#38403a;--ava:#eceee8;--edge:#0000002e;--grid:#0000000a;--row:#0000001a;--eye:#a8700a;--ring:#0000001a;--tick:#00000066;--hand:#d08a00;--shadow:0 1px 2px #0000000f";
const DARK = "--bg:#0f1216;--panel:#171b21;--line:#ffffff1f;--mut:#9aa39a;--txt:#e8ebe4;--dim:#8b948b;--soft:#c4cbc2;--ava:#1d2229;--edge:#ffffff22;--grid:#ffffff08;--row:#ffffff10;--eye:#e8b43c;--ring:#ffffff12;--tick:#ffffff55;--hand:#e8b43c;--shadow:none";

const CSS = `
.sh{${LIGHT};background:var(--bg);color:var(--txt);min-height:100vh}
:root.dark .sh{${DARK}}
@media (prefers-color-scheme:dark){:root:not(.light) .sh{${DARK}}}
.sh *{box-sizing:border-box}
.sh-wrap{max-width:1240px;margin:0 auto;padding:18px 16px 40px;display:flex;flex-direction:column;gap:14px}
.sh-eyebrow{font:600 12px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--eye)}
.sh h1{margin:4px 0 4px;font-size:26px;line-height:1.1;font-weight:800}
.sh-sub{font-size:13.5px;color:var(--mut);max-width:680px;line-height:1.45}
.sh-top{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end;justify-content:space-between}
.sh-counters{display:flex;flex-wrap:wrap;gap:10px}
.sh-c{display:flex;align-items:center;gap:8px;padding:6px 12px;border:1px solid var(--line);border-radius:12px;background:var(--panel);box-shadow:var(--shadow)}
.sh-c b{font-size:20px;line-height:1}
.sh-c span{font-size:12.5px;color:var(--mut)}
.sh-now{display:flex;gap:10px;align-items:center;flex-wrap:wrap;border:1px solid var(--line);border-radius:12px;background:var(--panel);padding:8px 14px;font-size:13.5px;line-height:1.4;box-shadow:var(--shadow)}
.sh-now b{font-weight:800}
.sh-verdict{display:flex;flex-direction:column;gap:2px;border-radius:14px;padding:12px 16px;border:1px solid var(--line);border-left-width:6px;background:var(--panel);box-shadow:var(--shadow)}
.sh-verdict b{font-size:17px;font-weight:800;line-height:1.25}
.sh-verdict span{font-size:13.5px;color:var(--soft);line-height:1.4}
.sh-v-ok{border-left-color:#3ddc84}.sh-v-run{border-left-color:#3ddc84}.sh-v-wait{border-left-color:#6ea8ff}.sh-v-bad{border-left-color:#ff6b5e}
.sh-now .sh-lamp{margin:0}
.sh-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:14px;align-items:start}
.sh-room{border:1px solid var(--line);border-radius:16px;background-color:var(--panel);background-image:linear-gradient(var(--grid) 1px,transparent 1px),linear-gradient(90deg,var(--grid) 1px,transparent 1px);background-size:28px 28px;padding:14px;display:flex;flex-direction:column;gap:10px;box-shadow:var(--shadow)}
.sh-wide{grid-column:span 2}
@media (max-width:760px){.sh-wide{grid-column:span 1}}
.sh-room h2{margin:0;font-size:16px;font-weight:800}
.sh-room header{display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap}
.sh-where{font:400 12px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--dim)}
.sh-desks{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;align-items:start}
.sh-desk{border:1px solid var(--edge);border-radius:12px;background:var(--bg);min-width:0}
.sh-desk>summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:12px}
.sh-desk>summary::-webkit-details-marker{display:none}
.sh-desk>summary:hover{background:var(--row)}
.sh-desk>summary::after{content:"";width:6px;height:6px;border-right:2px solid var(--dim);border-bottom:2px solid var(--dim);transform:rotate(45deg);margin:0 2px 3px 2px;flex:none;transition:transform .15s}
.sh-desk[open]>summary::after{transform:rotate(-135deg);margin-bottom:-3px}
.sh-sum{min-width:0;flex:1}
.sh-st{font-size:12px;font-weight:700;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sh-more{padding:2px 12px 12px;display:flex;flex-direction:column;gap:8px}
.sh-row{display:flex;align-items:center;gap:12px}
.sh-ava{width:32px;height:32px;border-radius:9px;background:var(--ava);display:flex;align-items:center;justify-content:center;flex:none}
.sh-ava svg{width:20px;height:20px}
.sh-name{font-size:14px;font-weight:800;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sh-nick{font-size:12px;font-weight:400;color:var(--dim)}
.sh-role{font-size:12.5px;color:var(--mut);line-height:1.35}
.sh-lamp{width:11px;height:11px;border-radius:50%;flex:none;margin-left:auto}
.sh-pulse{animation:shpl 1.6s ease-in-out infinite}
.sh-warn{animation:shwp 2s ease-in-out infinite}
@keyframes shpl{0%,100%{box-shadow:0 0 0 0 #3ddc8466}50%{box-shadow:0 0 0 7px #3ddc8400}}
@keyframes shwp{0%,100%{box-shadow:0 0 0 0 #ff6b5e66}50%{box-shadow:0 0 0 7px #ff6b5e00}}
.sh-state{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;font-size:12.5px;font-weight:700}
.sh-next{font:400 11.5px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--dim);font-weight:400}
.sh-last{font-size:12.5px;color:var(--soft);line-height:1.4;border-top:1px dashed var(--line);padding-top:8px;min-height:2.6em}
.sh-parts{display:flex;flex-direction:column;gap:8px;border-top:1px dashed var(--line);padding-top:8px}
.sh-part{display:grid;grid-template-columns:12px 1fr;gap:8px;font-size:12.5px;line-height:1.4}
.sh-part .sh-lamp{margin:4px 0 0}
.sh-part small{display:block;color:var(--mut);font-size:12px}
.sh-legend{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px}
.sh-card{border:1px solid var(--line);border-radius:18px;background:var(--panel);padding:20px;display:flex;flex-direction:column;gap:10px;box-shadow:var(--shadow)}
.sh-card h3{margin:0;font-size:17px;font-weight:800}
.sh-li{display:flex;gap:12px;align-items:flex-start;font-size:14px;line-height:1.45}
.sh-li .sh-lamp{margin:4px 0 0}
.sh-det{border:1px solid var(--line);border-radius:18px;background:var(--panel);box-shadow:var(--shadow)}
.sh-det>summary{list-style:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 20px;font-size:17px;font-weight:800}
.sh-det>summary::-webkit-details-marker{display:none}
.sh-btn{font:600 13px/1 system-ui,sans-serif;border:1px solid var(--edge);border-radius:999px;padding:8px 14px;color:var(--soft);background:var(--bg);white-space:nowrap}
.sh-det[open] .sh-btn-open{display:none}
.sh-det:not([open]) .sh-btn-close{display:none}
.sh-det-body{padding:0 20px 20px;display:flex;flex-direction:column;gap:18px}
.sh-sched{display:grid;grid-template-columns:minmax(280px,380px) 1fr;gap:24px;align-items:start}
@media (max-width:900px){.sh-sched{grid-template-columns:1fr}}
.sh-tl{display:flex;flex-direction:column;gap:0;margin:0;padding:0;list-style:none}
.sh-tl li{display:grid;grid-template-columns:64px 14px 1fr;gap:10px;font-size:14px;line-height:1.4;padding:8px 0}
.sh-tl time{font:700 14px/1.4 ui-monospace,Menlo,monospace}
.sh-tl i{width:12px;height:12px;border-radius:50%;margin-top:4px;border:2px solid var(--dim)}
.sh-tl .past i{background:var(--dim)}
.sh-tl .next i{border-color:var(--hand);background:var(--hand)}
.sh-tl small{display:block;color:var(--mut);font-size:12.5px}
.sh-tablewrap{overflow-x:auto}
.sh-swipe{display:none;color:var(--dim);font-size:12px;margin:0 0 6px}
@media (max-width:760px){.sh-swipe{display:block}}
.sh-table{width:100%;border-collapse:collapse;font-size:13px;min-width:640px}
.sh-table th{text-align:left;font-weight:600;color:var(--dim);font-size:12px;padding:6px 8px;border-bottom:1px solid var(--line)}
.sh-table td{padding:9px 8px;border-bottom:1px solid var(--row);vertical-align:top;line-height:1.4}
.sh-n{font:600 12px/1 ui-monospace,Menlo,monospace;color:var(--dim)}
.sh-key{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:12px;color:var(--mut)}
.sh-key i{display:inline-block;width:14px;height:6px;border-radius:3px;margin-right:6px;vertical-align:middle}
@media (prefers-reduced-motion:reduce){.sh-pulse,.sh-warn{animation:none}}
`;

const LEGEND: { lamp: Lamp; title: string; text: string }[] = [
  { lamp: "done", title: "Зелёная", text: "отработал по графику или работает прямо сейчас" },
  { lamp: "wait", title: "Синяя", text: "ждёт своего времени или стоит в очереди, всё в порядке" },
  { lamp: "missed", title: "Красная", text: "пропустил запуск, ошибка или завис — нужно посмотреть" },
  { lamp: "manual", title: "Жёлтая", text: "запускается только вручную" },
  { lamp: "nodata", title: "Серая", text: "пульс ещё не подключён или агента ещё нет" },
];

const lampText = (l: Lamp): string => `color-mix(in srgb, ${LAMP_COLOR[l]} 60%, var(--txt))`;

function LampDot({ lamp }: { lamp: Lamp }) {
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
    <details className="sh-desk">
      <summary>
        <div className="sh-ava">
          <Robot color={color} />
        </div>
        <div className="sh-sum">
          <div className="sh-name">{v.def.name}</div>
          <div className="sh-st" style={{ color: lampText(v.lamp) }}>{v.label}</div>
        </div>
        <LampDot lamp={v.lamp} />
      </summary>
      <div className="sh-more">
        <div className="sh-role">
          {v.def.nick ? <b>{v.def.nick}. </b> : null}
          {v.def.role}
        </div>
        {v.next ? <div className="sh-next">дальше: {v.next}</div> : null}
        {v.parts ? (
          <div className="sh-parts">
            {v.parts.map((p) => (
              <div className="sh-part" key={p.name}>
                <span className="sh-lamp" style={{ background: LAMP_COLOR[p.lamp] }} aria-hidden="true" />
                <div>
                  <b>{p.name}</b> <span style={{ color: lampText(p.lamp) }}>· {p.label}</span>
                  <small>{p.last || "—"}</small>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="sh-last">{v.last || "—"}</div>
        )}
      </div>
    </details>
  );
}

async function probe(url: string): Promise<Probe> {
  const t0 = Date.now();
  try {
    const r = await fetch(url, { method: "GET", cache: "no-store", signal: AbortSignal.timeout(6000), headers: { "user-agent": "A1ShtabCheck/1" } });
    return { ok: r.status < 500, ms: Date.now() - t0, status: r.status };
  } catch {
    return { ok: false, ms: Date.now() - t0, status: 0 };
  }
}

type TimelineRow = { min: number; title: string; detail: string };

export async function ShtabBoard() {
  const pulses = await loadPulses();
  const now = new Date();
  const healthDefs = ALL_AGENTS.filter((a) => a.kind === "health" && a.health);
  const probes = new Map<string, Probe>();
  await Promise.all(healthDefs.map(async (a) => { probes.set(a.id, await probe(a.health!)); }));

  // 1) одиночные агенты
  const byId = new Map<string, AgentView>();
  ALL_AGENTS.filter((a) => a.kind !== "group").forEach((a) => byId.set(a.id, describeAgent(a, pulses[a.id], now, probes.get(a.id))));

  // 2) очередь забега Конкистадора: идут по порядку, кто ещё не начал, стоит за предыдущим
  const queued = ALL_AGENTS.filter((a) => a.order !== undefined)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((a) => byId.get(a.id)!);
  queued.forEach((v, i) => {
    if (v.lamp !== "wait" || i === 0) return;
    const ahead = queued.slice(0, i).reverse().find((p) => p.lamp === "wait" || p.lamp === "work");
    if (ahead) {
      v.label = "В очереди";
      v.last = `Начнёт, когда закончит «${ahead.def.name}». ${v.last}`.trim();
    }
  });

  // 3) групповые столы
  const viewOf = (a: AgentDef): AgentView =>
    a.kind === "group" ? describeGroup(a, (a.members ?? []).map((id) => byId.get(id)).filter((x): x is AgentView => !!x)) : byId.get(a.id)!;
  const rooms = ROOMS.map((r) => ({ room: r, views: r.agents.filter((a) => !a.hidden).map(viewOf) }));
  const visible = rooms.flatMap((r) => r.views);

  // 4) часы и лента времени
  const nowMin = kyivMinutes(now);
  const runs: ClockRun[] = [];
  const ticks: ClockTick[] = [];
  ALL_AGENTS.filter((a) => a.kind !== "group").forEach((def) => {
    const v = byId.get(def.id)!;
    const track = def.track;
    if (track === undefined) return;
    def.slots.forEach((sl) => {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), sl.h, sl.m));
      ticks.push({ track, min: kyivMinutes(d), title: `${v.def.name}: по расписанию ${formatKyivTime(d)}` });
    });
    const rec = pulses[def.id];
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
      color: rec.status === "error" && !isSoftError(rec) ? LAMP_COLOR.error : LAMP_COLOR.done,
      live: rec.status === "working",
      title: `${def.name}: ${formatKyivTime(st)}–${rec.finishedAt ? formatKyivTime(en) : "идёт"}`,
    });
  });
  const nowLabel = formatKyivTime(now);

  const timeline: TimelineRow[] = [];
  const slotMin = (h: number, m: number): number => kyivMinutes(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), h, m)));
  const seq = (ids: string[]): string => ids.map((id) => ALL_AGENTS.find((a) => a.id === id)?.name ?? id).join(" → ");
  const konkOrder = ["news", ...queued.map((v) => v.def.id)];
  timeline.push({ min: slotMin(7, 0), title: "Общий забег Конкистадора", detail: `Идут строго по очереди: ${seq(konkOrder)}. Следующий начинает, когда закончил предыдущий.` });
  timeline.push({ min: slotMin(7, 20), title: "Украина · DOU, затем отправка в Google", detail: "Первый проход сервиса DOU, после него Почтальон отправляет адреса в Google." });
  timeline.push({ min: slotMin(15, 20), title: "Украина · DOU, затем отправка в Google", detail: "Второй проход сервиса DOU." });
  timeline.push({ min: slotMin(3, 23), title: "Подвоз вакансий Workable", detail: "Сборщик кладёт свежие вакансии Африки, Латам и Азии в кеш — из него утром берут агенты." });
  timeline.sort((a, b) => a.min - b.min);
  const nextRow = timeline.find((r) => r.min > nowMin) ?? timeline[0];

  const working = visible.filter((v) => v.lamp === "work" || v.parts?.some((p) => p.lamp === "work"));
  const count = (f: (l: Lamp) => boolean) => visible.filter((v) => f(v.lamp)).length;
  const counters = [
    { color: LAMP_COLOR.done, n: count((l) => l === "done" || l === "work"), label: "в порядке" },
    { color: LAMP_COLOR.wait, n: count((l) => l === "wait"), label: "ждут запуска" },
    { color: LAMP_COLOR.missed, n: count((l) => l === "missed" || l === "error"), label: "нужен взгляд" },
    { color: LAMP_COLOR.nodata, n: count((l) => l === "nodata" || l === "planned" || l === "manual"), label: "не подключены или вручную" },
  ];
  // Вердикт дня: одной фразой, «всё ли в порядке сегодня».
  const konkSteps = ALL_AGENTS.filter((a) => a.kind === "pulse" && a.track === 0 && !a.hidden || a.id === "ua").map((a) => byId.get(a.id)!).filter(Boolean);
  const stepsDone = konkSteps.filter((v) => v.lamp === "done").length;
  const workingStep = konkSteps.find((v) => v.lamp === "work");
  const bad = visible.filter((v) => v.lamp === "error" || v.lamp === "missed");
  const publishedToday = Object.values(pulses).reduce((sum, r) => {
    if (!r || r.published == null || !r.finishedAt || !sameKyivDay(new Date(r.finishedAt), now)) return sum;
    return sum + r.published;
  }, 0);
  let verdict: { tone: "ok" | "run" | "bad" | "wait"; title: string; text: string };
  if (bad.length) {
    verdict = { tone: "bad", title: "Есть что проверить", text: `Проблема у: ${bad.map((v) => v.def.name).join(", ")}. Подробности в карточках ниже.` };
  } else if (workingStep) {
    verdict = { tone: "run", title: "Всё идёт по плану: утренний забег в работе", text: `Сейчас «${workingStep.def.name}», готово ${stepsDone} из ${konkSteps.length} шагов. Остальные ждут очереди, это нормально.${publishedToday ? ` Опубликовано сегодня: ${publishedToday}.` : ""}` };
  } else if (konkSteps.length && stepsDone === konkSteps.length) {
    verdict = { tone: "ok", title: "Сегодня всё отработало", text: `Все ${konkSteps.length} шагов забега выполнены без ошибок. Опубликовано сегодня: ${publishedToday}.` };
  } else if (stepsDone > 0) {
    verdict = { tone: "run", title: "Забег идёт между шагами", text: `Готово ${stepsDone} из ${konkSteps.length}, следующий шаг стартует сам.` };
  } else {
    verdict = { tone: "wait", title: "Ждём утреннего запуска", text: "Сегодня ещё никто не стартовал. Забег начинается в 10:00 по Киеву, красной лампочкой штаб загорится, только если запуск не случится." };
  }
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
              Зелёная — работает или отработал, синяя — ждёт очереди, красная — нужен взгляд. Нажми на карточку, чтобы раскрыть. Время киевское, обновлено {stamp}.
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

        <div className={`sh-verdict sh-v-${verdict.tone}`}>
          <b>{verdict.title}</b>
          <span>{verdict.text}</span>
        </div>

        {!workingStep || !working.length ? (
        <div className="sh-now">
          <LampDot lamp={working.length ? "work" : "wait"} />
          {working.length ? (
            <span>
              <b>Сейчас работают:</b> {working.map((v) => v.def.name).join(", ")}.
            </span>
          ) : (
            <span>
              <b>Сейчас никто не работает.</b> Ближайший запуск в {String(Math.floor((nextRow?.min ?? 0) / 60)).padStart(2, "0")}:{String((nextRow?.min ?? 0) % 60).padStart(2, "0")} — {nextRow?.title}.
            </span>
          )}
        </div>
        ) : null}

        <div className="sh-grid">
          {rooms.map(({ room, views }) => (
            <section key={room.id} className={`sh-room${room.wide ? " sh-wide" : ""}`}>
              <header>
                <h2 style={{ color: `color-mix(in srgb, ${room.color} 70%, var(--txt))` }}>{room.name}</h2>
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

        <details className="sh-det">
          <summary>
            <span>Расписание суток и очередь</span>
            <span className="sh-btn sh-btn-open">Показать</span>
            <span className="sh-btn sh-btn-close">Скрыть</span>
          </summary>
          <div className="sh-det-body">
            <div className="sh-sched">
              <div>
                <ShtabClock runs={runs} ticks={ticks} nowMin={nowMin} nowLabel={nowLabel} />
                <div className="sh-key">
                  <span><i style={{ background: "var(--txt)" }} />по расписанию</span>
                  <span><i style={{ background: LAMP_COLOR.done }} />запуск сегодня</span>
                  <span><i style={{ background: LAMP_COLOR.error }} />запуск с ошибкой</span>
                  <span><i style={{ background: "var(--hand)" }} />сейчас</span>
                </div>
                <div className="sh-key" style={{ marginTop: 6 }}>
                  <span>внешнее кольцо — общий забег (10:00), среднее — сервис DOU (10:20 и 18:20), внутреннее — Сборщик Workable (06:23)</span>
                </div>
              </div>
              <div>
                <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 800 }}>Что за чем идёт (время киевское)</h3>
                <ul className="sh-tl">
                  {timeline.map((r) => {
                    const cls = r.min <= nowMin ? "past" : r === nextRow ? "next" : "";
                    return (
                      <li key={`${r.min}-${r.title}`} className={cls}>
                        <time>{String(Math.floor(r.min / 60)).padStart(2, "0")}:{String(r.min % 60).padStart(2, "0")}</time>
                        <i />
                        <div>
                          <b>{r.title}</b>
                          <small>{r.detail}</small>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>

            <div>
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
                    {queued.map((v) => {
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
                          <td style={{ color: "var(--soft)" }}>{v.def.sources}</td>
                          <td>
                            <span style={{ color: lampText(v.lamp), fontWeight: 700 }}>{v.label}</span>
                            <div style={{ color: "var(--mut)" }}>{v.last}</div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="sh-sub" style={{ marginTop: 12, fontSize: 13 }}>
                Принцип у всех один: каждый день агент берёт новые вакансии из своих источников, оставляет только IT, отбрасывает старше 6 месяцев, дубли и уже опубликованное, публикует не больше лимита, остальное остаётся на следующий день. Запускаются по очереди, одним общим забегом с 10:00 по Киеву.
              </div>
            </div>
          </div>
        </details>

        <div className="sh-legend">
          <div className="sh-card">
            <h3>Что значат лампочки</h3>
            {LEGEND.map((l) => (
              <div className="sh-li" key={l.title}>
                <span className="sh-lamp" style={{ background: LAMP_COLOR[l.lamp] }} aria-hidden="true" />
                <div>
                  <b>{l.title}</b>
                  <span style={{ color: "var(--mut)" }}> — {l.text}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="sh-card">
            <h3>Как это работает</h3>
            <div className="sh-li" style={{ color: "var(--soft)" }}>
              Конкистадор и его агенты присылают отметку в начале и в конце запуска: сколько опубликовано и сколько ошибок. Если время запуска прошло, а отметки нет, лампочка краснеет — значит, агент отвалился.
            </div>
            <div className="sh-li" style={{ color: "var(--mut)" }}>
              Сборщик Workable (GitHub), сервисы сайта и бот подписок подключим следующими — у них пока серая лампочка.
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
