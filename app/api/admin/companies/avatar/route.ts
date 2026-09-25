// app/api/admin/companies/avatar/route.ts
//
// 25.09.2026 (Александр, профиль /u/whitebit: «Поставьте только быка в
// центр аватара»). Логотип компании можно было поменять ровно одним
// способом -- войти на сайт ПОД САМОЙ компанией и нажать карандаш у
// аватара (components/avatar-edit-button.tsx). Для ~525 автосозданных
// компаний это 525 входов с паролем, и у почти всех сейчас в аватаре
// сплющенная плашка с надписью вместо знака.
//
// Здесь тот же самый путь, но от имени компании действует СЕРВЕР: он
// уже умеет это для постов и ссылки-клейма (lib/a1/admin-act-as.ts,
// getAdminActAsToken -- логинится сохранёнными данными технического
// аккаунта). Пароли не покидают сервер и не проходят через браузер,
// как и в соседних админских ручках.
//
// Шаги ровно те же четыре, что делает кнопка у аватара в профиле:
//   1. прочитать текущий profile.photos (account.updateProfile с пустым
//      телом отдаёт профиль -- так же читает bootstrap редактора);
//   2. upload.create -> куда и с какими полями заливать;
//   3. POST самого файла на выданный адрес;
//   4. upload.confirm -> fileReference, и account.updateProfile с новым
//      photos, где новый снимок стоит нулевым (нулевой и есть аватар),
//      а остальные сохраняются -- иначе «быстрая замена логотипа»
//      молча стирала бы photos[1..] компании.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readSession } from "@/lib/a1/session";
import { isAdminEmail } from "@/lib/admin-access";
import { getAdminActAsToken, UnknownAccountError } from "@/lib/a1/admin-act-as";
import { call, A1ApiError } from "@/lib/a1/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Заливка файла через два обращения к бэкенду плюс сам POST картинки --
// дольше обычной ручки, но заметно короче лимита.
export const maxDuration = 60;

// 4 МБ: аватар -- это квадрат в пару сотен пикселей, всё сверх этого
// означает, что прислали не то. Ограничение стоит и здесь, а не только
// в панели, потому что ручка доступна и напрямую.
const MAX_BYTES = 4 * 1024 * 1024;

const Input = z.object({
  /** Почта технического аккаунта компании (из /api/admin/companies). */
  email: z.string().trim().min(3),
  mimetype: z.string().trim().min(1),
  /** Сам файл. base64 -- чтобы ручка осталась обычным JSON, как соседние. */
  dataBase64: z.string().min(1),
});

type UploadTarget = { id: string; url: string; fields?: Record<string, string> };

export async function POST(request: NextRequest) {
  const session = await readSession();
  if (!isAdminEmail(session?.email ?? null)) {
    return NextResponse.json({ ok: false, message: "not_found" }, { status: 404 });
  }

  const parsed = Input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "invalid_input" }, { status: 400 });
  }
  if (!/^image\//.test(parsed.data.mimetype)) {
    return NextResponse.json({ ok: false, message: "not_an_image" }, { status: 400 });
  }

  const bytes = Buffer.from(parsed.data.dataBase64, "base64");
  if (bytes.byteLength === 0) {
    return NextResponse.json({ ok: false, message: "empty_file" }, { status: 400 });
  }
  if (bytes.byteLength > MAX_BYTES) {
    return NextResponse.json({ ok: false, message: "too_large" }, { status: 413 });
  }

  // Какой из четырёх шагов упал -- иначе в ответе только голое
  // "500: Internal server error" и гадать приходится по коду.
  let step = "login";
  try {
    const accessToken = await getAdminActAsToken(parsed.data.email);

    // 1. Текущие снимки профиля -- чтобы заменить только нулевой.
    step = "read-profile";
    const profile = await call<{ photos?: { fileReference?: string }[] }>(
      "account.updateProfile",
      {},
      { accessToken },
    );
    const existing = Array.isArray(profile?.photos) ? profile.photos : [];

    // 2. Куда заливать.
    step = "upload-create";
    const target = await call<UploadTarget>(
      "upload.create",
      { mimetype: parsed.data.mimetype, bytes: bytes.byteLength },
      { accessToken },
    );
    if (!target?.url || !target?.id) {
      return NextResponse.json({ ok: false, message: "upload_not_offered" }, { status: 502 });
    }

    // 3. Сам файл. Форма ровно та же, что собирает браузер в
    //    avatar-edit-button.tsx: сначала поля из ответа, файл последним.
    const form = new FormData();
    for (const [key, value] of Object.entries(target.fields ?? {})) form.append(key, value);
    form.append("file", new Blob([new Uint8Array(bytes)], { type: parsed.data.mimetype }), "avatar");
    step = "upload-put";
    const put = await fetch(target.url, { method: "POST", body: form });
    if (!put.ok) {
      console.error("[api/admin/companies/avatar] storage rejected the file:", put.status);
      return NextResponse.json({ ok: false, message: "storage_rejected", debug: String(put.status) }, { status: 502 });
    }

    // 4. Подтвердить и поставить нулевым снимком.
    step = "upload-confirm";
    const media = await call<{ fileReference?: string }>(
      "upload.confirm",
      { documentId: target.id },
      { accessToken },
    );
    if (!media?.fileReference) {
      return NextResponse.json({ ok: false, message: "confirm_without_reference" }, { status: 502 });
    }
    const photos = [
      { fileReference: media.fileReference },
      ...existing
        .slice(1)
        .map((p) => p?.fileReference)
        .filter((ref): ref is string => typeof ref === "string" && ref.length > 0)
        .map((fileReference) => ({ fileReference })),
    ];
    step = "write-profile";
    await call("account.updateProfile", { photos }, { accessToken });

    return NextResponse.json({ ok: true, fileReference: media.fileReference, photos: photos.length });
  } catch (err) {
    if (err instanceof UnknownAccountError) {
      return NextResponse.json({ ok: false, message: "unknown_account" }, { status: 404 });
    }
    // Как в соседних админских ручках: за проверкой isAdminEmail можно
    // вернуть настоящую причину -- логи Vercel Александр не читает.
    const debug =
      err instanceof A1ApiError
        ? `${err.httpStatus}: ${(err.detail ?? err.body).slice(0, 300)}`
        : err instanceof Error
          ? err.message.slice(0, 300)
          : null;
    if (err instanceof A1ApiError) {
      console.error("[api/admin/companies/avatar] failed:", err.httpStatus, err.body.slice(0, 500));
    } else {
      console.error("[api/admin/companies/avatar] unexpected error:", err);
    }
    return NextResponse.json({ ok: false, message: "failed", step, debug }, { status: 500 });
  }
}
