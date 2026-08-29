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
// band. Overlapping layers — weakest blur nearest the page content,
// strongest right under the header — reads as one smooth, continuously
// increasing blur, which no single backdrop-filter can produce. A
// matching colour fade rides on top for the actual "fog" tint
// Aleksandr pointed at, not just the optical blur.
//
// 2026-08-28 (round 2): Aleksandr sent a screenshot showing a hard,
// un-blurred cut right where his phone's screen meets the header — not
// the gradual fog this was supposed to be. Tracked it to a real bug in
// the mask math, not a device quirk: the strongest (topmost, nearest-
// header) layer's mask was built with the same 4-stop "fade in, hold,
// fade out" shape as the middle layers, so it faded back to fully
// TRANSPARENT again right at 100% — i.e. exactly on the seam where
// this strip meets the header's bottom edge. That put a strip of zero
// blur precisely where the fog needed to be strongest, which reads
// exactly like a hard cut once you're close enough that it's the only
// part of the gradient still on-screen. Fixed by giving each layer an
// explicit shape instead of inferring it from stop count: the bottom
// layer fades OUT (opaque near the content, transparent going up), the
// top layer fades IN and then STAYS opaque through 100% (transparent
// near the content, opaque touching the header), and only the layers
// in between get the fade-in-hold-fade-out "bump" shape. Also widened
// the band and added `isolate` on the nav (site-nav.tsx) — a stacking
// context anchor that's cheap insurance against any WebKit z-ordering
// glitch during scroll, independent of the mask bug itself.
//
// 2026-08-28 (round 3): that 128px band (h-32) was sized off a desktop
// test and turned out too tall on a phone screen — "она начинается
// слишком рано... уже там чуть-чуть скролишь залазит тень" (it starts
// too soon, just barely scroll and the shadow's already creeping in).
// This strip is glued to the header regardless of scroll position — it
// isn't scroll-triggered, it just sits wherever the header currently is
// — so its height alone decides how far down into content it visibly
// reaches even at rest. 128px eats a much bigger slice of a short phone
// viewport than of a tall desktop one, so it was darkening/blurring the
// TOP of the very first card the instant a page loaded, before the user
// had scrolled anything into the header at all. h-20 (80px) on mobile
// keeps the same layer curve (all the LAYERS stops below are
// percentages of this height, so they stay proportionally identical,
// just compressed into less physical space) while sm:h-32 keeps the
// desktop version — which Aleksandr already confirmed looked right —
// unchanged.
//
// Renders as a strip glued to the bottom edge of its parent — the
// parent must be positioned (site-nav.tsx's <nav> is `sticky`, which
// counts) so this can be `absolute inset-x-0 top-full` and scroll with
// it. pointer-events-none throughout: it's decorative and sits over
// real cards/content, so it must never intercept a click or tap.

type Shape = "fade-out" | "bump" | "fade-in";

type Layer = {
  blur: number;
  shape: Shape;
  // fade-out: [opaque-until, transparent-by]
  // fade-in:  [transparent-until, opaque-by]
  // bump:     [transparent-until, opaque-by, opaque-until, transparent-by]
  stops: readonly number[];
};

// `to top`: 0% = bottom of the strip (nearest the page content), 100%
// = top of the strip (nearest the header). Ordered weakest-to-strongest
// so the blur reads as continuously increasing toward the header.
const LAYERS: readonly Layer[] = [
  { blur: 2, shape: "fade-out", stops: [20, 40] },
  { blur: 6, shape: "bump", stops: [10, 30, 50, 65] },
  { blur: 12, shape: "bump", stops: [35, 50, 70, 85] },
  { blur: 22, shape: "bump", stops: [55, 70, 90, 97] },
  // Stays opaque through 100% — the whole point of this layer is to be
  // the strongest blur exactly on the seam with the header, so unlike
  // every layer below it, it must NOT fade back out before reaching it.
  { blur: 38, shape: "fade-in", stops: [75, 92] },
];

function maskFor(layer: Layer) {
  if (layer.shape === "fade-out") {
    const [opaqueUntil, transparentBy] = layer.stops;
    return `linear-gradient(to top, black ${opaqueUntil}%, transparent ${transparentBy}%)`;
  }
  if (layer.shape === "fade-in") {
    const [transparentUntil, opaqueBy] = layer.stops;
    return `linear-gradient(to top, transparent ${transparentUntil}%, black ${opaqueBy}%)`;
  }
  const [a, b, c, d] = layer.stops;
  return `linear-gradient(to top, transparent ${a}%, black ${b}%, black ${c}%, transparent ${d}%)`;
}

// 2026-08-29 (round 4): Aleksandr, again -- "она дефолтно залазит на
// search, даже без скролла... или вообще убери её, чтобы не делала
// мозги." Three rounds of re-tuning this strip's mobile height (see the
// round-3 comment above) still weren't enough once the search bar sits
// this close under the nav on the feed pages -- there's no height short
// of "basically off" that both reads as a real fog effect AND clears a
// search box sitting right at the top of the page with zero scroll.
// Taking the explicit fallback he offered: gone on mobile entirely
// (`hidden`), unchanged on desktop (`sm:block`) where it was already
// confirmed to look right and there's no tight neighboring UI for it to
// bleed onto.
export function ProgressiveBlur({ heightClassName = "hidden sm:block sm:h-32" }: { heightClassName?: string }) {
  return (
    <div
      className={`pointer-events-none absolute inset-x-0 top-full ${heightClassName}`}
      aria-hidden="true"
    >
      {LAYERS.map((layer) => {
        const mask = maskFor(layer);
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
