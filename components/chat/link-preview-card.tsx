"use client";

// components/chat/link-preview-card.tsx
//
// Карточка превью ссылки под текстом сообщения (волна 4B), как
// chat_link_preview.dart в приложении: цветная полоса слева, сайт,
// заголовок (2 строки), описание (3 строки), справа квадрат 56 px или
// большая картинка сверху, если она широкая (>=300 px, 1.2:1). Нажатие
// открывает ссылку в новой вкладке. Пустое превью -- ничего не рисуем.
import { useEffect, useState } from "react";
import { authFetch } from "@/lib/auth-fetch";

type Data = { title: string | null; description: string | null; siteName: string | null; imageUrl: string | null };

const memo = new Map<string, Data | null>();
const inflight = new Map<string, Promise<Data | null>>();

function load(url: string): Promise<Data | null> {
  if (memo.has(url)) return Promise.resolve(memo.get(url) ?? null);
  let p = inflight.get(url);
  if (!p) {
    p = authFetch(`/api/link-preview?url=${encodeURIComponent(url)}`)
      .then((r) => r.json())
      .then((d: (Data & { ok?: boolean }) | null) => {
        const data = d && d.ok ? { title: d.title, description: d.description, siteName: d.siteName, imageUrl: d.imageUrl } : null;
        memo.set(url, data);
        return data;
      })
      .catch(() => {
        memo.set(url, null);
        return null;
      })
      .finally(() => inflight.delete(url));
    inflight.set(url, p);
  }
  return p;
}

const URL_RX = /https?:\/\/[^\s<>"')\]]+[^\s<>"')\].,;:!?]/i;

/** Первая подходящая ссылка в тексте (кроме наших собственных a1appp.com). */
export function previewUrlFor(text: string): string | null {
  const m = text.match(URL_RX);
  if (!m) return null;
  try {
    const host = new URL(m[0]).hostname.toLowerCase();
    if (host === "a1appp.com" || host.endsWith(".a1appp.com")) return null;
  } catch {
    return null;
  }
  return m[0];
}

function clean(s: string | null | undefined): string | null {
  const t = (s ?? "").replace(/\s+/g, " ").trim();
  return t ? t : null;
}

export function LinkPreviewCard({ url, mine }: { url: string; mine: boolean }) {
  const [data, setData] = useState<Data | null | undefined>(memo.has(url) ? memo.get(url) : undefined);
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | "bad" | null>(null);
  useEffect(() => {
    let cancelled = false;
    void load(url).then((d) => !cancelled && setData(d));
    return () => {
      cancelled = true;
    };
  }, [url]);
  useEffect(() => {
    setImgSize(null);
    const src = data?.imageUrl;
    if (!src) return;
    let cancelled = false;
    const img = new window.Image();
    img.onload = () => !cancelled && setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => !cancelled && setImgSize("bad");
    img.src = src;
    return () => {
      cancelled = true;
    };
  }, [data?.imageUrl]);
  if (!data) return null;
  let site: string | null = clean(data.siteName);
  if (!site) {
    try {
      site = new URL(url).hostname.replace(/^www\./, "");
    } catch {
      site = null;
    }
  }
  const title = clean(data.title);
  const desc = clean(data.description);
  const img = data.imageUrl && imgSize !== "bad" ? data.imageUrl : null;
  if (!title && !desc && !img) return null;
  const size = imgSize && imgSize !== "bad" ? imgSize : null;
  const large = !!img && !!size && size.w >= 300 && size.w / (size.h || 1) >= 1.2;
  const thumb = !!img && !large && !!size;
  const accent = mine ? "text-white" : "text-[#335ef7] dark:text-[#0c8ce9]";
  const bar = mine ? "border-white bg-white/15" : "border-[#335ef7] bg-[#335ef7]/10 dark:border-[#0c8ce9] dark:bg-[#0c8ce9]/10";
  const text = mine ? "text-white" : "text-[#262a34] dark:text-white";
  const texts = (
    <div className="min-w-0 flex-1">
      {site && <div className={`truncate text-[13px] font-semibold ${accent}`}>{site}</div>}
      {title && <div className={`line-clamp-2 text-[13px] font-semibold leading-[1.25] ${text}`}>{title}</div>}
      {desc && <div className={`line-clamp-3 text-[13px] leading-[1.25] ${text}`}>{desc}</div>}
    </div>
  );
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      data-testid="link-preview"
      onClick={(e) => e.stopPropagation()}
      className={`mt-1.5 mb-0.5 block overflow-hidden rounded-lg border-l-[3px] px-2.5 py-1.5 no-underline ${bar}`}
    >
      {thumb ? (
        <div className="flex items-start gap-2">
          {texts}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img!} alt="" referrerPolicy="no-referrer" className="h-14 w-14 shrink-0 rounded-md object-cover" />
        </div>
      ) : (
        <>
          {texts}
          {large && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img!} alt="" referrerPolicy="no-referrer" className="mt-1.5 max-h-52 w-full rounded-md object-cover" />
          )}
        </>
      )}
    </a>
  );
}
