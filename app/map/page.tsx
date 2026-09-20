// app/map/page.tsx — «Карта IT: Україна і Польща».
//
// Aleksandr, 2026-09-20. Родилась из сбора базы разработчиков (shtab/):
// у нас на руках оказались агрегаты, которых нет ни у одного конкурента,
// и первая мысль была выложить сами профили. От неё отказались — чужие
// имена и почты на коммерческом сайте это GDPR и репутация. Осталось то,
// что публиковать честно можно и нужно: только обезличенные числа.
// Ни одного имени, ни одной ссылки на человека на этой странице нет
// и не должно появиться.
//
// Числа лежат отдельно, в lib/a1/it-map-data.json, и пересобираются
// скриптом shtab/github/make_stats.py («потом просто обновим цифры, как
// они у нас будут»). Правка цифр = перезапуск скрипта + push, вёрстку
// трогать не надо.
//
// Серверный компонент: страница полностью статична, никаких cookies()/
// headers() — значит Next отдаёт её как статику и она быстро грузится
// из кэша. Интерактив (карта, графики) вынесен в ./it-map.tsx.
//
// Девять языков — как решил Александр («все девять, как весь сайт»),
// через тот же <T/>, что и остальная статическая копия сайта.
// Названия городов намеренно оставлены латиницей в оригинальном
// написании (Kyiv, Kraków, Łódź): иначе 43 города пришлось бы
// переводить девять раз, а латиница читается во всех девяти.
import type { Metadata } from "next";
import { T } from "@/components/t";
import data from "@/lib/a1/it-map-data.json";
import { Counter, ItMap, type MapData } from "./it-map";

const SITE_URL = "https://jobs.a1appp.com";
const D = data as unknown as MapData;

export const metadata: Metadata = {
  title: "Скільки розробників в Україні та Польщі — карта IT | A1 Jobs",
  description:
    "Скільки активних розробників в Україні та Польщі, у яких містах вони живуть, на яких мовах пишуть і скільки з них відкриті до пропозицій. Дослідження A1 за відкритими профілями GitHub.",
  alternates: { canonical: `${SITE_URL}/map` },
  openGraph: {
    title: "Карта IT: скільки розробників в Україні та Польщі",
    description:
      "Міста, мови та частка відкритих до пропозицій — за відкритими профілями GitHub. Без персональних даних.",
    url: `${SITE_URL}/map`,
    type: "website",
  },
};

const nf = (n: number) => n.toLocaleString("uk-UA").replace(/ /g, " ");

function Stat({ value, label, note, tone }: {
  value: React.ReactNode;
  label: React.ReactNode;
  note: React.ReactNode;
  tone?: "accent" | "good";
}) {
  const color =
    tone === "accent" ? "text-[#3987e5]"
    : tone === "good" ? "text-emerald-600 dark:text-emerald-400"
    : "text-neutral-900 dark:text-neutral-50";
  return (
    <div className="bg-white p-5 dark:bg-white/[0.04]">
      <div className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
        {label}
      </div>
      <div className={`mt-2 text-3xl font-bold tabular-nums sm:text-4xl ${color}`}>{value}</div>
      <div className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">{note}</div>
    </div>
  );
}

function Section({ title, note, children }: {
  title: React.ReactNode; note: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <section className="border-t border-neutral-200 pt-12 dark:border-white/10">
      <h2 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl dark:text-neutral-50">
        {title}
      </h2>
      <p className="mt-2 mb-8 max-w-2xl text-neutral-500 dark:text-neutral-400">{note}</p>
      {children}
    </section>
  );
}

