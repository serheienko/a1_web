// components/profile-share.tsx
//
// 25.10.2026 (Александр: «профиль как ссылка "обо мне" везде»). Кнопка
// «Поділитися профілем» на СВОЁМ профиле: ссылка, QR-код и подсказка, куда
// её вставить (LinkedIn, отклики, подпись в почте и Telegram). Рядом с
// чужим профилем такой кнопки нет -- там свой ряд из четырёх кнопок
// (components/profile-action-row.tsx), а он для владельца пуст.
//
// Ссылка ведёт на jobs.a1appp.com/u/<ник>, а не на a1appp.com/userProfile:
// только здесь живёт личная карточка-превью (app/u/[username]/
// opengraph-image.tsx), ради которой всё и затевалось. Её же показываем
// в окне -- «вот так тебя увидят».
//
// Владельца узнаём так же, как components/edit-profile-button.tsx: через
// /api/account/whoami на клиенте (страница профиля кешируется и сессию не
// читает). Пока не ясно -- ничего не рисуем.
"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import qrcode from "qrcode-generator";
import type { Locale } from "@/components/t";
import { authFetch } from "@/lib/auth-fetch";
import { useActiveLocale } from "@/lib/use-active-locale";
import { backdropDismiss } from "@/lib/use-backdrop-dismiss";
import { profileHref } from "@/lib/profile-href";

const SITE_URL = "https://jobs.a1appp.com";

type Key =
  | "share" | "title" | "previewHint" | "copy" | "copied" | "copyFailed" | "qrHint" | "qrSave"
  | "whereTitle" | "whereLinkedin" | "whereApply" | "whereSign" | "sendElsewhere" | "close";

const S: Record<Key, Record<Locale, string>> = {
  share: { uk: "Поділитися профілем", en: "Share profile", ru: "Поделиться профилем", de: "Profil teilen", es: "Compartir perfil", fr: "Partager le profil", pl: "Udostępnij profil", ptBR: "Compartilhar perfil", zh: "分享资料" },
  title: { uk: "Профіль A1 замість резюме", en: "Your A1 profile instead of a CV", ru: "Профиль A1 вместо резюме", de: "A1-Profil statt Lebenslauf", es: "Tu perfil de A1 en lugar del CV", fr: "Votre profil A1 au lieu d'un CV", pl: "Profil A1 zamiast CV", ptBR: "Perfil A1 no lugar do currículo", zh: "用 A1 资料代替简历" },
  previewHint: { uk: "Так посилання виглядає в LinkedIn, Telegram і листах", en: "This is how the link looks in LinkedIn, Telegram and email", ru: "Так ссылка выглядит в LinkedIn, Telegram и письмах", de: "So sieht der Link in LinkedIn, Telegram und E-Mails aus", es: "Así se ve el enlace en LinkedIn, Telegram y el correo", fr: "Voici l'aperçu du lien dans LinkedIn, Telegram et les e-mails", pl: "Tak link wygląda w LinkedIn, Telegramie i mailach", ptBR: "Assim o link aparece no LinkedIn, Telegram e e-mail", zh: "链接在 LinkedIn、Telegram 和邮件中的样子" },
  copy: { uk: "Копіювати", en: "Copy", ru: "Копировать", de: "Kopieren", es: "Copiar", fr: "Copier", pl: "Kopiuj", ptBR: "Copiar", zh: "复制" },
  copied: { uk: "Скопійовано", en: "Copied", ru: "Скопировано", de: "Kopiert", es: "Copiado", fr: "Copié", pl: "Skopiowano", ptBR: "Copiado", zh: "已复制" },
  copyFailed: { uk: "Не вдалося скопіювати", en: "Couldn't copy", ru: "Не удалось скопировать", de: "Kopieren fehlgeschlagen", es: "No se pudo copiar", fr: "Copie impossible", pl: "Nie udało się skopiować", ptBR: "Não foi possível copiar", zh: "复制失败" },
  qrHint: { uk: "Наведіть камеру — відкриється профіль. Згодиться для резюме, бейджа чи слайда.", en: "Point a camera at it to open the profile. Handy for a badge, a slide or a printout.", ru: "Наведите камеру — откроется профиль. Пригодится для бейджа, слайда или распечатки.", de: "Mit der Kamera scannen, um das Profil zu öffnen. Praktisch für Badge, Folie oder Ausdruck.", es: "Apunta la cámara para abrir el perfil. Útil para una credencial, una diapositiva o un impreso.", fr: "Scannez avec l'appareil photo pour ouvrir le profil. Pratique pour un badge, une slide ou un document.", pl: "Zeskanuj aparatem, aby otworzyć profil. Przyda się na identyfikator, slajd lub wydruk.", ptBR: "Aponte a câmera para abrir o perfil. Útil em crachá, slide ou impresso.", zh: "用相机扫码即可打开资料，适合胸牌、幻灯片或打印件。" },
  qrSave: { uk: "Зберегти QR", en: "Save QR", ru: "Сохранить QR", de: "QR speichern", es: "Guardar QR", fr: "Enregistrer le QR", pl: "Zapisz QR", ptBR: "Salvar QR", zh: "保存二维码" },
  whereTitle: { uk: "Куди вставити", en: "Where to paste it", ru: "Куда вставить", de: "Wo einfügen", es: "Dónde pegarlo", fr: "Où le coller", pl: "Gdzie wkleić", ptBR: "Onde colar", zh: "粘贴到哪里" },
  whereLinkedin: { uk: "LinkedIn: Контактна інформація → Вебсайт", en: "LinkedIn: Contact info → Website", ru: "LinkedIn: Контактная информация → Веб-сайт", de: "LinkedIn: Kontaktinfo → Website", es: "LinkedIn: Información de contacto → Sitio web", fr: "LinkedIn : Coordonnées → Site web", pl: "LinkedIn: Informacje kontaktowe → Witryna", ptBR: "LinkedIn: Informações de contato → Site", zh: "LinkedIn：联系信息 → 网站" },
  whereApply: { uk: "Відгук на вакансію: поле Website або Portfolio", en: "Job applications: the Website or Portfolio field", ru: "Отклик на вакансию: поле Website или Portfolio", de: "Bewerbungen: Feld Website oder Portfolio", es: "Candidaturas: campo Website o Portfolio", fr: "Candidatures : champ Website ou Portfolio", pl: "Aplikacje: pole Website lub Portfolio", ptBR: "Candidaturas: campo Website ou Portfolio", zh: "求职申请：Website 或 Portfolio 字段" },
  whereSign: { uk: "Підпис у пошті, біо в Telegram та інших мережах", en: "Email signature, Telegram bio and other socials", ru: "Подпись в почте, био в Telegram и других сетях", de: "E-Mail-Signatur, Telegram-Bio und andere Netzwerke", es: "Firma del correo, bio de Telegram y otras redes", fr: "Signature e-mail, bio Telegram et autres réseaux", pl: "Podpis w mailu, bio w Telegramie i innych sieciach", ptBR: "Assinatura de e-mail, bio do Telegram e outras redes", zh: "邮件签名、Telegram 简介及其他社交平台" },
  sendElsewhere: { uk: "Надіслати…", en: "Send…", ru: "Отправить…", de: "Senden…", es: "Enviar…", fr: "Envoyer…", pl: "Wyślij…", ptBR: "Enviar…", zh: "发送…" },
  close: { uk: "Закрити", en: "Close", ru: "Закрыть", de: "Schließen", es: "Cerrar", fr: "Fermer", pl: "Zamknij", ptBR: "Fechar", zh: "关闭" },
};

function ShareIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className + " animate-share-lift"} aria-hidden="true">
      <path d="M12 15V3" />
      <path d="M7.5 7.5 12 3l4.5 4.5" />
      <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
    </svg>
  );
}

/** QR как один svg-путь: модули -> прямоугольники 1×1 (как в components/app-qr.tsx). */
function useQr(text: string): { path: string; size: number } {
  return useMemo(() => {
    const qr = qrcode(0, "M");
    qr.addData(text);
    qr.make();
    const n = qr.getModuleCount();
    let d = "";
    for (let y = 0; y < n; y++) {
      let x = 0;
      while (x < n) {
        if (!qr.isDark(y, x)) {
          x++;
          continue;
        }
        const start = x;
        while (x < n && qr.isDark(y, x)) x++;
        d += `M${start} ${y}h${x - start}v1h-${x - start}z`;
      }
    }
    return { path: d, size: n };
  }, [text]);
}

export function ProfileShare({ username, fullName }: { username: string; fullName: string }) {
  const lang = useActiveLocale();
  const [isOwner, setIsOwner] = useState(false);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<"idle" | "ok" | "fail">("idle");
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [previewLoaded, setPreviewLoaded] = useState(false);

  const url = `${SITE_URL}${profileHref(username)}`;
  const shownUrl = url.replace(/^https:\/\//, "").replace(/%2E/g, ".");
  const qr = useQr(url);

  useEffect(() => {
    let cancelled = false;
    authFetch("/api/account/whoami")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data?.ok && data.username === username) setIsOwner(true);
      })
      .catch(() => undefined);
    setCanNativeShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
    return () => {
      cancelled = true;
    };
  }, [username]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (copied === "idle") return;
    const t = window.setTimeout(() => setCopied("idle"), 2000);
    return () => window.clearTimeout(t);
  }, [copied]);

  if (!isOwner) return null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied("ok");
    } catch {
      setCopied("fail");
    }
  }

  async function nativeShare() {
    try {
      await navigator.share({ title: fullName, url });
    } catch {
      // Закрыли системное окно -- это не ошибка.
    }
  }

  // QR в PNG: рисуем тот же путь на холсте, с белыми полями, 1024 px.
  function saveQr() {
    const quiet = 2;
    const total = qr.size + quiet * 2;
    const px = 1024;
    const canvas = document.createElement("canvas");
    canvas.width = px;
    canvas.height = px;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, px, px);
    ctx.scale(px / total, px / total);
    ctx.translate(quiet, quiet);
    ctx.fillStyle = "#000";
    ctx.fill(new Path2D(qr.path));
    canvas.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `a1-${username}-qr.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }, "image/png");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-full border border-neutral-200 bg-white px-4 text-sm font-medium text-accent transition hover:bg-accent/5 active:scale-[0.99] dark:border-neutral-700 dark:bg-neutral-900"
      >
        <ShareIcon />
        <span>{S.share[lang]}</span>
      </button>

      {open &&
        createPortal(
          <div className="animate-backdrop-in fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" {...backdropDismiss(() => setOpen(false))}>
            <div
              role="dialog"
              aria-modal="true"
              aria-label={S.share[lang]}
              onClick={(e) => e.stopPropagation()}
              className="animate-modal-in flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-neutral-900"
            >
              <div className="flex items-center justify-between gap-2 px-5 pt-5">
                <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-neutral-900 dark:text-neutral-50">{S.title[lang]}</h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={S.close[lang]}
                  className="group/close flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-neutral-400 transition hover:bg-black/5 hover:text-neutral-900 active:scale-90 dark:hover:bg-white/10 dark:hover:text-neutral-50"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4 transition-transform duration-200 ease-out group-hover/close:rotate-90 motion-reduce:transition-none" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-3">
                {/* Превью -- та самая картинка, которую видят LinkedIn и Telegram. */}
                <div className="relative aspect-[1200/630] w-full overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800">
                  {!previewLoaded && <div className="absolute inset-0 animate-pulse bg-neutral-200 dark:bg-neutral-800" />}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`${profileHref(username)}/opengraph-image`}
                    alt=""
                    onLoad={() => setPreviewLoaded(true)}
                    className={"absolute inset-0 h-full w-full object-cover transition-opacity duration-300 " + (previewLoaded ? "opacity-100" : "opacity-0")}
                  />
                </div>
                <p className="mt-2 text-center text-xs text-neutral-500 dark:text-neutral-400">{S.previewHint[lang]}</p>

                {/* Ссылка + «Копіювати». */}
                <div className="mt-4 flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 py-1 pl-4 pr-1 dark:border-neutral-700 dark:bg-neutral-800/60">
                  <span className="min-w-0 flex-1 truncate text-sm text-neutral-700 dark:text-neutral-200">{shownUrl}</span>
                  <button
                    type="button"
                    onClick={copy}
                    className={
                      "flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold text-white transition hover:brightness-110 active:scale-95 " +
                      (copied === "fail" ? "bg-red-600" : "bg-[#335ef7] dark:bg-[#0c8ce9]")
                    }
                  >
                    {copied === "ok" && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                    {copied === "ok" ? S.copied[lang] : copied === "fail" ? S.copyFailed[lang] : S.copy[lang]}
                  </button>
                </div>

                {/* QR. Белая подложка всегда -- инвертированный QR читают не все камеры. */}
                <div className="mt-4 flex items-center gap-4 rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
                  <svg viewBox={`-2 -2 ${qr.size + 4} ${qr.size + 4}`} shapeRendering="crispEdges" className="h-28 w-28 shrink-0 rounded-lg" role="img" aria-label={`QR: ${shownUrl}`}>
                    <rect x="-2" y="-2" width={qr.size + 4} height={qr.size + 4} fill="#fff" />
                    <path fill="#000" d={qr.path} />
                  </svg>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] leading-snug text-neutral-600 dark:text-neutral-300">{S.qrHint[lang]}</p>
                    <button
                      type="button"
                      onClick={saveQr}
                      className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-full border border-neutral-200 px-3 text-[13px] font-medium text-neutral-700 transition hover:bg-neutral-50 active:scale-95 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
                        <path d="M12 3v12" />
                        <path d="M7.5 10.5 12 15l4.5-4.5" />
                        <path d="M5 21h14" />
                      </svg>
                      {S.qrSave[lang]}
                    </button>
                  </div>
                </div>

                {/* Куда вставить. */}
                <h3 className="mt-5 text-xs font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">{S.whereTitle[lang]}</h3>
                <ul className="mt-2 flex flex-col gap-2 text-[13px] text-neutral-700 dark:text-neutral-300">
                  {(["whereLinkedin", "whereApply", "whereSign"] as const).map((k, i) => (
                    <li key={k} className="flex items-start gap-2.5">
                      <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/10 text-[11px] font-semibold text-accent">{i + 1}</span>
                      <span>{S[k][lang]}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {canNativeShare && (
                <div className="border-t border-neutral-200 px-5 py-3 dark:border-neutral-800">
                  <button
                    type="button"
                    onClick={nativeShare}
                    className="group flex h-10 w-full items-center justify-center gap-2 rounded-full border border-neutral-200 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 active:scale-[0.99] dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
                  >
                    <ShareIcon />
                    {S.sendElsewhere[lang]}
                  </button>
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
