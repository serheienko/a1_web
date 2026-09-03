// components/daily-uploads-modal.tsx
//
// 2026-09-02, Aleksandr (native-app "Daily Uploads" screenshot -- big
// "94 KB / 20 MB" figure, a progress bar, "Available again in 3m", and a
// Files/Available legend with dots + percentages), follow-up question
// "как ты UI отрисуешь? Надо чтобы попапы +- совпадали с мобом, + был
// прогресс бар и тд": the actual visible screen for the quota that
// app/api/upload/create/route.ts and app/api/upload/usage/route.ts
// already surface (9d888ec / 5c26a00) as raw numbers. This is the popup
// that turns those numbers into the same picture mobile shows.
//
// Three things confirmed with Aleksandr before building this (his own
// AskUserQuestion answers, all "Рекомендую"):
//  1. The reference screenshot's bar is ~99.5% filled at only 0.5% used
//     -- that's not a plain "used" bar (which would look almost empty),
//     it's a stacked bar where the AVAILABLE remainder is what dominates
//     the fill. Built here as a real segmented bar: one flex-basis
//     segment per non-zero used category (colored) plus a flex-1 grey
//     segment for whatever's left -- which is why it reads as "mostly
//     grey" exactly like the screenshot whenever usage is small, without
//     being a literal inversion of what a storage bar normally means.
//  2. Entry point is the small stack/disk icon in the chat attach
//     popover's top-right corner (app/chats/[chatId]/page.tsx), same
//     spot the reference screenshot shows it -- not wired into
//     post-editor/profile-editor/avatar-edit-button's own quota-banner
//     text yet, that was explicitly deferred.
//  3. The legend breaks down all three of the backend's usedByType
//     buckets (image/video/others) instead of collapsing to the
//     screenshot's literal single "Files" row, so it stays accurate once
//     someone's usage actually spans more than one media type.
//
// Self-contained modal (fetches its own data), following this codebase's
// established modal shell (see components/photo-crop-modal.tsx's own
// header comment on why avatar-edit-button.tsx's copy wasn't merged with
// it): a plain "backdrop + centered rounded-2xl card" rather than a
// dedicated <dialog>, same as every other modal in this app.
"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/components/t";
import { authFetch } from "@/lib/auth-fetch";
import { formatBytes, formatRelativeTime } from "@/lib/format";
import type { MediaUploadUsage } from "@/lib/a1/schemas";

type StringKey =
  | "title" | "close" | "loading" | "loadFailed" | "retry"
  | "resetsIn" | "photos" | "videos" | "files" | "available";

const STRINGS: Record<StringKey, Record<Locale, string>> = {
  title: { uk: "Щоденні завантаження", en: "Daily Uploads", ru: "Дневная загрузка", de: "Tägliche Uploads", es: "Subidas diarias", fr: "Téléversements quotidiens", pl: "Dzienne przesyłanie", ptBR: "Envios diários", zh: "每日上传" },
  close: { uk: "Закрити", en: "Close", ru: "Закрыть", de: "Schließen", es: "Cerrar", fr: "Fermer", pl: "Zamknij", ptBR: "Fechar", zh: "关闭" },
  loading: { uk: "Завантаження…", en: "Loading…", ru: "Загрузка…", de: "Wird geladen…", es: "Cargando…", fr: "Chargement…", pl: "Ładowanie…", ptBR: "Carregando…", zh: "加载中…" },
  loadFailed: { uk: "Не вдалося завантажити дані", en: "Couldn't load usage data", ru: "Не удалось загрузить данные", de: "Daten konnten nicht geladen werden", es: "No se pudieron cargar los datos", fr: "Impossible de charger les données", pl: "Nie udało się wczytać danych", ptBR: "Não foi possível carregar os dados", zh: "无法加载数据" },
  retry: { uk: "Спробувати ще раз", en: "Try again", ru: "Повторить", de: "Erneut versuchen", es: "Reintentar", fr: "Réessayer", pl: "Spróbuj ponownie", ptBR: "Tentar novamente", zh: "重试" },
  resetsIn: { uk: "Знову доступно через", en: "Available again in", ru: "Снова доступно через", de: "Wieder verfügbar in", es: "Disponible de nuevo en", fr: "Disponible à nouveau dans", pl: "Znów dostępne za", ptBR: "Disponível novamente em", zh: "将于以下时间后恢复" },
  photos: { uk: "Фото", en: "Photos", ru: "Фото", de: "Fotos", es: "Fotos", fr: "Photos", pl: "Zdjęcia", ptBR: "Fotos", zh: "照片" },
  videos: { uk: "Відео", en: "Videos", ru: "Видео", de: "Videos", es: "Videos", fr: "Vidéos", pl: "Filmy", ptBR: "Vídeos", zh: "视频" },
  files: { uk: "Файли", en: "Files", ru: "Файлы", de: "Dateien", es: "Archivos", fr: "Fichiers", pl: "Pliki", ptBR: "Arquivos", zh: "文件" },
  available: { uk: "Доступно", en: "Available", ru: "Доступно", de: "Verfügbar", es: "Disponible", fr: "Disponible", pl: "Dostępne", ptBR: "Disponível", zh: "可用" },
};

function t(key: StringKey, lang: Locale): string {
  return STRINGS[key][lang];
}

