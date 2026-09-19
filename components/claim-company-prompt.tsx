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

// 2026-09-19, второй заход по тексту (Александр: «для соискателя это
// отталкивающий фактор — он поймёт, что за объявлением никто не стоит»).
// Первая версия честно писала, что вакансии собраны автоматически и
// профиль ничей. Компании это объясняло хорошо, но читают карточку
// двое, и второму читателю такое знать незачем.
//
// Объяснение не потерялось: ровно тот же смысл стоит на СЛЕДУЮЩЕМ
// экране (components/claim-form.tsx, строка intro), а его видит только
// тот, кто нажал кнопку, — то есть сама компания. Здесь осталась
// выгода вместо признания: соискатель читает её как «у компании есть
// кабинет», компания — как приглашение.
const NOTE: Record<Locale, string> = {
  uk: "Керуйте вакансіями та спілкуйтеся з кандидатами від імені компанії.",
  en: "Manage your vacancies and talk to candidates as the company.",
  ru: "Управляйте вакансиями и общайтесь с кандидатами от имени компании.",
  de: "Verwalten Sie Ihre Stellen und sprechen Sie als Unternehmen mit Kandidaten.",
  es: "Gestiona tus vacantes y habla con los candidatos en nombre de la empresa.",
  fr: "Gerez vos offres et echangez avec les candidats au nom de l'entreprise.",
  pl: "Zarzadzaj ofertami i rozmawiaj z kandydatami w imieniu firmy.",
  ptBR: "Gerencie suas vagas e fale com os candidatos em nome da empresa.",
  zh: "\u4ee5\u516c\u53f8\u8eab\u4efd\u7ba1\u7406\u804c\u4f4d\u5e76\u4e0e\u5019\u9009\u4eba\u6c9f\u901a\u3002",
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
      <div className="flex items-center gap-2 sm:gap-3">
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
        {/* Кот прижат к левой рамке изнутри: -ml-4 ровно гасит padding
            карточки (p-4 = 16px), поэтому его левый край совпадает с
            линией обводки и наружу он не выходит. По вертикали —
            середина карточки (items-center у строки выше), как было в
            первой версии. */}
        {showCat && (
          <LottiePlayer
            src="/animations/cat-sleeping.json"
            size={96}
            loop={false}
            placeholder={false}
            className="-ml-4"
          />
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
