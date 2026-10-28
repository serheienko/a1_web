// components/cv-promo-strip.tsx -- строка «Потрібне резюме? Створіть безкоштовно» (28.10.2026).
// Ставим на страницы вакансий: живые ссылки изнутри сайта подсказывают Google,
// что /cv-builder важная страница, а кандидату перед откликом полезно резюме.
import Link from "next/link";
import { T } from "@/components/t";

export function CvPromoStrip({ className }: { className?: string }) {
  return (
    <Link
      href="/cv-builder"
      className={
        "group mt-8 flex items-center gap-4 rounded-2xl border border-neutral-200 bg-gradient-to-r from-[#335EF7]/[0.06] to-[#A63DF2]/[0.06] p-4 transition hover:border-[#6A4BF5]/40 dark:border-neutral-800 " +
        (className ?? "")
      }
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(125deg,#335EF7,#6A4BF5,#A63DF2)] text-white">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
          <path d="M14 3v5h5M9 13h6M9 17h4" />
        </svg>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-neutral-900 dark:text-neutral-50">
          <T uk="Потрібне резюме для відгуку?" en="Need a CV for this application?" ru="Нужно резюме для отклика?" de="Lebenslauf für die Bewerbung nötig?" es="¿Necesita un CV para postularse?" fr="Besoin d'un CV pour postuler ?" pl="Potrzebujesz CV do aplikacji?" ptBR="Precisa de um currículo para se candidatar?" zh="投递需要简历？" />
        </span>
        <span className="mt-0.5 block text-[13px] text-neutral-500 dark:text-neutral-400">
          <T uk="Конструктор резюме A1: безкоштовний PDF з QR-кодом на Ваш профіль" en="A1 CV builder: a free PDF with a QR code to your profile" ru="Конструктор резюме A1: бесплатный PDF с QR-кодом на Ваш профиль" de="A1 Lebenslauf-Generator: kostenloses PDF mit QR-Code zu Ihrem Profil" es="Creador de CV de A1: PDF gratis con código QR a su perfil" fr="Générateur de CV A1 : PDF gratuit avec QR vers votre profil" pl="Kreator CV A1: darmowy PDF z kodem QR do Twojego profilu" ptBR="Criador de currículo do A1: PDF grátis com QR para o seu perfil" zh="A1 简历制作：免费 PDF，带个人主页二维码" />
        </span>
      </span>
      <span className="shrink-0 text-[#6A4BF5] transition group-hover:translate-x-1" aria-hidden="true">→</span>
    </Link>
  );
}
