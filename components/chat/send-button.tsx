// components/chat/send-button.tsx
//
// Кнопка отправки -- одна на весь сайт. 2026-09-16, Александр: «сделай
// норм стрелку с заливкой и ховером при наведении, и кстати в мини-чатах
// и обычных».
//
// До этого одна и та же кнопка была скопирована шесть раз: большой чат
// (поле ввода и расчёт), мини-чат (поле ввода и расчёт), голосовое
// сообщение и комментарии под вакансией. Копии, как водится, разъехались:
// у половины не было класса `group`, а без него не работает ни подсветка
// при наведении, ни подталкивание самой стрелки (`animate-send-arrow` в
// app/globals.css висит именно на `.group:hover`). То есть кнопка
// выглядела одинаково, а вела себя по-разному.
//
// Здесь только классы и глиф; размер и всё, что нужно конкретному месту
// (схлопывание ширины в мини-чате, например), остаётся на месте вызова.
"use client";

/**
 * Синяя заливка, подсветка и лёгкий подъём при наведении, нажатие --
 * чуть уменьшить. `group` обязателен: на нём держится анимация стрелки.
 * Размер НЕ задаётся -- его передаёт место вызова (h-9/h-11/36px...).
 */
export const SEND_BUTTON_CLASS =
  "group flex shrink-0 items-center justify-center rounded-full bg-[#335ef7] text-white shadow-sm transition-all duration-200 ease-out hover:brightness-110 hover:shadow-md active:scale-95 disabled:opacity-40 disabled:shadow-none disabled:hover:brightness-100 disabled:hover:shadow-none dark:bg-[#0c8ce9]";

/** Стрелка вверх. При наведении на кнопку подталкивается вверх же. */
export function SendArrowIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="animate-send-arrow shrink-0"
    >
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}
