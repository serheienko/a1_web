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

import { useEffect, useRef, useState } from "react";
import { useActiveLocale } from "@/lib/use-active-locale";
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


// 2026-09-19 (Александр: «при клике на кота — маленькое облачко
// „Meow“, штук пять текстов»). Намеренно НЕ переводятся: кошачьи звуки
// одинаковы на всех девяти языках сайта, а сорок пять переводов слова
// «мяу» — это ровно та работа, которой лучше не быть.
const MEOWS = ["Meow", "Mrrr", "Purr…", "Meow?", "Zzz…"];

// 2026-09-19 (Александр): звуки на тык. Порядок фиксированный и идёт по
// кругу: сначала фирменный сигнал A1, потом три мяуканья, а на пятый
// тык кот не выдерживает и лает. Файлы лежат в public/sounds, все
// пережаты в моно 96 kbps (8–27 КБ) — это меньше одной иконки, и
// грузятся они только после первого касания кота, а не при открытии
// страницы.
const CAT_SOUNDS = [
  "/sounds/a1-original.mp3",
  "/sounds/meow-1.mp3",
  "/sounds/meow-2.mp3",
  "/sounds/meow-3.mp3",
  "/sounds/bark.mp3",
] as const;
const BARK_INDEX = CAT_SOUNDS.length - 1;

