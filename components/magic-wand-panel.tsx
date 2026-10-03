"use client";

// components/magic-wand-panel.tsx
//
// Magic Wand в редакторе профиля (волна 5, 2026-10-03). Логика один в один
// с приложением (features/magic_wand), вид -- в стиле сайта:
//  * свёрнутая строка «Magic Wand» с переливающейся обводкой;
//  * по нажатию панель раскрывается: чипы-подсказки полей, поле для
//    рассказа (текстом), кнопка «Надіслати» / «Застосувати»;
//  * после первого разбора найденные чипы горят зелёным с крестиком,
//    ненайденные остаются серыми и по нажатию подсказывают, что сказать;
//    второй раз «отправить» с пустым полем = применить к форме;
//  * вокруг палочки кольцо с процентом заполнения.
// ИИ только раскладывает рассказ по полям, текст не переписывает; ничего
// не сохраняется, пока человек не нажмёт «Зберегти» в самом редакторе.
import { useRef, useState } from "react";
import { authFetch } from "@/lib/auth-fetch";
import type { Locale } from "@/components/t";
import {
  EMPTY_MAGIC_WAND_DATA,
  MAGIC_WAND_CHIPS,
  MAGIC_WAND_CHIP_COLOR,
  adoptMagicWandResult,
  magicWandFilledCount,
  removeMagicWandField,
  type MagicWandField,
  type MagicWandLocation,
  type MagicWandPanelData,
  type MagicWandPatch,
  type MagicWandResult,
} from "@/lib/a1/magic-wand";
import { magicWandText, type MagicWandStr } from "@/lib/a1/magic-wand-i18n";

const FIELD_LABEL: Partial<Record<MagicWandField, MagicWandStr>> = {
  name: "fieldName",
  bio: "fieldBio",
  industry: "fieldIndustry",
  education: "fieldEducation",
  companies: "fieldCompanies",
  hobbies: "fieldHobbies",
  skills: "fieldSkills",
  languages: "fieldLanguages",
  location: "fieldLocation",
};

function WandIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="mw-wand" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#FE4BA3" />
          <stop offset="1" stopColor="#247DFF" />
        </linearGradient>
      </defs>
      <path d="m4 20 11-11" stroke="url(#mw-wand)" strokeWidth="2.4" strokeLinecap="round" />
      <path d="m15.5 3.5.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2Zm4.5 7 .5 1.2 1.2.5-1.2.5-.5 1.2-.5-1.2-1.2-.5 1.2-.5.5-1.2ZM8 3.5l.5 1.2 1.2.5-1.2.5L8 6.9l-.5-1.2-1.2-.5 1.2-.5L8 3.5Z" fill="url(#mw-wand)" />
    </svg>
  );
}

/** Кольцо вокруг палочки: серая дорожка и дуга, зеленеет на 100%. */
function ProgressRing({ value, children }: { value: number; children: React.ReactNode }) {
  const size = 34;
  const w = 3;
  const r = (size - w) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.min(Math.max(value, 0), 1);
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }} role="img" aria-label={`${Math.round(v * 100)}%`} data-testid="magic-wand-ring">
      <svg width={size} height={size} className="absolute inset-0 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={w} className="stroke-neutral-200 dark:stroke-neutral-700" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={w}
          strokeLinecap="round"
          stroke={v >= 1 ? "#1fa54a" : "#8A59FF"}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          style={{ transition: "stroke-dashoffset 700ms cubic-bezier(.22,1,.36,1)" }}
        />
      </svg>
      <span className="relative flex items-center justify-center">{children}</span>
    </span>
  );
}

