import Link from "next/link";
import { T } from "@/components/t";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50"><T uk="Сторінку не знайдено" en="Page not found" ru="Страница не найдена" de="Seite nicht gefunden" es="Página no encontrada" fr="Page introuvable" pl="Nie znaleziono strony" ptBR="Página não encontrada" zh="页面未找到" /></h1>
      <p className="mt-2 text-neutral-500 dark:text-neutral-400"><T uk="Можливо, допис було видалено або посилання застаріло." en="The post may have been deleted or the link may be outdated." ru="Возможно, публикация была удалена или ссылка устарела." de="Der Beitrag wurde möglicherweise gelöscht oder der Link ist veraltet." es="Es posible que la publicación haya sido eliminada o que el enlace esté desactualizado." fr="Il se peut que la publication ait été supprimée ou que le lien soit obsolète." pl="Możliwe, że post został usunięty lub link jest nieaktualny." ptBR="A publicação pode ter sido excluída ou o link pode estar desatualizado." zh="该帖子可能已被删除，或链接已失效。" /></p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
      >
        <T uk="На головну" en="Back to home" ru="На главную" de="Zur Startseite" es="Ir al inicio" fr="Retour à l'accueil" pl="Strona główna" ptBR="Voltar ao início" zh="返回首页" />
      </Link>
    </main>
  );
}
