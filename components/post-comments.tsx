// components/post-comments.tsx
//
// Комментарии под вакансией -- список. 2026-09-16.
//
// Серверный компонент, как и components/related-jobs.tsx, и по той же
// причине: комментарии должны быть в HTML. Это единственный текст на
// странице вакансии, которого нет у источника (сам текст вакансии мы
// парсим слово в слово), поэтому прятать его за клиентской загрузкой
// значило бы выбросить ровно то, ради чего он ценен для поиска.
//
// Что здесь НЕТ и появится следующими шагами (план согласован с
// Александром): поле ввода, наліпки/гифки, реакции, правка и удаление.
// Этот шаг -- только чтение, и он самодостаточен: страницу уже можно
// открыть и посмотреть глазами.
//
// Вид намеренно не как в приложении. Там комментарии -- переписка:
// свои пузыри справа, чужие слева. На публичной странице, где пишут
// разные незнакомые люди, это читается как подсмотренный чужой чат.
// Здесь обычный список: аватар, имя, время, текст (согласовано, см.
// переписку 16 сентября).

import Link from "next/link";
import { T } from "@/components/t";
import { RelativeTime } from "@/components/locale-format";
import { avatarSourceUrl } from "@/lib/avatar-source";
import { pickDefaultCatAvatar } from "@/lib/avatars";
import { profileHref } from "@/lib/profile-href";
import type { WebComment } from "@/lib/a1/comments";

function CommentAvatar({ comment }: { comment: WebComment }) {
  const src = comment.authorAvatarUrl
    ? avatarSourceUrl(comment.authorAvatarUrl)
    : pickDefaultCatAvatar(comment.authorUsername ?? comment.authorId ?? comment.id);

  // Обычный <img> с ленивой загрузкой -- см. тот же разбор в шапке
  // components/related-jobs.tsx: блок внизу страницы, и тянуть аватарки
  // до того, как до них долистали, незачем.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={32}
      height={32}
      loading="lazy"
      decoding="async"
      className="h-8 w-8 shrink-0 rounded-full bg-neutral-100 object-cover dark:bg-neutral-800"
    />
  );
}

function CommentRow({ comment }: { comment: WebComment }) {
  const avatar = <CommentAvatar comment={comment} />;

  return (
    <li className="flex gap-3">
      {comment.authorUsername ? (
        <Link href={profileHref(comment.authorUsername)} className="shrink-0 transition-opacity hover:opacity-80">
          {avatar}
        </Link>
      ) : (
        avatar
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          {comment.authorUsername ? (
            <Link
              href={profileHref(comment.authorUsername)}
              className="text-[13px] font-medium text-neutral-900 hover:underline dark:text-neutral-50"
            >
              {comment.authorName}
            </Link>
          ) : (
            <span className="text-[13px] font-medium text-neutral-900 dark:text-neutral-50">{comment.authorName}</span>
          )}
          <span className="text-[12px] text-ink-faint dark:text-neutral-500">
            <RelativeTime date={comment.createdAt} />
          </span>
        </div>
        {comment.mediaOnly ? (
          <p className="mt-0.5 text-[14px] italic text-neutral-400 dark:text-neutral-500">
            <T
              uk="Наліпка" en="Sticker" ru="Стикер" de="Sticker" es="Sticker"
              fr="Sticker" pl="Naklejka" ptBR="Figurinha" zh="贴纸"
            />
          </p>
        ) : (
          // whitespace-pre-line: перенос строки в комментарии -- это
          // намерение автора, а не случайность вёрстки.
          <p className="mt-0.5 whitespace-pre-line break-words text-[14px] leading-relaxed text-neutral-700 dark:text-neutral-300">
            {comment.text}
          </p>
        )}
      </div>
    </li>
  );
}

export function PostComments({ comments }: { comments: WebComment[] }) {
  return (
    <section className="mt-10">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
        <T
          uk="Коментарі" en="Comments" ru="Комментарии" de="Kommentare" es="Comentarios"
          fr="Commentaires" pl="Komentarze" ptBR="Comentários" zh="评论"
        />
        {comments.length > 0 && <span className="ml-1.5 tabular-nums">{comments.length}</span>}
      </h2>

      {comments.length === 0 ? (
        // Сдержаннее, чем в приложении: там во всю шторку кот и крупная
        // надпись, но там это отдельный экран, который человек открыл
        // сам. Здесь блок стоит на странице всегда, под каждой из почти
        // двух тысяч вакансий, и такой же крупный пустой экран под
        // каждой выглядел бы как поломка.
        <p className="mt-2 text-[14px] text-neutral-400 dark:text-neutral-500">
          <T
            uk="Залиште перший коментар!" en="Be the first to comment!" ru="Оставьте первый комментарий!"
            de="Schreiben Sie den ersten Kommentar!" es="¡Sé el primero en comentar!"
            fr="Soyez le premier à commenter !" pl="Dodaj pierwszy komentarz!"
            ptBR="Seja o primeiro a comentar!" zh="来发表第一条评论吧！"
          />
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-4">
          {comments.map((comment) => (
            <CommentRow key={comment.id} comment={comment} />
          ))}
        </ul>
      )}
    </section>
  );
}
