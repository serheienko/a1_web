// app/c/[chatId]/[messageId]/page.tsx
//
// 21.10.2026 (Александр: «надо, чтобы этот link вёл на сообщение в чате
// конкретное»). Короткая ссылка на одно сообщение группового чата:
// jobs.a1appp.com/c/<чат>/<сообщение>. Её копируют из меню сообщения в
// приложении и отправляют куда угодно.
//
// Телефон с установленным A1 до этой страницы обычно не доходит: ссылку
// перехватывает сам телефон (App Links на Android, Universal Links на
// iOS — см. public/.well-known/) и открывает чат прямо в приложении,
// прокручивая ленту к сообщению. Страница — это то, что видят все
// остальные: компьютер, телефон без приложения, чужой браузер.
//
// Серверная и без JS: вся развилка — две ссылки. «Відкрити в A1» ведёт в
// веб-версию чата, которая давно умеет ?m=<id> (прокрутка к сообщению,
// app/chats/[chatId]/page.tsx, jumpParam); не вошедшего она сама
// отправит на вход и вернёт обратно. Вторая ссылка — на /download, для
// тех, кому удобнее в приложении.
import Link from "next/link";
import { T } from "@/components/t";

export default async function MessageLinkPage({
  params,
}: {
  params: Promise<{ chatId: string; messageId: string }>;
}) {
  const { chatId, messageId } = await params;
  const openHref = `/chats/${encodeURIComponent(chatId)}?group=1&m=${encodeURIComponent(messageId)}`;

  return (
    <main className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
        <T uk="Повідомлення в A1" en="A message in A1" ru="Сообщение в A1" de="Eine Nachricht in A1" es="Un mensaje en A1" fr="Un message dans A1" pl="Wiadomość w A1" ptBR="Uma mensagem no A1" zh="A1 中的一条消息" />
      </h1>
      <p className="mt-2 text-neutral-500 dark:text-neutral-400">
        <T uk="Відкрийте його в A1 — ми одразу перейдемо до цього повідомлення." en="Open it in A1 — we'll jump straight to this message." ru="Откройте его в A1 — мы сразу перейдём к этому сообщению." de="Öffne sie in A1 — wir springen direkt zu dieser Nachricht." es="Ábrelo en A1: iremos directamente a este mensaje." fr="Ouvrez-le dans A1 — nous irons directement à ce message." pl="Otwórz ją w A1 — przejdziemy prosto do tej wiadomości." ptBR="Abra no A1 — vamos direto para esta mensagem." zh="在 A1 中打开，直接跳转到这条消息。" />
      </p>

      <Link
        href={openHref}
        className="mt-6 inline-block rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
      >
        <T uk="Відкрити в A1" en="Open in A1" ru="Открыть в A1" de="In A1 öffnen" es="Abrir en A1" fr="Ouvrir dans A1" pl="Otwórz w A1" ptBR="Abrir no A1" zh="在 A1 中打开" />
      </Link>

      <div className="mt-4">
        <Link
          href="/download"
          className="text-sm text-neutral-500 underline-offset-4 transition hover:underline dark:text-neutral-400"
        >
          <T uk="Завантажити застосунок" en="Get the app" ru="Скачать приложение" de="App laden" es="Descargar la app" fr="Télécharger l'application" pl="Pobierz aplikację" ptBR="Baixar o app" zh="下载应用" />
        </Link>
      </div>
    </main>
  );
}
