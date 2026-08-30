// components/avatar-edit-button.tsx
//
// 2026-08-30, live-testing feedback: "Возле аватара тоже добавь таку
// штуку для редагування, щоб можна було швидко поміняти, або підвантажити.
// Зроби це ще окремим додатковим полем-модалкою біля фото." — a small
// pencil badge on the avatar itself, opening a lightweight modal scoped
// to JUST the avatar photo, separate from the full profile editor
// (components/profile-editor.tsx) that already has a whole Photos
// section. Deliberately its own small dialog rather than a shortcut into
// the big one — the ask was for something faster than opening the full
// editor just to swap one photo.
//
// 2026-08-30 follow-up, separate live-testing feedback item ("додай
// можливість кадрувати/центрувати фото аватарки, а не просто заливати
// як є"): the original version of this file uploaded the picked file
// completely unmodified — whatever crop/aspect the source photo already
// had is what everyone would see as a circular avatar, with no way to
// re-center a face that wasn't already dead-center in a roughly-square
// photo. This adds a real crop step between picking the file and
// uploading it: drag-to-reposition plus a zoom slider over a square
// viewport, cropped to a real square PNG/JPEG via <canvas> BEFORE
// compressImage/upload ever see it — so the two-step upload flow, the
// bootstrap-then-patch-photos[0] logic, and everything after "pick a
// file" is completely unchanged; only what gets handed to that pipeline
// is now the cropped result instead of the raw file.
//
// 2026-08-30 follow-up, live-testing feedback: "Нажатие на edit должно
// сразу открывать подгрузку фото" — the pencil badge used to open a
// small modal with its own "Завантажити нове фото" button, which then
// had to be clicked AGAIN to actually open the OS file picker. That
// extra step is gone: the pencil button itself triggers the hidden
// file input directly, so this modal never appears at all until a file
// has actually been picked (at which point it shows the crop step,
// see the comment above this).
//
// Same whoami-gating trick as components/edit-profile-button.tsx (this
// file's own sibling) — renders nothing until it's confirmed to be the
// signed-in visitor's own profile.
//
// Bootstraps via the SAME GET /api/account/profile-editor/bootstrap the
// full editor uses, rather than inventing a narrower endpoint: the write
// side (POST .../update) sends `photos` as a full array (account.
// updateProfile has no "just replace index 0" shape), so avoiding data
// loss on photos[1]/[2] means first reading the visitor's current full
// photos array, same as the big dialog already has to.
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LOCALES, LOCALE_CLASS, type Locale } from "@/components/t";

const MAX_PHOTO_BYTES = 300 * 1024;
const MAX_PHOTO_DIMENSION = 1600;

// Crop viewport: a CROP_SIZE x CROP_SIZE square shown on screen (small
// enough to fit the existing max-w-xs modal with room for the zoom
// slider below it). OUTPUT_SIZE is the resolution the crop is actually
// rendered to before handing it to compressImage — comfortably above
// any real display size for a profile avatar, and compressImage's own
// MAX_PHOTO_DIMENSION(1600)/MAX_PHOTO_BYTES stepping still runs
// afterwards exactly as before, so this doesn't bypass that budget.
const CROP_SIZE = 260;
const OUTPUT_SIZE = 640;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

type StringKey =
  | "editPhoto" | "uploading" | "uploadFailed" | "loadFailed" | "close"
  | "adjustPhoto" | "zoomLabel" | "save" | "back";

