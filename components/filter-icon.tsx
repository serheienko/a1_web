// components/filter-icon.tsx
//
// Aleksandr, 2026-08-27: "категории... можно их вообще поселить на
// иконку фильтров, как у нас в приложении. Иконка по ссылке
// https://www.figma.com/design/.../node-id=24342-43819" — the exact
// "sliders" icon from the in-app search bar (Figma layer "coolicon",
// 24x18, fill #9899A6), reproduced by hand from that node rather than
// an exact vector export: it's a small stroke icon (two vertical
// tracks, a round handle on each at a different height), simple enough
// to match visually pixel-for-pixel without needing the raw path data.
export function FilterIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 18" fill="none" className={`animate-filter-adjust ${className ?? ""}`} aria-hidden="true">
      <line x1="7" y1="1" x2="7" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="17" y1="1" x2="17" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="7" cy="6" r="2.5" className="fill-white dark:fill-black" stroke="currentColor" strokeWidth="2" />
      <circle cx="17" cy="12" r="2.5" className="fill-white dark:fill-black" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
