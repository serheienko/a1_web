// components/claim-company-prompt.tsx
//
// 2026-09-19 (Александр: «я компания, увидел своё объявление под не
// своим профилем — как мне его забрать?»). Вход в самостоятельный
// клейм прямо со страницы вакансии.
//
// Показывается только пока профиль автора не забран (WebPostAuthor.
// unclaimed). После передачи бэкенд снимает признак сам, и блок
// исчезает вместе с ним — отдельной уборки не нужно.
//
// Свёрнут по умолчанию: девяноста девяти посетителям из ста это не
// адресовано, и большая форма на странице вакансии мешала бы им читать.
"use client";

import { useEffect, useState } from "react";
import { useActiveLocale } from "@/components/claim-form";
import { ClaimForm } from "@/components/claim-form";
import { LottiePlayer } from "@/components/lottie-player";
import type { Locale } from "@/components/t";

const ASK: Record<Locale, string> = {
  uk: "Це ваша компанія?",
  en: "Is this your company?",
  ru: "Это ваша компания?",
  de: "Ist das Ihr Unternehmen?",
  es: "¿Es tu empresa?",
  fr: "C'est votre entreprise ?",
  pl: "To Twoja firma?",
  ptBR: "Esta é a sua empresa?",
  zh: "这是贵公司吗？",
};

const NOTE: Record<Locale, string> = {
  uk: "Вакансії зібрані автоматично, профіль ще нікому не належить. Підтвердьте робочу пошту — і він стане вашим разом з усіма відгуками.",
  en: "These vacancies were collected automatically and the profile belongs to nobody yet. Confirm a work email and it becomes yours, applications included.",
  ru: "Вакансии собраны автоматически, профиль ещё никому не принадлежит. Подтвердите рабочую почту — и он станет вашим вместе со всеми откликами.",
  de: "Diese Stellen wurden automatisch gesammelt, das Profil gehört noch niemandem. Bestätigen Sie eine Arbeits-E-Mail, und es gehört Ihnen — samt Bewerbungen.",
  es: "Estas vacantes se recopilaron automáticamente y el perfil aún no tiene dueño. Confirma un correo de trabajo y será tuyo, con las candidaturas incluidas.",
  fr: "Ces offres ont été collectées automatiquement et le profil n'appartient encore à personne. Confirmez un e-mail professionnel et il devient le vôtre, candidatures comprises.",
  pl: "Te oferty zebrano automatycznie, profil nie należy jeszcze do nikogo. Potwierdź służbowy e-mail, a stanie się Twój razem ze zgłoszeniami.",
  ptBR: "Estas vagas foram coletadas automaticamente e o perfil ainda não tem dono. Confirme um e-mail de trabalho e ele será seu, com as candidaturas incluídas.",
  zh: "这些职位是自动收集的，主页尚无归属。确认工作邮箱后，主页连同所有投递都归贵公司所有。",
};

const TAKE: Record<Locale, string> = {
  uk: "Забрати профіль",
  en: "Take the profile",
  ru: "Забрать профиль",
  de: "Profil übernehmen",
  es: "Reclamar el perfil",
  fr: "Récupérer le profil",
  pl: "Przejmij profil",
  ptBR: "Assumir o perfil",
  zh: "认领主页",
};

// Со страницы вакансии приходит postId, со страницы компании —
// username. Разница только в том, по чему сервер будет искать профиль:
// сам экран и правило одни и те же.
export type ClaimCompanyPromptProps = { postId: string } | { username: string };

export function ClaimCompanyPrompt(props: ClaimCompanyPromptProps) {
  const lang = useActiveLocale();
  const [open, setOpen] = useState(false);
  const [showCat, setShowCat] = useState(false);

  useEffect(() => {
    setShowCat(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  if (open) {
    return (
      <div className="mt-6">
        {"postId" in props ? <ClaimForm postId={props.postId} /> : <ClaimForm username={props.username} />}
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-start gap-3 sm:gap-4">
        {/* 2026-09-19 (Александр: «поставим кота слева, появление не резкое,
            через блюр, проиграть один раз, а в конце он садится и спит»).
            Всё это уже умеет components/lottie-player.tsx: он сам
            проявляет анимацию из blur(14px) за 320 мс, а loop={false}
            означает «сыграть один раз и замереть на последнем кадре» —
            то есть кот засыпает и таким остаётся.

            Кот появляется только после гидратации: до неё showCat false.
            Так решаются сразу две вещи — нет мигания при серверном
            рендере, и есть куда вставить проверку «уменьшить движение».
            С ней кота нет вовсе: трёхсекундная анимация человеку,
            который попросил систему не двигать картинки, ни к чему. */}
        {showCat && (
          <LottiePlayer src="/animations/cat-sleeping.json" size={80} loop={false} />
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink dark:text-neutral-100">{ASK[lang]}</p>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{NOTE[lang]}</p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-3 rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold text-ink transition hover:border-accent hover:text-accent dark:border-neutral-700 dark:text-neutral-100"
          >
            {TAKE[lang]}
          </button>
        </div>
      </div>
    </div>
  );
}
