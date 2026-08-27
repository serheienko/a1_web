// components/globe-icon.tsx
//
// Simple stroke globe icon for the language switcher (components/lang-toggle.tsx),
// hand-drawn in the same minimal style as components/filter-icon.tsx and
// components/clear-icon.tsx (currentColor strokes, no fills baked in) rather
// than pulling in an icon library for one glyph.
export function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
      <ellipse cx="10" cy="10" rx="3.4" ry="8" stroke="currentColor" strokeWidth="1.5" />
      <line x1="2" y1="10" x2="18" y2="10" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3.2 6h13.6M3.2 14h13.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