// One row's worth of the legend + segmented-bar data. Colors deliberately
// distinct from each other and from the neutral grey "available" segment
// -- reuses this app's own blue accent for photos since that's already
// the color the paperclip menu's own Photo row uses
// (components/chat/icons.tsx's ChatPhotoAttachIcon), so the same media
// type reads the same color in both places.
const CATEGORY_COLOR: Record<"image" | "video" | "others", string> = {
  image: "bg-[#335ef7] dark:bg-[#0c8ce9]",
  video: "bg-violet-500 dark:bg-violet-400",
  others: "bg-teal-500 dark:bg-teal-400",
};

function formatPercent(value: number, total: number): string {
  if (total <= 0) return "0%";
  const raw = (value / total) * 100;
  const rounded = Math.round(raw * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}%` : `${rounded.toFixed(1)}%`;
}

export function DailyUploadsModal({ lang, onClose }: { lang: Locale; onClose: () => void }) {
  const [usage, setUsage] = useState<MediaUploadUsage | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(false);
      try {
        const res = await authFetch("/api/upload/usage");
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || !data.ok || !data.usage) {
          setError(true);
        } else {
          setUsage(data.usage as MediaUploadUsage);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const categories: Array<{ key: "image" | "video" | "others"; label: string; bytes: number }> = usage
    ? [
        { key: "image", label: t("photos", lang), bytes: usage.usedByType.image },
        { key: "video", label: t("videos", lang), bytes: usage.usedByType.video },
        { key: "others", label: t("files", lang), bytes: usage.usedByType.others },
      ]
    : [];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">{t("title", lang)}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close", lang)}
            className="text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50"
          >
            ×
          </button>
        </div>

        {/* 2026-09-03 (Aleksandr, live screenshot: "Тут вместо слова
            'завантаження' показывай скелетон лоад") -- same animate-
            pulse gray-block language this app's other loading states
            already use, shaped like the two real blocks below: the big
            usage-summary card (total line + segmented bar + reset
            line) and the per-category breakdown list (dot + label +
            byte count, one row per category plus the "available" row,
            see this file's own `categories` + the trailing available
            row below -- 4 rows total). */}
        {loading && (
          <div className="flex flex-col gap-3" aria-hidden="true">
            <div className="rounded-2xl bg-neutral-100 p-4 dark:bg-neutral-800">
              <div className="h-5 w-32 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
              <div className="mt-3 h-2.5 w-full animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-700" />
              <div className="mt-2 h-3 w-40 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
            </div>
            <div className="flex flex-col gap-3 rounded-2xl bg-neutral-100 p-4 dark:bg-neutral-800">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-neutral-300 dark:bg-neutral-600" />
                    <span className="h-3.5 w-24 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                  </span>
                  <span className="h-3.5 w-12 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center gap-3 py-8">
            <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">{t("loadFailed", lang)}</p>
            <button
              type="button"
              onClick={() => {
                setError(false);
                setLoading(true);
                authFetch("/api/upload/usage")
                  .then((res) => res.json())
                  .then((data) => {
                    if (data.ok && data.usage) setUsage(data.usage as MediaUploadUsage);
                    else setError(true);
                  })
                  .catch(() => setError(true))
                  .finally(() => setLoading(false));
              }}
              className="rounded-full bg-neutral-100 px-4 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
            >
              {t("retry", lang)}
            </button>
          </div>
        )}

        {!loading && !error && usage && (
          <div className="flex flex-col gap-3">
            <div className="rounded-2xl bg-neutral-100 p-4 dark:bg-neutral-800">
              <div className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                {formatBytes(usage.usedBytes)} / {formatBytes(usage.limitBytes)}
              </div>
              {/* Segmented bar: one flex-none colored slice per non-zero
                  used category, plus a flex-1 grey slice for whatever's
                  left -- see this file's header comment for why the grey
                  "available" slice is deliberately the dominant one
                  whenever usage is small, matching the reference
                  screenshot without inverting what the bar means. */}
              <div className="mt-3 flex h-2.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                {categories
                  .filter((c) => c.bytes > 0)
                  .map((c) => (
                    <div
                      key={c.key}
                      className={`h-full ${CATEGORY_COLOR[c.key]}`}
                      style={{ flex: `0 0 ${(c.bytes / usage.limitBytes) * 100}%` }}
                    />
                  ))}
                <div className="h-full flex-1 bg-neutral-400 dark:bg-neutral-500" />
              </div>
              <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                {t("resetsIn", lang)} {formatRelativeTime(new Date(usage.resetAt * 1000), lang)}
              </div>
            </div>

            <div className="flex flex-col gap-2.5 rounded-2xl bg-neutral-100 p-4 dark:bg-neutral-800">
              {categories.map((c) => (
                <div key={c.key} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-neutral-700 dark:text-neutral-200">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${CATEGORY_COLOR[c.key]}`} />
                    {c.label} {formatPercent(c.bytes, usage.limitBytes)}
                  </span>
                  <span className="tabular-nums text-neutral-500 dark:text-neutral-400">{formatBytes(c.bytes)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-neutral-700 dark:text-neutral-200">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-neutral-400 dark:bg-neutral-500" />
                  {t("available", lang)} {formatPercent(usage.remainingBytes, usage.limitBytes)}
                </span>
                <span className="tabular-nums text-neutral-500 dark:text-neutral-400">
                  {formatBytes(usage.remainingBytes)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
