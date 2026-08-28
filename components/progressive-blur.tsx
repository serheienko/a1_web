// components/progressive-blur.tsx
//
// 2026-08-28: "хочу такой же эффект, как у шапки в моём мобильном
// приложении — частично блюр, частично туманка" — Aleksandr pointed at
// the Claude app's nav header, where content scrolling up doesn't just
// vanish behind a flat bar: it gradually blurs and fades into the page
// background as it approaches the header, with no hard edge.
//
// A single backdrop-blur can't do a *gradient* of blur strength — CSS
// has no way to interpolate a filter's radius across a mask. The
// standard trick (used by Linear- and Vercel-style headers, and here)
// is to stack several full-width layers directly under the header,
// each blurred by a different amount and each masked (via a soft
// linear-gradient alpha mask) so it only "switches on" over a narrow
// band. Overlapping six of these bands — weakest blur nearest the page
// content, strongest right under the header — reads as one smooth,
// continuously increasing blur, which no single backdrop-filter can
// produce. A matching colour fade rides on top for the actual "fog"
// tint Aleksandr pointed at, not just the optical blur.
//
// Renders as a strip glued to the bottom edge of its parent — the
// parent must be positioned (site-nav.tsx's <nav> is `sticky`, which
// counts) so this can be `absolute inset-x-0 top-full` and scroll with
// it. pointer-events-none throughout: it's decorative and sits over
// real cards/content, so it must never intercept a click or tap.

const LAYERS = [
  { blur: 1, stops: [0, 12.5, 25] as const },
  { blur: 2, stops: [0, 12.5, 25, 37.5] as const },
  { blur: 4, stops: [12.5, 25, 37.5, 50] as const },
  { blur: 8, stops: [25, 37.5, 50, 62.5] as const },
  { blur: 16, stops: [37.5, 50, 62.5, 75] as const },
  { blur: 32, stops: [50, 62.5, 75, 100] as const },
];

// `to top`: 0% = bottom of the strip (nearest the page content), 100%
// = top of the strip (nearest the header). Each layer is fully
// transparent (blur off) outside its band and fully opaque (blur on)
// inside it, with a short ramp at each edge so neighboring layers
// overlap instead of stepping — that overlap is what fuses six discrete
// layers into what reads as one continuous gradient.
function maskFor(stops: readonly number[]) {
  if (stops.length === 3) {
    const [a, b, c] = stops;
    return `linear-gradient(to top, black ${a}%, black ${b}%, transparent ${c}%)`;
  }
  const [a, b, c, d] = stops;
  return `linear-gradient(to top, transparent ${a}%, black ${b}%, black ${c}%, transparent ${d}%)`;
}

export function ProgressiveBlur({ heightClassName = "h-24" }: { heightClassName?: string }) {
  return (
    <div
      className={`pointer-events-none absolute inset-x-0 top-full ${heightClassName}`}
      aria-hidden="true"
    >
      {LAYERS.map((layer) => {
        const mask = maskFor(layer.stops);
        return (
          <div
            key={layer.blur}
            className="absolute inset-0"
            style={{
              backdropFilter: `blur(${layer.blur}px)`,
              WebkitBackdropFilter: `blur(${layer.blur}px)`,
              maskImage: mask,
              WebkitMaskImage: mask,
            }}
          />
        );
      })}
      {/* Colour fade on top of the optical blur layers above — the
          actual "fog" tint, matching each theme's page background so it
          reads as a continuation of the nav bar rather than a filter
          effect bolted onto the content underneath. */}
      <div className="absolute inset-0 bg-gradient-to-t from-transparent to-app/70 dark:to-black/70" />
    </div>
  );
}
