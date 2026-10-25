// lib/seo/region-texts.ts -- тексты страниц «профессии по стране» и плашек
// «в этом регионе пока мало данных» (25.10.2026).
//
// Названия профессий -- ROLE_LABELS (9 языков), стран -- countryName.

import { LOCALES, type Locale } from "@/components/t";
import { countryName, type Country } from "@/lib/seo/countries";
import { ROLE_LABELS } from "@/lib/seo/role-labels";
import type { JobRole } from "@/lib/seo/job-role";

type L = Record<Locale, string>;

function each(f: (locale: Locale, country: string) => string, country: Country): L {
  return Object.fromEntries(LOCALES.map((l) => [l, f(l, countryName(country, l))])) as L;
}

export function countryRolesH1(country: Country): L {
  return each(
    (l, c) =>
      ({
        uk: `Вакансії за професією: ${c}`,
        en: `Jobs by role: ${c}`,
        ru: `Вакансии по профессии: ${c}`,
        de: `Jobs nach Rolle: ${c}`,
        es: `Empleos por puesto: ${c}`,
        fr: `Offres par métier : ${c}`,
        pl: `Oferty wg stanowiska: ${c}`,
        ptBR: `Vagas por função: ${c}`,
        zh: `按职位浏览：${c}`,
      })[l],
    country,
  );
}

export function countryRolesLead(country: Country, directions: number): L {
  return each(
    (l, c) =>
      ({
        uk: `${directions} напрямів з вакансіями в країні ${c}. Роль визначаємо за назвою вакансії, список оновлюється щодня.`,
        en: `${directions} roles with open jobs in ${c}. The role comes from the job title, the list updates daily.`,
        ru: `${directions} направлений с вакансиями в стране ${c}. Роль определяем по названию вакансии, список обновляется ежедневно.`,
        de: `${directions} Rollen mit offenen Stellen in ${c}. Die Rolle ergibt sich aus dem Jobtitel, täglich aktualisiert.`,
        es: `${directions} puestos con vacantes en ${c}. El puesto sale del título de la vacante y se actualiza a diario.`,
        fr: `${directions} métiers avec des offres en ${c}. Le métier vient de l'intitulé, mis à jour chaque jour.`,
        pl: `${directions} stanowisk z ofertami w kraju ${c}. Rolę określamy po tytule oferty, lista odświeża się codziennie.`,
        ptBR: `${directions} funções com vagas em ${c}. A função vem do título da vaga, atualizada diariamente.`,
        zh: `${c} 共有 ${directions} 个职位方向在招聘。职位类型根据职位名称判断，每日更新。`,
      })[l],
    country,
  );
}

/** Вакансий с определённой профессией в стране нет вообще. */
export function countryRolesEmpty(country: Country): L {
  return each(
    (l, c) =>
      ({
        uk: `У регіоні «${c}» поки немає вакансій, за якими ми можемо визначити професію. Подивіться професії в Україні та віддалено або оберіть іншу країну вгорі.`,
        en: `In ${c} there are no jobs yet where we can tell the role. See roles in Ukraine and remote, or pick another country at the top.`,
        ru: `В регионе «${c}» пока нет вакансий, по которым можно определить профессию. Посмотрите профессии в Украине и удалённо или выберите другую страну вверху.`,
        de: `In ${c} gibt es noch keine Jobs mit erkennbarer Rolle. Sehen Sie Rollen in der Ukraine und remote oder wählen Sie oben ein anderes Land.`,
        es: `En ${c} todavía no hay vacantes con un puesto identificable. Mira los puestos en Ucrania y en remoto o elige otro país arriba.`,
        fr: `En ${c}, aucune offre ne permet encore d'identifier le métier. Voyez les métiers en Ukraine et à distance, ou choisissez un autre pays en haut.`,
        pl: `W regionie ${c} nie ma jeszcze ofert z rozpoznanym stanowiskiem. Zobacz stanowiska w Ukrainie i zdalnie lub wybierz inny kraj u góry.`,
        ptBR: `Em ${c} ainda não há vagas com função identificável. Veja as funções na Ucrânia e remotas ou escolha outro país no topo.`,
        zh: `${c} 暂无可识别职位类型的招聘。可查看乌克兰及远程职位，或在顶部选择其他国家。`,
      })[l],
    country,
  );
}

