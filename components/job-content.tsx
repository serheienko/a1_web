// components/job-content.tsx
//
// 2026-09-14 (Александр, SEO-разбор). Раньше тело вакансии было одним
// <div className="whitespace-pre-wrap">{post.contentText}</div>: переносы
// есть, структуры нет. Здесь тот же текст, но разобранный на заголовки,
// списки и абзацы -- разбор и вся мотивация в lib/a1/job-content.ts.
//
// Серверный компонент, без клиентского JS: содержимое вакансии обязано
// быть в HTML сразу, иначе вся затея бессмысленна.
//
// Заголовки внутри текста -- настоящие <h2>. Это заголовки, которые
// НАПИСАЛ АВТОР («Що потрібно робити:», «Вимоги:»), то есть на каждой
// вакансии свои и со своими словами. Служебного заголовка вроде «Опис
// вакансії» тут намеренно нет: он был бы одинаковым на всех 1790
// страницах, то есть ровно тем шаблонным шумом, от которого мы уходим.

import { A1_SUMMARY_LABEL, guessLang, parseJobContent, splitA1Summary } from "@/lib/a1/job-content";
import { splitLinks } from "@/lib/a1/linkify";

// 2026-09-19 (Александр): «ссылка к самой вакансии не кликабельная,
// можем ли мы детектить». Адреса внутри текста становятся настоящими
// ссылками прямо на месте — переносить их в блок «Посилання» нельзя,
// там они потеряют смысл: «надішліть резюме на forms.gle/…» работает
// только рядом со своей фразой.
//
// Текст приходит с DOU, то есть снаружи. Поэтому разбор идёт кусками, а
// не через innerHTML: React экранирует каждый кусок сам, чужая разметка
// в страницу не попадёт. rel="nofollow ugc" — чтобы вес страницы не
// утекал по чужим ссылкам и чтобы спамные вакансии не становились
// способом накрутить свой сайт.
function Linked({ line }: { line: string }) {
  return (
    <>
      {splitLinks(line).map((part, i) =>
        part.kind === "text" ? (
          <span key={i}>{part.value}</span>
        ) : (
          <a
            key={i}
            href={part.href}
            target="_blank"
            rel="noopener noreferrer nofollow ugc"
            className="break-all text-accent hover:underline"
          >
            {part.label}
          </a>
        ),
      )}
    </>
  );
}

/** 01.10.2026 (Александр: «summary лучше в конец, перед блоком комментариев»):
 *  блок «A1 Summary» вынесен отдельно, страница вакансии ставит его перед комментариями. */
export function JobSummary({ text }: { text: string }) {
  const { summary } = splitA1Summary(text);
  if (!summary) return null;
  return (
    <aside className="mt-6 rounded-2xl border border-accent/20 bg-accent/5 px-4 py-3.5 text-[15px] leading-relaxed text-neutral-800 dark:text-neutral-200">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-accent">{A1_SUMMARY_LABEL}</p>
      <p lang={guessLang(summary)}>{summary}</p>
    </aside>
  );
}

export function JobContent({ text: fullText, hideSummary = false }: { text: string; hideSummary?: boolean }) {
  const { rest: text } = splitA1Summary(fullText);
  const blocks = parseJobContent(text);
  const summaryBlock = hideSummary ? null : <JobSummary text={fullText} />;

  // Пустой текст или текст, из которого ничего не разобралось -- ведём
  // себя как раньше, одним куском. Лучше показать как есть, чем ничего.
  if (blocks.length === 0) {
    return (
      <>
        {summaryBlock}
        <div className="mt-6 whitespace-pre-wrap text-neutral-700 dark:text-neutral-300">
          <Linked line={text} />
        </div>
      </>
    );
  }

  return (
    <>
    {summaryBlock}
    <div className="mt-6 flex flex-col gap-4 text-neutral-700 dark:text-neutral-300">
      {blocks.map((block, i) => {
        if (block.type === "heading") {
          return (
            <h2
              key={i}
              className="mt-2 text-[17px] font-semibold leading-snug text-neutral-900 first:mt-0 dark:text-neutral-50"
            >
              {block.text}
            </h2>
          );
        }

        if (block.type === "list") {
          return (
            <ul key={i} className="flex list-disc flex-col gap-1.5 pl-5 marker:text-neutral-300 dark:marker:text-neutral-600">
              {block.items.map((item, j) => (
                <li key={j}>
                  <Linked line={item} />
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={i}>
            {block.lines.map((line, j) => (
              // Мягкие переносы внутри одного абзаца сохраняем: в текстах
              // с DOU ими нередко разбит перечень без маркеров.
              <span key={j}>
                {j > 0 && <br />}
                <Linked line={line} />
              </span>
            ))}
          </p>
        );
      })}
    </div>
    </>
  );
}
