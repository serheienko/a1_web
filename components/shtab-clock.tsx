// components/shtab-clock.tsx
//
// 09.10.2026 (Александр: «часы кругом… по каким часам они все работают»).
// Суточные часы по Киеву: 00:00 сверху, дорожки -- Конкистадор, Казак, Сборщик.
// Цветные дуги -- сегодняшние запуски, чёрточки -- время по расписанию,
// стрелка -- сейчас. Чистый SVG, без скриптов.

export type ClockRun = { track: number; fromMin: number; toMin: number; color: string; live?: boolean; title: string };
export type ClockTick = { track: number; min: number; title: string };

const C = 180;
const RADII = [138, 112, 86];
const W = 16;
const radius = (i: number): number => RADII[i] ?? 138;

function pt(min: number, r: number): [number, number] {
  const a = (min / 1440) * Math.PI * 2 - Math.PI / 2;
  return [C + r * Math.cos(a), C + r * Math.sin(a)];
}

function arc(fromMin: number, toMin: number, r: number): string {
  let to = toMin;
  if (to - fromMin < 6) to = fromMin + 6; // совсем короткий запуск всё равно видно
  const [x1, y1] = pt(fromMin, r);
  const [x2, y2] = pt(Math.min(to, 1440), r);
  const large = Math.min(to, 1440) - fromMin > 720 ? 1 : 0;
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

export function ShtabClock({
  runs,
  ticks,
  nowMin,
  nowLabel,
}: {
  runs: ClockRun[];
  ticks: ClockTick[];
  nowMin: number;
  nowLabel: string;
}) {
  const [hx, hy] = pt(nowMin, 150);
  return (
    <svg viewBox="0 0 360 360" width="100%" style={{ maxWidth: 380 }} role="img" aria-label={`Суточные часы, сейчас ${nowLabel} по Киеву`}>
      {RADII.map((r, i) => (
        <circle key={i} cx={C} cy={C} r={r} fill="none" style={{ stroke: "var(--ring)" }} strokeWidth={W} />
      ))}
      {Array.from({ length: 24 }, (_, h) => {
        const [x1, y1] = pt(h * 60, 150);
        const [x2, y2] = pt(h * 60, h % 6 === 0 ? 160 : 155);
        return <line key={h} x1={x1} y1={y1} x2={x2} y2={y2} style={{ stroke: "var(--tick)" }} strokeWidth={h % 6 === 0 ? 2 : 1} />;
      })}
      {[0, 6, 12, 18].map((h) => {
        const [x, y] = pt(h * 60, 172);
        return (
          <text key={h} x={x} y={y} style={{ fill: "var(--dim)" }} fontSize="11" textAnchor="middle" dominantBaseline="middle" fontFamily="ui-monospace,Menlo,monospace">
            {String(h).padStart(2, "0")}
          </text>
        );
      })}
      {ticks.map((t, i) => {
        const [x1, y1] = pt(t.min, radius(t.track) - W / 2 - 3);
        const [x2, y2] = pt(t.min, radius(t.track) + W / 2 + 3);
        return (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} style={{ stroke: "var(--txt)" }} strokeWidth="2.5" strokeLinecap="round">
            <title>{t.title}</title>
          </line>
        );
      })}
      {runs.map((r, i) => (
        <path key={i} d={arc(r.fromMin, r.toMin, radius(r.track))} fill="none" stroke={r.color} strokeWidth={W - 4} strokeLinecap="butt" opacity={r.live ? 1 : 0.85}>
          <title>{r.title}</title>
        </path>
      ))}
      <line x1={C} y1={C} x2={hx} y2={hy} style={{ stroke: "var(--hand)" }} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx={hx} cy={hy} r="5" style={{ fill: "var(--hand)" }} />
      <circle cx={C} cy={C} r="4" style={{ fill: "var(--hand)" }} />
      <text x={C} y={C - 22} style={{ fill: "var(--txt)" }} fontSize="26" fontWeight="800" textAnchor="middle" fontFamily="ui-monospace,Menlo,monospace">
        {nowLabel}
      </text>
      <text x={C} y={C + 30} style={{ fill: "var(--dim)" }} fontSize="11" textAnchor="middle">
        по Киеву
      </text>
    </svg>
  );
}
