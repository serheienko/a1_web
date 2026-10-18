// lib/events/ui.ts -- статичные тексты интерфейса раздела «Події» на всех 9 языках.
//
// 18.10.2026 (Александр: «статику в ивентах надо перевести на 9 языков; названия и описания событий не трогаем»).
// Названия, описания, города и страны событий остаются на двух языках (uk/en, как в данных) --
// здесь только кнопки, фильтры, заголовки, подписи и шаблоны заголовков подборок.
// Порядок переводов в массиве: [uk, en, ru, de, es, fr, pl, ptBR, zh]. Новую строку добавляйте сразу на все 9.

import { LOCALES, type Locale } from "@/components/t";
import type { EvLang } from "./types";

type Nine = readonly [string, string, string, string, string, string, string, string, string];

const K = {
  // регионы и общие слова
  all: ["Усі", "All", "Все", "Alle", "Todos", "Tous", "Wszystkie", "Todos", "全部"],
  ua: ["Україна", "Ukraine", "Украина", "Ukraine", "Ucrania", "Ukraine", "Ukraina", "Ucrânia", "乌克兰"],
  eu: ["Європа", "Europe", "Европа", "Europa", "Europa", "Europe", "Europa", "Europa", "欧洲"],
  online: ["Онлайн", "Online", "Онлайн", "Online", "Online", "En ligne", "Online", "Online", "线上"],
  world: ["Світ", "World", "Мир", "Welt", "Mundo", "Monde", "Świat", "Mundo", "全球"],
  onlineLower: ["онлайн", "online", "онлайн", "online", "en línea", "en ligne", "online", "online", "线上"],
  free: ["Безкоштовно", "Free", "Бесплатно", "Kostenlos", "Gratis", "Gratuit", "Bezpłatnie", "Grátis", "免费"],
  // главная
  h1: ["IT-події", "Tech events", "IT-события", "Tech-Events", "Eventos tech", "Événements tech", "Wydarzenia IT", "Eventos de tecnologia", "技术活动"],
  lead: [
    "Календар IT-конференцій і мітапів: Україна, Європа, світ та онлайн. Дати, місця, теми й наш короткий опис кожної події.",
    "A calendar of tech conferences and meetups: Ukraine, Europe, worldwide and online. Dates, places, topics and our short take on every event.",
    "Календарь IT-конференций и митапов: Украина, Европа, мир и онлайн. Даты, места, темы и наше короткое описание каждого события.",
    "Kalender für Tech-Konferenzen und Meetups: Ukraine, Europa, weltweit und online. Termine, Orte, Themen und unsere kurze Einschätzung zu jedem Event.",
    "Calendario de conferencias y meetups tech: Ucrania, Europa, el mundo y online. Fechas, lugares, temas y nuestra breve reseña de cada evento.",
    "Calendrier des conférences et meetups tech : Ukraine, Europe, monde entier et en ligne. Dates, lieux, thèmes et notre court résumé de chaque événement.",
    "Kalendarz konferencji i meetupów IT: Ukraina, Europa, świat i online. Daty, miejsca, tematy i nasz krótki opis każdego wydarzenia.",
    "Calendário de conferências e meetups de tecnologia: Ucrânia, Europa, o mundo e online. Datas, locais, temas e nossa breve análise de cada evento.",
    "技术大会与聚会日历：乌克兰、欧洲、全球及线上。日期、地点、主题，以及我们对每场活动的简短介绍。",
  ],
  searchPh: ["Країна, місто або назва", "Country, city or name", "Страна, город или название", "Land, Stadt oder Name", "País, ciudad o nombre", "Pays, ville ou nom", "Kraj, miasto lub nazwa", "País, cidade ou nome", "国家、城市或名称"],
  clear: ["Очистити", "Clear", "Очистить", "Löschen", "Borrar", "Effacer", "Wyczyść", "Limpar", "清除"],
  allTopics: ["Усі теми", "All topics", "Все темы", "Alle Themen", "Todos los temas", "Tous les sujets", "Wszystkie tematy", "Todos os temas", "全部主题"],
  allCats: ["Усі категорії", "All categories", "Все категории", "Alle Kategorien", "Todas las categorías", "Toutes les catégories", "Wszystkie kategorie", "Todas as categorias", "全部类别"],
  category: ["Категорія", "Category", "Категория", "Kategorie", "Categoría", "Catégorie", "Kategoria", "Categoria", "类别"],
  region: ["Регіон", "Region", "Регион", "Region", "Región", "Région", "Region", "Região", "地区"],
  topic: ["Тема", "Topic", "Тема", "Thema", "Tema", "Sujet", "Temat", "Tema", "主题"],
  soon: ["Найближчі", "Coming up", "Ближайшие", "Demnächst", "Próximamente", "À venir", "Wkrótce", "Em breve", "即将举行"],
  today: ["Сьогодні", "Today", "Сегодня", "Heute", "Hoy", "Aujourd'hui", "Dzisiaj", "Hoje", "今天"],
  noDay: [
    "Цього дня подій немає. Ось найближчі:", "No events on this day. Coming up next:", "В этот день событий нет. Вот ближайшие:",
    "An diesem Tag gibt es keine Events. Als Nächstes:", "No hay eventos ese día. Los próximos:", "Aucun événement ce jour-là. Prochainement :",
    "Tego dnia nie ma wydarzeń. Najbliższe:", "Não há eventos neste dia. Os próximos:", "当天没有活动。接下来的活动：",
  ],
  dayEvents: ["Події дня", "Events on this day", "События дня", "Events an diesem Tag", "Eventos del día", "Événements du jour", "Wydarzenia tego dnia", "Eventos do dia", "当日活动"],
  events: ["Події", "Events", "События", "Events", "Eventos", "Événements", "Wydarzenia", "Eventos", "活动"],
  nothing: [
    "За цими фільтрами нічого немає. Спробуйте змінити регіон або тему.", "Nothing matches these filters. Try another region or topic.",
    "По этим фильтрам ничего нет. Попробуйте сменить регион или тему.", "Mit diesen Filtern gibt es nichts. Probiere eine andere Region oder ein anderes Thema.",
    "Nada coincide con estos filtros. Prueba otra región u otro tema.", "Rien ne correspond à ces filtres. Essayez une autre région ou un autre sujet.",
    "Nic nie pasuje do tych filtrów. Spróbuj innego regionu lub tematu.", "Nada corresponde a esses filtros. Tente outra região ou outro tema.", "没有符合这些筛选条件的活动。请换个地区或主题试试。",
  ],
  list: [
    "Усі найближчі події", "All upcoming events", "Все ближайшие события", "Alle kommenden Events", "Todos los próximos eventos",
    "Tous les événements à venir", "Wszystkie nadchodzące wydarzenia", "Todos os próximos eventos", "所有即将举行的活动",
  ],
  // карта
  mapNone: ["Подій на карті немає", "No events on the map", "На карте событий нет", "Keine Events auf der Karte", "No hay eventos en el mapa", "Aucun événement sur la carte", "Brak wydarzeń na mapie", "Não há eventos no mapa", "地图上没有活动"],
  mapHint: ["Натисніть на країну", "Click a country", "Нажмите на страну", "Land anklicken", "Haz clic en un país", "Cliquez sur un pays", "Kliknij kraj", "Clique em um país", "点击国家"],
  showAll: ["Усі країни", "All countries", "Все страны", "Alle Länder", "Todos los países", "Tous les pays", "Wszystkie kraje", "Todos os países", "全部国家"],
  hide: ["Згорнути", "Collapse", "Свернуть", "Einklappen", "Contraer", "Réduire", "Zwiń", "Recolher", "收起"],
  onlineHint: [
    "Онлайн-події: без країни, дивитись можна звідки завгодно", "Online events: no country, watch from anywhere", "Онлайн-события: без страны, смотреть можно откуда угодно",
    "Online-Events: ohne Land, von überall aus ansehbar", "Eventos online: sin país, se pueden seguir desde cualquier lugar", "Événements en ligne : sans pays, à suivre de n'importe où",
    "Wydarzenia online: bez kraju, można oglądać z dowolnego miejsca", "Eventos online: sem país, para assistir de qualquer lugar", "线上活动：不限国家，可在任何地方观看",
  ],
  // страница события
  when: ["Коли", "When", "Когда", "Wann", "Cuándo", "Quand", "Kiedy", "Quando", "时间"],
  where: ["Де", "Where", "Где", "Wo", "Dónde", "Où", "Gdzie", "Onde", "地点"],
  format: ["Формат", "Format", "Формат", "Format", "Formato", "Format", "Format", "Formato", "形式"],
  price: ["Вартість", "Price", "Стоимость", "Preis", "Precio", "Prix", "Cena", "Preço", "价格"],
  progLang: ["Мова програми", "Program language", "Язык программы", "Programmsprache", "Idioma del programa", "Langue du programme", "Język programu", "Idioma do programa", "活动语言"],
  go: ["Перейти на сайт події", "Go to the event site", "Перейти на сайт события", "Zur Event-Website", "Ir al sitio del evento", "Aller sur le site de l'événement", "Przejdź na stronę wydarzenia", "Ir ao site do evento", "前往活动官网"],
  ics: ["Додати в календар", "Add to calendar", "Добавить в календарь", "Zum Kalender hinzufügen", "Añadir al calendario", "Ajouter au calendrier", "Dodaj do kalendarza", "Adicionar ao calendário", "添加到日历"],
  ended: [
    "Подія вже відбулася", "This event has already taken place", "Событие уже состоялось", "Dieses Event hat bereits stattgefunden", "Este evento ya tuvo lugar",
    "Cet événement a déjà eu lieu", "To wydarzenie już się odbyło", "Este evento já aconteceu", "该活动已经结束",
  ],
  editions: ["Усі видання", "All editions", "Все издания", "Alle Ausgaben", "Todas las ediciones", "Toutes les éditions", "Wszystkie edycje", "Todas as edições", "历届活动"],
  similar: ["Схожі події", "Similar events", "Похожие события", "Ähnliche Events", "Eventos similares", "Événements similaires", "Podobne wydarzenia", "Eventos semelhantes", "相似活动"],
  cfp: ["Приймають доповіді", "Call for papers is open", "Принимают доклады", "Call for Papers ist geöffnet", "Convocatoria de ponencias abierta", "Appel à communications ouvert", "Trwa nabór referatów", "Chamada de trabalhos aberta", "正在征集演讲"],
  cfpUntil: ["до", "until", "до", "bis", "hasta", "jusqu'au", "do", "até", "截止"],
  cfpGo: ["Подати доповідь", "Submit a talk", "Подать доклад", "Vortrag einreichen", "Enviar una charla", "Proposer une conférence", "Zgłoś referat", "Enviar uma palestra", "提交演讲"],
  jobs: ["Вакансії по темі", "Jobs on this topic", "Вакансии по теме", "Jobs zum Thema", "Vacantes sobre este tema", "Offres sur ce sujet", "Oferty pracy w tym temacie", "Vagas sobre este tema", "相关职位"],
  jobsLead: [
    "Шукаєте роботу в цій темі? Відкриті вакансії:", "Looking for a job in this area? Open vacancies:", "Ищете работу в этой теме? Открытые вакансии:",
    "Suchst du einen Job in diesem Bereich? Offene Stellen:", "¿Buscas trabajo en este ámbito? Vacantes abiertas:", "Vous cherchez un poste dans ce domaine ? Offres ouvertes :",
    "Szukasz pracy w tym obszarze? Otwarte oferty:", "Procurando vaga nessa área? Vagas abertas:", "想在这个领域找工作？开放职位：",
  ],
  src: ["Дані про подію", "Event data", "Данные о событии", "Eventdaten", "Datos del evento", "Données de l'événement", "Dane o wydarzeniu", "Dados do evento", "活动数据"],
  note: [
    "Перед поїздкою перевірте дату й ціну на сайті організатора.", "Please check the date and price on the organiser's site before you go.",
    "Перед поездкой проверьте дату и цену на сайте организатора.", "Bitte prüfe vor der Reise Datum und Preis auf der Website des Veranstalters.",
    "Antes de viajar, comprueba la fecha y el precio en el sitio del organizador.", "Avant de partir, vérifiez la date et le prix sur le site de l'organisateur.",
    "Przed wyjazdem sprawdź datę i cenę na stronie organizatora.", "Antes de ir, confira a data e o preço no site do organizador.", "出行前请在主办方网站上确认日期和价格。",
  ],
  // подборки
  upcoming: ["Найближчі події", "Upcoming events", "Ближайшие события", "Kommende Events", "Próximos eventos", "Événements à venir", "Nadchodzące wydarzenia", "Próximos eventos", "即将举行的活动"],
  archive: ["Архів", "Archive", "Архив", "Archiv", "Archivo", "Archives", "Archiwum", "Arquivo", "往期"],
  collNone: [
    "Найближчих дат поки немає. Ми стежимо за оновленнями й додамо їх одразу, як організатори оголосять нове видання.",
    "No upcoming dates yet. We watch for updates and add the next edition as soon as the organisers announce it.",
    "Ближайших дат пока нет. Мы следим за обновлениями и добавим их сразу, как организаторы объявят новое издание.",
    "Noch keine kommenden Termine. Wir beobachten Neuigkeiten und tragen die nächste Ausgabe ein, sobald die Veranstalter sie ankündigen.",
    "Aún no hay próximas fechas. Seguimos las novedades y añadiremos la siguiente edición en cuanto los organizadores la anuncien.",
    "Pas encore de dates à venir. Nous suivons les annonces et ajouterons la prochaine édition dès que les organisateurs la dévoileront.",
    "Na razie brak nadchodzących terminów. Śledzimy nowości i dodamy kolejną edycję, gdy tylko organizatorzy ją ogłoszą.",
    "Ainda não há próximas datas. Acompanhamos as novidades e vamos adicionar a próxima edição assim que os organizadores a anunciarem.",
    "暂时还没有即将举行的日期。我们会持续关注，主办方一公布新一届就会添加。",
  ],
  topics: ["Інші теми", "Other topics", "Другие темы", "Weitere Themen", "Otros temas", "Autres sujets", "Inne tematy", "Outros temas", "其他主题"],
  places: ["Інші міста й країни", "Other cities and countries", "Другие города и страны", "Weitere Städte und Länder", "Otras ciudades y países", "Autres villes et pays", "Inne miasta i kraje", "Outras cidades e países", "其他城市和国家"],
  allEvents: ["Усі події", "All events", "Все события", "Alle Events", "Todos los eventos", "Tous les événements", "Wszystkie wydarzenia", "Todos os eventos", "全部活动"],
  // формат события
  fmtConference: ["Конференція", "Conference", "Конференция", "Konferenz", "Conferencia", "Conférence", "Konferencja", "Conferência", "大会"],
  fmtMeetup: ["Мітап", "Meetup", "Митап", "Meetup", "Meetup", "Meetup", "Meetup", "Meetup", "聚会"],
  fmtWorkshop: ["Воркшоп", "Workshop", "Воркшоп", "Workshop", "Taller", "Atelier", "Warsztaty", "Workshop", "工作坊"],
  fmtCourse: ["Курс", "Course", "Курс", "Kurs", "Curso", "Cours", "Kurs", "Curso", "课程"],
  fmtOther: ["Подія", "Event", "Событие", "Event", "Evento", "Événement", "Wydarzenie", "Evento", "活动"],
  // категории
  catAi: ["ШІ та дані", "AI & Data", "ИИ и данные", "KI & Daten", "IA y datos", "IA et données", "AI i dane", "IA e dados", "AI 与数据"],
  catWeb: ["Веб", "Web", "Веб", "Web", "Web", "Web", "Web", "Web", "Web"],
  catMobile: ["Мобільна розробка", "Mobile", "Мобильная разработка", "Mobile Entwicklung", "Desarrollo móvil", "Développement mobile", "Rozwój mobilny", "Desenvolvimento mobile", "移动开发"],
  catCloud: ["Хмара та DevOps", "Cloud & DevOps", "Облако и DevOps", "Cloud & DevOps", "Nube y DevOps", "Cloud et DevOps", "Chmura i DevOps", "Nuvem e DevOps", "云与 DevOps"],
  catSecurity: ["Безпека", "Security", "Безопасность", "Sicherheit", "Seguridad", "Sécurité", "Bezpieczeństwo", "Segurança", "安全"],
  catLang: ["Мови програмування", "Languages", "Языки программирования", "Programmiersprachen", "Lenguajes de programación", "Langages de programmation", "Języki programowania", "Linguagens de programação", "编程语言"],
  catEmerging: ["Ігри, Web3, IoT", "Games, Web3, IoT", "Игры, Web3, IoT", "Games, Web3, IoT", "Juegos, Web3, IoT", "Jeux, Web3, IoT", "Gry, Web3, IoT", "Jogos, Web3, IoT", "游戏、Web3、物联网"],
  catProduct: ["Продукт і менеджмент", "Product & Management", "Продукт и менеджмент", "Produkt & Management", "Producto y gestión", "Produit et management", "Produkt i zarządzanie", "Produto e gestão", "产品与管理"],
  catDesign: ["Дизайн і якість", "Design & QA", "Дизайн и качество", "Design & QA", "Diseño y QA", "Design et QA", "Design i QA", "Design e QA", "设计与质量"],
  catCommunity: ["Спільнота та Open Source", "Community & Open Source", "Сообщество и Open Source", "Community & Open Source", "Comunidad y código abierto", "Communauté et Open Source", "Społeczność i Open Source", "Comunidade e Open Source", "社区与开源"],
  // шаблоны заголовков подборок: {name} {year} {label} {n} {shown}
  serNext: [
    "{name}: наступне видання — {year} рік. Тут зібрано дати, місце, теми й архів попередніх видань.",
    "{name}: the next edition is in {year}. Dates, venue, topics and the archive of earlier editions are collected here.",
    "{name}: следующее издание — {year} год. Здесь собраны даты, место, темы и архив прошлых изданий.",
    "{name}: Die nächste Ausgabe findet {year} statt. Hier findest du Termine, Ort, Themen und das Archiv früherer Ausgaben.",
    "{name}: la próxima edición es en {year}. Aquí reunimos fechas, sede, temas y el archivo de ediciones anteriores.",
    "{name} : la prochaine édition a lieu en {year}. Retrouvez ici les dates, le lieu, les thèmes et les archives des éditions précédentes.",
    "{name}: kolejna edycja odbędzie się w {year} roku. Zebraliśmy tu daty, miejsce, tematy i archiwum wcześniejszych edycji.",
    "{name}: a próxima edição será em {year}. Aqui reunimos datas, local, temas e o arquivo das edições anteriores.",
    "{name}：下一届将于 {year} 年举行。这里汇集了日期、地点、主题和往届存档。",
  ],
  serNone: [
    "{name}: усі видання, які ми знаємо. Щойно організатори оголосять нову дату, вона з’явиться тут.",
    "{name}: every edition we know of. As soon as the organisers announce a new date, it will appear here.",
    "{name}: все издания, о которых мы знаем. Как только организаторы объявят новую дату, она появится здесь.",
    "{name}: alle Ausgaben, die wir kennen. Sobald die Veranstalter einen neuen Termin ankündigen, erscheint er hier.",
    "{name}: todas las ediciones que conocemos. En cuanto los organizadores anuncien una nueva fecha, aparecerá aquí.",
    "{name} : toutes les éditions que nous connaissons. Dès que les organisateurs annonceront une nouvelle date, elle apparaîtra ici.",
    "{name}: wszystkie znane nam edycje. Gdy tylko organizatorzy ogłoszą nowy termin, pojawi się tutaj.",
    "{name}: todas as edições que conhecemos. Assim que os organizadores anunciarem uma nova data, ela aparecerá aqui.",
    "{name}：我们已知的所有届次。主办方一公布新日期，就会显示在这里。",
  ],
  topicTitle: [
    "{label}: конференції та мітапи", "{label} conferences and meetups", "{label}: конференции и митапы", "{label}-Konferenzen und Meetups",
    "Conferencias y meetups de {label}", "Conférences et meetups {label}", "Konferencje i meetupy: {label}", "Conferências e meetups de {label}", "{label} 大会与聚会",
  ],
  topicUp: [
    "Найближчих подій за темою «{label}»: {n}.", "Upcoming {label} events: {n}.", "Ближайших событий по теме «{label}»: {n}.",
    "Kommende Events zum Thema „{label}“: {n}.", "Próximos eventos sobre «{label}»: {n}.", "Événements à venir sur « {label} » : {n}.",
    "Nadchodzących wydarzeń na temat „{label}”: {n}.", "Próximos eventos sobre “{label}”: {n}.", "“{label}”主题的即将举行活动：{n} 场。",
  ],
  topicNone: [
    "Найближчих подій за темою «{label}» поки немає.", "No upcoming {label} events yet.", "Ближайших событий по теме «{label}» пока нет.",
    "Zum Thema „{label}“ gibt es noch keine kommenden Events.", "Aún no hay próximos eventos sobre «{label}».", "Aucun événement à venir sur « {label} » pour le moment.",
    "Na razie brak nadchodzących wydarzeń na temat „{label}”.", "Ainda não há próximos eventos sobre “{label}”.", "“{label}”主题暂时没有即将举行的活动。",
  ],
  topicTail: [
    "Дати, міста й короткий опис кожної; архів минулих видань нижче.", "Dates, cities and a short take on each; the archive of earlier editions is below.",
    "Даты, города и короткое описание каждого; архив прошлых изданий ниже.", "Termine, Städte und eine kurze Einschätzung zu jedem; das Archiv früherer Ausgaben steht unten.",
    "Fechas, ciudades y una breve reseña de cada uno; el archivo de ediciones anteriores está abajo.", "Dates, villes et court résumé de chacun ; les archives des éditions précédentes sont plus bas.",
    "Daty, miasta i krótki opis każdego; archiwum wcześniejszych edycji poniżej.", "Datas, cidades e uma breve análise de cada um; o arquivo de edições anteriores está abaixo.", "每场活动的日期、城市和简短介绍；往届存档见下方。",
  ],
  placeTitle: [
    "IT-події: {label}", "Tech events in {label}", "IT-события: {label}", "Tech-Events: {label}", "Eventos tech en {label}",
    "Événements tech : {label}", "Wydarzenia IT: {label}", "Eventos de tecnologia em {label}", "{label}的技术活动",
  ],
  placeUp: [
    "Найближчих IT-подій: {n}.", "Upcoming tech events: {n}.", "Ближайших IT-событий: {n}.", "Kommende Tech-Events: {n}.", "Próximos eventos tech: {n}.",
    "Événements tech à venir : {n}.", "Nadchodzących wydarzeń IT: {n}.", "Próximos eventos de tecnologia: {n}.", "即将举行的技术活动：{n} 场。",
  ],
  placeNone: [
    "Найближчих дат поки немає.", "No upcoming dates yet.", "Ближайших дат пока нет.", "Noch keine kommenden Termine.", "Aún no hay próximas fechas.",
    "Pas encore de dates à venir.", "Na razie brak nadchodzących terminów.", "Ainda não há próximas datas.", "暂时没有即将举行的日期。",
  ],
  placeTail: [
    "{shown} — конференції, мітапи й воркшопи з датами, темами та коротким описом.", "{shown} — conferences, meetups and workshops with dates, topics and a short take on each.",
    "{shown} — конференции, митапы и воркшопы с датами, темами и коротким описанием.", "{shown} — Konferenzen, Meetups und Workshops mit Terminen, Themen und kurzer Einschätzung.",
    "{shown} — conferencias, meetups y talleres con fechas, temas y una breve reseña.", "{shown} — conférences, meetups et ateliers avec dates, thèmes et court résumé.",
    "{shown} — konferencje, meetupy i warsztaty z datami, tematami i krótkim opisem.", "{shown} — conferências, meetups e workshops com datas, temas e uma breve análise.",
    "{shown}——大会、聚会和工作坊，含日期、主题和简短介绍。",
  ],
} satisfies Record<string, Nine>;

