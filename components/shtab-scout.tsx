// components/shtab-scout.tsx
//
// 14.10.2026 (Александр: «агент-разведчик… что у конкурентов можно у нас внедрить»). Окно «Разведчик»
// в штабе: последний недельный отчёт -- 3-5 идей «что сделали / зачем нам / как у нас / сложность»,
// ниже прошлые недели. Отчёты присылает konkistador/konk_scout.py (lib/a1/scout-store.ts).
import { isRejected, loadScoutRejected, loadScoutReports, type ScoutIdea } from "@/lib/a1/scout-store";
import { ScoutRejectButton } from "@/components/shtab-scout-reject";

const CSS = `
.shs{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:14px 16px;box-shadow:var(--shadow)}
.shs h2{margin:0;font-size:15px;font-weight:800}
.shs-head{display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap}
.shs-sub{font-size:12px;color:var(--dim)}
.shs-list{display:grid;gap:10px;margin-top:12px}
.shs-i{border:1px solid var(--row);border-radius:12px;padding:10px 12px}
.shs-top{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}
.shs-who{font-size:12px;font-weight:800;color:var(--mut)}
.shs-e{font-size:11px;font-weight:800;border-radius:99px;padding:1px 8px}
.shs-e-easy{background:#dcfce7;color:#166534}.shs-e-mid{background:#fef3c7;color:#92400e}.shs-e-hard{background:#fee2e2;color:#991b1b}
.shs-what{font-size:14px;font-weight:700;margin-top:4px}
.shs-p{font-size:13px;color:var(--soft);margin-top:4px}
.shs-p b{color:var(--mut)}
.shs-a{font-size:12px;color:var(--dim);margin-top:4px;display:inline-block}
.shs-a:hover{text-decoration:underline}
.shs-note{font-size:12px;color:var(--dim);margin-top:10px}
.shs details{margin-top:10px}
.shs summary{cursor:pointer;font-size:13px;font-weight:700}
.shs-old{font-size:13px;color:var(--soft);margin:6px 0 0 0;padding-left:18px}
.shs-rej{margin-top:8px;font-size:12px;font-weight:700;color:var(--dim);background:transparent;border:1px solid var(--row);border-radius:99px;padding:3px 10px;cursor:pointer}
.shs-rej:hover{color:var(--mut)}
.shs-no{color:#dc2626;border-color:#fca5a5}
.shs-no:hover{color:#b91c1c;background:#fee2e2}
.shs-done{color:#15803d;border-color:#86efac}
.shs-done:hover{color:#166534;background:#dcfce7}
.shs-rej-box{margin-top:8px}
.shs-rej-txt{width:100%;font:inherit;font-size:13px;border:1px solid var(--row);border-radius:10px;padding:6px 8px;background:transparent;color:inherit;resize:vertical}
.shs-rej-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.shs-rej-err{font-size:12px;color:#991b1b}
`;

const EFFORT: Record<ScoutIdea["effort"], string> = { легко: "shs-e-easy", средне: "shs-e-mid", сложно: "shs-e-hard" };

function day(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

export async function ShtabScout() {
  const [reports, rejected] = await Promise.all([loadScoutReports(4).catch(() => []), loadScoutRejected().catch(() => [])]);
  // 15.10.2026: отклонённые Александром идеи не показываем (lib/a1/scout-store.ts).
  const visible = reports.map((r) => ({ ...r, ideas: r.ideas.filter((i) => !isRejected(i, rejected)) }));
  const [last, ...older] = visible;

  return (
    <section className="shs">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="shs-head">
        <h2>🔭 Разведчик: идеи у конкурентов</h2>
        <span className="shs-sub">
          {last
            ? `неделя до ${day(last.date)} · разобрано ${last.scanned.items} новостей`
            : "раз в неделю, в утреннем забеге Конкистадора"}
        </span>
      </div>

      {!last ? (
        <div className="shs-note">Первый отчёт придёт после ближайшего утреннего забега, дальше — раз в неделю.</div>
      ) : last.ideas.length ? (
        <div className="shs-list">
          {last.ideas.map((i, k) => (
            <div className="shs-i" key={k}>
              <div className="shs-top">
                {i.who ? <span className="shs-who">{i.who}</span> : null}
                <span className={`shs-e ${EFFORT[i.effort]}`}>{i.effort}</span>
              </div>
              <div className="shs-what">{i.what}</div>
              <div className="shs-p">
                <b>Зачем нам:</b> {i.why}
              </div>
              {i.how ? (
                <div className="shs-p">
                  <b>Как у нас:</b> {i.how}
                </div>
              ) : null}
              {i.url ? (
                <a className="shs-a" href={i.url} target="_blank" rel="noopener noreferrer">
                  Источник{i.source ? ` · ${i.source}` : ""} ↗
                </a>
              ) : null}
              <div>
                <ScoutRejectButton date={last.date} what={i.what} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="shs-note">За эту неделю ничего, что стоило бы внедрять, не нашлось.</div>
      )}

      {last?.market ? (
        <div className="shs-note">
          <b>Рынок:</b> {last.market}
        </div>
      ) : null}

      {rejected.length ? (
        <details>
          <summary>Сделано и отклонённые ({rejected.length}) · Разведчик читает этот список и не повторяет такое</summary>
          <ul className="shs-old">
            {rejected
              .slice()
              .reverse()
              .map((r, k) => (
                <li key={k}>
                  {r.status === "done" ? "✅ Сделано · " : "❌ Не подходит · "}
                  {r.who ? `${r.who}: ` : ""}
                  {r.what.replace(/[.\s]+$/, "")}
                  {r.reason ? `. Комментарий: ${r.reason}` : ""}
                </li>
              ))}
          </ul>
        </details>
      ) : null}

      {older.length ? (
        <details>
          <summary>Прошлые недели</summary>
          {older.map((r) => (
            <div key={r.date}>
              <div className="shs-note" style={{ marginTop: 8 }}>
                <b>До {day(r.date)}</b>
              </div>
              <ul className="shs-old">
                {r.ideas.length ? (
                  r.ideas.map((i, k) => (
                    <li key={k}>
                      {i.who ? `${i.who}: ` : ""}
                      {i.what} ({i.effort})
                    </li>
                  ))
                ) : (
                  <li>идей не было</li>
                )}
              </ul>
            </div>
          ))}
        </details>
      ) : null}
    </section>
  );
}