const STRINGS: Record<StringKey, Record<Locale, string>> = {
  editPhoto: {
    uk: "Змінити фото профілю", en: "Change profile photo", ru: "Изменить фото профиля",
    de: "Profilfoto ändern", es: "Cambiar foto de perfil", fr: "Changer la photo de profil",
    pl: "Zmień zdjęcie profilowe", ptBR: "Alterar foto do perfil", zh: "更换头像",
  },
  uploading: { uk: "Завантаження…", en: "Uploading…", ru: "Загрузка…", de: "Wird hochgeladen…", es: "Subiendo…", fr: "Envoi…", pl: "Przesyłanie…", ptBR: "Enviando…", zh: "上传中…" },
  uploadFailed: { uk: "Не вдалося завантажити фото", en: "Couldn't upload photo", ru: "Не удалось загрузить фото", de: "Foto-Upload fehlgeschlagen", es: "No se pudo subir la foto", fr: "Échec de l'envoi de la photo", pl: "Nie udało się przesłać zdjęcia", ptBR: "Não foi possível enviar a foto", zh: "照片上传失败" },
  loadFailed: { uk: "Не вдалося завантажити профіль", en: "Couldn't load your profile", ru: "Не удалось загрузить профиль", de: "Profil konnte nicht geladen werden", es: "No se pudo cargar el perfil", fr: "Impossible de charger le profil", pl: "Nie udało się załadować profilu", ptBR: "Não foi possível carregar o perfil", zh: "无法加载资料" },
  close: { uk: "Закрити", en: "Close", ru: "Закрыть", de: "Schließen", es: "Cerrar", fr: "Fermer", pl: "Zamknij", ptBR: "Fechar", zh: "关闭" },
  adjustPhoto: { uk: "Кадрування фото", en: "Crop photo", ru: "Кадрирование фото", de: "Foto zuschneiden", es: "Recortar foto", fr: "Recadrer la photo", pl: "Kadrowanie zdjęcia", ptBR: "Cortar foto", zh: "裁剪照片" },
  zoomLabel: { uk: "Масштаб", en: "Zoom", ru: "Масштаб", de: "Zoom", es: "Zoom", fr: "Zoom", pl: "Powiększenie", ptBR: "Zoom", zh: "缩放" },
  save: { uk: "Зберегти", en: "Save", ru: "Сохранить", de: "Speichern", es: "Guardar", fr: "Enregistrer", pl: "Zapisz", ptBR: "Salvar", zh: "保存" },
  back: { uk: "Назад", en: "Back", ru: "Назад", de: "Zurück", es: "Atrás", fr: "Retour", pl: "Wstecz", ptBR: "Voltar", zh: "返回" },
};

function t(key: StringKey, lang: Locale): string {
  return STRINGS[key][lang];
}

function useActiveLocale(): Locale {
  const [lang, setLang] = useState<Locale>("uk");
  useEffect(() => {
    const root = document.documentElement;
    const active = LOCALES.find((l) => root.classList.contains(LOCALE_CLASS[l]));
    if (active) setLang(active);
  }, []);
  return lang;
}

function isNotSignedIn(data: unknown): boolean {
  return typeof data === "object" && data !== null && (data as { message?: unknown }).message === "not_signed_in";
}

// Verbatim approach from components/profile-editor.tsx's own compressImage
// (same constants) — kept as a separate small copy rather than an import
// since profile-editor.tsx doesn't export it and this button needs to
// keep working even when the big dialog isn't mounted at all.
async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || typeof createImageBitmap !== "function") return file;
  try {
    const bitmap = await createImageBitmap(file);
    let { width, height } = bitmap;
    if (width > MAX_PHOTO_DIMENSION || height > MAX_PHOTO_DIMENSION) {
      const scale = MAX_PHOTO_DIMENSION / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    let blob: Blob | null = null;
    let quality = 0.85;
    for (let i = 0; i < 6; i++) {
      blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
      if (!blob || blob.size <= MAX_PHOTO_BYTES || quality <= 0.35) break;
      quality -= 0.15;
    }
    if (!blob) return file;
    const base = file.name.replace(/\.\w+$/, "") || "photo";
    return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  }
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  );
}

// Point in the SOURCE image's own natural-pixel space that should sit at
// the exact center of the CROP_SIZE x CROP_SIZE viewport, at zoom=1
// (i.e. baseScale, the smallest scale that still fully covers the
// square — same "cover" fit <img> would use). Tracking the crop as "one
// centered point + a zoom factor" (rather than a top-left offset) is
// what makes the zoom-slider math trivial: the center point never has
// to move just because the zoom level changed, only the visible radius
// around it does.
type CropCenter = { x: number; y: number };

