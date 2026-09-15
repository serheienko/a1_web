export const runtime = "nodejs";

// app/api/media/[docId]/download/route.ts
//
// 2026-09-03 (Aleksandr, photo-viewer spec: "Save — это сохранить в
// телефон"): a plain `<a href={mediaProxyUrl} download>` doesn't
// reliably force a download here, because the sibling ../route.ts
// redirects cross-origin to S3 -- per spec, the `download` attribute
// is only honored when the resulting resource is same-origin (or the
// origin itself sets Content-Disposition: attachment, which this
// bucket's objects don't). Rather than fight that from the client,
// this route does the fetch server-side (same media.getUrl + retry
// this file's sibling already established, PLAN.md §2.6) and streams
// the bytes back itself with an explicit Content-Disposition, so the
// browser downloads no matter what the S3 object's own headers say.
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { call } from "@/lib/a1/client";

type MediaGetUrlOutput = { downloadUrl: string };

// 2026-09-15 (SEO-разбор, замер главной): аватарки компаний приезжали
// в оригинальном размере -- 400 КБ на страницу, одна из них 184 КБ, --
// а показываются кружком 40 пикселей. Сжималка их превращает в
// единицы килобайт.
//
// Ресайз живёт ЗДЕСЬ, а не в оптимизаторе картинок Next: его кэш
// ключуется по URL целиком, а в нашем URL сидит fileReference, который
// бэкенд меняет при каждой выдаче (проверено живьём: две загрузки
// страницы -- два разных ref). То есть каждый показ аватарки считался
// бы новой картинкой, и мы бы платили за преобразование вместо того,
// чтобы попадать в кэш.
//
// Включается только параметром `w`. Без него маршрут отдаёт байты как
// отдавал -- «Сохранить на телефон» из просмотрщика фото обязано
// получать оригинал, а не пережатую копию.
const MAX_RESIZE_WIDTH = 512;
const MIN_RESIZE_WIDTH = 16;

function parseWidth(raw: string | null): number | null {
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return Math.min(MAX_RESIZE_WIDTH, Math.max(MIN_RESIZE_WIDTH, Math.round(n)));
}

const MEDIA_URL_MAX_ATTEMPTS = 3;
const MEDIA_URL_RETRY_DELAY_MS = 300;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Strip anything that isn't safe inside a Content-Disposition filename
// (quotes/newlines could break the header) -- the name itself is just a
// courtesy for the saved file, never trusted for anything else.
function sanitizeFilename(name: string): string {
  return name.replace(/["\r\n]/g, "").slice(0, 200) || "download";
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ docId: string }> }) {
  const { docId } = await params;
  const fileReference = request.nextUrl.searchParams.get("ref");
  const size = request.nextUrl.searchParams.get("size") ?? "size-photo";
  const filename = sanitizeFilename(request.nextUrl.searchParams.get("filename") ?? docId);
  const width = parseWidth(request.nextUrl.searchParams.get("w"));

  if (!fileReference) {
    return NextResponse.json({ error: "missing ref" }, { status: 400 });
  }

  let lastErr: unknown;
  for (let attempt = 1; attempt <= MEDIA_URL_MAX_ATTEMPTS; attempt++) {
    try {
      const { downloadUrl } = await call<MediaGetUrlOutput>("media.getUrl", {
        fileId: docId,
        fileReference,
        size,
      });

      const upstream = await fetch(downloadUrl);
      if (!upstream.ok || !upstream.body) {
        throw new Error(`upstream fetch failed: ${upstream.status}`);
      }

      const upstreamType = upstream.headers.get("content-type") ?? "application/octet-stream";

      if (width && upstreamType.startsWith("image/")) {
        // Картинку приходится дочитать целиком, а не стримить: ресайз
        // без полного файла невозможен. Аватарки маленькие, а на
        // случай чего-то огромного сверху стоит ограничение.
        const input = Buffer.from(await upstream.arrayBuffer());
        try {
          const resized = await sharp(input)
            // rotate() без аргументов -- это не поворот, а применение
            // EXIF-ориентации: иначе фото с телефона приезжает боком.
            .rotate()
            .resize(width, width, { fit: "cover", position: "centre", withoutEnlargement: true })
            .webp({ quality: 80 })
            .toBuffer();
          return new NextResponse(new Uint8Array(resized), {
            status: 200,
            headers: {
              "Content-Type": "image/webp",
              // Короткое, но не нулевое: в пределах одной загрузки
              // страницы один и тот же аватар просят и <img>, и
              // прогрев кэша, и это должен быть один запрос.
              "Cache-Control": "private, max-age=300",
            },
          });
        } catch (resizeErr) {
          // Битый или неподдерживаемый формат -- отдаём как есть,
          // пусть тяжёлое, но рабочее. Байты уже в руках.
          console.error("[api/media/download] resize failed, serving original", resizeErr);
          return new NextResponse(new Uint8Array(input), {
            status: 200,
            headers: { "Content-Type": upstreamType, "Cache-Control": "private, no-store" },
          });
        }
      }

      return new NextResponse(upstream.body, {
        status: 200,
        headers: {
          "Content-Type": upstreamType,
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "private, no-store",
        },
      });
    } catch (err) {
      lastErr = err;
      if (attempt < MEDIA_URL_MAX_ATTEMPTS) {
        await sleep(MEDIA_URL_RETRY_DELAY_MS * attempt);
      }
    }
  }

  console.error(`[api/media/download] failed after ${MEDIA_URL_MAX_ATTEMPTS} attempts`, lastErr);
  return NextResponse.json({ error: "failed to resolve media" }, { status: 502 });
}
