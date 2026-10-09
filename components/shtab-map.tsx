"use client";
// components/shtab-map.tsx
//
// 09.10.2026 (Александр: «мини-карту, на которую можно нажимать и видеть покрытие:
// какие страны покрываем, какие пробелы; кроме стран, с которыми не будем работать:
// Беларусь, Россия, санкционные»). Маленькая карта в штабе; по клику -- большая
// с подробностями и списком пробелов.
import { useEffect, useMemo, useState } from "react";
import { WORLD, WORLD_W, WORLD_H, type WorldShape } from "@/lib/a1/shtab-world";

export type MapStatus = "covered" | "thin" | "gap" | "excluded";

export type MapData = {
  /** Готовы ли числа (первый пересчёт после деплоя ещё мог не закончиться). */
  ready: boolean;
  /** Число вакансий по странам (>= порога показа). */
  counts: Record<string, number>;
  /** Страны, которые есть в справочнике бэкенда, но вакансий там мало. */
  thin: string[];
  /** Страны, с которыми не работаем: код -> причина. */
  excluded: Record<string, string>;
  /** Страны, которые есть в справочнике бэкенда (в них можно публиковать). */
  known: string[];
};

const COLOR: Record<MapStatus, string> = { covered: "#3ddc84", thin: "#e8b43c", gap: "#ff6b5e", excluded: "#6b7380" };
const LABEL: Record<MapStatus, string> = { covered: "Покрыто", thin: "Мало вакансий", gap: "Пробел", excluded: "Не работаем" };

function agentFor(code: string, k: string): string {
  if (code === "UA") return "Украина · Казак";
  if (code === "US") return "США";
  if (code === "BR" || code === "MX" || code === "CA") return "Мир · топ-компании";
  if (k === "EU") return "Европа";
  if (k === "AF") return "Африка";
  if (k === "AS") return "Азия и Залив";
  if (k === "SA" || k === "NA") return "Латинская Америка";
  return "Мир · топ-компании";
}

const CSS = `
.shm-card{border:1px solid var(--line);border-radius:16px;background:var(--panel);padding:14px;display:flex;flex-direction:column;gap:8px;box-shadow:var(--shadow)}
.shm-head{display:flex;align-items:baseline;justify-content:space-between;gap:8px}
.shm-head h2{margin:0;font-size:16px;font-weight:800}
.shm-open{font:600 12px/1 system-ui,sans-serif;border:1px solid var(--edge);border-radius:999px;padding:6px 11px;color:var(--soft);background:var(--bg);cursor:pointer}
.shm-svg{width:100%;height:auto;display:block;border-radius:10px;background:var(--bg)}
.shm-svg path{stroke:var(--panel);stroke-width:.6;cursor:pointer;transition:opacity .12s}
.shm-svg path:hover{opacity:.75}
.shm-svg path.sel{stroke:var(--txt);stroke-width:1.6}
.shm-nums{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:12.5px;color:var(--soft)}
.shm-nums i{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:6px}
.shm-info{font-size:12.5px;color:var(--soft);min-height:2.7em;line-height:1.35}
.shm-back{position:fixed;inset:0;background:#0009;z-index:60;display:flex;align-items:center;justify-content:center;padding:16px}
.shm-panel{background:var(--panel);color:var(--txt);border:1px solid var(--line);border-radius:18px;max-width:1120px;width:100%;max-height:92vh;overflow:auto;padding:18px;display:flex;flex-direction:column;gap:12px}
.shm-panel header{display:flex;align-items:center;justify-content:space-between;gap:12px}
.shm-panel h2{margin:0;font-size:20px;font-weight:800}
.shm-cols{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(260px,1fr);gap:16px}
@media (max-width:900px){.shm-cols{grid-template-columns:1fr}}
.shm-list h3{margin:10px 0 4px;font-size:13px;font-weight:800;color:var(--soft)}
.shm-chips{display:flex;flex-wrap:wrap;gap:4px}
.shm-chip{font-size:12px;border:1px solid var(--edge);border-radius:999px;padding:3px 9px;background:var(--bg);color:var(--soft);cursor:pointer}
.shm-chip.sel{border-color:var(--txt);color:var(--txt)}
.shm-note{font-size:12.5px;color:var(--mut);line-height:1.45}
`;