export function AvatarEditButton({ username, className }: { username: string; className?: string }) {
  const lang = useActiveLocale();
  const router = useRouter();
  const [isOwner, setIsOwner] = useState(false);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Crop step state. previewUrl is an object URL for the just-picked
  // file, revoked on every transition away from it (new pick, cancel,
  // or unmount) so repeated picks don't leak blob URLs.
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [center, setCenter] = useState<CropCenter | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  // Plain ref, not state — updated on every pointermove while dragging,
  // and dragging itself doesn't need to trigger its own re-render.
  const dragRef = useRef<{ pointerId: number; lastX: number; lastY: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/account/whoami")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data?.ok && data.username === username) setIsOwner(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [username]);

  // Revoke the object URL whenever it's replaced or this component goes
  // away, regardless of which of the several exit paths (cancel, save,
  // pick-a-different-file, close-the-whole-modal) got there.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  if (!isOwner) return null;

  function baseScaleFor(w: number, h: number): number {
    return CROP_SIZE / Math.min(w, h);
  }

  function clampAxis(value: number, dimension: number, halfViewportInNatural: number): number {
    // Valid range for the centered point on this axis is [halfViewport,
    // dimension - halfViewport] — center can't be so close to an edge
    // that the viewport would have to show empty space past it. When
    // halfViewport > dimension/2 (only possible at z === MIN_ZOOM, on
    // whichever axis ISN'T the "cover" axis — i.e. the one with room to
    // spare) that range is inverted; min-of-the-pair/max-of-the-pair
    // un-inverts it into a single point at the exact center, which is
    // exactly the desired "no drag freedom on this axis" behavior
    // rather than a NaN or a backwards clamp.
    const lower = Math.min(halfViewportInNatural, dimension - halfViewportInNatural);
    const upper = Math.max(halfViewportInNatural, dimension - halfViewportInNatural);
    return Math.min(Math.max(value, lower), upper);
  }

  function clampCenter(c: CropCenter, w: number, h: number, z: number): CropCenter {
    const totalScale = baseScaleFor(w, h) * z;
    const halfViewportInNatural = CROP_SIZE / 2 / totalScale;
    return {
      x: clampAxis(c.x, w, halfViewportInNatural),
      y: clampAxis(c.y, h, halfViewportInNatural),
    };
  }

  function handleImageLoad() {
    const img = imgRef.current;
    if (!img) return;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    setNaturalSize({ w, h });
    setZoom(MIN_ZOOM);
    setCenter(clampCenter({ x: w / 2, y: h / 2 }, w, h, MIN_ZOOM));
  }

  function onZoomChange(nextZoom: number) {
    setZoom(nextZoom);
    // Re-clamp (not re-center) on every zoom change: the point already
    // centered in the viewport stays centered, only the radius of
    // natural-space pixels visible around it shrinks/grows — the whole
    // point of tracking the crop as "a centered point" (see CropCenter's
    // own comment) rather than a top-left offset.
    if (naturalSize) {
      setCenter((c) => (c ? clampCenter(c, naturalSize.w, naturalSize.h, nextZoom) : c));
    }
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!naturalSize) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragRef.current = { pointerId: e.pointerId, lastX: e.clientX, lastY: e.clientY };
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId || !naturalSize) return;
    const dx = e.clientX - drag.lastX;
    const dy = e.clientY - drag.lastY;
    dragRef.current = { pointerId: e.pointerId, lastX: e.clientX, lastY: e.clientY };
    const totalScale = baseScaleFor(naturalSize.w, naturalSize.h) * zoom;
    setCenter((c) => {
      if (!c) return c;
      // Dragging the photo to the right should reveal more of its left
      // side, i.e. the natural-space point centered in the viewport
      // moves left — hence subtracting, not adding, the screen-space
      // delta (converted to natural-space via the current scale).
      const next = { x: c.x - dx / totalScale, y: c.y - dy / totalScale };
      return clampCenter(next, naturalSize.w, naturalSize.h, zoom);
    });
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === e.pointerId) dragRef.current = null;
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setNaturalSize(null);
    setCenter(null);
    setPreviewUrl(URL.createObjectURL(file));
    // 2026-08-30, live-testing feedback ("нажатие на edit должно сразу
    // открывать подгрузку фото"): the pencil button now jumps straight to
    // the OS file picker (skipping the old "click here to upload" landing
    // step inside this modal), so the modal itself only ever needs to
    // open once a file has actually been picked -- opening it here, right
    // after previewUrl is set, is what makes the crop step appear at all.
    setOpen(true);
  }

  function cancelCrop() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setNaturalSize(null);
    setCenter(null);
    setZoom(MIN_ZOOM);
  }

  async function confirmCrop() {
    const img = imgRef.current;
    if (!img || !naturalSize || !center) return;
    setError(null);
    setUploading(true);
    try {
      const totalScale = baseScaleFor(naturalSize.w, naturalSize.h) * zoom;
      const sourceSize = CROP_SIZE / totalScale;
      const sourceX = center.x - sourceSize / 2;
      const sourceY = center.y - sourceSize / 2;

      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no-2d-context");
      ctx.drawImage(img, sourceX, sourceY, sourceSize, sourceSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
      if (!blob) throw new Error("crop-failed");
      const croppedFile = new File([blob], "avatar.jpg", { type: "image/jpeg" });

      await uploadCroppedFile(croppedFile);
    } catch {
      setError(t("uploadFailed", lang));
      setUploading(false);
    }
  }

  async function uploadCroppedFile(file: File) {
    try {
      // 1. Read the visitor's current full photos array first — the
      // write side has no "just replace the avatar" shape, only a full
      // `photos` array, so photos[1]/[2] (if any) would otherwise be
      // silently dropped by this "quick edit" affordance.
      const bootstrapRes = await fetch("/api/account/profile-editor/bootstrap");
      const bootstrapData = await bootstrapRes.json().catch(() => ({ ok: false }));
      if (!bootstrapRes.ok || !bootstrapData.ok) {
        if (isNotSignedIn(bootstrapData)) {
          window.location.href = "/sign-in?reason=edit-profile";
          return;
        }
        setError(t("loadFailed", lang));
        return;
      }
      const existingPhotos = (bootstrapData.profile?.photos ?? []) as { fileReference: string }[];

      // 2. Compress (the crop above already downsized to OUTPUT_SIZE,
      // but compressImage's own byte-size stepping still applies, same
      // as every other photo upload in this app) + two-step upload,
      // identical flow to profile-editor.tsx.
      const compressed = await compressImage(file);
      const createRes = await fetch("/api/upload/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mimetype: compressed.type || "application/octet-stream", bytes: compressed.size }),
      });
      const createData = await createRes.json();
      if (!createRes.ok || !createData.ok || !createData.result?.url) {
        if (isNotSignedIn(createData)) {
          window.location.href = "/sign-in?reason=edit-profile";
          return;
        }
        setError(t("uploadFailed", lang));
        return;
      }
      const { id, url, fields } = createData.result as { id: string; url: string; fields: Record<string, string> };
      const formData = new FormData();
      for (const [key, value] of Object.entries(fields ?? {})) formData.append(key, value);
      formData.append("file", compressed);
      const uploadRes = await fetch(url, { method: "POST", body: formData });
      if (!uploadRes.ok) {
        setError(t("uploadFailed", lang));
        return;
      }
      const confirmRes = await fetch("/api/upload/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ documentId: id }),
      });
      const confirmData = await confirmRes.json();
      if (!confirmRes.ok || !confirmData.ok) {
        if (isNotSignedIn(confirmData)) {
          window.location.href = "/sign-in?reason=edit-profile";
          return;
        }
        setError(t("uploadFailed", lang));
        return;
      }
      const newDoc = confirmData.media as { fileReference: string };

      // 3. New photo becomes the avatar (index 0) — the rest of the
      // existing array (if any) follows it, unchanged.
      const nextPhotos = [{ fileReference: newDoc.fileReference }, ...existingPhotos.slice(1 /* drop old index 0 */).map((p) => ({ fileReference: p.fileReference }))];
      // If there WAS no existing photo at all, existingPhotos.slice(1) on
      // an empty array is still just [], so nextPhotos is correctly just
      // the one new photo either way.

      const updateRes = await fetch("/api/account/profile-editor/update", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ photos: nextPhotos }),
      });
      const updateData = await updateRes.json().catch(() => ({ ok: false }));
      if (!updateRes.ok || !updateData.ok) {
        if (isNotSignedIn(updateData)) {
          window.location.href = "/sign-in?reason=edit-profile";
          return;
        }
        setError(t("uploadFailed", lang));
        return;
      }

      setOpen(false);
      cancelCrop();
      window.dispatchEvent(new Event("a1:profile-saved"));
      router.refresh();
    } catch {
      setError(t("uploadFailed", lang));
    } finally {
      setUploading(false);
    }
  }

  // Current display geometry for the <img> inside the crop viewport —
  // derived straight from state on every render rather than kept as its
  // own state, so there's exactly one source of truth (center + zoom +
  // naturalSize) and nothing to fall out of sync.
  let imgStyle: React.CSSProperties | undefined;
  if (naturalSize && center) {
    const totalScale = baseScaleFor(naturalSize.w, naturalSize.h) * zoom;
    const width = naturalSize.w * totalScale;
    const height = naturalSize.h * totalScale;
    const left = CROP_SIZE / 2 - center.x * totalScale;
    const top = CROP_SIZE / 2 - center.y * totalScale;
    imgStyle = { position: "absolute", left, top, width, height, maxWidth: "none" };
  }

  return (
    <>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        aria-label={t("editPhoto", lang)}
        title={t("editPhoto", lang)}
        className={
          "flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-neutral-900/80 text-white shadow-sm transition hover:bg-neutral-900 dark:border-black " +
          (className ?? "")
        }
      >
        <PencilIcon />
      </button>
      {/* Always mounted (not just while the crop modal is open) so the
          pencil button above can trigger it directly on click, with no
          intermediate "now click here to actually pick a file" step. */}
      <input ref={fileInputRef} type="file" accept="image/*" onChange={onPickFile} className="hidden" />
      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
          onClick={() => {
            if (uploading) return;
            setOpen(false);
            cancelCrop();
          }}
        >
          <div
            className="w-full max-w-xs rounded-2xl bg-white p-5 shadow-xl dark:bg-neutral-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                {/* The modal only ever opens once a file has been picked
                    (see onPickFile's setOpen(true) call above), so
                    previewUrl is always set here -- no landing-step title
                    to fall back to anymore. */}
                {t("adjustPhoto", lang)}
              </h2>
              <button
                type="button"
                onClick={() => {
                  if (uploading) return;
                  setOpen(false);
                  cancelCrop();
                }}
                aria-label={t("close", lang)}
                className="text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50"
              >
                ×
              </button>
            </div>

            {/* This modal only ever mounts once a file has been picked
                (see onPickFile's setOpen(true) call), so previewUrl is
                always set by the time we get here -- no more "click here
                to pick a file" landing branch. */}
            <div className="flex flex-col items-center gap-3">
              {/* Square crop viewport: drag to reposition, wheel/slider
                  to zoom. `touch-none` stops the browser's own
                  scroll/pan gesture from fighting the pointer-drag
                  handlers below on mobile. `overflow-hidden` is what
                  actually crops the oversized <img> to this square. */}
              <div
                ref={viewportRef}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                className="relative touch-none select-none overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800"
                style={{ width: CROP_SIZE, height: CROP_SIZE, cursor: naturalSize ? "grab" : "default" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- object-URL preview, not a real remote asset next/image would help with */}
                <img
                  ref={imgRef}
                  src={previewUrl ?? undefined}
                  alt=""
                  draggable={false}
                  onLoad={handleImageLoad}
                  style={imgStyle}
                />
              </div>

              <div className="flex w-full items-center gap-2">
                <span className="shrink-0 text-xs text-neutral-500 dark:text-neutral-400">{t("zoomLabel", lang)}</span>
                <input
                  type="range"
                  min={MIN_ZOOM}
                  max={MAX_ZOOM}
                  step={0.01}
                  value={zoom}
                  disabled={!naturalSize}
                  onChange={(e) => onZoomChange(Number(e.target.value))}
                  className="flex-1 accent-accent"
                />
              </div>

              <div className="flex w-full gap-2">
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => {
                    // 2026-08-30: with the old "pick a file" landing step
                    // gone, there's nothing left for this button to go
                    // "back" to inside the modal -- cancelCrop() alone
                    // used to just clear previewUrl and fall through to
                    // that landing view. Now it has to close the modal
                    // too, same as the × button; the pencil re-opens the
                    // file picker fresh if the visitor wants to try again.
                    setOpen(false);
                    cancelCrop();
                  }}
                  className="flex-1 rounded-full border border-neutral-300 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50 disabled:opacity-60 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  {t("back", lang)}
                </button>
                <button
                  type="button"
                  disabled={uploading || !naturalSize}
                  onClick={confirmCrop}
                  className="flex-1 rounded-full bg-accent py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                >
                  {uploading ? t("uploading", lang) : t("save", lang)}
                </button>
              </div>
            </div>
            {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
          </div>
        </div>
      )}
    </>
  );
}