export type UiKey = keyof typeof K;

const INDEX: Record<Locale, number> = { uk: 0, en: 1, ru: 2, de: 3, es: 4, fr: 5, pl: 6, ptBR: 7, zh: 8 };

/** Один текст на языке locale. */
export function ui(key: UiKey, locale: Locale): string {
  return K[key][INDEX[locale]] ?? K[key][1];
}

/** Тот же текст на всех 9 языках -- для <T {...tt("go")} /> в серверных компонентах. */
export function tt(key: UiKey): Record<Locale, string> {
  const out = {} as Record<Locale, string>;
  for (const l of LOCALES) out[l] = ui(key, l);
  return out;
}

/** Текст с подстановкой {name}, {n}…: на всех 9 языках. */
export function ttf(key: UiKey, vars: Record<string, string | number>): Record<Locale, string> {
  const out = {} as Record<Locale, string>;
  for (const l of LOCALES) out[l] = fill(ui(key, l), vars);
  return out;
}

export function fill(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));
}

/** Все тексты одного языка (для клиентских компонентов, где строки идут в aria-label и placeholder). */
export function uiFor(locale: Locale): Record<UiKey, string> {
  const out = {} as Record<UiKey, string>;
  for (const k of Object.keys(K) as UiKey[]) out[k] = ui(k, locale);
  return out;
}

/**
 * Язык интерфейса на странице события. Страница uk показывает uk или ru, страница en -- остальные семь;
 * данные (названия, описания) остаются на языке страницы. `active` -- язык, выбранный на сайте (useActiveLocale).
 */
export function evLocale(lang: EvLang, active: Locale): Locale {
  if (lang === "uk") return active === "ru" ? "ru" : "uk";
  return active === "uk" || active === "ru" ? "en" : active;
}

export const CAT_KEY: Record<string, UiKey> = {
  ai: "catAi", web: "catWeb", mobile: "catMobile", cloud: "catCloud", security: "catSecurity",
  lang: "catLang", emerging: "catEmerging", product: "catProduct", design: "catDesign", community: "catCommunity",
};
export const FMT_KEY: Record<string, UiKey> = {
  conference: "fmtConference", meetup: "fmtMeetup", workshop: "fmtWorkshop", course: "fmtCourse", other: "fmtOther",
};
