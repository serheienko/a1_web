// components/photo-crop-modal.tsx
//
// 2026-08-30, live-testing feedback: "При подгрузке фото должен
// открываться редактор с центрированием" — reported against the main
// Photos section (components/profile-editor.tsx, "up to 3 photos"),
// which used to upload whatever file was picked completely unmodified,
// same gap components/avatar-edit-button.tsx had before ITS OWN crop
// step was added (see that file's own 2026-08-30 follow-up comment).
// This is the same drag-to-reposition + zoom-slider + <canvas> crop,
// pulled out into its own component so the Photos section can use it too
// without a second hand-copied implementation of the crop math.
//
// Deliberately NOT wired into avatar-edit-button.tsx as well — that file
// already has its own working, independently-verified copy of this exact
// logic (circular viewport, single-avatar upload pipeline); swapping it
// over to this component is a separate refactor with its own regression
// risk, not something this feedback item asked for. So for now there are
// two copies of the same crop math in this codebase — this one and
// avatar-edit-button's — which isn't ideal, but is the lower-risk choice
// today. If a THIRD crop use ever comes up, that's the point to actually
// migrate avatar-edit-button.tsx onto this shared component instead of
// letting a third copy happen.
"use client";

import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/components/t";

// Square viewport shown on screen — the Photos section's own thumbnails
// are square (rounded-xl, not circular like the avatar), so this crops
// to a square too, unlike avatar-edit-button's circular viewport.
const CROP_SIZE = 280;
const OUTPUT_SIZE = 800;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

type StringKey = "title" | "zoomLabel" | "save" | "cancel" | "close";

const STRINGS: Record<StringKey, Record<Locale, string>> = {
  title: { uk: "Кадрування фото", en: "Crop photo", ru: "Кадрирование фото", de: "Foto zuschneiden", es: "Recortar foto", fr: "Recadrer la photo", pl: "Kadrowanie zdjęcia", ptBR: "Cortar foto", zh: "裁剪照片" },
  zoomLabel: { uk: "Масштаб", en: "Zoom", ru: "Масштаб", de: "Zoom", es: "Zoom", fr: "Zoom", pl: "Powiększenie", ptBR: "Zoom", zh: "缩放" },
  save: { uk: "Зберегти", en: "Save", ru: "Сохранить", de: "Speichern", es: "Guardar", fr: "Enregistrer", pl: "Zapisz", ptBR: "Salvar", zh: "保存" },
  cancel: { uk: "Скасувати", en: "Cancel", ru: "Отмена", de: "Abbrechen", es: "Cancelar", fr: "Annuler", pl: "Anuluj", ptBR: "Cancelar", zh: "取消" },
  close: { uk: "Закрити", en: "Close", ru: "Закрыть", de: "Schließen", es: "Cerrar", fr: "Fermer", pl: "Zamknij", ptBR: "Fechar", zh: "关闭" },
};

function t(key: StringKey, lang: Locale): string {
  return STRINGS[key][lang];
}

// Point in the SOURCE image's own natural-pixel space that sits at the
// exact center of the CROP_SIZE x CROP_SIZE viewport at zoom=1 — same
// "centered point + zoom factor" tracking as avatar-edit-button.tsx's own
// CropCenter (see that file's comment for why this makes the zoom-slider
// math trivial).
type CropCenter = { x: number; y: number };

export function PhotoCropModal({
  file,
  lang,
  confirming,
  error,
  onCancel,
  onConfirm,
}: {
  file: File;
  lang: Locale;
  confirming: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: (cropped: File) => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [center, setCenter] = useState<CropCenter | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<{ pointerId: number; lastX: number; lastY: number } | null>(null);

  // New object URL whenever `file` changes (a fresh pick), revoked on
  // every transition away from it so repeated picks don't leak blob URLs.
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setNaturalSize(null);
    setCenter(null);
    setZoom(MIN_ZOOM);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function baseScaleFor(w: number, h: number): number {
    return CROP_SIZE / Math.min(w, h);
  }

  function clampAxis(value: number, dimension: number, halfViewportInNatural: number): number {
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
      const next = { x: c.x - dx / totalScale, y: c.y - dy / totalScale };
      return clampCenter(next, naturalSize.w, naturalSize.h, zoom);
    });
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === e.pointerId) dragRef.current = null;
  }

  function handleSave() {
    const img = imgRef.current;
    if (!img || !naturalSize || !center) return;
    const totalScale = baseScaleFor(naturalSize.w, naturalSize.h) * zoom;
    const sourceSize = CROP_SIZE / totalScale;
    const sourceX = center.x - sourceSize / 2;
    const sourceY = center.y - sourceSize / 2;

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, sourceX, sourceY, sourceSize, sourceSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const base = file.name.replace(/\.\w+$/, "") || "photo";
        onConfirm(new File([blob], `${base}.jpg`, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.92,
    );
  }

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
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
      onClick={() => {
        if (!confirming) onCancel();
      }}
    >
      <div className="w-full max-w-xs rounded-2xl bg-white p-5 shadow-xl dark:bg-neutral-900" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">{t("title", lang)}</h2>
          <button
            type="button"
            onClick={() => {
              if (!confirming) onCancel();
            }}
            aria-label={t("close", lang)}
            className="text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50"
          >
            ×
          </button>
        </div>

        <div className="flex flex-col items-center gap-3">
          {/* Square (not circular) viewport, to match this section's own
              square photo thumbnails -- `touch-none` stops the browser's
              own scroll/pan gesture from fighting the pointer-drag
              handlers on mobile, `overflow-hidden` is what actually crops
              the oversized <img> to this square. */}
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className="relative touch-none select-none overflow-hidden rounded-2xl bg-neutral-100 dark:bg-neutral-800"
            style={{ width: CROP_SIZE, height: CROP_SIZE, cursor: naturalSize ? "grab" : "default" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- object-URL preview, not a real remote asset next/image would help with */}
            <img ref={imgRef} src={previewUrl ?? undefined} alt="" draggable={false} onLoad={handleImageLoad} style={imgStyle} />
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
              disabled={confirming}
              onClick={onCancel}
              className="flex-1 rounded-full border border-neutral-300 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50 disabled:opacity-60 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              {t("cancel", lang)}
            </button>
            <button
              type="button"
              disabled={confirming || !naturalSize}
              onClick={handleSave}
              className="flex-1 rounded-full bg-accent py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {t("save", lang)}
            </button>
          </div>
        </div>
        {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </div>
  );
}
