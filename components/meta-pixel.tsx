// components/meta-pixel.tsx
//
// 03.10.2026: подключение пикселя Meta — см. lib/meta-pixel.ts.
// Стандартный код Meta грузится после того, как страница стала
// интерактивной (afterInteractive), чтобы не тормозить первую отрисовку.
// Первый PageView шлёт сам код при загрузке; дальше сайт меняет адрес без
// перезагрузки страницы, поэтому на каждый новый адрес шлём PageView сами.
"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";
import { META_PIXEL_ID, fbqTrack } from "@/lib/meta-pixel";

const PIXEL_SCRIPT = `
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${META_PIXEL_ID}');
fbq('track', 'PageView');
`;

export function MetaPixel() {
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    // первый заход уже посчитан самим кодом пикселя — не дублируем
    if (first.current) {
      first.current = false;
      return;
    }
    fbqTrack("PageView");
  }, [pathname]);

  return (
    <Script id="meta-pixel" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: PIXEL_SCRIPT }} />
  );
}