export default function MapPage() {
  const hirePct = Math.round((D.hireable / D.total) * 100);

  return (
    <div className="mx-auto max-w-5xl px-4 pt-4 pb-fab-safe sm:pt-16">
      <header className="relative">
        <div aria-hidden
             className="pointer-events-none absolute -top-24 -left-24 -z-10 h-72 w-[38rem] max-w-full rounded-full opacity-60 blur-3xl"
             style={{ background: "radial-gradient(closest-side, rgba(79,155,255,.22), transparent)" }} />
        <span className="inline-flex items-center gap-2 rounded-full border border-neutral-200 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-neutral-500 dark:border-white/15 dark:text-neutral-400">
          <T uk="Дослідження A1" en="A1 research" ru="Исследование A1" de="A1-Studie"
             es="Estudio de A1" fr="Étude A1" pl="Badanie A1" ptBR="Pesquisa A1" zh="A1 研究" />
        </span>

        <h1 className="mt-5 max-w-[18ch] text-3xl font-bold tracking-tight text-neutral-900 sm:text-5xl dark:text-neutral-50">
          <T uk="Скільки нас насправді" en="How many of us there really are"
             ru="Сколько нас на самом деле" de="Wie viele wir wirklich sind"
             es="Cuántos somos en realidad" fr="Combien sommes-nous vraiment"
             pl="Ilu nas naprawdę jest" ptBR="Quantos somos de verdade" zh="我们究竟有多少人" />
        </h1>

        <p className="mt-5 max-w-2xl text-lg text-neutral-600 dark:text-neutral-300">
          <T
            uk="Ми порахували відкриті профілі розробників з України та Польщі — тих, хто має власні проєкти і був активний протягом останнього року. Ось що видно на цих даних: де вони живуть, на чому пишуть і скільки з них самі позначили себе відкритими до пропозицій."
            en="We counted the public profiles of developers in Ukraine and Poland — those with projects of their own who have been active over the past year. Here is what the data shows: where they live, what they build with, and how many have marked themselves open to offers."
            ru="Мы посчитали открытые профили разработчиков из Украины и Польши — тех, у кого есть собственные проекты и кто был активен в течение последнего года. Вот что видно на этих данных: где они живут, на чём пишут и сколько из них сами отметили себя открытыми к предложениям."
            de="Wir haben die öffentlichen Profile von Entwicklern in der Ukraine und in Polen gezählt — jene mit eigenen Projekten, die im letzten Jahr aktiv waren. Das zeigen die Daten: wo sie leben, womit sie arbeiten und wie viele sich als offen für Angebote markiert haben."
            es="Contamos los perfiles públicos de desarrolladores de Ucrania y Polonia — los que tienen proyectos propios y estuvieron activos durante el último año. Esto muestran los datos: dónde viven, con qué programan y cuántos se han marcado como abiertos a ofertas."
            fr="Nous avons compté les profils publics des développeurs d'Ukraine et de Pologne — ceux qui ont leurs propres projets et sont restés actifs cette dernière année. Voici ce que montrent les données : où ils vivent, avec quoi ils codent et combien se déclarent ouverts aux offres."
            pl="Policzyliśmy publiczne profile programistów z Ukrainy i Polski — tych z własnymi projektami, aktywnych w ciągu ostatniego roku. Oto co widać w danych: gdzie mieszkają, w czym piszą i ilu z nich samo oznaczyło się jako otwarci na oferty."
            ptBR="Contamos os perfis públicos de desenvolvedores da Ucrânia e da Polônia — aqueles com projetos próprios e ativos no último ano. Eis o que os dados mostram: onde vivem, com o que programam e quantos se marcaram como abertos a ofertas."
            zh="我们统计了乌克兰和波兰开发者的公开资料——那些拥有自己的项目、并在过去一年中保持活跃的人。数据显示：他们住在哪里、用什么语言编程，以及有多少人主动标记自己接受新机会。"
          />
        </p>

        <div className="mt-8 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-200 sm:grid-cols-2 lg:grid-cols-4 dark:border-white/10 dark:bg-white/10">
          <Stat
            tone="accent"
            value={<Counter to={D.found} />}
            label={<T uk="Знайдено профілів" en="Profiles found" ru="Найдено профилей"
                      de="Gefundene Profile" es="Perfiles encontrados" fr="Profils trouvés"
                      pl="Znalezionych profili" ptBR="Perfis encontrados" zh="已找到的资料" />}
            note={<T uk="Україна і Польща" en="Ukraine and Poland" ru="Украина и Польша"
                     de="Ukraine und Polen" es="Ucrania y Polonia" fr="Ukraine et Pologne"
                     pl="Ukraina i Polska" ptBR="Ucrânia e Polônia" zh="乌克兰与波兰" />}
          />
          <Stat
            value={<Counter to={D.total} />}
            label={<T uk="Розібрано детально" en="Analysed in detail" ru="Разобрано детально"
                      de="Im Detail ausgewertet" es="Analizados en detalle" fr="Analysés en détail"
                      pl="Przeanalizowanych szczegółowo" ptBR="Analisados em detalhe" zh="已详细分析" />}
            note={<T uk="усі графіки нижче — на цій вибірці" en="every chart below uses this sample"
                     ru="все графики ниже — на этой выборке" de="alle Diagramme unten beruhen darauf"
                     es="todos los gráficos usan esta muestra" fr="tous les graphiques utilisent cet échantillon"
                     pl="wszystkie wykresy na tej próbie" ptBR="todos os gráficos usam esta amostra"
                     zh="下方所有图表基于该样本" />}
          />
          <Stat
            tone="good"
            value={<Counter to={hirePct} suffix="%" />}
            label={<T uk="Відкриті до пропозицій" en="Open to offers" ru="Открыты к предложениям"
                      de="Offen für Angebote" es="Abiertos a ofertas" fr="Ouverts aux offres"
                      pl="Otwarci na oferty" ptBR="Abertos a ofertas" zh="接受新机会" />}
            note={<><span className="tabular-nums">{nf(D.hireable)}</span>{" "}
                  <T uk="людей позначили це самі" en="people set this flag themselves"
                     ru="человек отметили это сами" de="Personen haben das selbst markiert"
                     es="personas lo marcaron ellas mismas" fr="personnes l'ont indiqué elles-mêmes"
                     pl="osób zaznaczyło to samodzielnie" ptBR="pessoas marcaram isso elas mesmas"
                     zh="人自己勾选了该标记" /></>}
          />
          <Stat
            value={<Counter to={D.avgRepos} decimals={1} />}
            label={<T uk="Проєктів на людину" en="Projects per person" ru="Проектов на человека"
                      de="Projekte pro Person" es="Proyectos por persona" fr="Projets par personne"
                      pl="Projektów na osobę" ptBR="Projetos por pessoa" zh="人均项目数" />}
            note={<T uk="у середньому, відкритих" en="public ones, on average"
                     ru="в среднем, открытых" de="im Schnitt, öffentlich"
                     es="públicos, en promedio" fr="publics, en moyenne"
                     pl="publicznych, średnio" ptBR="públicos, em média" zh="公开项目，平均" />}
          />
        </div>
      </header>

      <div className="mt-16 flex flex-col gap-16">
        <Section
          title={<T uk="Де вони" en="Where they are" ru="Где они" de="Wo sie sind"
                    es="Dónde están" fr="Où ils sont" pl="Gdzie są" ptBR="Onde estão" zh="他们在哪里" />}
          note={<T uk="Кожна точка — місто, розмір кола відповідає кількості розробників. Наведіть, щоб побачити розріз по мовах."
                   en="Each dot is a city; the circle size matches the number of developers. Hover to see the language split."
                   ru="Каждая точка — город, размер круга соответствует количеству разработчиков. Наведите, чтобы увидеть разрез по языкам."
                   de="Jeder Punkt ist eine Stadt, die Kreisgröße entspricht der Zahl der Entwickler. Zum Sprach-Detail darüberfahren."
                   es="Cada punto es una ciudad; el tamaño del círculo corresponde al número de desarrolladores. Pase el cursor para ver el desglose por lenguaje."
                   fr="Chaque point est une ville ; la taille du cercle correspond au nombre de développeurs. Survolez pour voir la répartition par langage."
                   pl="Każdy punkt to miasto, wielkość koła odpowiada liczbie programistów. Najedź, aby zobaczyć podział na języki."
                   ptBR="Cada ponto é uma cidade; o tamanho do círculo corresponde ao número de desenvolvedores. Passe o cursor para ver a divisão por linguagem."
                   zh="每个点代表一座城市，圆的大小对应开发者人数。悬停查看语言分布。" />}
        >
          <ItMap
            data={D}
            heads={{
              langs: {
                title: <T uk="На чому пишуть" en="What they build with" ru="На чём пишут"
                          de="Womit sie arbeiten" es="Con qué programan" fr="Avec quoi ils codent"
                          pl="W czym piszą" ptBR="Com o que programam" zh="他们用什么语言" />,
                note: <T uk="Основна мова профілю — та, за якою людину знайшов пошук. Багато хто пише більш ніж однією; тут врахована одна, головна."
                         en="The profile's main language is the one the search matched. Many write in more than one; only the main one is counted here."
                         ru="Основной язык профиля — тот, по которому человека нашёл поиск. Многие пишут более чем на одном; здесь учтён один, главный."
                         de="Die Hauptsprache eines Profils ist die, über die die Suche es gefunden hat. Viele nutzen mehrere; gezählt wird nur die wichtigste."
                         es="El lenguaje principal del perfil es aquel con el que lo encontró la búsqueda. Muchos usan más de uno; aquí se cuenta solo el principal."
                         fr="Le langage principal d'un profil est celui par lequel la recherche l'a trouvé. Beaucoup en utilisent plusieurs ; un seul est compté ici."
                         pl="Główny język profilu to ten, po którym znalazło go wyszukiwanie. Wielu pisze w kilku; tutaj liczy się jeden, główny."
                         ptBR="A linguagem principal do perfil é aquela pela qual a busca o encontrou. Muitos usam mais de uma; aqui conta apenas a principal."
                         zh="资料的主要语言是搜索匹配到的那一种。许多人使用多种语言，这里只计入主要的一种。" />,
              },
              cmp: {
                title: <T uk="Україна і Польща: різні стеки" en="Ukraine and Poland: different stacks"
                          ru="Украина и Польша: разные стеки" de="Ukraine und Polen: andere Stacks"
                          es="Ucrania y Polonia: pilas distintas" fr="Ukraine et Pologne : des stacks différentes"
                          pl="Ukraina i Polska: inne stosy" ptBR="Ucrânia e Polônia: stacks diferentes"
                          zh="乌克兰与波兰：不同的技术栈" />,
                note: <T uk="Частка мови всередині кожної країни — так два ринки можна порівнювати, навіть коли вибірки різного розміру."
                         en="Each language's share within its own country — that way the two markets compare even when the samples differ in size."
                         ru="Доля языка внутри каждой страны — так два рынка можно сравнивать, даже когда выборки разного размера."
                         de="Der Anteil jeder Sprache innerhalb des eigenen Landes — so bleiben beide Märkte vergleichbar, auch bei unterschiedlich großen Stichproben."
                         es="La proporción de cada lenguaje dentro de su país — así los dos mercados se comparan aunque las muestras difieran en tamaño."
                         fr="La part de chaque langage au sein de son propre pays — les deux marchés restent ainsi comparables même si les échantillons diffèrent."
                         pl="Udział języka wewnątrz każdego kraju — dzięki temu rynki da się porównać nawet przy próbach różnej wielkości."
                         ptBR="A proporção de cada linguagem dentro de seu país — assim os dois mercados se comparam mesmo com amostras de tamanhos diferentes."
                         zh="各语言在本国内部的占比——这样即使样本量不同，两个市场也能相互比较。" />,
              },
              open: {
                title: <T uk="Хто відкритий до пропозицій" en="Who is open to offers"
                          ru="Кто открыт к предложениям" de="Wer offen für Angebote ist"
                          es="Quién está abierto a ofertas" fr="Qui est ouvert aux offres"
                          pl="Kto jest otwarty na oferty" ptBR="Quem está aberto a ofertas"
                          zh="谁在接受新机会" />,
                note: <T uk="GitHub має власну позначку «available for hire» — людина вмикає її сама. Це не здогадка і не оцінка: це публічна заява розробника. По містах вона розподілена нерівно."
                         en="GitHub has its own “available for hire” flag, which people switch on themselves. It is not a guess or a score — it is the developer's own public statement, and it is spread unevenly across cities."
                         ru="У GitHub есть собственная пометка «available for hire» — человек включает её сам. Это не догадка и не оценка: это публичное заявление разработчика. По городам она распределена неравномерно."
                         de="GitHub hat eine eigene „available for hire“-Markierung, die man selbst setzt. Keine Vermutung, keine Bewertung — eine öffentliche Aussage der Entwickler, und sie verteilt sich ungleich über die Städte."
                         es="GitHub tiene su propia marca “available for hire”, que cada persona activa por sí misma. No es una suposición ni una puntuación: es una declaración pública, y se reparte de forma desigual entre ciudades."
                         fr="GitHub possède son propre indicateur « available for hire », activé par la personne elle-même. Ni supposition ni score : une déclaration publique, répartie inégalement selon les villes."
                         pl="GitHub ma własny znacznik „available for hire”, który każdy włącza sam. To nie domysł ani ocena, lecz publiczna deklaracja — i rozkłada się nierówno między miastami."
                         ptBR="O GitHub tem sua própria marca “available for hire”, que cada pessoa ativa por conta própria. Não é suposição nem pontuação: é uma declaração pública, distribuída de forma desigual entre as cidades."
                         zh="GitHub 有自己的“available for hire”标记，由本人开启。这不是推测也不是评分，而是开发者自己的公开声明，且在各城市分布并不均匀。" />,
              },
            }}
          />
        </Section>
      </div>

      <div className="mt-16 flex flex-col gap-16">
        <Section
          title={<T uk="Як це зібрано" en="How this was put together" ru="Как это собрано"
                    de="Wie das entstanden ist" es="Cómo se hizo" fr="Comment c'est fait"
                    pl="Jak to zebrano" ptBR="Como isto foi feito" zh="数据从何而来" />}
          note={<T uk="Коротко про джерело і про те, чого в цих даних немає."
                   en="Briefly: where the data comes from and what it does not contain."
                   ru="Коротко про источник и про то, чего в этих данных нет."
                   de="Kurz: woher die Daten stammen und was sie nicht enthalten."
                   es="En breve: de dónde vienen los datos y qué no contienen."
                   fr="En bref : d'où viennent les données et ce qu'elles ne contiennent pas."
                   pl="Krótko: skąd pochodzą dane i czego w nich nie ma."
                   ptBR="Em resumo: de onde vêm os dados e o que eles não contêm."
                   zh="简要说明数据来源，以及其中没有包含什么。" />}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                h: <T uk="Джерело" en="Source" ru="Источник" de="Quelle" es="Fuente"
                      fr="Source" pl="Źródło" ptBR="Fonte" zh="来源" />,
                p: <T uk="Відкриті профілі GitHub. Усе, що тут показано, видно будь-кому на самому GitHub — жодних закритих даних."
                      en="Public GitHub profiles. Everything shown here is visible to anyone on GitHub itself — no private data."
                      ru="Открытые профили GitHub. Всё, что здесь показано, видно любому на самом GitHub — никаких закрытых данных."
                      de="Öffentliche GitHub-Profile. Alles hier ist auf GitHub für jeden sichtbar — keine privaten Daten."
                      es="Perfiles públicos de GitHub. Todo lo mostrado es visible para cualquiera en GitHub — ningún dato privado."
                      fr="Profils GitHub publics. Tout ce qui est montré ici est visible par tous sur GitHub — aucune donnée privée."
                      pl="Publiczne profile GitHub. Wszystko tutaj widać na samym GitHubie — żadnych danych prywatnych."
                      ptBR="Perfis públicos do GitHub. Tudo aqui é visível a qualquer pessoa no próprio GitHub — nenhum dado privado."
                      zh="公开的 GitHub 资料。此处所示的一切在 GitHub 上人人可见，不涉及任何非公开数据。" />,
              },
              {
                h: <T uk="Хто потрапив у вибірку" en="Who is included" ru="Кто попал в выборку"
                      de="Wer erfasst ist" es="Quién entra en la muestra" fr="Qui est inclus"
                      pl="Kto trafił do próby" ptBR="Quem entra na amostra" zh="样本包含谁" />,
                p: <T uk="Профілі з місцем проживання в Україні чи Польщі, з кількома власними проєктами й активністю за останній рік. Покинуті та порожні акаунти відсіяно."
                      en="Profiles located in Ukraine or Poland, with several projects of their own and activity within the past year. Abandoned and empty accounts are filtered out."
                      ru="Профили с местом жительства в Украине или Польше, с несколькими собственными проектами и активностью за последний год. Заброшенные и пустые аккаунты отсеяны."
                      de="Profile mit Wohnort in der Ukraine oder Polen, mit mehreren eigenen Projekten und Aktivität im letzten Jahr. Verlassene und leere Konten wurden aussortiert."
                      es="Perfiles ubicados en Ucrania o Polonia, con varios proyectos propios y actividad en el último año. Se excluyen cuentas abandonadas y vacías."
                      fr="Profils situés en Ukraine ou en Pologne, avec plusieurs projets personnels et une activité sur l'année écoulée. Les comptes abandonnés et vides sont exclus."
                      pl="Profile z lokalizacją w Ukrainie lub Polsce, z kilkoma własnymi projektami i aktywnością w ostatnim roku. Porzucone i puste konta odfiltrowano."
                      ptBR="Perfis localizados na Ucrânia ou na Polônia, com vários projetos próprios e atividade no último ano. Contas abandonadas e vazias foram filtradas."
                      zh="居住地为乌克兰或波兰、拥有若干自有项目且过去一年有活动的资料。已排除废弃和空账号。" />,
              },
              {
                h: <T uk="Чого тут немає" en="What this is not" ru="Чего здесь нет"
                      de="Was hier fehlt" es="Lo que no está aquí" fr="Ce qui n'y est pas"
                      pl="Czego tu nie ma" ptBR="O que não está aqui" zh="这里没有什么" />,
                p: <T uk="Це розробники на GitHub, а не весь IT-ринок. Дизайнери, тестувальники, аналітики й менеджери туди майже не заходять. Частина людей взагалі не вказує місто."
                      en="These are developers on GitHub, not the whole IT market. Designers, QA, analysts and managers are barely there, and many people give no location at all."
                      ru="Это разработчики на GitHub, а не весь IT-рынок. Дизайнеры, тестировщики, аналитики и менеджеры туда почти не заходят. Часть людей вообще не указывает город."
                      de="Das sind Entwickler auf GitHub, nicht der gesamte IT-Markt. Designer, QA, Analysten und Manager sind dort kaum vertreten, viele geben gar keinen Ort an."
                      es="Son desarrolladores en GitHub, no todo el mercado IT. Diseñadores, QA, analistas y gerentes casi no están, y muchos no indican ciudad."
                      fr="Ce sont des développeurs sur GitHub, pas tout le marché IT. Les designers, QA, analystes et managers y sont rares, et beaucoup n'indiquent aucune ville."
                      pl="To programiści na GitHubie, a nie cały rynek IT. Projektantów, testerów, analityków i menedżerów prawie tam nie ma, a wielu w ogóle nie podaje miasta."
                      ptBR="São desenvolvedores no GitHub, não todo o mercado de TI. Designers, QA, analistas e gestores quase não estão lá, e muitos não informam cidade."
                      zh="这些是 GitHub 上的开发者，而非整个 IT 市场。设计师、测试、分析师和管理者几乎不在其中，许多人也未填写所在城市。" />,
              },
              {
                h: <T uk="Без персональних даних" en="No personal data" ru="Без персональных данных"
                      de="Keine personenbezogenen Daten" es="Sin datos personales"
                      fr="Aucune donnée personnelle" pl="Bez danych osobowych"
                      ptBR="Sem dados pessoais" zh="不含个人数据" />,
                p: <T uk="На цій сторінці немає імен, пошти й посилань на конкретних людей — лише агреговані числа. Так і залишиться."
                      en="This page carries no names, no emails and no links to individuals — only aggregate numbers. That will not change."
                      ru="На этой странице нет имён, почты и ссылок на конкретных людей — только агрегированные числа. Так и останется."
                      de="Diese Seite enthält keine Namen, keine E-Mails und keine Links zu Einzelpersonen — nur aggregierte Zahlen. Das bleibt so."
                      es="Esta página no contiene nombres, correos ni enlaces a personas concretas — solo cifras agregadas. Así seguirá."
                      fr="Cette page ne contient ni noms, ni e-mails, ni liens vers des personnes — uniquement des chiffres agrégés. Cela ne changera pas."
                      pl="Na tej stronie nie ma imion, adresów e-mail ani odnośników do konkretnych osób — tylko zagregowane liczby. Tak zostanie."
                      ptBR="Esta página não traz nomes, e-mails nem links para pessoas específicas — apenas números agregados. E assim continuará."
                      zh="本页不含姓名、邮箱或指向具体个人的链接，只有汇总数字。今后也是如此。" />,
              },
            ].map((card, i) => (
              <div key={i}
                   className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.04]">
                <h3 className="font-semibold text-neutral-900 dark:text-neutral-50">{card.h}</h3>
                <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">{card.p}</p>
              </div>
            ))}
          </div>

          <p className="mt-8 text-sm text-neutral-400 dark:text-neutral-500">
            <T uk="Дані зібрано" en="Data collected" ru="Данные собраны" de="Daten erhoben"
               es="Datos recogidos" fr="Données collectées" pl="Dane zebrane"
               ptBR="Dados coletados" zh="数据采集于" />{" "}
            <span className="tabular-nums">{D.generated}</span> · A1
          </p>
        </Section>
      </div>
    </div>
  );
}
