// components/app-qr.tsx
//
// QR на умную ссылку jobs.a1appp.com/get (app/get/route.ts): iPhone уходит
// в App Store, Android -- в Google Play, остальные -- на /download. Тот же
// код, что на /download (там он нарисован прямо в странице); здесь -- для
// подвала сайта. Белая подложка всегда, в тёмной теме тоже: инвертированный
// QR читают не все камеры.

const QR_PATH =
  "M0 0h7v1h-7zM9 0h2v1h-2zM12 0h4v1h-4zM18 0h1v1h-1zM22 0h7v1h-7zM0 1h1v1h-1zM6 1h1v1h-1zM8 1h2v1h-2zM15 1h1v1h-1zM20 1h1v1h-1zM22 1h1v1h-1zM28 1h1v1h-1zM0 2h1v1h-1zM2 2h3v1h-3zM6 2h1v1h-1zM8 2h1v1h-1zM10 2h2v1h-2zM14 2h1v1h-1zM16 2h1v1h-1zM19 2h2v1h-2zM22 2h1v1h-1zM24 2h3v1h-3zM28 2h1v1h-1zM0 3h1v1h-1zM2 3h3v1h-3zM6 3h1v1h-1zM8 3h2v1h-2zM11 3h2v1h-2zM14 3h2v1h-2zM17 3h4v1h-4zM22 3h1v1h-1zM24 3h3v1h-3zM28 3h1v1h-1zM0 4h1v1h-1zM2 4h3v1h-3zM6 4h1v1h-1zM12 4h4v1h-4zM17 4h4v1h-4zM22 4h1v1h-1zM24 4h3v1h-3zM28 4h1v1h-1zM0 5h1v1h-1zM6 5h1v1h-1zM13 5h2v1h-2zM16 5h2v1h-2zM20 5h1v1h-1zM22 5h1v1h-1zM28 5h1v1h-1zM0 6h7v1h-7zM8 6h1v1h-1zM10 6h1v1h-1zM12 6h1v1h-1zM14 6h1v1h-1zM16 6h1v1h-1zM18 6h1v1h-1zM20 6h1v1h-1zM22 6h7v1h-7zM8 7h3v1h-3zM12 7h2v1h-2zM19 7h1v1h-1zM0 8h1v1h-1zM6 8h1v1h-1zM8 8h3v1h-3zM12 8h1v1h-1zM14 8h2v1h-2zM17 8h1v1h-1zM21 8h2v1h-2zM25 8h3v1h-3zM0 9h1v1h-1zM3 9h3v1h-3zM7 9h3v1h-3zM12 9h1v1h-1zM14 9h1v1h-1zM18 9h2v1h-2zM24 9h1v1h-1zM26 9h2v1h-2zM5 10h2v1h-2zM10 10h1v1h-1zM12 10h1v1h-1zM17 10h1v1h-1zM22 10h2v1h-2zM1 11h2v1h-2zM5 11h1v1h-1zM8 11h1v1h-1zM14 11h3v1h-3zM19 11h2v1h-2zM22 11h1v1h-1zM24 11h2v1h-2zM3 12h2v1h-2zM6 12h2v1h-2zM10 12h1v1h-1zM12 12h3v1h-3zM20 12h1v1h-1zM22 12h1v1h-1zM28 12h1v1h-1zM0 13h1v1h-1zM2 13h1v1h-1zM7 13h1v1h-1zM9 13h1v1h-1zM12 13h3v1h-3zM18 13h2v1h-2zM22 13h3v1h-3zM27 13h2v1h-2zM0 14h1v1h-1zM5 14h3v1h-3zM10 14h1v1h-1zM13 14h4v1h-4zM21 14h1v1h-1zM25 14h2v1h-2zM2 15h4v1h-4zM7 15h1v1h-1zM10 15h1v1h-1zM12 15h3v1h-3zM16 15h1v1h-1zM20 15h3v1h-3zM24 15h1v1h-1zM26 15h1v1h-1zM28 15h1v1h-1zM1 16h3v1h-3zM5 16h2v1h-2zM9 16h1v1h-1zM12 16h1v1h-1zM14 16h2v1h-2zM17 16h1v1h-1zM20 16h2v1h-2zM25 16h2v1h-2zM0 17h2v1h-2zM4 17h1v1h-1zM7 17h1v1h-1zM9 17h1v1h-1zM12 17h1v1h-1zM16 17h1v1h-1zM19 17h6v1h-6zM26 17h3v1h-3zM0 18h4v1h-4zM5 18h3v1h-3zM11 18h1v1h-1zM13 18h2v1h-2zM16 18h2v1h-2zM19 18h4v1h-4zM25 18h1v1h-1zM28 18h1v1h-1zM0 19h1v1h-1zM4 19h2v1h-2zM7 19h1v1h-1zM9 19h2v1h-2zM12 19h1v1h-1zM14 19h3v1h-3zM18 19h1v1h-1zM21 19h1v1h-1zM23 19h1v1h-1zM0 20h1v1h-1zM2 20h1v1h-1zM4 20h1v1h-1zM6 20h3v1h-3zM10 20h1v1h-1zM12 20h1v1h-1zM16 20h1v1h-1zM18 20h1v1h-1zM20 20h5v1h-5zM26 20h3v1h-3zM8 21h1v1h-1zM10 21h1v1h-1zM12 21h2v1h-2zM16 21h5v1h-5zM24 21h2v1h-2zM0 22h7v1h-7zM10 22h8v1h-8zM19 22h2v1h-2zM22 22h1v1h-1zM24 22h3v1h-3zM0 23h1v1h-1zM6 23h1v1h-1zM12 23h2v1h-2zM17 23h4v1h-4zM24 23h1v1h-1zM27 23h2v1h-2zM0 24h1v1h-1zM2 24h3v1h-3zM6 24h1v1h-1zM10 24h4v1h-4zM15 24h3v1h-3zM19 24h7v1h-7zM27 24h1v1h-1zM0 25h1v1h-1zM2 25h3v1h-3zM6 25h1v1h-1zM9 25h2v1h-2zM12 25h1v1h-1zM16 25h1v1h-1zM18 25h1v1h-1zM21 25h1v1h-1zM25 25h3v1h-3zM0 26h1v1h-1zM2 26h3v1h-3zM6 26h1v1h-1zM9 26h6v1h-6zM18 26h1v1h-1zM21 26h7v1h-7zM0 27h1v1h-1zM6 27h1v1h-1zM9 27h1v1h-1zM11 27h1v1h-1zM15 27h1v1h-1zM19 27h1v1h-1zM22 27h1v1h-1zM25 27h2v1h-2zM28 27h1v1h-1zM0 28h7v1h-7zM8 28h1v1h-1zM12 28h2v1h-2zM16 28h1v1h-1zM18 28h2v1h-2zM26 28h1v1h-1z";

export function AppQr({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="-2 -2 33 33"
      shapeRendering="crispEdges"
      role="img"
      aria-label="QR: jobs.a1appp.com/get"
    >
      <rect x="-2" y="-2" width="33" height="33" fill="#fff" />
      <path fill="#000" d={QR_PATH} />
    </svg>
  );
}
