// app/get/route.ts
//
// Умная ссылка jobs.a1appp.com/get: один адрес на обе платформы.
// Aleksandr, 2026-09-14 — про QR на /download: «один QR будет вести в
// 2 разных магаза в зависимости от устройства?». Да, и вот как именно:
// сам код никакой логики не содержит, он просто адрес. Логика здесь —
// сервер смотрит, с какого устройства пришёл запрос, и перенаправляет.
//
// Эту же ссылку удобно кидать в постах и сторис: одна на обе платформы,
// вместо «Android — сюда, iOS — туда».
//
// Кто куда:
//   iPhone/iPad/iPod -> App Store
//   Android          -> Google Play
//   всё остальное    -> /download (десктоп, боты, неизвестные устройства)
//
// Десктоп нарочно НЕ отправляем в веб-витрину магазина: поставить оттуда
// приложение всё равно нельзя, а на /download человек увидит QR и
// перейдёт на телефон. Туда же попадают краулеры соцсетей — им нужна
// страница с картинкой предпросмотра, а не редирект в магазин.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { DOWNLOAD_LINKS } from "@/app/download/copy";

// Никакого кэша: ответ зависит от устройства, а закэшированный редирект
// отправил бы всех туда, куда ушёл первый посетитель.
export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  const ua = request.headers.get("user-agent") ?? "";

  // iPadOS 13+ по умолчанию представляется макинтошем, поэтому отдельно
  // проверяем сенсорный ввод — иначе новые iPad уезжали бы на /download.
  const isIOS = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && /Mobile|Touch/i.test(ua));
  const isAndroid = /Android/i.test(ua);

  const target = isIOS
    ? DOWNLOAD_LINKS.appStore
    : isAndroid
      ? DOWNLOAD_LINKS.googlePlay
      : `${DOWNLOAD_LINKS.website}/download`;

  // 302, а не 301: 301 браузеры и почтовые клиенты запоминают навсегда,
  // и человек, однажды открывший ссылку с телефона, потом с компьютера
  // всё равно улетал бы в мобильный магазин.
  return NextResponse.redirect(target, 302);
}