export function ShtabMap({ data }: { data: MapData }) {
  const [sel, setSel] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const known = useMemo(() => new Set(data.known), [data.known]);
  const thin = useMemo(() => new Set(data.thin), [data.thin]);

  const statusOf = (code: string): MapStatus => {
    if (data.excluded[code]) return "excluded";
    if (data.counts[code] !== undefined) return "covered";
    if (thin.has(code)) return "thin";
    return "gap";
  };

  const maxLog = useMemo(() => Math.log10(Math.max(10, ...Object.values(data.counts))), [data.counts]);
  const fillOf = (s: WorldShape): { fill: string; op: number } => {
    const st = data.ready ? statusOf(s.c) : "gap";
    if (!data.ready) return { fill: "var(--dim)", op: 0.35 };
    if (st === "covered") {
      const t = Math.log10(Math.max(10, data.counts[s.c] ?? 10)) / maxLog;
      return { fill: COLOR.covered, op: 0.4 + 0.6 * t };
    }
    return { fill: COLOR[st], op: st === "excluded" ? 0.55 : st === "gap" ? 0.5 : 0.85 };
  };

  const tally = useMemo(() => {
    const t = { covered: 0, thin: 0, gap: 0, excluded: 0 };
    WORLD.forEach((s) => {
      const st = statusOf(s.c);
      t[st] += 1;
    });
    return t;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const shape = sel ? WORLD.find((s) => s.c === sel) : null;
  const info = (): string => {
    if (!data.ready) return "Числа по странам ещё считаются, обнови страницу через минуту.";
    if (!shape) return "Нажми на страну, чтобы увидеть, что с ней.";
    const st = statusOf(shape.c);
    const base = `${shape.ru}: ${LABEL[st].toLowerCase()}`;
    if (st === "covered") return `${base}, ${data.counts[shape.c]} вакансий. Отвечает: ${agentFor(shape.c, shape.k)}.`;
    if (st === "thin") return `${base} (меньше 10), пока в списке стран сайта не показывается. Отвечает: ${agentFor(shape.c, shape.k)}.`;
    if (st === "excluded") return `${base}: ${data.excluded[shape.c]}.`;
    return known.has(shape.c)
      ? `${base}: вакансий нет. Отвечает: ${agentFor(shape.c, shape.k)}.`
      : `${base}: этой страны нет в справочнике бэкенда, вакансии туда пока положить нельзя.`;
  };

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open]);

  const svg = (cls?: string) => (
    <svg className={cls ?? "shm-svg"} viewBox={`0 0 ${WORLD_W} ${WORLD_H}`} role="img" aria-label="Карта покрытия стран">
      {WORLD.map((s) => {
        const { fill, op } = fillOf(s);
        return (
          <path
            key={s.c}
            d={s.d}
            fill={fill}
            fillOpacity={op}
            className={sel === s.c ? "sel" : undefined}
            onClick={() => setSel(s.c === sel ? null : s.c)}
          >
            <title>{s.ru}</title>
          </path>
        );
      })}
    </svg>
  );

  const nums = (
    <div className="shm-nums">
      {(["covered", "thin", "gap", "excluded"] as MapStatus[]).map((k) => (
        <span key={k}>
          <i style={{ background: COLOR[k] }} />
          {LABEL[k]} {data.ready || k === "excluded" ? tally[k] : "…"}
        </span>
      ))}
    </div>
  );

  const byRegion = useMemo(() => {
    const groups = new Map<string, WorldShape[]>();
    WORLD.forEach((s) => {
      const st = statusOf(s.c);
      if (st !== "gap" && st !== "thin") return;
      const a = agentFor(s.c, s.k);
      groups.set(a, [...(groups.get(a) ?? []), s]);
    });
    return [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  return (
    <section className="shm-card">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="shm-head">
        <h2>Покрытие стран</h2>
        <button type="button" className="shm-open" onClick={() => setOpen(true)}>Открыть крупно</button>
      </div>
      {svg()}
      {nums}
      <div className="shm-info">{info()}</div>

      {open ? (
        <div className="shm-back" onClick={() => setOpen(false)}>
          <div className="shm-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Покрытие стран">
            <header>
              <h2>Покрытие стран</h2>
              <button type="button" className="shm-open" onClick={() => setOpen(false)}>Закрыть</button>
            </header>
            <div className="shm-cols">
              <div>
                {svg()}
                {nums}
                <div className="shm-info" style={{ marginTop: 6 }}>{info()}</div>
              </div>
              <div className="shm-list">
                <div className="shm-note">
                  Зелёная — есть вакансии (чем ярче, тем больше). Жёлтая — в справочнике есть, но вакансий меньше 10. Красная — пробел: вакансий нет, а у части стран нет даже записи в справочнике бэкенда. Серая — не работаем: Россия, Беларусь и страны под полными санкциями.
                </div>
                {byRegion.map(([agent, list]) => (
                  <div key={agent}>
                    <h3>{agent} · пробелов {list.length}</h3>
                    <div className="shm-chips">
                      {list.map((s) => (
                        <button type="button" key={s.c} className={`shm-chip${sel === s.c ? " sel" : ""}`} onClick={() => setSel(s.c)}>
                          {s.ru}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <h3>Не работаем</h3>
                <div className="shm-note">
                  {Object.keys(data.excluded)
                    .map((c) => WORLD.find((s) => s.c === c)?.ru ?? c)
                    .join(", ")}
                  .
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