function Chip({
  label,
  suffix,
  color,
  filled,
  focused,
  shimmering,
  showRemove,
  clearLabel,
  onTap,
  onRemove,
  testId,
}: {
  label: string;
  suffix?: string;
  color: string;
  filled: boolean;
  focused: boolean;
  shimmering: boolean;
  showRemove: boolean;
  clearLabel: string;
  onTap?: () => void;
  onRemove: () => void;
  testId: string;
}) {
  const base = filled
    ? "bg-[#ddf3e3] text-[#007a15] dark:bg-[#11421a] dark:text-[#7be08f]"
    : "border border-dashed border-[#c6cde0] bg-[#f5f5f9] text-neutral-700 dark:border-[#3a3a3e] dark:bg-[#27272a] dark:text-neutral-200";
  return (
    <span
      data-testid={testId}
      data-state={filled ? "filled" : "missing"}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium ${base} ${focused ? "ring-2 ring-[#8A59FF]" : ""} ${shimmering ? "animate-pulse" : ""}`}
    >
      <button type="button" disabled={!onTap} onClick={onTap} className={`inline-flex items-center gap-1.5 ${onTap ? "cursor-pointer" : "cursor-default"}`}>
        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: filled ? "#1fa54a" : color }} />
        <span>
          {label}
          {suffix ? <span className="ml-1 opacity-60">{suffix}</span> : null}
        </span>
      </button>
      {filled && showRemove && (
        <button type="button" aria-label={clearLabel} data-testid={`${testId}-remove`} onClick={onRemove} className="-mr-1 flex h-4 w-4 items-center justify-center rounded-full text-[12px] leading-none opacity-70 hover:bg-black/10 hover:opacity-100 dark:hover:bg-white/10">
          ×
        </button>
      )}
    </span>
  );
}

export function MagicWandPanel({
  lang,
  onApply,
}: {
  lang: Locale;
  /** Применить найденное к форме редактора (ничего не сохраняет). */
  onApply: (patch: MagicWandPatch, location: MagicWandLocation) => void;
}) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<MagicWandPanelData>(EMPTY_MAGIC_WAND_DATA);
  const [focus, setFocus] = useState<MagicWandField | null>(null);
  const [text, setText] = useState("");
  const [hint, setHint] = useState<string | null>(null);
  const [working, setWorking] = useState<Set<MagicWandField>>(new Set());
  const [error, setError] = useState(false);
  const [applied, setApplied] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const tx = (key: MagicWandStr, vars?: Record<string, string | number>) => magicWandText(lang, key, vars);
  const isWorking = working.size > 0;
  const filledCount = magicWandFilledCount(data);
  const total = MAGIC_WAND_CHIPS.length;
  const canApply = data.hasResult && filledCount > 0 && !isWorking;
  const showApply = text.trim() === "" && canApply;
  const canSend = !isWorking && (text.trim() !== "" || canApply);

  async function send() {
    const story = text.trim();
    if (isWorking) return;
    if (!story) {
      if (canApply) {
        onApply(data.patch, data.location);
        setApplied(true);
        setOpen(false);
      }
      return;
    }
    setError(false);
    setApplied(false);
    const f = focus;
    setWorking(f ? new Set<MagicWandField>([f, ...MAGIC_WAND_CHIPS.filter((c) => data.chips[c]?.status !== "filled")]) : new Set(MAGIC_WAND_CHIPS));
    try {
      const res = await authFetch("/api/account/magic-wand", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: story, ...(f ? { focus: f } : {}), lang: lang === "ptBR" ? "pt" : lang }),
      });
      const body = (await res.json().catch(() => null)) as { ok?: boolean; result?: MagicWandResult } | null;
      if (!res.ok || !body?.ok || !body.result) throw new Error("failed");
      setData((prev) => adoptMagicWandResult(prev, body.result as MagicWandResult, f));
      setText("");
      setHint(null);
      setFocus(null);
    } catch {
      setError(true);
    } finally {
      setWorking(new Set());
    }
  }

  function tapChip(field: MagicWandField) {
    if (isWorking || !data.hasResult) return;
    if (focus === field) {
      setFocus(null);
      setText("");
      setHint(null);
      return;
    }
    const chip = data.chips[field];
    setFocus(field);
    setText(chip?.status === "filled" ? (chip.preview ?? "") : "");
    setHint(chip?.hint ?? null);
    setTimeout(() => textRef.current?.focus(), 0);
  }

  function removeChip(field: MagicWandField) {
    setData((prev) => removeMagicWandField(prev, field));
    if (focus === field) {
      setFocus(null);
      setText("");
      setHint(null);
    }
    setApplied(false);
  }

  const placeholder = hint ?? (data.hasResult ? tx("addMore") : tx("placeholder"));
  const ringValue = filledCount / total;

  return (
    <div data-testid="magic-wand" className="rounded-2xl">
      <style>{`@keyframes mwShift{0%{background-position:0% 50%}100%{background-position:200% 50%}}`}</style>
      {!open ? (
        <button
          type="button"
          data-testid="magic-wand-entry"
          onClick={() => setOpen(true)}
          className="w-full rounded-2xl p-[1.5px] text-left"
          style={{ background: "linear-gradient(90deg,#317AFF,#8A59FF,#EF51CE,#FD31BB,#04B8FF,#317AFF)", backgroundSize: "200% 100%", animation: "mwShift 6s linear infinite" }}
        >
          <span className="flex items-center gap-3 rounded-[14.5px] bg-white px-3 py-2.5 dark:bg-neutral-900">
            {data.hasResult ? (
              <ProgressRing value={ringValue}>
                <WandIcon className="h-[18px] w-[18px]" />
              </ProgressRing>
            ) : (
              <WandIcon className="h-6 w-6 shrink-0" />
            )}
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold text-neutral-900 dark:text-neutral-50">{tx("title")}</span>
              {data.hasResult && (
                <span className="block truncate text-[12.5px] text-neutral-500 dark:text-neutral-400">
                  {applied ? tx("filledHint") : tx("filled", { count: filledCount, total })}
                </span>
              )}
            </span>
          </span>
        </button>
      ) : (
        <div className="rounded-2xl p-[1.5px]" style={{ background: "linear-gradient(90deg,#317AFF,#8A59FF,#EF51CE,#FD31BB,#04B8FF,#317AFF)", backgroundSize: "200% 100%", animation: "mwShift 6s linear infinite" }}>
          <div className="flex flex-col gap-3 rounded-[14.5px] bg-white p-3 dark:bg-neutral-900" data-testid="magic-wand-panel">
            <div className="flex items-center gap-3">
              <ProgressRing value={data.hasResult ? ringValue : 0}>
                <WandIcon className="h-[18px] w-[18px]" />
              </ProgressRing>
              <span className="flex-1 text-[15px] font-semibold text-neutral-900 dark:text-neutral-50">{tx("title")}</span>
              {data.hasResult && (
                <span data-testid="magic-wand-filled" className="rounded-full bg-[#ddf3e3] px-2.5 py-1 text-[12px] font-medium text-[#007a15] dark:bg-[#11421a] dark:text-[#7be08f]">
                  {tx("filled", { count: filledCount, total })}
                </span>
              )}
              <button type="button" aria-label={tx("cancel")} onClick={() => setOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 hover:bg-black/5 dark:hover:bg-white/10">
                ✕
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {MAGIC_WAND_CHIPS.map((f) => {
                const key = FIELD_LABEL[f];
                return (
                  <Chip
                    key={f}
                    testId={`magic-wand-chip-${f}`}
                    label={key ? tx(key) : f}
                    suffix={f === "languages" || f === "skills" ? tx("levels") : undefined}
                    color={MAGIC_WAND_CHIP_COLOR[f] ?? "#8A59FF"}
                    filled={data.chips[f]?.status === "filled"}
                    focused={focus === f}
                    shimmering={working.has(f)}
                    showRemove={data.hasResult && !isWorking}
                    clearLabel={tx("clear")}
                    onTap={data.hasResult ? () => tapChip(f) : undefined}
                    onRemove={() => removeChip(f)}
                  />
                );
              })}
            </div>

            <textarea
              ref={textRef}
              data-testid="magic-wand-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={placeholder}
              rows={7}
              maxLength={20000}
              disabled={isWorking}
              className="min-h-[160px] w-full resize-y rounded-2xl bg-[#f2f2f7] px-3.5 py-3 text-[15px] text-neutral-900 outline-none placeholder:text-neutral-400 disabled:opacity-60 dark:bg-[#313136] dark:text-neutral-50"
            />

            {focus && data.chips[focus]?.note && <p className="text-[12.5px] text-amber-700 dark:text-amber-400">{data.chips[focus]?.note}</p>}
            {error && (
              <p data-testid="magic-wand-error" className="text-[13px] text-red-600 dark:text-red-400">
                {tx("failed")}
              </p>
            )}

            <div className="flex items-center justify-between gap-3">
              <span className="text-[12.5px] text-neutral-500 dark:text-neutral-400">{isWorking ? tx("reading") : ""}</span>
              <button
                type="button"
                data-testid={showApply ? "magic-wand-apply" : "magic-wand-send"}
                disabled={!canSend}
                onClick={() => void send()}
                className={`rounded-full px-5 py-2 text-[14px] font-semibold text-white transition disabled:opacity-40 ${showApply ? "bg-[#1fa54a] hover:bg-[#188a3d]" : "bg-[#335ef7] hover:bg-[#2a4fd6]"}`}
              >
                {showApply ? tx("apply") : tx("send")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