/** Профессия в стране есть, но вакансий меньше порога страницы. */
export function thinRoleText(role: JobRole, country: Country): L {
  const r = ROLE_LABELS[role];
  return each(
    (l, c) =>
      ({
        uk: `У регіоні «${c}» поки мало вакансій «${r.uk}»: показуємо всі, що є. Більше вакансій цієї професії в Україні та віддалено.`,
        en: `In ${c} there are only a few ${r.en} jobs so far: here are all of them. Find more of this role in Ukraine and remote.`,
        ru: `В регионе «${c}» пока мало вакансий «${r.ru}»: показываем все, что есть. Больше вакансий этой профессии в Украине и удалённо.`,
        de: `In ${c} gibt es bisher nur wenige ${r.de}-Jobs: Hier sind alle. Mehr davon in der Ukraine und remote.`,
        es: `En ${c} todavía hay pocas vacantes de ${r.es}: aquí están todas. Encuentra más en Ucrania y en remoto.`,
        fr: `En ${c}, il n'y a encore que peu d'offres ${r.fr} : les voici toutes. Plus d'offres en Ukraine et à distance.`,
        pl: `W regionie ${c} jest na razie mało ofert ${r.pl}: pokazujemy wszystkie. Więcej w Ukrainie i zdalnie.`,
        ptBR: `Em ${c} ainda há poucas vagas de ${r.ptBR}: aqui estão todas. Veja mais na Ucrânia e remotas.`,
        zh: `${c} 目前 ${r.zh} 职位较少，以下为全部。更多职位见乌克兰及远程。`,
      })[l],
    country,
  );
}

/** Зарплат по профессии в стране слишком мало для вилки. */
export function thinSalaryText(role: JobRole, country: Country, count: number): L {
  const r = ROLE_LABELS[role];
  return each(
    (l, c) =>
      ({
        uk: `У регіоні «${c}» поки замало вакансій «${r.uk}» із зарплатою (${count}), щоб чесно порахувати вилку: потрібно хоча б 10. Нижче вакансії з сумою, що є, а зарплати цієї професії по всіх країнах за посиланням.`,
        en: `In ${c} there are too few ${r.en} jobs with a salary (${count}) to give an honest range: we need at least 10. Below are the ones we have; salaries for this role across all countries are one click away.`,
        ru: `В регионе «${c}» пока слишком мало вакансий «${r.ru}» с зарплатой (${count}), чтобы честно посчитать вилку: нужно хотя бы 10. Ниже вакансии с суммой, что есть, а зарплаты этой профессии по всем странам по ссылке.`,
        de: `In ${c} gibt es noch zu wenige ${r.de}-Jobs mit Gehalt (${count}) für eine ehrliche Spanne: Wir brauchen mindestens 10. Unten die vorhandenen, Gehälter in allen Ländern per Link.`,
        es: `En ${c} todavía hay muy pocas vacantes de ${r.es} con salario (${count}) para dar un rango honesto: necesitamos al menos 10. Abajo las que hay; los salarios de todos los países, en el enlace.`,
        fr: `En ${c}, trop peu d'offres ${r.fr} indiquent un salaire (${count}) pour une fourchette honnête : il en faut au moins 10. Voici celles que nous avons ; les salaires tous pays confondus sont en lien.`,
        pl: `W regionie ${c} jest za mało ofert ${r.pl} z wynagrodzeniem (${count}), by uczciwie podać widełki: potrzeba co najmniej 10. Poniżej te, które mamy; wynagrodzenia we wszystkich krajach pod linkiem.`,
        ptBR: `Em ${c} ainda há poucas vagas de ${r.ptBR} com salário (${count}) para uma faixa honesta: precisamos de pelo menos 10. Abaixo as que temos; salários de todos os países no link.`,
        zh: `${c} 带薪资的 ${r.zh} 职位太少（${count} 个），无法给出可靠区间（至少需要 10 个）。下方为现有职位，所有国家的薪资见链接。`,
      })[l],
    country,
  );
}

export const LINK_ALL_ROLES: L = { uk: "Усі професії", en: "All roles", ru: "Все профессии", de: "Alle Rollen", es: "Todos los puestos", fr: "Tous les métiers", pl: "Wszystkie stanowiska", ptBR: "Todas as funções", zh: "全部职位" };
export const LINK_ROLE_EVERYWHERE: L = { uk: "Ця професія в Україні та віддалено", en: "This role in Ukraine and remote", ru: "Эта профессия в Украине и удалённо", de: "Diese Rolle in der Ukraine und remote", es: "Este puesto en Ucrania y remoto", fr: "Ce métier en Ukraine et à distance", pl: "To stanowisko w Ukrainie i zdalnie", ptBR: "Esta função na Ucrânia e remota", zh: "该职位：乌克兰及远程" };
export const LINK_SALARY_ALL: L = { uk: "Зарплати по всіх країнах", en: "Salaries in all countries", ru: "Зарплаты по всем странам", de: "Gehälter in allen Ländern", es: "Salarios en todos los países", fr: "Salaires dans tous les pays", pl: "Wynagrodzenia we wszystkich krajach", ptBR: "Salários em todos os países", zh: "所有国家的薪资" };
export const LINK_ROLE_IN_COUNTRY: L = { uk: "Усі вакансії професії тут", en: "All jobs of this role here", ru: "Все вакансии профессии здесь", de: "Alle Jobs dieser Rolle hier", es: "Todas las vacantes de este puesto aquí", fr: "Toutes les offres de ce métier ici", pl: "Wszystkie oferty tego stanowiska tutaj", ptBR: "Todas as vagas desta função aqui", zh: "此处该职位全部招聘" };