// 2026-09-24 (Александр): на украинском сайте после лая кот продолжает
// говорить — восемь фраз голосом Александра, как в приложении. Только
// для uk: на остальных языках остаются пять звуков выше. Звук null —
// фраза без озвучки (сейчас таких нет).
// hold — сколько держать облачко: не меньше, чем звучит фраза.
// Длинная фраза разбита на две строки вручную (\n): при автопереносе
// облачко остаётся шириной во весь max-width и справа висит пустота;
// с явным переносом оно ровно по самой длинной строке.
type VoiceLine = { text: string; sound: string | null; hold: number; icon?: string };
const UK_VOICE_LINES: VoiceLine[] = [
  { text: "В тебе шо, підвищена\nтапальна активність?", sound: "/sounds/cat-tap-activity.mp3", hold: 3200 },
  { text: "Хм, зрозумів, зараз піду...", sound: "/sounds/cat-going.mp3", hold: 2700 },
  { text: "Або не піду...", sound: "/sounds/cat-not-going.mp3", hold: 1800 },
  { text: "Маєш піццу?", sound: "/sounds/cat-pizza.mp3", hold: 2000, icon: "/animations/cat-line-pizza.json" },
  { text: "А я маю птицу 😈", sound: "/sounds/cat-bird.mp3", hold: 2500, icon: "/animations/cat-line-bird.json" },
  { text: "Зовуть голуб, зі стікерпаку", sound: "/sounds/cat-pigeon.mp3", hold: 2700 },
  { text: "Ха ха ха хааааа", sound: "/sounds/cat-haha-1.mp3", hold: 1900 },
  { text: "Ха ха ха хааааа", sound: "/sounds/cat-haha-2.mp3", hold: 1900 },
];

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
  // Форма сначала рисуется закрытой и только следующим кадром получает
  // data-open="true" — иначе браузер применит открытое состояние сразу,
  // и переходу будет не от чего стартовать. Два кадра, а не один:
  // одного Safari хватает не всегда.
  const [formIn, setFormIn] = useState(false);
  const [asleep, setAsleep] = useState(false);
  const [meow, setMeow] = useState<string>(MEOWS[0] ?? "Meow");
  const [meowOn, setMeowOn] = useState(false);
  const [meowIcon, setMeowIcon] = useState<string | null>(null);
  const meowTimer = useRef<number | null>(null);
  const pokeCount = useRef(0);
  const catAudio = useRef<Map<string, HTMLAudioElement>>(new Map());

  // Каждый тык — новая фраза, и никогда та же, что висит сейчас:
  // повтор подряд читается как «кнопка не сработала».
  //
  // 2026-09-19 (Александр, запись экрана): «нажал один раз, а текст
  // потом перелистывается на другой». Причина: облачко рисовало
  // `meow ?? MEOWS[0]`, и по таймеру фраза обнулялась — ровно в момент
  // затухания подпись успевала смениться на запасную «Meow», то есть на
  // один клик кот мяукал дважды. Теперь текст и видимость разведены:
  // фраза остаётся прежней до следующего тыка, гаснет только
  // прозрачность. Один клик — одна фраза.
  function poke() {
    const cycle = CAT_SOUNDS.length + (lang === "uk" ? UK_VOICE_LINES.length : 0);
    const step = pokeCount.current % cycle;
    pokeCount.current = step + 1;
    let hold = 1800;
    const voice = step >= CAT_SOUNDS.length ? UK_VOICE_LINES[step - CAT_SOUNDS.length] : undefined;
    setMeowIcon(voice?.icon ?? null);
    if (voice) {
      if (voice.sound) playSrc(voice.sound);
      setMeow(voice.text);
      hold = voice.hold;
    } else if (step === BARK_INDEX) {
      playCatSound(step);
      // Лай — и подпись про лай: «Purr…» над гавкающим котом читалась бы
      // как рассинхрон звука и картинки.
      setMeow("Woof!");
    } else {
      playCatSound(step);
      setMeow((current) => {
        const shown = meowOn ? current : null;
        const choices = MEOWS.filter((phrase) => phrase !== shown);
        return choices[Math.floor(Math.random() * choices.length)] ?? MEOWS[0] ?? "Meow";
      });
    }
    setMeowOn(true);
    if (meowTimer.current !== null) window.clearTimeout(meowTimer.current);
    meowTimer.current = window.setTimeout(() => setMeowOn(false), hold);
  }

  // Звук заводим лениво и по одному объекту на файл: браузер сам держит
  // их в кэше, повторный тык стартует мгновенно. Любая осечка
  // (автоплей запрещён, файл не доехал, вкладка без звука) гасится
  // молча — из-за звука кот не должен ломаться.
  function playCatSound(step: number) {
    const src = CAT_SOUNDS[step];
    if (src) playSrc(src);
  }

  function playSrc(src: string) {
    try {
      let audio = catAudio.current.get(src);
      if (!audio) {
        audio = new Audio(src);
        audio.preload = "auto";
        audio.volume = 0.45;
        catAudio.current.set(src, audio);
      }
      audio.currentTime = 0;
      void audio.play().catch(() => {});
    } catch {
      // тишина вместо ошибки
    }
  }

  useEffect(
    () => () => {
      if (meowTimer.current !== null) window.clearTimeout(meowTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (!open) {
      setFormIn(false);
      return;
    }
    let second = 0;
    const first = window.requestAnimationFrame(() => {
      second = window.requestAnimationFrame(() => setFormIn(true));
    });
    return () => {
      window.cancelAnimationFrame(first);
      if (second) window.cancelAnimationFrame(second);
    };
  }, [open]);

  return (
    <div className="mt-3.5">
      {/* Карточка-приглашение и форма меняются местами не рывком:
          одна схлопывается, вторая раскрывается — см. .claim-reveal в
          app/globals.css. */}
      <div className="claim-reveal claim-reveal--headroom" data-open={open ? "false" : "true"} aria-hidden={open}>
        <div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
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
                середина карточки (items-center у строки выше).

                2026-09-19 (Александр: «полечить прыжок текста при появлении
                анимации»). Прыгало потому, что кота раньше не было в
                разметке до гидратации: он появлялся уже после первой
                отрисовки и раздвигал текст. Теперь место под него занято
                всегда — блок ровно 96px с первого кадра, а плеер просто
                проявляется внутри него.

                Проверку «уменьшить движение» пришлось перенести из
                JavaScript в CSS (motion-reduce:hidden) ровно по той же
                причине: любое решение, принятое после первой отрисовки,
                двигает вёрстку. CSS применяется сразу. */}
            <div className="relative h-[68px] w-[68px] shrink-0 -ml-4 motion-reduce:hidden">
              <LottiePlayer
                src="/animations/cat-sleeping.json"
                size={68}
                loop={false}
                placeholder={false}
                className="pointer-events-none"
                onComplete={() => setAsleep(true)}
              />
              {/* Нажимать можно не всего кота, а его правые 56px (left-3).
                  2026-09-19 (Александр, запись с iPhone: «нажимаю на кота —
                  скидывает на страницу назад»). Кот стоит вплотную к левой
                  рамке карточки, а это ~16px от края экрана — ровно та
                  полоса, где iOS ловит системный жест «назад». Палец
                  чуть-чуть ведёт вправо, и Safari уходит на предыдущую
                  страницу вместо клика. Сдвигаем не кота, а его зону
                  нажатия: она начинается в 28px от края экрана, дальше
                  системной полосы. Картинка при этом не сдвинулась ни на
                  пиксель. */}
              <button
                type="button"
                onClick={poke}
                tabIndex={open ? -1 : undefined}
                aria-label="Meow"
                className="absolute inset-y-0 left-3 right-0 cursor-pointer appearance-none bg-transparent p-0"
              />

              {/* Буквы «z» над котом — только после того, как анимация
                  доиграла и кот улёгся. Разные задержки и размеры делают
                  из трёх одинаковых букв ленивую очередь. */}
              {asleep && (
                <span aria-hidden="true" className="pointer-events-none absolute left-[42px] top-[6px]">
                  {[0, 1.2, 2.4].map((delay, i) => (
                    <span
                      key={delay}
                      className="animate-cat-snooze absolute font-semibold text-neutral-400 dark:text-neutral-500"
                      style={{
                        animationDelay: `${delay}s`,
                        fontSize: `${9 + i * 2}px`,
                        left: `${i * 3}px`,
                      }}
                    >
                      z
                    </span>
                  ))}
                </span>
              )}

              {/* Облачко живёт всегда, меняется только прозрачность —
                  так оно плавно появляется и уходит, а не возникает рывком
                  вместе с узлом.

                  Облачко специально торчит за левую рамку карточки на 14px:
                  справа оно налезало бы на заголовок. Вылет ровно 14px и не
                  больше — у страницы боковой отступ 16px, и всё, что шире,
                  утащило бы облачко за край экрана вместе с горизонтальной
                  прокруткой.

                  2026-09-19 (Александр, скриншот: «текст кота не выходит за
                  рамку попапа»). Обрезала не карточка, а обёртка плавного
                  появления: .claim-reveal > * обязана быть overflow:hidden,
                  иначе анимация высоты не работает. Лечится там же, в
                  app/globals.css: границу обрезки раздвинули на 16px в
                  стороны. Двигать само облачко не нужно. */}
              <span
                aria-hidden="true"
                className={
                  "pointer-events-none absolute bottom-[calc(100%+2px)] left-[-14px] w-max whitespace-pre-line leading-[1.3] rounded-xl border border-neutral-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-ink shadow-sm transition duration-150 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 " +
                  (meowOn ? "scale-100 opacity-100" : "scale-90 opacity-0")
                }
              >
                <span className="inline-flex items-center gap-1">
                  {meow}
                  {meowIcon && meowOn && (
                    <LottiePlayer key={meowIcon} src={meowIcon} size={16} placeholder={false} />
                  )}
                </span>
                {/* Хвостик на фиксированном месте над головой кота, а не у правого
                    края: длинные украинские фразы тянут облачко далеко вправо. */}
                <span className="absolute -bottom-1 left-[34px] h-2 w-2 rotate-45 border-b border-r border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800" />
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink dark:text-neutral-100">{ASK[lang]}</p>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{NOTE[lang]}</p>
              <button
                type="button"
                onClick={() => setOpen(true)}
                tabIndex={open ? -1 : undefined}
                className="mt-3 rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold text-ink transition hover:border-accent hover:text-accent dark:border-neutral-700 dark:text-neutral-100"
              >
                {TAKE[lang]}
              </button>
            </div>
          </div>
        </div>
        </div>
      </div>

      <div className="claim-reveal" data-open={formIn ? "true" : "false"}>
        <div>
          {open &&
            ("postId" in props ? <ClaimForm postId={props.postId} /> : <ClaimForm username={props.username} />)}
        </div>
      </div>
    </div>
  );
}
