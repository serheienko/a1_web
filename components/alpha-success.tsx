// components/alpha-success.tsx
//
// 09.10.2026 (Александр: «после Join Alpha в тесте тоже должна появляться
// анимация и All set… дубль приложения»). Port of the app's
// styled_premium_purchase_success_pop_up.dart: dimmed screen, frosted card,
// cat with the cup, «You are all set!», thanks, «Enjoy A1 Alpha», round
// «Continue», money rain over everything (plays once). No auto-close.
// Mounted on its own (not inside the Alpha window), because the window
// closes right when the purchase goes through.
"use client";

import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { LottiePlayer } from "@/components/lottie-player";
import { useActiveLocale } from "@/lib/use-active-locale";

type T9 = { uk: string; en: string; ru: string; de: string; es: string; fr: string; pl: string; ptBR: string; zh: string };
const S = {
  allSet: { uk: "Усе готово!", ru: "Всё готово!", en: "You are all set!", de: "Alles bereit!", es: "¡Todo listo!", fr: "Tout est prêt !", pl: "Wszystko gotowe!", ptBR: "Tudo pronto!", zh: "一切就绪！" },
  thanks: { uk: "Дякуємо за покупку!", ru: "Спасибо за покупку!", en: "Thank you for your purchase!", de: "Danke für Ihren Kauf!", es: "¡Gracias por su compra!", fr: "Merci pour votre achat !", pl: "Dziękujemy za zakup!", ptBR: "Obrigado pela compra!", zh: "感谢您的购买！" },
  enjoy: { uk: "Насолоджуйтеся A1 Alpha", ru: "Наслаждайтесь A1 Alpha", en: "Enjoy A1 Alpha features", de: "Viel Freude mit A1 Alpha", es: "Disfrute de A1 Alpha", fr: "Profitez d’A1 Alpha", pl: "Korzystaj z A1 Alpha", ptBR: "Aproveite o A1 Alpha", zh: "尽情享受 A1 Alpha" },
  cont: { uk: "Продовжити", ru: "Продолжить", en: "Continue", de: "Weiter", es: "Continuar", fr: "Continuer", pl: "Dalej", ptBR: "Continuar", zh: "继续" },
} satisfies Record<string, T9>;

function rainSize(): number {
  return typeof window === "undefined" ? 800 : Math.max(window.innerHeight, 600);
}
function rainColumns(): number {
  if (typeof window === "undefined") return 1;
  // One column is ~46% as wide as it is tall (375 x 812).
  return Math.max(1, Math.ceil(window.innerWidth / (rainSize() * 0.4)));
}

function AlphaSuccess({ onDone }: { onDone: () => void }) {
  const locale = useActiveLocale();
  const t = (v: T9) => (v as Record<string, string>)[locale] ?? v.en;
  const [shown, setShown] = useState(false);
  const [dark, setDark] = useState(false);
  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    const r = requestAnimationFrame(() => setShown(true));
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(r);
      document.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function close() {
    setShown(false);
    window.setTimeout(onDone, 250);
  }
  const text = dark ? "#4FEFFF" : "#1f2a5a";
  const accent = dark ? "#4FEFFF" : "#335ef7";
  return (
    <div className={`fixed inset-0 z-[260] transition-opacity duration-300 ${shown ? "opacity-100" : "opacity-0"}`}>
      <style>{`@keyframes alphaGrad{0%{background-position:0% 0%}50%{background-position:100% 100%}100%{background-position:0% 0%}}`}</style>
      <div className={`absolute inset-0 ${dark ? "bg-black/60" : "bg-black/45"}`} onClick={close} />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t(S.allSet)}
          className={`pointer-events-auto w-full max-w-[400px] rounded-[36px] border px-5 pb-6 pt-4 text-center backdrop-blur-[24px] transition duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${dark ? "border-white/[0.12]" : "border-white/90"} ${shown ? "scale-100" : "scale-75"}`}
          style={{
            background: dark
              ? "linear-gradient(160deg,rgba(52,71,124,.85),rgba(40,52,98,.85),rgba(30,33,66,.85),rgba(43,58,107,.85))"
              : "linear-gradient(160deg,rgba(255,255,255,.9),rgba(153,211,219,.9),rgba(255,255,255,.9),rgba(153,211,219,.9))",
            backgroundSize: "300% 300%",
            animation: "alphaGrad 8s ease-in-out infinite",
          }}
        >
          <div className="mx-auto grid h-[250px] w-[250px] place-items-center">
            <LottiePlayer src="/premium/wallet/cat_cup.json" size={250} placeholder={false} />
          </div>
          <div className="mt-5 text-[30px] font-bold uppercase leading-none tracking-wide" style={{ color: text, fontFamily: "Impact, 'Arial Narrow Bold', sans-serif" }}>
            {t(S.allSet)}
          </div>
          <div className="mt-3.5 text-[17px] font-semibold" style={{ color: text }}>{t(S.thanks)}</div>
          <div className={`text-[17px] font-bold ${dark ? "text-[#E6EA4B]" : "text-[#1fa54a]"}`}>{t(S.enjoy)}</div>
          <button
            type="button"
            onClick={close}
            className="mt-6 h-14 w-full rounded-[28px] border-[1.5px] text-[22px] uppercase tracking-wide transition active:scale-[0.97]"
            style={{ borderColor: accent, color: text, background: `${accent}1f`, fontFamily: "Impact, 'Arial Narrow Bold', sans-serif" }}
          >
            {t(S.cont)}
          </button>
        </div>
      </div>
      {/* Money rain over everything, once (like the app). The clip is a
          phone-shaped column, so on a wide screen several columns side by side. */}
      <div className="pointer-events-none absolute inset-0 flex justify-center overflow-hidden">
        {Array.from({ length: rainColumns() }, (_, i) => (
          <span key={i} className="flex shrink-0 justify-center" style={{ width: rainSize() * 0.4, marginTop: i % 2 ? "-8vh" : 0 }}>
            <LottiePlayer src="/premium/wallet/moneyrain.json" size={rainSize()} loop={false} placeholder={false} />
          </span>
        ))}
      </div>
    </div>
  );
}

/** Shows the «You are all set!» screen on top of the page. */
export function showAlphaSuccess() {
  if (typeof document === "undefined") return;
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  root.render(
    <AlphaSuccess
      onDone={() => {
        root.unmount();
        host.remove();
      }}
    />,
  );
}
