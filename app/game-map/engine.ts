// @ts-nocheck
// app/game-map/engine.ts -- игровая карта A1, версия 2 (02.10.2026).
//
// Александр: новые упрощённые ассеты (light/dark, 89 штук), основа карты
// рисуется кодом («пока нарисуем кодом, а потом, если что, подменим фон»),
// ~50 живых компаний разного размера, карточка компании прямо возле
// здания, «оживление» (облака с тенями, туман, свет, птицы, корабли).
//
// Основа -- векторная: границы стран Natural Earth 10m в варианте точки
// зрения Украины (Крым -- Украина), упрощены и спроецированы заранее
// (public/game-map/v2/geo.json). Поэтому при любом приближении резко.
// Готовую картинку-фон можно подставить позже через opts.baseImage.
//
// Без фреймворка: mountGameMap(root, opts) возвращает функцию очистки.

import { getMapMusic } from './music';
import CITY_I18N_JSON from './city-names.json';

export type MapCompany = {
  id: string;
  name: string;
  username: string | null;
  avatar: string | null;
  n: number; // число живых вакансий
  city: string;
  lng: number;
  lat: number;
  jobs: { title: string; slug: string }[];
  userId?: string | null;
  bio?: string | null;
  website?: string | null;
  employees?: number | null;
  est?: number | null;
  occupation?: string | null;
  /** світова компанія з зовнішніми вакансіями (за кордоном -- пін, будинок лише зблизька) */
  ext?: boolean;
  /** країна офісу (ISO-2): вибір країни у списку регіонів */
  cc?: string;
  /** 07.10.2026: пін-кластер «+N компаній» у місті (коли офісів більше за ліміт карти) */
  cluster?: boolean;
  /** скільки компаній у кластері */
  cos?: number;
  /** назви компаній кластера -- для пошуку карти */
  names?: string[];
};

/** Країна у списку регіонів карти: код, регіон-підкладка, скільки вакансій. */
export type MapCountry = { cc: string; r: 'ua' | 'eu' | 'us' | 'latam' | 'asia' | 'oceania' | 'mideast'; n: number };

const LEVELS = [1, 2, 4, 6, 10, 15, 25, 40]; // от скольких вакансий уровень 1..8
const SIZE = [22, 25, 29, 33, 38, 44, 51, 60]; // ширина здания в единицах карты
const PINS = ['pin-sky-blue', 'pin-mint', 'pin-orange', 'pin-pink', 'pin-teal', 'pin-yellow'];

const PAL = {
  light: {
    sea: '#2f7f9e', sea2: '#1f6386', shallow: 'rgba(170,225,225,.55)', wave: 'rgba(255,255,255,.35)',
    land: '#93aa6c', land2: '#88a062', ua: '#d3dc76', ua2: '#bccb5c',
    border: '#e0b252', borderDark: 'rgba(90,60,20,.55)', uaBorder: '#f3c95a',
    river: '#4ea3c8', lake: '#3d93b8', label: 'rgba(60,45,25,.55)', fog: '246,239,222',
    light: 'rgba(255,214,140,', vignette: 'rgba(40,60,40,', fogA: 0.28,
  },
  dark: {
    sea: '#0f2a43', sea2: '#0a1d31', shallow: 'rgba(80,140,170,.35)', wave: 'rgba(170,210,255,.18)',
    land: '#2f4a3a', land2: '#27402f', ua: '#4d6a3c', ua2: '#425c33',
    border: '#b98a3d', borderDark: 'rgba(0,0,0,.55)', uaBorder: '#e2b456',
    river: '#2f6f95', lake: '#22597c', label: 'rgba(220,210,180,.5)', fog: '20,30,48',
    light: 'rgba(150,170,255,', vignette: 'rgba(5,10,20,', fogA: 0.5,
  },
};

// ---------- мови (02.10.2026, Александр: «зміна локалізації має одразу міняти інтерфейс карти») ----------
const TAG = { uk: 'uk', en: 'en', ru: 'ru', de: 'de', es: 'es', fr: 'fr', pl: 'pl', ptBR: 'pt-BR', zh: 'zh-CN' };
const STR = {
  uk: { rUa: '🇺🇦 Україна', rEu: '🇪🇺 Європа', rUs: '🇺🇸 США і Канада', rLatam: '🌎 Латинська Америка', rAsia: '🌏 Азія', rOceania: '🦘 Океанія', rMideast: '🕌 Близький Схід', offMap: 'Не відображено на карті: у профілі не вказана локація', allyOff: 'Прибрати з союзників', allyGone: 'Прибрано з союзників', allyGoneSub: 'Більше не у ваших контактах', allyDone: 'Додано в союзники', allyDoneSub: 'Тепер у ваших контактах', title: 'Карта A1', find: 'Пошук', fsOn: 'На весь екран', fsOff: 'Вийти з повного екрана', zin: 'Приблизити', zout: 'Віддалити', say: 'Наведи на будиночок — покажу, хто там працює', load: 'Завантажуємо карту…', profile: 'Відкрити профіль', since: 'з {y} року', close: 'Закрити', allyOn: 'Ваш союзник (у контактах)', allyAdd: 'Додати в союзники — з’явиться у ваших контактах', allyErr: 'Не вдалося додати, спробуйте ще раз', none: 'Нічого не знайшли', day: '☀ День', eve: '☾ Вечір', vac: { one: 'вакансія', few: 'вакансії', many: 'вакансій', other: 'вакансії' }, emp: { one: 'співробітник', few: 'співробітники', many: 'співробітників', other: 'співробітника' }, cos: { one: 'компанія', few: 'компанії', many: 'компаній', other: 'компанії' }, sayHouse: "Розмір будинку залежить від кількості відкритих вакансій і розміру команди, який вказала компанія.", gTitle: "Довідник", gSizeT: "Розмір будинку", gSizeD: "Залежить від відкритих вакансій і розміру команди, який вказала компанія.", gPinsT: "Булавки", gPinsD: "Здалеку багато компаній показано кольоровими булавками. Наблизьте, і з’являться будинки.", gAllyT: "Союзники", gAllyD: "Якщо ви додали компанію чи людину в союзники, на її будинку з’являється значок." },
  ru: { rUa: '🇺🇦 Украина', rEu: '🇪🇺 Европа', rUs: '🇺🇸 США и Канада', rLatam: '🌎 Латинская Америка', rAsia: '🌏 Азия', rOceania: '🦘 Океания', rMideast: '🕌 Ближний Восток', offMap: 'Не отображено на карте: в профиле не указана локация', allyOff: 'Убрать из союзников', allyGone: 'Убрано из союзников', allyGoneSub: 'Больше не в ваших контактах', allyDone: 'Добавлено в союзники', allyDoneSub: 'Теперь в ваших контактах', title: 'Карта A1', find: 'Поиск', fsOn: 'На весь экран', fsOff: 'Выйти из полноэкранного режима', zin: 'Приблизить', zout: 'Отдалить', say: 'Наведи на домик — покажу, кто там работает', load: 'Загружаем карту…', profile: 'Открыть профиль', since: 'с {y} года', close: 'Закрыть', allyOn: 'Ваш союзник (в контактах)', allyAdd: 'Добавить в союзники — появится в ваших контактах', allyErr: 'Не удалось добавить, попробуйте ещё раз', none: 'Ничего не нашли', day: '☀ День', eve: '☾ Вечер', vac: { one: 'вакансия', few: 'вакансии', many: 'вакансий', other: 'вакансии' }, emp: { one: 'сотрудник', few: 'сотрудника', many: 'сотрудников', other: 'сотрудника' }, cos: { one: 'компания', few: 'компании', many: 'компаний', other: 'компании' }, sayHouse: "Размер дома зависит от числа открытых вакансий и размера команды, который указала компания.", gTitle: "Справочник", gSizeT: "Размер дома", gSizeD: "Зависит от открытых вакансий и размера команды, который указала компания.", gPinsT: "Булавки", gPinsD: "Издалека многие компании показаны цветными булавками. Приблизьте, и появятся дома.", gAllyT: "Союзники", gAllyD: "Если вы добавили компанию или человека в союзники, на их доме появляется значок." },
  en: { rUa: '🇺🇦 Ukraine', rEu: '🇪🇺 Europe', rUs: '🇺🇸 US & Canada', rLatam: '🌎 Latin America', rAsia: '🌏 Asia', rOceania: '🦘 Oceania', rMideast: '🕌 Middle East', offMap: 'Not shown on the map: no location in the profile', allyOff: 'Remove from allies', allyGone: 'Removed from allies', allyGoneSub: 'No longer in your contacts', allyDone: 'Added to allies', allyDoneSub: 'Now in your contacts', title: 'A1 Map', find: 'Search', fsOn: 'Full screen', fsOff: 'Exit full screen', zin: 'Zoom in', zout: 'Zoom out', say: 'Hover over a house — I’ll show you who works there', load: 'Loading the map…', profile: 'Open profile', since: 'since {y}', close: 'Close', allyOn: 'Your ally (in contacts)', allyAdd: 'Add as an ally — they’ll appear in your contacts', allyErr: 'Couldn’t add, please try again', none: 'Nothing found', day: '☀ Day', eve: '☾ Evening', vac: { one: 'job', other: 'jobs' }, emp: { one: 'employee', other: 'employees' }, cos: { one: 'company', other: 'companies' }, sayHouse: "A house’s size depends on the company’s open jobs and the team size it has stated.", gTitle: "Glossary", gSizeT: "House size", gSizeD: "Depends on the open jobs and the team size the company has stated.", gPinsT: "Pins", gPinsD: "From afar, many companies appear as colored pins. Zoom in to see their houses.", gAllyT: "Allies", gAllyD: "If you add a company or person as an ally, a badge appears on their house." },
  de: { rUa: '🇺🇦 Ukraine', rEu: '🇪🇺 Europa', rUs: '🇺🇸 USA & Kanada', rLatam: '🌎 Lateinamerika', rAsia: '🌏 Asien', rOceania: '🦘 Ozeanien', rMideast: '🕌 Naher Osten', offMap: 'Nicht auf der Karte: kein Standort im Profil', allyOff: 'Aus Verbündeten entfernen', allyGone: 'Aus Verbündeten entfernt', allyGoneSub: 'Nicht mehr in deinen Kontakten', allyDone: 'Als Verbündeter hinzugefügt', allyDoneSub: 'Jetzt in deinen Kontakten', title: 'A1-Karte', find: 'Suche', fsOn: 'Vollbild', fsOff: 'Vollbild beenden', zin: 'Vergrößern', zout: 'Verkleinern', say: 'Fahr über ein Haus – ich zeige dir, wer dort arbeitet', load: 'Karte wird geladen…', profile: 'Profil öffnen', since: 'seit {y}', close: 'Schließen', allyOn: 'Dein Verbündeter (in den Kontakten)', allyAdd: 'Als Verbündeten hinzufügen – erscheint in deinen Kontakten', allyErr: 'Hinzufügen fehlgeschlagen, bitte erneut versuchen', none: 'Nichts gefunden', day: '☀ Tag', eve: '☾ Abend', vac: { one: 'Stelle', other: 'Stellen' }, emp: { one: 'Mitarbeiter', other: 'Mitarbeiter' }, cos: { one: 'Unternehmen', other: 'Unternehmen' }, sayHouse: "Die Hausgröße hängt von den offenen Stellen und der vom Unternehmen angegebenen Teamgröße ab.", gTitle: "Glossar", gSizeT: "Hausgröße", gSizeD: "Hängt von den offenen Stellen und der vom Unternehmen angegebenen Teamgröße ab.", gPinsT: "Stecknadeln", gPinsD: "Aus der Ferne erscheinen viele Unternehmen als bunte Stecknadeln. Zoome hinein, um die Häuser zu sehen.", gAllyT: "Verbündete", gAllyD: "Fügst du ein Unternehmen oder eine Person als Verbündeten hinzu, erscheint ein Abzeichen auf dem Haus." },
  es: { rUa: '🇺🇦 Ucrania', rEu: '🇪🇺 Europa', rUs: '🇺🇸 EE. UU. y Canadá', rLatam: '🌎 América Latina', rAsia: '🌏 Asia', rOceania: '🦘 Oceanía', rMideast: '🕌 Oriente Medio', offMap: 'No aparece en el mapa: el perfil no indica ubicación', allyOff: 'Quitar de aliados', allyGone: 'Quitado de aliados', allyGoneSub: 'Ya no está en tus contactos', allyDone: 'Añadido a aliados', allyDoneSub: 'Ya está en tus contactos', title: 'Mapa de A1', find: 'Buscar', fsOn: 'Pantalla completa', fsOff: 'Salir de pantalla completa', zin: 'Acercar', zout: 'Alejar', say: 'Pasa el cursor sobre una casa: te muestro quién trabaja allí', load: 'Cargando el mapa…', profile: 'Abrir perfil', since: 'desde {y}', close: 'Cerrar', allyOn: 'Tu aliado (en contactos)', allyAdd: 'Añadir como aliado: aparecerá en tus contactos', allyErr: 'No se pudo añadir, inténtalo de nuevo', none: 'No se encontró nada', day: '☀ Día', eve: '☾ Noche', vac: { one: 'vacante', other: 'vacantes' }, emp: { one: 'empleado', other: 'empleados' }, cos: { one: 'empresa', other: 'empresas' }, sayHouse: "El tamaño de la casa depende de las vacantes abiertas y del tamaño del equipo que indicó la empresa.", gTitle: "Glosario", gSizeT: "Tamaño de la casa", gSizeD: "Depende de las vacantes abiertas y del tamaño del equipo que indicó la empresa.", gPinsT: "Chinchetas", gPinsD: "De lejos, muchas empresas aparecen como chinchetas de colores. Acerca el mapa para ver sus casas.", gAllyT: "Aliados", gAllyD: "Si añades una empresa o persona como aliado, aparece una insignia en su casa." },
  fr: { rUa: '🇺🇦 Ukraine', rEu: '🇪🇺 Europe', rUs: '🇺🇸 États-Unis et Canada', rLatam: '🌎 Amérique latine', rAsia: '🌏 Asie', rOceania: '🦘 Océanie', rMideast: '🕌 Moyen-Orient', offMap: 'Absent de la carte : aucun lieu dans le profil', allyOff: 'Retirer des alliés', allyGone: 'Retiré des alliés', allyGoneSub: 'N’est plus dans vos contacts', allyDone: 'Ajouté aux alliés', allyDoneSub: 'Maintenant dans vos contacts', title: 'Carte A1', find: 'Rechercher', fsOn: 'Plein écran', fsOff: 'Quitter le plein écran', zin: 'Zoom avant', zout: 'Zoom arrière', say: 'Survole une maison — je te montre qui y travaille', load: 'Chargement de la carte…', profile: 'Ouvrir le profil', since: 'depuis {y}', close: 'Fermer', allyOn: 'Votre allié (dans les contacts)', allyAdd: 'Ajouter comme allié — apparaîtra dans vos contacts', allyErr: 'Échec de l’ajout, réessayez', none: 'Aucun résultat', day: '☀ Jour', eve: '☾ Soir', vac: { one: 'offre', other: 'offres' }, emp: { one: 'employé', other: 'employés' }, cos: { one: 'entreprise', other: 'entreprises' }, sayHouse: "La taille de la maison dépend des offres ouvertes et de la taille d’équipe indiquée par l’entreprise.", gTitle: "Glossaire", gSizeT: "Taille de la maison", gSizeD: "Dépend des offres ouvertes et de la taille d’équipe indiquée par l’entreprise.", gPinsT: "Épingles", gPinsD: "De loin, de nombreuses entreprises apparaissent comme des épingles colorées. Zoomez pour voir leurs maisons.", gAllyT: "Alliés", gAllyD: "Si vous ajoutez une entreprise ou une personne comme alliée, un badge apparaît sur sa maison." },
  pl: { rUa: '🇺🇦 Ukraina', rEu: '🇪🇺 Europa', rUs: '🇺🇸 USA i Kanada', rLatam: '🌎 Ameryka Łacińska', rAsia: '🌏 Azja', rOceania: '🦘 Oceania', rMideast: '🕌 Bliski Wschód', offMap: 'Brak na mapie: w profilu nie podano lokalizacji', allyOff: 'Usuń z sojuszników', allyGone: 'Usunięto z sojuszników', allyGoneSub: 'Nie ma już w Twoich kontaktach', allyDone: 'Dodano do sojuszników', allyDoneSub: 'Teraz w Twoich kontaktach', title: 'Mapa A1', find: 'Szukaj', fsOn: 'Pełny ekran', fsOff: 'Wyjdź z pełnego ekranu', zin: 'Przybliż', zout: 'Oddal', say: 'Najedź na domek — pokażę, kto tam pracuje', load: 'Ładujemy mapę…', profile: 'Otwórz profil', since: 'od {y} r.', close: 'Zamknij', allyOn: 'Twój sojusznik (w kontaktach)', allyAdd: 'Dodaj jako sojusznika — pojawi się w Twoich kontaktach', allyErr: 'Nie udało się dodać, spróbuj ponownie', none: 'Nic nie znaleziono', day: '☀ Dzień', eve: '☾ Wieczór', vac: { one: 'oferta', few: 'oferty', many: 'ofert', other: 'oferty' }, emp: { one: 'pracownik', few: 'pracowników', many: 'pracowników', other: 'pracownika' }, cos: { one: 'firma', few: 'firmy', many: 'firm', other: 'firmy' }, sayHouse: "Wielkość domu zależy od liczby otwartych ofert i wielkości zespołu podanej przez firmę.", gTitle: "Słowniczek", gSizeT: "Wielkość domu", gSizeD: "Zależy od otwartych ofert i wielkości zespołu podanej przez firmę.", gPinsT: "Pinezki", gPinsD: "Z daleka wiele firm widać jako kolorowe pinezki. Przybliż, aby zobaczyć domy.", gAllyT: "Sojusznicy", gAllyD: "Jeśli dodasz firmę lub osobę jako sojusznika, na jej domu pojawi się odznaka." },
  ptBR: { rUa: '🇺🇦 Ucrânia', rEu: '🇪🇺 Europa', rUs: '🇺🇸 EUA e Canadá', rLatam: '🌎 América Latina', rAsia: '🌏 Ásia', rOceania: '🦘 Oceania', rMideast: '🕌 Oriente Médio', offMap: 'Fora do mapa: o perfil não informa a localização', allyOff: 'Remover dos aliados', allyGone: 'Removido dos aliados', allyGoneSub: 'Não está mais nos seus contatos', allyDone: 'Adicionado aos aliados', allyDoneSub: 'Agora nos seus contatos', title: 'Mapa do A1', find: 'Buscar', fsOn: 'Tela cheia', fsOff: 'Sair da tela cheia', zin: 'Aproximar', zout: 'Afastar', say: 'Passe o mouse sobre uma casa — mostro quem trabalha lá', load: 'Carregando o mapa…', profile: 'Abrir perfil', since: 'desde {y}', close: 'Fechar', allyOn: 'Seu aliado (nos contatos)', allyAdd: 'Adicionar como aliado — aparecerá nos seus contatos', allyErr: 'Não foi possível adicionar, tente novamente', none: 'Nada encontrado', day: '☀ Dia', eve: '☾ Noite', vac: { one: 'vaga', other: 'vagas' }, emp: { one: 'funcionário', other: 'funcionários' }, cos: { one: 'empresa', other: 'empresas' }, sayHouse: "O tamanho da casa depende das vagas abertas e do tamanho da equipe informado pela empresa.", gTitle: "Glossário", gSizeT: "Tamanho da casa", gSizeD: "Depende das vagas abertas e do tamanho da equipe informado pela empresa.", gPinsT: "Alfinetes", gPinsD: "De longe, muitas empresas aparecem como alfinetes coloridos. Aproxime para ver as casas.", gAllyT: "Aliados", gAllyD: "Se você adicionar uma empresa ou pessoa como aliada, um selo aparece na casa dela." },
  zh: { rUa: '🇺🇦 乌克兰', rEu: '🇪🇺 欧洲', rUs: '🇺🇸 美国和加拿大', rLatam: '🌎 拉丁美洲', rAsia: '🌏 亚洲', rOceania: '🦘 大洋洲', rMideast: '🕌 中东', offMap: '未显示在地图上：资料中未填写所在地', allyOff: '移除盟友', allyGone: '已移除盟友', allyGoneSub: '已不在你的联系人中', allyDone: '已添加为盟友', allyDoneSub: '已在你的联系人中', title: 'A1 地图', find: '搜索', fsOn: '全屏', fsOff: '退出全屏', zin: '放大', zout: '缩小', say: '把鼠标移到房子上——我告诉你谁在那里工作', load: '正在加载地图…', profile: '打开主页', since: '成立于 {y} 年', close: '关闭', allyOn: '你的盟友（已在联系人中）', allyAdd: '添加为盟友——将出现在你的联系人中', allyErr: '添加失败，请重试', none: '未找到', day: '☀ 白天', eve: '☾ 夜晚', vac: { other: '个职位' }, emp: { other: '名员工' }, cos: { other: '家公司' }, sayHouse: "房子的大小取决于公司的开放职位数量和公司填写的团队规模。", gTitle: "词汇表", gSizeT: "房子大小", gSizeD: "取决于开放职位数量和公司填写的团队规模。", gPinsT: "图钉", gPinsD: "缩小地图时，许多公司以彩色图钉显示。放大后即可看到房子。", gAllyT: "盟友", gAllyD: "把公司或个人添加为盟友后，其房子上会出现徽章。" },
};
// Міста: англійська назва (так приходить з бекенду) → [укр, рос, кит]. Латиниця -- англійською.
const CITY = {
  Kyiv: ['Київ', 'Киев', '基辅'], Lviv: ['Львів', 'Львов', '利沃夫'], Odesa: ['Одеса', 'Одесса', '敖德萨'], Kharkiv: ['Харків', 'Харьков', '哈尔科夫'],
  Dnipro: ['Дніпро', 'Днепр', '第聂伯'], Zaporizhzhia: ['Запоріжжя', 'Запорожье', '扎波罗热'], Vinnytsia: ['Вінниця', 'Винница', '文尼察'],
  'Ivano-Frankivsk': ['Івано-Франківськ', 'Ивано-Франковск', '伊万诺-弗兰科夫斯克'], Chernihiv: ['Чернігів', 'Чернигов', '切尔尼戈夫'], Poltava: ['Полтава', 'Полтава', '波尔塔瓦'],
  Uzhhorod: ['Ужгород', 'Ужгород', '乌日哥罗德'], Chernivtsi: ['Чернівці', 'Черновцы', '切尔诺夫策'], Zhytomyr: ['Житомир', 'Житомир', '日托米尔'], Cherkasy: ['Черкаси', 'Черкассы', '切尔卡瑟'],
  Mykolaiv: ['Миколаїв', 'Николаев', '尼古拉耶夫'], Kherson: ['Херсон', 'Херсон', '赫尔松'], Sumy: ['Суми', 'Сумы', '苏梅'], Rivne: ['Рівне', 'Ровно', '罗夫诺'],
  Lutsk: ['Луцьк', 'Луцк', '卢茨克'], Ternopil: ['Тернопіль', 'Тернополь', '捷尔诺波尔'], Khmelnytskyi: ['Хмельницький', 'Хмельницкий', '赫梅利尼茨基'],
  Kropyvnytskyi: ['Кропивницький', 'Кропивницкий', '克罗佩夫尼茨基'], 'Bila Tserkva': ['Біла Церква', 'Белая Церковь', '白采尔科维'], Irpin: ['Ірпінь', 'Ирпень', '伊尔平'],
  Brovary: ['Бровари', 'Бровары', '布罗瓦雷'], Mukachevo: ['Мукачево', 'Мукачево', '穆卡切沃'], Bucha: ['Буча', 'Буча', '布恰'], 'Kryvyi Rih': ['Кривий Ріг', 'Кривой Рог', '克里维里赫'],
  Kremenchuk: ['Кременчук', 'Кременчуг', '克列缅丘格'], Simferopol: ['Сімферополь', 'Симферополь', '辛菲罗波尔'], Mariupol: ['Маріуполь', 'Мариуполь', '马里乌波尔'],
  Sevastopol: ['Севастополь', 'Севастополь', '塞瓦斯托波尔'], 'Kamianets-Podilskyi': ['Кам’янець-Подільський', 'Каменец-Подольский', '卡缅涅茨-波多利斯基'],
};
const CITY_I18N = CITY_I18N_JSON;
const CITY_ALIAS = { kiev: 'Kyiv', odessa: 'Odesa', 'bila_tserkva': 'Bila Tserkva', 'dnepr': 'Dnipro', 'kharkov': 'Kharkiv', 'lvov': 'Lviv' };
const CITY_IDX = (() => { const m = {}; for (const en in CITY) { m[en.toLowerCase()] = en; for (const n of CITY[en]) m[n.toLowerCase()] = en; } for (const a in CITY_ALIAS) m[a] = CITY_ALIAS[a]; return m; })();
// «Kyiv, Ukraine» / «м. Київ» → ключ Kyiv; невідоме місто лишається як є.
function cityKey(raw) {
  if (!raw) return '';
  const s = String(raw).split(',')[0].replace(/^(м\.|г\.|місто|город)\s*/i, '').trim();
  return CITY_IDX[s.toLowerCase()] || CITY_IDX[s.toLowerCase().replace(/\s+/g, '_')] || s;
}
const REMOTE_NAME = { uk: 'Острів «Віддалено»', ru: 'Остров «Удалёнка»', en: 'Remote Island', de: 'Remote-Insel', es: 'Isla Remota', fr: 'Île du Télétravail', pl: 'Wyspa Zdalna', ptBR: 'Ilha Remota', zh: '远程岛' };
function cityName(key, lang) {
  if (key === 'Remote') return REMOTE_NAME[lang] || REMOTE_NAME.en;
  // Українські міста: ручний список вище (де, на відміну від словника, навмисно «Kyiv», а не «Kiew»).
  const e = CITY[key]; if (e) return lang === 'uk' ? e[0] : lang === 'ru' ? e[1] : lang === 'zh' ? e[2] : key;
  // 04.10.2026 (Александр: «міста теж мовою сайту»): решта світу -- зі словника city-names.json
  // (скрипт scripts/gen-city-names.py); міста, яких там ще немає, лишаються англійською.
  return CITY_I18N[key]?.[lang] || key;
}
// 03.10.2026: + Південна Америка й Кариби (назви країн на карті мовою сайту).
const A2 = { CHL: 'CL', BOL: 'BO', PER: 'PE', ARG: 'AR', SUR: 'SR', GUY: 'GY', CRI: 'CR', BRA: 'BR', URY: 'UY', ECU: 'EC', COL: 'CO', PRY: 'PY', PAN: 'PA', VEN: 'VE', CUW: 'CW', TTO: 'TT', BRB: 'BB', LCA: 'LC', DMA: 'DM', PRI: 'PR', SGS: 'GS', FLK: 'FK', PSX: 'PS', FIN: 'FI', NOR: 'NO', EST: 'EE', NLD: 'NL', BEL: 'BE', LUX: 'LU', FRA: 'FR', ESP: 'ES', PRT: 'PT', GBR: 'GB', IRL: 'IE', ISL: 'IS', CHE: 'CH', CYP: 'CY', MLT: 'MT', MAR: 'MA', DZA: 'DZ', TUN: 'TN', LBY: 'LY', EGY: 'EG', SYR: 'SY', IRQ: 'IQ', KAZ: 'KZ', LBN: 'LB', ISR: 'IL', JOR: 'JO', SAU: 'SA', USA: 'US', CAN: 'CA', MEX: 'MX', CUB: 'CU', BHS: 'BS', GTM: 'GT', HND: 'HN', BLZ: 'BZ', SLV: 'SV', NIC: 'NI', HTI: 'HT', DOM: 'DO', JAM: 'JM', UKR: 'UA', BLR: 'BY', LTU: 'LT', RUS: 'RU', CZE: 'CZ', DEU: 'DE', LVA: 'LV', SWE: 'SE', GEO: 'GE', MKD: 'MK', ALB: 'AL', AZE: 'AZ', SRB: 'RS', TUR: 'TR', ARM: 'AM', DNK: 'DK', ROU: 'RO', HUN: 'HU', SVK: 'SK', POL: 'PL', GRC: 'GR', AUT: 'AT', ITA: 'IT', IRN: 'IR', HRV: 'HR', SVN: 'SI', BGR: 'BG', MNE: 'ME', BIH: 'BA', MDA: 'MD', AND: 'AD', IMN: 'IM', FRO: 'FO', ALD: 'AX', AFG: 'AF', ARE: 'AE', AUS: 'AU', BGD: 'BD', BHR: 'BH', BRN: 'BN', BTN: 'BT', CHN: 'CN', DJI: 'DJ', ERI: 'ER', ETH: 'ET', FJI: 'FJ', GUM: 'GU', HKG: 'HK', IDN: 'ID', IND: 'IN', JPN: 'JP', KGZ: 'KG', KHM: 'KH', KOR: 'KR', KWT: 'KW', LAO: 'LA', LKA: 'LK', MMR: 'MM', MNG: 'MN', MNP: 'MP', MYS: 'MY', NCL: 'NC', NPL: 'NP', NZL: 'NZ', OMN: 'OM', PAK: 'PK', PHL: 'PH', PLW: 'PW', PNG: 'PG', PRK: 'KP', QAT: 'QA', SDN: 'SD', SDS: 'SS', SGP: 'SG', SLB: 'SB', SOM: 'SO', THA: 'TH', TJK: 'TJ', TKM: 'TM', TLS: 'TL', TWN: 'TW', UZB: 'UZ', VNM: 'VN', VUT: 'VU', YEM: 'YE' };
// 02.10.2026 (Александр): список регіонів -- дропдаун під кнопкою:
// зверху загальні регіони, нижче всі країни, де в нас є вакансії.
const REG_H = {
  uk: ['Регіони', 'Країни', 'Завантажуємо…'], ru: ['Регионы', 'Страны', 'Загружаем…'], en: ['Regions', 'Countries', 'Loading…'],
  de: ['Regionen', 'Länder', 'Wird geladen…'], es: ['Regiones', 'Países', 'Cargando…'], fr: ['Régions', 'Pays', 'Chargement…'],
  pl: ['Regiony', 'Kraje', 'Ładowanie…'], ptBR: ['Regiões', 'Países', 'Carregando…'], zh: ['地区', '国家', '加载中…'],
};
function flagOf(cc) { return String(cc || '').toUpperCase().replace(/[A-Z]/g, (ch) => String.fromCodePoint(0x1f1a5 + ch.charCodeAt(0))); }
// Список країн один на сторінку: при перемиканні регіону карта монтується
// наново, а список уже є.
let countriesCache = null;
let countriesLoading = null;
function loadCountries() {
  if (countriesCache) return Promise.resolve(countriesCache);
  countriesLoading ||= fetch('/game-map/data?region=countries').then((r) => (r.ok ? r.json() : [])).catch(() => []).then((l) => { countriesCache = Array.isArray(l) && l.length ? l : null; countriesLoading = null; return countriesCache || []; });
  return countriesLoading;
}

const FLAG_COLORS = ['#c0392b', '#2e86c1', '#28a06a', '#d68910', '#8e44ad', '#16a085', '#d35400', '#2c3e9e'];

// Ширина декору (03.10.2026, регіональні сети): поля й скелі ширші за дерево.
function decorW(k) {
  if (/^(vineyard|cornfield|coffee-plantation|red-rock)/.test(k)) return 30;
  if (/^(tree|cactus|joshua)/.test(k)) return 22;
  if (k === 'llama' || k === 'water-tower') return 15;
  return 18;
}
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
const EMP_LEVELS = [1, 5, 15, 40, 100, 250, 600, 1500];
function levelBy(arr, n) { let l = 1; for (let i = 0; i < arr.length; i++) if (n >= arr[i]) l = i + 1; return l; }
// 02.10.2026 (Александр): размер дома -- и от числа сотрудников, и от
// числа вакансий. Сотрудники весят больше (это размер компании), вакансии
// добавляют; если сотрудников компания не указала -- только вакансии.
function sizeLevel(c) {
  const lv = levelBy(LEVELS, c.n || 0);
  if (!c.employees) return lv;
  const le = levelBy(EMP_LEVELS, c.employees);
  return Math.max(1, Math.min(8, Math.round(le * 0.65 + lv * 0.35)));
}
function level(n) { let l = 1; for (let i = 0; i < LEVELS.length; i++) if (n >= LEVELS[i]) l = i + 1; return l; }
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

// Версія даних карти: браузер кешує файли карти на тиждень, тож при зміні
// geo.json число треба збільшити, інакше люди бачитимуть стару.
const GEO_VERSION = 6;

// 03.10.2026: регіони карти (Азія, Океанія, Близький Схід -- нові підкладки).
const REGIONS = ['ua', 'eu', 'us', 'latam', 'asia', 'oceania', 'mideast'];

// 03.10.2026 (Александр): фонова музика карти, кнопка-еквалайзер (./music.ts).
const MUSIC_STR = {
  uk: ['Увімкнути музику', 'Вимкнути музику'], ru: ['Включить музыку', 'Выключить музыку'], en: ['Turn music on', 'Turn music off'],
  de: ['Musik einschalten', 'Musik ausschalten'], es: ['Activar música', 'Desactivar música'], fr: ['Activer la musique', 'Couper la musique'],
  pl: ['Włącz muzykę', 'Wyłącz muzykę'], ptBR: ['Ligar a música', 'Desligar a música'], zh: ['打开音乐', '关闭音乐'],
};

// 03.10.2026 (Александр: «дим лише там, де є справжній димар»). Верх
// димаря в частках ширини/висоти спрайта (заміряно за прозорістю PNG).
// Ключ -- як у sprite(): регіональний стиль має префікс стилю.
const CHIMNEY = {
  'buildings/level-02': [0.772, 0.3], 'forest/level-02': [0.74, 0.25], 'forest/level-03': [0.697, 0.24],
  'eu/buildings/level-02': [0.828, 0.369], 'eu/buildings/level-02-b': [0.799, 0.064], 'eu/buildings/level-03-b': [0.847, 0.305], 'eu/buildings/level-04': [0.658, 0.166],
  'latam/buildings/level-02': [0.818, 0.185],
  'us/buildings/level-02-b': [0.748, 0.067], 'us/buildings/level-03-b': [0.757, 0.125], 'us/buildings/level-05': [0.698, 0.002],
};

export function mountGameMap(root, opts) {
  const base = opts.base || '/game-map/v2';
  const companiesIn = opts.companies || [];
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let theme = opts.theme === 'dark' ? 'dark' : 'light';
  // Карта внутри приложения A1 (см. «режим приложения» ниже).
  const appMode = !!opts.app;
  // В приложении ссылка на профиль несёт id автора: приложение открывает
  // профиль по id, а не по нику.
  const profileHref = (c) => `/u/${encodeURIComponent(c.username)}` + (appMode && c.userId ? `?id=${encodeURIComponent(c.userId)}` : '');
  let lang = STR[opts.lang] ? opts.lang : 'uk';
  const tr = (k) => (STR[lang][k] ?? STR.en[k]);
  const plurals = {};
  function nForm(n, kind) {
    const forms = tr(kind); let cat = 'other';
    try { cat = (plurals[lang] ||= new Intl.PluralRules(TAG[lang])).select(n); } catch { /* old browser */ }
    return `${n}${lang === 'zh' ? ' ' : ' '}${forms[cat] ?? forms.other}`;
  }
  const regionNames = {};
  function countryName(co) {
    if (lang === 'uk' || !A2[co.a3]) return co.name;
    try { return (regionNames[lang] ||= new Intl.DisplayNames([TAG[lang]], { type: 'region' })).of(A2[co.a3]) || co.name; } catch { return co.name; }
  }
  const ICON_FS = '<svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path class="c1" d="M3 8V3h5"/><path class="c2" d="M12 3h5v5"/><path class="c3" d="M17 12v5h-5"/><path class="c4" d="M8 17H3v-5"/></svg>';
  const ICON_SUN = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.6" fill="currentColor" stroke="none"/><path d="M12 2.2v2.4M12 19.4v2.4M2.2 12h2.4M19.4 12h2.4M5.1 5.1l1.7 1.7M17.2 17.2l1.7 1.7M5.1 18.9l1.7-1.7M17.2 6.8l1.7-1.7"/></svg>';
  const ICON_MOON = '<svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true"><path d="M20.3 14.6A8.6 8.6 0 0 1 9.4 3.7a8.6 8.6 0 1 0 10.9 10.9z" fill="currentColor"/></svg>';
  const ICON_X = '<svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15"/></svg>';
  const COMPASS = '<svg class="gm-compass" viewBox="0 0 40 40" width="30" height="30" aria-hidden="true"><circle cx="20" cy="20" r="17" fill="none" stroke="currentColor" stroke-width="2" opacity=".55"/><g class="gm-needle"><path d="M20 6l4 14h-8z" fill="#c0392b"/><path d="M20 34l-4-14h8z" fill="currentColor" opacity=".75"/></g><circle cx="20" cy="20" r="2.2" fill="currentColor"/></svg>';
  let destroyed = false;
  // 02.10.2026 (Александр: карта для інших країн). Регіон -- окрема підкладка
  // (geo-*.json) і свої компанії; перемикач кличе opts.onRegion, обгортка
  // перезавантажує дані й монтує карту наново.
  const region = REGIONS.includes(opts.region) ? opts.region : 'ua';
  // Країна, на яку дивимось (обрана у списку); null -- весь регіон.
  let focusCC = opts.country && opts.country !== 'UA' ? String(opts.country).toUpperCase() : null;
  // Стиль будинків регіону: якщо є папка styles/<стиль>, її спрайти
  // підміняють загальні (нові сети домиків під Європу/США без зміни коду).
  const style = opts.style || region;
  const styleKeys = new Set();
  const coarse = !!(window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches);
  const cleanup = [];

  root.innerHTML = `
    <canvas class="gm-cv"></canvas>
    <div class="gm-top">
      <div class="gm-left">
        <div class="gm-search"><input class="gm-q" type="search" autocomplete="off"><div class="gm-sug" role="listbox"></div></div>
        <div class="gm-regw"><button class="gm-btn gm-reg" type="button" aria-haspopup="listbox" aria-expanded="false"><span class="gm-regl"></span><svg class="gm-chev" viewBox="0 0 12 8" width="11" height="7" aria-hidden="true"><path d="M1 1l5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button><div class="gm-regp" role="listbox"></div></div>
      </div>
      <div class="gm-right">
        <button class="gm-btn gm-music" type="button" aria-pressed="false"><span class="gm-eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span></button>
        <button class="gm-btn gm-info" type="button" aria-haspopup="dialog" aria-expanded="false"><span class="gm-ii">i</span></button>
        <button class="gm-btn gm-theme" type="button"></button>
        <button class="gm-btn gm-fs" type="button"></button>
        <button class="gm-btn gm-close" type="button">${ICON_X}</button>
      </div>
    </div>
    <div class="gm-zoom"><button class="gm-btn" data-z="in" type="button"><span class="gm-zi">+</span></button><button class="gm-btn" data-z="out" type="button"><span class="gm-zi">−</span></button></div>
    <div class="gm-guide"><img alt="" class="gm-mascot"><div class="gm-say"></div></div>
    <div class="gm-pop" role="dialog" aria-live="polite"></div>
    <div class="gm-gl" role="dialog"></div>
    <div class="gm-load"><div class="gm-lbg"></div><div class="gm-lpill">${COMPASS}<span class="gm-ltx"></span></div></div>`;
  const cv = root.querySelector('.gm-cv');
  const ctx = cv.getContext('2d');
  const pop = root.querySelector('.gm-pop');
  const themeBtn = root.querySelector('.gm-theme');
  // 03.10.2026 (Александр): довідник («i» біля перемикача дня/вечора) і
  // підказка від кота про розмір будинку (чергується з основною).
  const infoBtn = root.querySelector('.gm-info');
  const glP = root.querySelector('.gm-gl');
  const sayEl = root.querySelector('.gm-say');
  const TIPS = ['say', 'sayHouse'];
  let tipI = 0;
  function renderGl() {
    glP.innerHTML = `<div class="gm-glh">${esc(tr('gTitle'))}</div>` + ['Size', 'Pins', 'Ally'].map((k) => `<div class="gm-gli"><b>${esc(tr('g' + k + 'T'))}</b><span>${esc(tr('g' + k + 'D'))}</span></div>`).join('');
    infoBtn.setAttribute('aria-label', tr('gTitle')); infoBtn.title = tr('gTitle');
  }
  function openGl(v) { glP.classList.toggle('on', v); infoBtn.setAttribute('aria-expanded', v ? 'true' : 'false'); }
  const mascot = root.querySelector('.gm-mascot');
  const qIn = root.querySelector('.gm-q');
  const sug = root.querySelector('.gm-sug');
  const fsBtn = root.querySelector('.gm-fs');
  // Музика -- спільний програвач сторінки: переживає перемонтування карти
  // при зміні регіону. Тут лише кнопка.
  const music = getMapMusic();
  const musicBtn = root.querySelector('.gm-music');
  function musicLabel() {
    const m = MUSIC_STR[lang] || MUSIC_STR.en; const t = m[music.playing ? 1 : 0];
    musicBtn.classList.toggle('on', music.playing); musicBtn.setAttribute('aria-pressed', music.playing ? 'true' : 'false');
    musicBtn.setAttribute('aria-label', t); musicBtn.title = t;
  }
  const regBtn = root.querySelector('.gm-reg');
  const regP = root.querySelector('.gm-regp');
  const REG_KEY = { ua: 'rUa', eu: 'rEu', us: 'rUs', latam: 'rLatam', asia: 'rAsia', oceania: 'rOceania', mideast: 'rMideast' };
  const ccName = (cc) => { try { return (regionNames['cc' + lang] ||= new Intl.DisplayNames([TAG[lang]], { type: 'region' })).of(cc) || cc; } catch { return cc; } };
  // 02.10.2026 (Александр): «День»/«Вечір» -- лише значок у кружечку,
  // як кнопка повного екрана; назва -- у підказці.
  function themeLabel() {
    const t = theme === 'dark' ? tr('day') : tr('eve'); const name = t.slice(t.indexOf(' ') + 1);
    themeBtn.innerHTML = theme === 'dark' ? ICON_SUN : ICON_MOON;
    themeBtn.setAttribute('aria-label', name); themeBtn.title = name;
  }
  function regLabel() {
    // Кількість компаній -- тут же, замість окремої плашки «Карта A1 · N».
    const cnt = (arr) => arr.reduce((a, c) => a + (c.cos || 1), 0);
    const n = focusCC ? cnt(companiesIn.filter((c) => c.cc === focusCC)) : cnt(companiesIn);
    const full = focusCC ? `${flagOf(focusCC)} ${ccName(focusCC)}` : tr(REG_KEY[region]);
    // 03.10.2026 (Александр): на телефоні в кнопці лише прапорець, щоб
    // пошуку було більше місця (назву ховає CSS, вона лишається в підказці).
    const sp = full.indexOf(' ');
    const flag = sp > 0 ? full.slice(0, sp) : '', name = sp > 0 ? full.slice(sp + 1) : full;
    root.querySelector('.gm-regl').innerHTML = (flag ? `<span class="gm-rfl">${esc(flag)}</span> ` : '') + `<span class="gm-rnm">${esc(name)}</span>` + (n ? `<span class="gm-regn"> · ${n}</span>` : '');
    regBtn.title = name + (n ? ` · ${n}` : ''); regBtn.setAttribute('aria-label', regBtn.title);
  }
  function renderReg() {
    const h = REG_H[lang] || REG_H.en;
    const item = (attrs, label, count, on) => `<button type="button" class="gm-ri${on ? ' on' : ''}" role="option" aria-selected="${on}" ${attrs}><span class="gm-rn">${esc(label)}</span>${count != null ? `<span class="gm-rc">${count}</span>` : ''}${on ? '<span class="gm-rk">✓</span>' : ''}</button>`;
    let html = `<div class="gm-rh">${esc(h[0])}</div>` + REGIONS.map((r) => item(`data-r="${r}"`, tr(REG_KEY[r]), null, r === region && !focusCC)).join('');
    const list = (countriesCache || []).filter((c) => c.cc !== 'UA');
    html += `<div class="gm-rh">${esc(h[1])}</div>`;
    if (!countriesCache) html += `<div class="gm-rl">${esc(h[2])}</div>`;
    else html += list.map((c) => ({ ...c, name: ccName(c.cc) })).sort((a, b) => b.n - a.n || a.name.localeCompare(b.name)).map((c) => item(`data-cc="${c.cc}" data-r="${c.r}"`, `${flagOf(c.cc)} ${c.name}`, c.n, c.cc === focusCC)).join('');
    regP.innerHTML = html;
  }
  function openReg(open) {
    regP.classList.toggle('on', open); regBtn.setAttribute('aria-expanded', String(open)); regBtn.classList.toggle('open', open);
    if (open) { renderReg(); if (!countriesCache) loadCountries().then(() => { if (!destroyed && regP.classList.contains('on')) renderReg(); }); const cur = regP.querySelector('.gm-ri.on'); if (cur) cur.scrollIntoView({ block: 'nearest' }); }
  }
  function chooseRegion(r, cc) {
    openReg(false);
    if (r !== region) { if (opts.onRegion) opts.onRegion(r, cc || null); return; }
    focusCC = cc || null; regLabel();
    if (geo) { if (focusCC) focusCountry(focusCC, true); else showRegion(true); }
  }
  function applyLang() {
    regLabel(); if (regP.classList.contains('on')) renderReg();
    qIn.placeholder = tr('find'); qIn.setAttribute('aria-label', tr('find'));
    const zb = root.querySelectorAll('[data-z]'); zb[0].setAttribute('aria-label', tr('zin')); zb[1].setAttribute('aria-label', tr('zout'));
    sayEl.textContent = tr(TIPS[tipI]); renderGl();
    const lt = root.querySelector('.gm-ltx'); if (lt) lt.textContent = tr('load');
    setFsBtn(root.classList.contains('gm-full'));
    themeLabel(); musicLabel();
    for (const g of cityGroups) g.label = cityName(g.name, lang);
    baseCache = null;
    if (popFor) { const c = popFor; popFor = null; showPopup(c); }
    if (sug.classList.contains('on')) renderSug();
  }
  function setFsBtn(full) {
    fsBtn.innerHTML = full ? ICON_X : ICON_FS; fsBtn.classList.toggle('x', full);
    fsBtn.title = full ? tr('fsOff') : tr('fsOn'); fsBtn.setAttribute('aria-label', fsBtn.title);
  }

  let geo = null, man = null;
  const imgs = { light: {}, dark: {} };
  const shadowCache = {};
  let W = 0, H = 0, dpr = 1;
  const view = { x: 0, y: 0, s: 1 };
  let minS = 0.3, maxS = 4;
  let cos = [];
  let dens = 1, densFixed = false;
  let island = null;
  let hover = null, pinned = null;
  let baseCache = null; // { key, canvas }
  let flagMeta = {};
  let noForest = false;
  // 03.10.2026: у регіональних сетах на рівень може бути кілька будинків
  // (level-03, level-03-b…): компанія бере один за хешем id, тож вигляд стабільний.
  let bVar = {};
  const flagCache = {};
  const logoImgs = {};
  const allies = new Map(); // userId -> id запису контакту (для видалення)
  let allyKnown = false;
  let t0 = performance.now();

  // ---------- загрузка ----------
  function loadImg(src) { return new Promise((res) => { const i = new Image(); i.decoding = 'async'; i.onload = () => res(i); i.onerror = () => res(null); i.src = src; }); }
  // 02.10.2026 (Александр: «завантажується дуже довго»). Спершу -- лише
  // будинки, ліс і прапори (без них карта порожня); решта (декор, хмари,
  // мандрівники) догружається вже при відкритій карті й з'являється сама.
  const loadingTh = {};
  async function loadKeys(th, keys) {
    await Promise.all(keys.map(async (k) => {
      if (imgs[th][k] || loadingTh[th + k]) return;
      loadingTh[th + k] = 1;
      const im = await loadImg(styleKeys.has(k) ? `${base}/styles/${style}/${th}/${k}.webp?v=${GEO_VERSION}` : `${base}/${th}/${k}.webp`);
      if (im) imgs[th][k] = im;
      delete loadingTh[th + k];
    }));
  }
  async function loadTheme(th) {
    const keys = Object.keys(man);
    const first = keys.filter((k) => /^(buildings|forest|flags)\//.test(k));
    await loadKeys(th, first);
    loadKeys(th, keys.filter((k) => !first.includes(k))).then(() => { baseCache = null; });
  }
  const PREF = ['', 'nature/', 'sea-sky/', 'markers/', 'travelers/', 'mascot/'];
  function sprite(k) {
    for (const p of PREF) { const kk = p + k; const im = imgs[theme][kk] || imgs.light[kk] || imgs.dark[kk]; if (im) return im; }
    return null;
  }
  function shadowOf(k) {
    const key = theme + k; if (shadowCache[key]) return shadowCache[key];
    const im = sprite(k); if (!im) return null;
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
    const x = c.getContext('2d'); x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#0d1a10'; x.fillRect(0, 0, c.width, c.height);
    return (shadowCache[key] = c);
  }

  // ---------- флаги компаний: цвет компании + логотип, развеваются ----------
  function logoOf(c) {
    if (!c.avatar) return null;
    if (logoImgs[c.id] !== undefined) return logoImgs[c.id];
    logoImgs[c.id] = null;
    // 02.10.2026: не більше 4 завантажень разом -- кожен логотип іде через
    // /api/media нашого ж сайту до бекенду; сотні одночасно гальмували сайт.
    logoQueue.push(c); pumpLogos();
    return null;
  }
  const logoQueue = []; let logoActive = 0;
  function pumpLogos() {
    while (logoActive < 4 && logoQueue.length) {
      const c = logoQueue.pop(); // останні додані -- ті, що зараз на екрані
      if (!onScreen(c.x, c.y, 200)) { logoImgs[c.id] = undefined; continue; }
      logoActive++;
      loadLogo(c);
    }
  }
  function loadLogo(c) {
    const i = new Image(); i.decoding = 'async';
    const done = () => { logoActive--; pumpLogos(); };
    i.onerror = done;
    i.onload = () => { done(); logoImgs[c.id] = i; c.color = logoBgColor(i) || dominantColor(i) || c.color; c.logoBg = !!logoBgColor(i); for (const k in flagCache) if (k.startsWith(c.id + '|')) delete flagCache[k]; };
    i.src = c.avatar;
    return null;
  }
  // Колір фону логотипа: найчастіший колір по краях картинки.
  const bgMemo = new WeakMap();
  function logoBgColor(img) {
    if (bgMemo.has(img)) return bgMemo.get(img);
    let res = null;
    try {
      const n = 32, cv2 = document.createElement('canvas'); cv2.width = cv2.height = n; const x = cv2.getContext('2d');
      x.drawImage(img, 0, 0, n, n); const d = x.getImageData(0, 0, n, n).data;
      const bins = {}; let total = 0;
      for (let i = 1; i < n - 1; i++) for (const [px, py] of [[i, 1], [i, n - 2], [1, i], [n - 2, i]]) {
        const o = (py * n + px) * 4; total++; if (d[o + 3] < 200) continue;
        const key = (d[o] >> 4) + ',' + (d[o + 1] >> 4) + ',' + (d[o + 2] >> 4);
        const b = bins[key] || (bins[key] = [0, 0, 0, 0]); b[0] += d[o]; b[1] += d[o + 1]; b[2] += d[o + 2]; b[3]++;
      }
      let best = null; for (const k in bins) if (!best || bins[k][3] > best[3]) best = bins[k];
      if (best && best[3] >= total * 0.45) res = `rgb(${Math.round(best[0] / best[3])},${Math.round(best[1] / best[3])},${Math.round(best[2] / best[3])})`;
    } catch { res = null; }
    bgMemo.set(img, res); return res;
  }
  function dominantColor(img) {
    try {
      const n = 24, cv2 = document.createElement('canvas'); cv2.width = cv2.height = n; const x = cv2.getContext('2d');
      x.drawImage(img, 0, 0, n, n); const d = x.getImageData(0, 0, n, n).data;
      let best = null, bs = 0; const bins = {};
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i + 1], b = d[i + 2], a = d[i + 3]; if (a < 128) continue;
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b); const sat = mx - mn; if (sat < 50 || mx < 60) continue;
        const key = (r >> 5) + ',' + (g >> 5) + ',' + (b >> 5); bins[key] = (bins[key] || 0) + sat;
        if (bins[key] > bs) { bs = bins[key]; best = [r, g, b]; }
      }
      return best ? `rgb(${best[0]},${best[1]},${best[2]})` : null;
    } catch { return null; }
  }
  function flagCanvas(c, entry) {
    const key = `${c.id}|${theme}|${entry[0]}|${logoImgs[c.id] ? 1 : 0}`;
    if (flagCache[key]) return flagCache[key];
    const src = sprite('flags/' + entry[0]); if (!src) return null;
    const w = src.width, h = src.height, cv2 = document.createElement('canvas'); cv2.width = w; cv2.height = h;
    const x = cv2.getContext('2d');
    // ткань флага в цвет компании, тени и обводка остаются (multiply)
    // ткань — рівно в колір фону логотипа, складки й обводка зі спрайта (multiply по сірому)
    x.drawImage(src, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = c.color; x.fillRect(0, 0, w, h);
    x.globalCompositeOperation = 'multiply'; x.filter = 'grayscale(1) brightness(1.12)'; x.drawImage(src, 0, 0); x.filter = 'none';
    x.globalCompositeOperation = 'destination-in'; x.drawImage(src, 0, 0); x.globalCompositeOperation = 'source-over';
    const logo = logoImgs[c.id];
    if (logo && h > 20) {
      const r = Math.min(w, h) * 0.3, cx = w * 0.52, cy = h * 0.46;
      x.save(); x.beginPath(); if (!c.logoBg) { x.arc(cx, cy, r + 2.5, 0, 7); x.fillStyle = 'rgba(255,255,255,.95)'; x.fill(); }
      x.beginPath(); x.arc(cx, cy, r, 0, 7); x.clip(); x.drawImage(logo, cx - r, cy - r, r * 2, r * 2); x.restore();
    }
    return (flagCache[key] = cv2);
  }
  function drawFlags(c, k, bx, by, bw, t) {
    const fk = k.replace('/level-0', '/'); const meta = flagMeta[`${theme}/${fk}`] || flagMeta[`light/${fk}`]; if (!meta) return;
    const sc = bw / meta.w;
    for (const e of meta.f) {
      const fc = flagCanvas(c, e); if (!fc) continue;
      const fx = bx + e[1] * sc, fy = by + e[2] * sc, fw = e[3] * sc, fh = e[4] * sc;
      const slices = 10, amp = reduce ? 0 : fh * 0.14;
      for (let i = 0; i < slices; i++) {
        const u0 = i / slices, sw = fc.width / slices;
        const dy = Math.sin(t * (3 + (c.h % 5) * 0.15) - u0 * 5 + c.h % 7) * amp * u0;
        ctx.drawImage(fc, i * sw, 0, sw + 0.6, fc.height, fx + u0 * fw, fy + dy, fw / slices + 0.3, fh);
      }
    }
  }

  // ---------- проекция и компании ----------
  function proj(lng, lat) { return [(lng - geo.lon0) * geo.k * geo.c, (geo.lat1 - lat) * geo.k]; }
  // Чи точка на суші України (будинки не мають стояти у воді).
  function inRing(r, x, y) { let inside = false; for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) { const xi = r[i], yi = r[i + 1], xj = r[j], yj = r[j + 1]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside; } return inside; }
  let uaRings = null;
  function onLand(x, y) {
    if (!uaRings) { if (region === 'ua') { const ua = geo.countries.find((c) => c.ua); uaRings = ua ? ua.r : []; } else uaRings = geo.countries.flatMap((c) => c.r); }
    if (!uaRings.length) return true;
    if (region === 'ua') { let n = 0; for (const r of uaRings) if (inRing(r, x, y)) n++; if (n % 2 !== 1) return false; }
    else if (!uaRings.some((r) => inRing(r, x, y))) return false;
    // 02.10.2026 (Александр: «не став будинки на воду»): озера/водосховища
    // і ріки -- теж вода.
    for (const r of geo.lakes) if (inRing(r, x, y)) return false;
    for (const rv of geo.rivers) {
      const pp = rv.p, rw = rv.s <= 3 ? 4 : 2.5;
      for (let i = 2; i < pp.length; i += 2) {
        const ax = pp[i - 2], ay = pp[i - 1], bx = pp[i], by = pp[i + 1];
        if (x < Math.min(ax, bx) - rw || x > Math.max(ax, bx) + rw || y < Math.min(ay, by) - rw || y > Math.max(ay, by) + rw) continue;
        const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy || 1;
        const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L));
        if ((x - ax - t * dx) ** 2 + (y - ay - t * dy) ** 2 < rw * rw) return false;
      }
    }
    return true;
  }
  // Компанії без локації в профілі на карті не малюємо -- лише в пошуку.
  function isOffMap(c) { return c.city === 'Remote' || !(typeof c.lng === 'number' && typeof c.lat === 'number'); }
  const offMap = companiesIn.filter(isOffMap).map((c) => ({ ...c, off: true }));
  function layout() {
    // Усі компанії України (02.10.2026): чим їх більше, тим дрібніші будиночки,
    // інакше Київ розповзається на пів області.
    // Розмір будиночків -- від найбільшого міста: Київ (сотні профілів) має
    // вміститись у ~60 км навколо, а не розповзтись на пів країни. Зате карту
    // можна наблизити глибше (maxS), і зблизька будинки великі й чіткі.
    const perCity = {}; for (const c of companiesIn) { const k = cityKey(c.city); perCity[k] = (perCity[k] || 0) + 1; }
    const biggest = Math.max(1, ...Object.values(perCity));
    if (!densFixed) { dens = Math.max(0.12, Math.min(1, Math.sqrt(8 / biggest))); densFixed = true; }  // розкритий кластер не зменшує всі будинки
    const list = companiesIn.filter((c) => !isOffMap(c)).map((c) => {
      const l = sizeLevel(c); const [x, y] = proj(c.lng, c.lat); const h = hash(c.id || c.name);
      return { ...c, l: c.cluster ? 1 : l, x, y, hx: x, hy: y, w: SIZE[c.cluster ? 0 : l - 1] * dens, forest: h % 10 < 3, pin: PINS[h % PINS.length], h, color: FLAG_COLORS[h % FLAG_COLORS.length], ck: cityKey(c.city) };
    }).sort((a, b) => b.n - a.n);
    // Разводим соседей по спирали: в Киеве десятки компаний в одной точке.
    // сітка для швидкої перевірки сусідів (сотні компаній в одній точці)
    const CELL = 40, grid = new Map();
    const cellKey = (x, y) => `${Math.floor(x / CELL)}|${Math.floor(y / CELL)}`;
    const near = (x, y) => { const out = []; const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL); for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) { const a = grid.get(`${cx + i}|${cy + j}`); if (a) out.push(...a); } return out; };
    const k = Math.sqrt(dens), ovl = 1.1;
    // 07.10.2026 (Александр: «куди діваються сусідні будиночки?»): коли розкриваємо кластер, будинки, що вже
    // стоять на карті, лишаються на своїх місцях -- нові компанії шукають вільне місце навколо них.
    const prevPos = new Map(cos.map((p) => [p.id, p]));
    for (const c of list) { const p = prevPos.get(c.id); if (p && !c.cluster) { c.x = p.x; c.y = p.y; c.kept = true; const key = cellKey(c.x, c.y); (grid.get(key) || grid.set(key, []).get(key)).push(c); } }
    for (const c of list) {
      if (c.kept) continue;
      const r = c.w * 0.5;
      let ang = (c.h % 360) * Math.PI / 180, step = 0;
      while (step < 4000) {
        const rr = step === 0 ? 0 : (6 + Math.sqrt(step) * 7) * k;
        const x = c.hx + Math.cos(ang) * rr, y = c.hy + Math.sin(ang) * rr * 0.75;
        if ((c.ck === 'Remote' || step > 3500 || (onLand(x - r * 0.6, y) && onLand(x + r * 0.6, y) && onLand(x, y + 2))) && !near(x, y).some((p) => (p.x - x) ** 2 + ((p.y - y) * 1.25) ** 2 < (p.w * 0.5 + r) ** 2 * ovl)) { c.x = x; c.y = y; break; }
        ang += 2.399963; step++;
      }
      const key = cellKey(c.x, c.y); (grid.get(key) || grid.set(key, []).get(key)).push(c);
    }
    // Острів «Віддалено»: розмір -- під кількість будиночків на ньому.
    const rem = list.filter((c) => c.ck === 'Remote');
    island = null;
    if (rem.length) {
      const xs = rem.map((c) => c.x), ys = rem.map((c) => c.y);
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
      const rx = (Math.max(...xs) - Math.min(...xs)) / 2 + 26, ry = (Math.max(...ys) - Math.min(...ys)) / 2 + 22;
      const pts = []; let sd = 7; const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
      const ph = [rnd() * 6, rnd() * 6, rnd() * 6];
      for (let i = 0; i < 48; i++) { const a = (i / 48) * Math.PI * 2; const k = 1 + 0.07 * Math.sin(a * 3 + ph[0]) + 0.05 * Math.sin(a * 5 + ph[1]) + 0.03 * Math.sin(a * 9 + ph[2]); pts.push(cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k); }
      island = { cx, cy, rx, ry, pts };
    }
    // Дерева й кущі всередині міста ховаємо -- місто має бути охайним.
    if (geo && geo.decor) for (const d of geo.decor) {
      const [dk, dx, dy] = d;
      if (island && ((dx - island.cx) / (island.rx + 30)) ** 2 + ((dy - island.cy) / (island.ry + 30)) ** 2 < 1) { d.hide = true; continue; }
      if (dk.startsWith('mountain') || /ship|whale|fish/.test(dk)) continue;
      d.hide = near(dx, dy).some((p) => (p.x - dx) ** 2 + ((p.y - dy) * 1.25) ** 2 < (p.w * 0.75 + (dk.startsWith('lighthouse') ? 22 : 10)) ** 2);
    }
    return list;
  }

  // ---------- текстура земли ----------
  const patterns = {};
  function landPattern(th) {
    if (patterns[th]) return patterns[th];
    const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
    let seed = th === 'dark' ? 11 : 5; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 70; i++) {
      const px = rnd() * 256, py = rnd() * 256, r = 10 + rnd() * 36;
      const g = x.createRadialGradient(px, py, 0, px, py, r);
      const light = rnd() > 0.5;
      g.addColorStop(0, light ? (th === 'dark' ? 'rgba(140,170,120,.10)' : 'rgba(255,245,190,.16)') : (th === 'dark' ? 'rgba(0,0,0,.14)' : 'rgba(40,80,30,.12)'));
      g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g;
      for (const ox of [-256, 0, 256]) for (const oy of [-256, 0, 256]) { x.save(); x.translate(ox, oy); x.beginPath(); x.arc(px, py, r, 0, 7); x.fill(); x.restore(); }
    }
    for (let i = 0; i < 260; i++) { x.fillStyle = th === 'dark' ? 'rgba(200,220,160,.05)' : 'rgba(60,90,30,.07)'; x.fillRect(rnd() * 256, rnd() * 256, 1.5, 1.5); }
    return (patterns[th] = ctx.createPattern(c, 'repeat'));
  }

  function pathRing(x, r) { x.moveTo(r[0], r[1]); for (let i = 2; i < r.length; i += 2) x.lineTo(r[i], r[i + 1]); x.closePath(); }

  // ---------- основа карты (кэш на текущий вид) ----------
  function renderBase() {
    const key = `${theme}|${lang}|${Math.round(view.x)}|${Math.round(view.y)}|${view.s.toFixed(4)}|${W}|${H}|${dpr}`;
    if (baseCache && baseCache.key === key) return baseCache.canvas;
    const c = baseCache?.canvas || document.createElement('canvas');
    c.width = Math.max(1, W * dpr); c.height = Math.max(1, H * dpr);
    const x = c.getContext('2d'); const P = PAL[theme];
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sg = x.createLinearGradient(0, 0, 0, H); sg.addColorStop(0, P.sea); sg.addColorStop(1, P.sea2);
    x.fillStyle = sg; x.fillRect(0, 0, W, H);
    x.save(); x.translate(view.x, view.y); x.scale(view.s, view.s);
    const px = 1 / view.s;
    // мелководье вдоль берега
    x.lineJoin = 'round'; x.strokeStyle = P.shallow; x.lineWidth = 16 * px + 6;
    x.beginPath(); for (const co of geo.countries) for (const r of co.r) pathRing(x, r); x.stroke();
    x.lineWidth = 7 * px + 3; x.strokeStyle = P.shallow; x.stroke();
    // волны
    x.strokeStyle = P.wave; x.lineWidth = 1.3 * px; x.lineCap = 'round';
    x.beginPath();
    for (const [wx, wy] of geo.waves) { const s = 9; x.moveTo(wx - s, wy); x.quadraticCurveTo(wx - s / 2, wy - 3.5, wx, wy); x.quadraticCurveTo(wx + s / 2, wy - 3.5, wx + s, wy); }
    x.stroke();
    // суша
    const pat = landPattern(theme);
    for (const co of geo.countries) {
      x.beginPath(); for (const r of co.r) pathRing(x, r);
      if (co.ua) { const g = x.createLinearGradient(0, 300, 0, 1000); g.addColorStop(0, P.ua); g.addColorStop(1, P.ua2); x.fillStyle = g; }
      else { x.fillStyle = (hash(co.a3) % 2) ? P.land : P.land2; }
      x.fill();
      if (pat) { x.save(); x.globalAlpha = 1; x.fillStyle = pat; x.fill(); x.restore(); }
    }
    // острів «Віддалено»
    if (island) {
      x.save(); x.beginPath(); pathRing(x, island.pts);
      x.lineJoin = 'round'; x.strokeStyle = P.shallow; x.lineWidth = 16 * px + 6; x.stroke(); x.lineWidth = 7 * px + 3; x.stroke();
      const g = x.createLinearGradient(0, island.cy - island.ry, 0, island.cy + island.ry); g.addColorStop(0, P.ua); g.addColorStop(1, P.ua2); x.fillStyle = g; x.fill();
      if (pat) { x.fillStyle = pat; x.fill(); }
      x.strokeStyle = theme === 'dark' ? 'rgba(230,200,140,.55)' : 'rgba(240,215,150,.95)'; x.lineWidth = 3.2 * px; x.stroke();
      x.strokeStyle = P.borderDark; x.lineWidth = 1.2 * px; x.stroke();
      x.restore();
    }
    // поля (степ і лісостеп): смугасті латки, малюються один раз у кеш основи
    if (geo.fields) {
      const tones = theme === 'dark'
        ? ['rgba(120,140,70,.22)', 'rgba(150,130,70,.2)', 'rgba(90,120,60,.22)', 'rgba(140,120,80,.18)']
        : ['rgba(232,196,88,.55)', 'rgba(196,206,96,.5)', 'rgba(220,170,84,.45)', 'rgba(176,196,84,.48)'];
      for (const [fx, fy, fw, fh, fa, ft] of geo.fields) {
        const sx = fx * view.s + view.x, sy = fy * view.s + view.y;
        if (sx < -60 || sy < -60 || sx > W + 60 || sy > H + 60) continue;
        x.save(); x.translate(fx, fy); x.rotate(fa);
        x.fillStyle = tones[ft % tones.length]; x.fillRect(-fw / 2, -fh / 2, fw, fh);
        if (view.s > minS * 2) { x.strokeStyle = theme === 'dark' ? 'rgba(0,0,0,.1)' : 'rgba(120,100,40,.16)'; x.lineWidth = 0.35;
          x.beginPath(); for (let i = -fh / 2 + 1; i < fh / 2; i += 1.2) { x.moveTo(-fw / 2, i); x.lineTo(fw / 2, i); } x.stroke(); }
        x.restore();
      }
    }
    // пустелі (Близький Схід, Азія, Австралія): піщана підсвітка суші, краї м'які
    if (geo.sand && geo.sand.length) {
      x.save(); x.lineJoin = 'round';
      x.beginPath(); for (const co of geo.countries) for (const r of co.r) pathRing(x, r); x.clip();
      const sc = theme === 'dark' ? [150, 120, 70] : [232, 198, 128];
      x.beginPath(); for (const r of geo.sand) pathRing(x, r);
      x.strokeStyle = `rgba(${sc},${theme === 'dark' ? 0.1 : 0.2})`; x.lineWidth = 16 * px; x.stroke();
      x.strokeStyle = `rgba(${sc},${theme === 'dark' ? 0.14 : 0.28})`; x.lineWidth = 8 * px; x.stroke();
      x.fillStyle = `rgba(${sc},${theme === 'dark' ? 0.34 : 0.62})`; x.fill();
      x.restore();
    }
    // межі штатів / провінцій (Америка)
    if (geo.inner && geo.inner.length) {
      x.save(); x.beginPath(); for (const r of geo.inner) pathRing(x, r);
      x.setLineDash([3 * px, 3 * px]); x.strokeStyle = theme === 'dark' ? 'rgba(220,190,120,.28)' : 'rgba(150,110,40,.32)'; x.lineWidth = 0.9 * px; x.stroke(); x.setLineDash([]); x.restore();
    }
    // озёра и реки
    x.fillStyle = P.lake; x.beginPath(); for (const r of geo.lakes) pathRing(x, r); x.fill();
    x.strokeStyle = P.river; x.lineCap = 'round'; x.lineJoin = 'round';
    for (const rv of geo.rivers) { x.lineWidth = Math.max(0.9, (7 - Math.min(6, rv.s)) * 0.75) * px + (rv.s <= 3 ? 1.6 : 0.7); x.beginPath(); const p = rv.p; x.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) x.lineTo(p[i], p[i + 1]); x.stroke(); }
    // границы: тёмная подложка + золотой пунктир
    for (const co of geo.countries) {
      x.beginPath(); for (const r of co.r) pathRing(x, r);
      x.setLineDash([]); x.strokeStyle = P.borderDark; x.lineWidth = (co.ua ? 4.2 : 2.6) * px; x.stroke();
      x.setLineDash(co.ua ? [] : [5 * px, 3.5 * px]); x.strokeStyle = co.ua ? P.uaBorder : P.border; x.lineWidth = (co.ua ? 2.4 : 1.3) * px; x.stroke();
    }
    x.setLineDash([]);
    // свечение Украины
    const ua = geo.countries.find((c) => c.ua);
    if (ua) { x.save(); x.beginPath(); for (const r of ua.r) pathRing(x, r); x.shadowColor = theme === 'dark' ? 'rgba(240,200,110,.55)' : 'rgba(255,220,120,.9)'; x.shadowBlur = 14; x.strokeStyle = 'rgba(255,225,140,.35)'; x.lineWidth = 3 * px; x.stroke(); x.restore(); }
    // нерухома природа (ліси, кущі, стоги, гори) -- теж у кеш основи:
    // поки карту не рухають, вона не коштує нічого.
    const decs = [];
    for (const d of geo.decor) {
      const [k, dx, dy, sc] = d; if (d.hide || /ship|whale|fish|llama/.test(k)) continue;
      const sx = dx * view.s + view.x, sy = dy * view.s + view.y;
      if (sx < -80 || sy < -80 || sx > W + 80 || sy > H + 120) continue;
      decs.push(d);
    }
    decs.sort((a, b) => a[2] - b[2]);
    for (const [k, dx, dy, sc] of decs) {
      const im = sprite(k); if (!im) continue;
      const big = k.startsWith('mountain'); const ds = (big ? Math.max(0.6, dens) : Math.max(0.4, dens)) * Math.min(1, Math.max(geo.k, 60) / 100);
      const w = (big ? 80 : k.startsWith('lighthouse') ? 40 : decorW(k)) * sc * ds, h = w * im.height / im.width;
      x.drawImage(im, dx - w / 2, dy - h, w, h);
    }
    // подписи стран (мелко, когда далеко)
    x.textAlign = 'center'; x.textBaseline = 'middle';
    for (const co of geo.countries) {
      if (co.ua) continue;
      const fs = Math.max(9, Math.min(15, 13 * Math.sqrt(view.s))) * px;
      x.font = `600 ${fs}px Georgia, 'Times New Roman', serif`; x.fillStyle = P.label; x.fillText(countryName(co), co.c[0], co.c[1]);
    }
    x.restore();
    baseCache = { key, canvas: c };
    return c;
  }

  // ---------- оживление ----------
  const clouds = Array.from({ length: 7 }, (_, i) => ({
    k: ['cloud-white-long', 'cloud-white-round', 'cloud-pink', 'cloud-white-blush', 'cloud-white-pink', 'cloud-pink-long', 'cloud-white-round'][i],
    x: (i * 0.153 + 0.05) % 1, y: 0.08 + ((i * 0.37) % 0.85), w: 150 + (i % 3) * 50, v: 0.006 + (i % 4) * 0.0025,
  }));
  const birds = { t: -999, path: null };
  const walkers = [];

  function drawSprite(k, x, y, w, alpha = 1, anchorY = 1) {
    const im = sprite(k); if (!im) return null;
    const h = w * im.height / im.width;
    if (alpha !== 1) ctx.globalAlpha = alpha;
    ctx.drawImage(im, x - w / 2, y - h * anchorY, w, h);
    if (alpha !== 1) ctx.globalAlpha = 1;
    return h;
  }

  function onScreen(x, y, m = 120) { const sx = x * view.s + view.x, sy = y * view.s + view.y; return sx > -m && sy > -m && sx < W + m && sy < H + m; }

  function frame(now) {
    if (destroyed) return;
    const t = (now - t0) / 1000;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.drawImage(renderBase(), 0, 0, W, H);
    ctx.save(); ctx.translate(view.x, view.y); ctx.scale(view.s, view.s);
    const zoom = view.s / minS;
    // декор (по y, чтобы ближние перекрывали дальние)
    const items = [];
    for (const d of geo.decor) {
      const [k, x, y, sc] = d; if (d.hide || !/ship|whale|fish|llama/.test(k) || !onScreen(x, y)) continue;
      const big = k.startsWith('mountain'); const sea = /ship|whale|fish|lighthouse/.test(k);
      const ds = (big ? Math.max(0.6, dens) : Math.max(0.4, dens)) * Math.min(1, Math.max(geo.k, 60) / 100);
      const w = (big ? 80 : sea ? 40 : decorW(k)) * sc * ds;
      items.push({ y, draw: () => {
        let yy = y, xx = x, a = 1;
        if (!reduce && sea && !k.startsWith('lighthouse')) { yy += Math.sin(t * 1.3 + x) * 1.6; xx += Math.sin(t * 0.07 + y) * 18; }
        if (!reduce && k.startsWith('whale')) a = Math.max(0, Math.sin(t * 0.25 + x * 0.01)) ** 0.6;
        // 03.10.2026 (Александр: «мінімально оживити лам»). Лама поволі
        // ходить туди-сюди на пів свого зросту, на краях стоїть і «пасеться»
        // й розвертається; на ходу ледь кивує. Своя фаза в кожної.
        if (k === 'llama') {
          if (reduce) { drawSprite(k, xx, yy, w); return; }
          const ph = (x * 0.37 + y * 0.61) % 6.283, u = Math.sin(t * 0.13 + ph), m = Math.max(-1, Math.min(1, u * 1.7));
          xx += m * w * 0.45;
          if (Math.abs(m) < 1) yy -= Math.abs(Math.sin(t * 5 + ph)) * w * 0.035;
          // спрайт дивиться ліворуч: ідемо праворуч -- віддзеркалюємо
          const right = Math.cos(t * 0.13 + ph) > 0;
          if (right) { ctx.save(); ctx.translate(xx, 0); ctx.scale(-1, 1); ctx.translate(-xx, 0); drawSprite(k, xx, yy, w); ctx.restore(); } else drawSprite(k, xx, yy, w);
          return;
        }
        if (a > 0.02) drawSprite(k, xx, yy, w, a);
      } });
    }
    // компании
    const far = zoom < 1.6;
    for (const c of cos) {
      if (!onScreen(c.x, c.y, 160)) { c._r = null; continue; }
      items.push({ y: c.y, draw: () => drawCompany(c, t, far) });
    }
    // путешественники
    for (const wk of walkers) {
      const p = (t * wk.v + wk.ph) % 2; const k = p < 1 ? p : 2 - p;
      const x = wk.a[0] + (wk.b[0] - wk.a[0]) * k, y = wk.a[1] + (wk.b[1] - wk.a[1]) * k + (reduce ? 0 : -Math.abs(Math.sin(t * 6 + wk.ph)) * 1.5);
      if (onScreen(x, y)) items.push({ y, draw: () => { ctx.save(); if ((p < 1) !== (wk.b[0] > wk.a[0])) { ctx.translate(x, 0); ctx.scale(-1, 1); ctx.translate(-x, 0); } drawSprite(wk.k, x, y, 16 * Math.max(0.4, dens)); ctx.restore(); } });
    }
    smokeQ = [];
    items.sort((a, b) => a.y - b.y).forEach((it) => it.draw());
    for (const [sx0, sy0, w, hs, own] of smokeQ) {
      // димар закритий будинком спереду -- диму не видно, не малюємо
      if (cos.some((o) => o !== own && o._r && o.y > own.y && Math.abs(sx0 - o._r.x) < o._r.w * 0.42 && sy0 > o._r.y - o._r.h * 0.42 && sy0 < o._r.y + o._r.h / 2)) continue;
      for (let i = 0; i < 5; i++) {
        const p = (t * 0.2 + i / 5 + (hs % 11) * 0.09) % 1;
        const r = w * (0.045 + p * 0.1);
        ctx.fillStyle = theme === 'dark' ? `rgba(205,210,225,${0.42 * (1 - p)})` : `rgba(226,222,215,${0.85 * (1 - p) * Math.min(1, p * 6)})`;
        ctx.beginPath(); ctx.arc(sx0 + Math.sin(p * 4 + hs) * w * 0.04 + p * w * 0.1, sy0 - p * w * 0.38, r, 0, 7); ctx.fill();
      }
    }
    // 03.10.2026 (Александр): уночі на маяках повільно крутиться промінь.
    if (theme === 'dark' && !reduce) {
      for (const d of geo.decor) {
        const [k, x, y, sc] = d; if (d.hide || !k.startsWith('lighthouse') || !onScreen(x, y, 120)) continue;
        const im = sprite(k); if (!im) continue;
        const ds = Math.max(0.4, dens) * Math.min(1, Math.max(geo.k, 60) / 100);
        const lw = 40 * sc * ds, lh = lw * im.height / im.width, lx = x, ly = y - lh * 0.8, L = lw * 2.6;
        const a0 = t * 0.6 + x;
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (const off of [0, Math.PI]) {
          const a = a0 + off, g = ctx.createRadialGradient(lx, ly, 0, lx, ly, L);
          g.addColorStop(0, 'rgba(255,230,160,.55)'); g.addColorStop(1, 'rgba(255,220,140,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.arc(lx, ly, L, a - 0.16, a + 0.16); ctx.closePath(); ctx.fill();
        }
        const hg = ctx.createRadialGradient(lx, ly, 0, lx, ly, lw * 0.35); hg.addColorStop(0, 'rgba(255,240,190,.9)'); hg.addColorStop(1, 'rgba(255,220,150,0)');
        ctx.fillStyle = hg; ctx.fillRect(lx - lw * 0.35, ly - lw * 0.35, lw * 0.7, lw * 0.7);
        ctx.restore();
      }
    }
    drawCityLabels();
    // птицы
    if (!reduce) {
      if (t - birds.t > 26) { birds.t = t; const y0 = 200 + Math.random() * (geo.h - 400); birds.path = { y0, dir: Math.random() > 0.5 ? 1 : -1 }; }
      const bt = t - birds.t; if (birds.path && bt < 22) {
        const { y0, dir } = birds.path; const bx = dir > 0 ? -60 + bt * 110 : geo.w + 60 - bt * 110;
        for (let i = 0; i < 3; i++) { const fx = bx - dir * i * 26, fy = y0 + i * 14 - bt * 6; ctx.save(); ctx.translate(fx, fy); ctx.scale(dir, 0.75 + 0.25 * Math.sin(t * 9 + i)); drawSprite(i === 1 ? 'bird-seabird' : 'bird-gull', 0, 0, 22); ctx.restore(); }
      }
    }
    // облака с тенями (выше всего)
    for (const cl of clouds) {
      const x = (((cl.x + (reduce ? 0 : t * cl.v)) % 1.2) - 0.1) * geo.w, y = cl.y * geo.h;
      const sh = shadowOf(cl.k), im = sprite(cl.k); if (!im) continue; const h = cl.w * im.height / im.width;
      if (sh) { ctx.globalAlpha = theme === 'dark' ? 0.14 : 0.09; ctx.drawImage(sh, x - cl.w / 2 + 40, y - h / 2 + 55, cl.w, h); }
      ctx.globalAlpha = Math.min(0.8, 0.45 + (2.2 - Math.min(2.2, zoom)) * 0.18) * (theme === 'dark' ? 0.5 : 1);
      ctx.drawImage(im, x - cl.w / 2, y - h / 2, cl.w, h); ctx.globalAlpha = 1;
    }
    ctx.restore();
    // свет и туман (поверх экрана)
    const P = PAL[theme];
    const lx = W * (0.25 + 0.5 * (reduce ? 0.3 : (Math.sin(t * 0.03) * 0.5 + 0.5))), ly = -H * 0.2;
    const lg = ctx.createRadialGradient(lx, ly, 0, lx, ly, Math.max(W, H) * 1.1);
    lg.addColorStop(0, P.light + (theme === 'dark' ? '.10)' : '.20)')); lg.addColorStop(1, P.light + '0)');
    ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H);
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
    vg.addColorStop(0, `rgba(${P.fog},0)`); vg.addColorStop(1, `rgba(${P.fog},${P.fogA})`);
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    if (!reduce) for (let i = 0; i < 3; i++) {
      const fx = W * (0.1 + 0.8 * ((i * 0.37 + t * 0.004 * (i + 1)) % 1)), fy = H * (i === 1 ? 0.92 : 0.08 + i * 0.4);
      const fg = ctx.createRadialGradient(fx, fy, 0, fx, fy, 260); fg.addColorStop(0, `rgba(${P.fog},${theme === 'dark' ? .2 : .14})`); fg.addColorStop(1, `rgba(${P.fog},0)`);
      ctx.fillStyle = fg; ctx.fillRect(fx - 260, fy - 260, 520, 520);
    }
    drawSeason(t);
    drawLabels();
    placePopup();
  }

  // 03.10.2026 (Александр): сезони, як на сторінці завантаження. Восени
  // падає листя, взимку сніг, навесні пилок, улітку -- світлячки ввечері
  // й легкі іскри вдень. Кілька десятків крапок поверх екрана.
  const SEASON = (() => { const m = new Date().getMonth(); return m >= 2 && m <= 4 ? 'spring' : m >= 5 && m <= 7 ? 'summer' : m >= 8 && m <= 10 ? 'autumn' : 'winter'; })();
  const LEAF = ['#d9822b', '#c0582a', '#e0b13a', '#b5652a', '#d4a02f'];
  let parts = null;
  function drawSeason(t) {
    if (reduce) return;
    if (!parts) {
      const n = SEASON === 'winter' ? (coarse ? 40 : 70) : coarse ? 12 : 20;
      parts = Array.from({ length: n }, (_, i) => ({ x: Math.random(), y: Math.random(), v: 0.5 + Math.random(), s: 0.6 + Math.random() * 0.8, ph: Math.random() * 6.28, c: LEAF[i % LEAF.length] }));
    }
    const dark = theme === 'dark';
    ctx.save();
    for (const p of parts) {
      let x, y;
      if (SEASON === 'autumn') {
        y = ((p.y + t * 0.022 * p.v) % 1.1) - 0.05; x = ((p.x + t * 0.006 * p.v + Math.sin(t * 0.9 * p.v + p.ph) * 0.02) % 1 + 1) % 1;
        const px = x * W, py = y * H, sz = 6 * p.s, rot = t * 1.4 * p.v + p.ph;
        ctx.globalAlpha = dark ? 0.55 : 0.8; ctx.fillStyle = p.c;
        ctx.save(); ctx.translate(px, py); ctx.rotate(rot); ctx.scale(1, 0.45 + 0.4 * Math.abs(Math.sin(rot * 1.7)));
        ctx.beginPath(); ctx.ellipse(0, 0, sz, sz * 0.55, 0, 0, 7); ctx.fill(); ctx.restore();
      } else if (SEASON === 'winter') {
        y = ((p.y + t * 0.03 * p.v) % 1.05) - 0.02; x = ((p.x + Math.sin(t * 0.6 * p.v + p.ph) * 0.015) % 1 + 1) % 1;
        ctx.globalAlpha = (dark ? 0.6 : 0.85) * (0.5 + p.s * 0.4); ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(x * W, y * H, 1.3 + p.s * 1.4, 0, 7); ctx.fill();
      } else {
        // весна -- пилок угору; літо -- світлячки (вечір) або іскри (день)
        y = 1.05 - ((p.y + t * 0.008 * p.v) % 1.1); x = ((p.x + Math.sin(t * 0.5 * p.v + p.ph) * 0.03) % 1 + 1) % 1;
        const tw = 0.5 + 0.5 * Math.sin(t * 2.2 * p.v + p.ph);
        const col = SEASON === 'summer' && dark ? '255,225,120' : SEASON === 'summer' ? '255,250,220' : '255,245,200';
        const r = (SEASON === 'summer' && dark ? 6 : 4) * p.s;
        const g = ctx.createRadialGradient(x * W, y * H, 0, x * W, y * H, r);
        g.addColorStop(0, `rgba(${col},${(dark ? 0.75 : 0.6) * tw})`); g.addColorStop(1, `rgba(${col},0)`);
        ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fillRect(x * W - r, y * H - r, r * 2, r * 2);
      }
    }
    ctx.restore();
  }

  let cityGroups = [];
  function buildCityGroups() {
    const g = {};
    for (const c of cos) { const k = c.ck || '—'; (g[k] ||= []).push(c); }
    let groups = Object.entries(g).map(([name, list]) => {
      const xs = list.map((c) => c.x), ys = list.map((c) => c.y);
      const hx = list.reduce((a, c) => a + c.hx, 0) / list.length, hy = list.reduce((a, c) => a + c.hy, 0) / list.length;
      return { name, list, hx, hy, x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
    }).sort((a, b) => b.list.length - a.list.length);
    // Передмістя (Бровари, Ірпінь…) потрапляють усередину великого кластера міста —
    // зливаємо їх із ним, щоб посеред Києва не стояла чужа назва.
    const out = [];
    for (const gr of groups) {
      // зливаємо лише справжні передмістя: справжні координати ближче ~35 км
      const host = out.find((h) => h.list.length > gr.list.length && Math.hypot(h.hx - gr.hx, h.hy - gr.hy) < 32);
      if (host) { host.list.push(...gr.list); host.x0 = Math.min(host.x0, gr.x0); host.x1 = Math.max(host.x1, gr.x1); host.y0 = Math.min(host.y0, gr.y0); host.y1 = Math.max(host.y1, gr.y1); }
      else out.push(gr);
    }
    // Підпис маленького міста, що опинився всередині великого кластера
    // (Чернігів посеред Києва), не малюємо -- компанії лишаються в пошуку.
    const inside = (gr) => out.some((h) => h !== gr && h.list.length > gr.list.length * 3 && gr.hx > h.x0 && gr.hx < h.x1 && gr.hy > h.y0 && gr.hy < h.y1);
    cityGroups = out.filter((gr) => !inside(gr)).map((gr) => ({ name: gr.name, label: cityName(gr.name, lang), n: gr.list.length, x: (gr.x0 + gr.x1) / 2, y: gr.y1 }));
  }
  // 02.10.2026 (Александр): при сильному наближенні плашка «їхала» від
  // тексту -- шрифт у кілька десятих пікселя браузер міряє неточно. Тепер
  // підписи міст малюються в пікселях екрана, як назви компаній.
  function drawCityLabels() {
    const P = theme === 'dark';
    ctx.save(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // більші міста першими; підпис, що налазить на вже намальований, пропускаємо
    const placedC = [];
    for (const g of [...cityGroups].sort((a, b) => b.n - a.n)) {
      if (!onScreen(g.x, g.y, 60)) continue;
      const fs = g.n > 5 ? 15 : 12;
      const sx = g.x * view.s + view.x, sy = g.y * view.s + view.y + (view.s > minS * 3.2 ? 26 : 12);
      ctx.font = `700 italic ${fs}px Georgia, 'Times New Roman', serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const label = g.n > 1 ? `${g.label} · ${g.n}` : g.label;
      const tw = ctx.measureText(label).width, padX = 8, h = fs + 9;
      const box = { x: sx - tw / 2 - padX - 4, y: sy - h / 2 - 2, w: tw + padX * 2 + 8, h: h + 4 };
      if (placedC.some((q) => box.x < q.x + q.w && q.x < box.x + box.w && box.y < q.y + q.h && q.y < box.y + box.h)) continue;
      placedC.push(box);
      ctx.fillStyle = P ? 'rgba(15,22,36,.72)' : 'rgba(251,245,230,.82)';
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(sx - tw / 2 - padX, sy - h / 2, tw + padX * 2, h, h / 2) : ctx.rect(sx - tw / 2 - padX, sy - h / 2, tw + padX * 2, h); ctx.fill();
      ctx.fillStyle = P ? '#f0e2bd' : '#5a3d16'; ctx.fillText(label, sx, sy + 0.5);
    }
    ctx.restore();
  }

  function drawCompany(c, t, far) {
    const act = c === hover || c === pinned;
    if (c.cluster) {
      // 07.10.2026: кластер «+N» -- завжди булавка з підписом, будинку немає.
      // Як у Google Maps / Mapbox: маркер має сталий розмір на екрані, зум його не роздуває
      // (булавка в одиницях карти росла разом із зумом і закривала півекрана).
      const w = Math.min(act ? 19 : 17, (act ? 30 : 26) / view.s); const h = drawSprite(c.pin, c.x, c.y, w) || w;
      c._r = { x: c.x, y: c.y - h / 2, w, h };
      if (act || view.s >= minS * 1.6) labelQ.push(c);
      return;
    }
    if (!act && ((c.ext && view.s < minS * 3) || (far && c.l <= 3 && cos.length <= 120))) {
      // мелкие издалека -- булавки; на екрані не більше 24 px, хоч як наближай
      const w = Math.min(15, 24 / view.s); const h = drawSprite(c.pin, c.x, c.y, w) || w;
      c._r = { x: c.x, y: c.y - h / 2, w, h };
      return;
    }
    let k = (c.forest && !noForest ? 'forest/' : 'buildings/') + `level-0${c.l}`;
    if (k.startsWith('buildings/')) { const pool = bVar[c.l]; if (pool && pool.length > 1) k = pool[hash(String(c.id)) % pool.length]; }
    const w = c.w;
    // тень-эллипс под зданием
    ctx.fillStyle = theme === 'dark' ? 'rgba(0,0,0,.35)' : 'rgba(40,50,20,.22)';
    ctx.beginPath(); ctx.ellipse(c.x, c.y - 1, w * 0.42, w * 0.11, 0, 0, 7); ctx.fill();
    if (act && !reduce) {
      const p = (t * 1.2) % 1;
      ctx.strokeStyle = `rgba(255,214,120,${0.85 * (1 - p)})`; ctx.lineWidth = 2.2 / view.s;
      ctx.beginPath(); ctx.ellipse(c.x, c.y - 1, w * (0.45 + p * 0.35), w * (0.13 + p * 0.1), 0, 0, 7); ctx.stroke();
    }
    // 02.10.2026 (Александр): логотипів на прапорах немає взагалі -- аватар
    // вантажиться один, у картці, коли навели на будинок.
    const im = sprite(k); const h = im ? w * im.height / im.width : w;
    const bx = c.x - w / 2, by = c.y + w * 0.04 - h;
    if (im) ctx.drawImage(im, bx, by, w, h);
    drawFlags(c, k, bx, by, w, t);
    // 03.10.2026 (Александр: оживлення). Лише зблизька, щоб не рахувати
    // зайвого: дим із труби в частини будинків і тепле світло вікон увечері.
    if (!reduce && !far && w * view.s >= 26) {
      const hs = c.h ?? hash(String(c.id));
      if (theme === 'dark') {
        const fl = 0.55 + 0.25 * Math.sin(t * (1.3 + (hs % 5) * 0.21) + hs) + 0.12 * Math.sin(t * 7.1 + hs * 3);
        const gx = c.x, gy = by + h * 0.62, gr = w * 0.42;
        const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
        g.addColorStop(0, `rgba(255,190,100,${0.45 * fl})`); g.addColorStop(1, 'rgba(255,170,80,0)');
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(gx - gr, gy - gr, gr * 2, gr * 2); ctx.restore();
      }
      // Дим -- лише з будинків, де в малюнку справді є димар (CHIMNEY).
      const chim = CHIMNEY[styleKeys.has(k) ? `${style}/${k}` : k];
      // малюємо після всіх будинків (smokeQ), щоб сусідній дах не ховав дим
      if (chim) smokeQ.push([bx + w * chim[0], by + h * chim[1], w, hs, c]);
    }
    if (c.userId && allies.has(c.userId)) { const a = sprite('markers/ally'); if (a) { const aw = w * 0.3; ctx.drawImage(a, c.x + w * 0.22, by + h * 0.18, aw, aw * a.height / a.width); } }
    c._r = { x: c.x, y: c.y - h / 2, w, h };
    if (act || w * view.s >= 34) labelQ.push(c);
  }
  // Назви -- поверх усіх будинків, у плашці; якщо назва налазить на вже
  // намальовану, не малюємо її (крупніші й наведена -- першими).
  let labelQ = [];
  function drawLabels() {
    const P = theme === 'dark';
    const placed = [];
    labelQ.sort((a, b) => ((b === hover || b === pinned) - (a === hover || a === pinned)) || b.l - a.l || b.n - a.n);
    ctx.save(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = '700 11.5px system-ui, -apple-system, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const c of labelQ) {
      if (c === popFor && popCoversLabel) continue;
      const act = c === hover || c === pinned;
      const sx = c.x * view.s + view.x, sy = c.y * view.s + view.y + 9;
      const nm = c.cluster ? `+${c.cos || 0}` : c.name;  // 07.10.2026: на карті коротко «+N», слово «компаній» -- лише в картці
      const name = nm.length > 22 ? nm.slice(0, 21) + '…' : nm;
      const tw = ctx.measureText(name).width, w = tw + 12, h = 18;
      const r = { x: sx - w / 2, y: sy - h / 2, w, h };
      if (!act && placed.some((q) => r.x < q.x + q.w + 3 && q.x < r.x + r.w + 3 && r.y < q.y + q.h + 2 && q.y < r.y + r.h + 2)) continue;
      placed.push(r);
      ctx.fillStyle = act ? (P ? '#5b6fc0' : '#a8571f') : (P ? 'rgba(15,22,36,.82)' : 'rgba(251,245,230,.9)');
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(r.x, r.y, r.w, r.h, 9) : ctx.rect(r.x, r.y, r.w, r.h); ctx.fill();
      ctx.fillStyle = act ? '#fff' : (P ? '#f4ead2' : '#3a2a14'); ctx.fillText(name, sx, sy + 0.5);
    }
    ctx.restore();
    labelQ = [];
  }

  // ---------- карточка компании возле здания ----------
  let popFor = null;
  let smokeQ = [];
  let popCoversLabel = false;
  function popupHtml(c) {
    if (c.cluster) {
      // 07.10.2026: кластер -- скільки компаній і вакансій у місті, кілька назв і вакансій
      const jobsC = (c.jobs || []).slice(0, 3).map((j) => `<a href="/jobs/${esc(j.slug)}">${esc(j.title)}</a>`).join('');
      const nm = (c.names || []).slice(0, 12).map(esc).join(' · ') + ((c.names || []).length > 12 ? ' …' : '');
      return `<div class="gm-ph" style="--fc:${esc(c.color)}"><div class="gm-ava"><span>+</span></div><div class="gm-pt"><b>${esc(nForm(c.cos || 0, 'cos'))}</b><small>${esc(cityName(c.ck, lang))}</small></div><button class="gm-x" type="button" aria-label="${esc(tr('close'))}">×</button></div>
      <div class="gm-chips"><span class="gm-chip g">💼 ${nForm(c.n, 'vac')}</span></div>
      ${nm ? `<p class="gm-bio">${nm}</p>` : ''}
      ${jobsC ? `<div class="gm-jobs">${jobsC}</div>` : ''}`;
    }
    const jobs = (c.jobs || []).slice(0, 3).map((j) => `<a href="/jobs/${esc(j.slug)}">${esc(j.title)}</a>`).join('');
    const ava = c.avatar ? `<img src="${esc(c.avatar)}" alt="">` : `<span>${esc((c.name || '?').slice(0, 1))}</span>`;
    const prof = c.username ? `<a class="gm-p" href="${esc(profileHref(c))}">${esc(tr('profile'))}</a>` : '';
    const sub = [cityName(c.ck, lang), c.est ? tr('since').replace('{y}', c.est) : ''].filter(Boolean).join(' · ');
    const chips = [
      `<span class="gm-chip g">💼 ${nForm(c.n, 'vac')}</span>`,
      c.employees ? `<span class="gm-chip">👥 ${nForm(c.employees, 'emp')}</span>` : '',
      c.occupation ? `<span class="gm-chip">${esc(c.occupation)}</span>` : '',
    ].join('');
    let site = '';
    if (c.website) { try { const u = new URL(c.website.startsWith('http') ? c.website : 'https://' + c.website); site = `<a class="gm-site" href="${esc(u.href)}" target="_blank" rel="noopener nofollow">🔗 ${esc(u.hostname.replace(/^www\./, ''))}</a>`; } catch { site = ''; } }
    const bio = c.bio ? `<p class="gm-bio">${esc(c.bio)}</p>` : '';
    const isAlly = c.userId && allies.has(c.userId);
    if (c.ext) c = { ...c, userId: null };
    const ally = c.userId ? `<button class="gm-ally${isAlly ? ' on' : ''}" type="button" title="${esc(isAlly ? tr('allyOff') : tr('allyAdd'))}" aria-label="${esc(isAlly ? tr('allyOff') : tr('allyAdd'))}">${isAlly ? '<span class="ok">✓</span><span class="rm">✕</span>' : '<span>+</span>'}</button>` : '';
    return `<div class="gm-ph" style="--fc:${esc(c.color)}"><div class="gm-ava">${ava}</div><div class="gm-pt"><b>${esc(c.name)}</b><small>${esc(sub)}</small></div><button class="gm-x" type="button" aria-label="${esc(tr('close'))}">×</button></div>
      <div class="gm-chips">${chips}</div>
      ${bio}${site}
      ${jobs ? `<div class="gm-jobs">${jobs}</div>` : ''}
      <div class="gm-acts">${prof}${ally}</div>`;
  }
  let allyBusy = false;
  // 02.10.2026 (Александр): повторне натискання прибирає з контактів.
  async function toggleAlly(c) {
    if (!c.userId || allyBusy) return;
    allyBusy = true;
    try { if (allies.has(c.userId)) await removeAlly(c); else await addAlly(c); } finally { allyBusy = false; }
  }
  // 07.10.2026 (Александр: «союзники не работают в приложении»). В
  // приложении сайт не знает, кто вошёл (вход -- в приложении, а не на
  // сайте), поэтому контакты добавляет и читает само приложение: карта
  // просит его через мостик A1Map и ждёт ответ в window.__a1MapReply.
  let appReqN = 0;
  const appWaits = new Map();
  if (appMode) {
    window.__a1MapReply = (id, ok, data) => {
      const w = appWaits.get(id); if (!w) return;
      appWaits.delete(id); if (ok) w.res(data); else w.rej(new Error('app call failed'));
    };
  }
  function appApi(method, body) {
    return new Promise((res, rej) => {
      const id = ++appReqN; appWaits.set(id, { res, rej });
      try { window.A1Map.postMessage(JSON.stringify({ t: 'api', id, method, body })); } catch (e) { appWaits.delete(id); rej(e); return; }
      setTimeout(() => { if (appWaits.has(id)) { appWaits.delete(id); rej(new Error('timeout')); } }, 15000);
    });
  }
  async function removeAlly(c) {
    try {
      let cid = allies.get(c.userId);
      if (!cid) { await loadAllies(); cid = allies.get(c.userId); }
      if (!cid) throw new Error('no contact id');
      if (appMode) {
        await appApi('contacts.deleteContacts', { ids: [cid] });
        allies.delete(c.userId); popFor = null; showPopup(c);
        toast(tr('allyGone'), tr('allyGoneSub'), c.avatar, true);
        return;
      }
      const r = await fetch('/api/contacts/remove', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contactId: cid }) });
      if (r.status === 401) { location.href = '/sign-in?next=' + encodeURIComponent(location.pathname); return; }
      if (!r.ok) throw new Error(String(r.status));
      allies.delete(c.userId); popFor = null; showPopup(c);
      toast(tr('allyGone'), tr('allyGoneSub'), c.avatar, true);
    } catch { const b = pop.querySelector('.gm-ally'); if (b) { b.title = tr('allyErr'); b.classList.add('err'); } }
  }
  async function addAlly(c) {
    try {
      if (appMode) {
        const d = await appApi('contacts.addContact', { user: c.userId });
        allies.set(c.userId, (d && d._id) || ''); popFor = null; showPopup(c);
        const ab = pop.querySelector('.gm-ally'); if (ab) ab.classList.add('pop');
        toast(tr('allyDone'), tr('allyDoneSub'), c.avatar);
        return;
      }
      const r = await fetch('/api/contacts/add', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: c.userId }) });
      if (r.status === 401) { location.href = '/sign-in?next=' + encodeURIComponent(location.pathname); return; }
      if (!r.ok) throw new Error(String(r.status));
      let cid = ''; try { const j = await r.json(); cid = j?.contact?._id || ''; } catch { /* id дізнаємось зі списку */ }
      allies.set(c.userId, cid); popFor = null; showPopup(c);
      const b = pop.querySelector('.gm-ally'); if (b) b.classList.add('pop');
      toast(tr('allyDone'), tr('allyDoneSub'), c.avatar);
    } catch { const b = pop.querySelector('.gm-ally'); if (b) { b.title = tr('allyErr'); b.classList.add('err'); } }
  }
  let toastT = 0;
  function toast(title, sub, img, gone) {
    let el = root.querySelector('.gm-toast');
    if (!el) { el = document.createElement('div'); el.className = 'gm-toast'; el.setAttribute('role', 'status'); root.appendChild(el); }
    el.classList.toggle('gone', !!gone);
    el.innerHTML = `<span class="gm-tk">${img ? `<img src="${esc(img)}" alt="">` : ''}<i>${gone ? '−' : '✓'}</i></span><span class="gm-tt2"><b>${esc(title)}</b><small>${esc(sub)}</small></span>`;
    el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 2800);
  }
  async function loadAllies() {
    try {
      let list;
      if (appMode) {
        const d = await appApi('contacts.search', {});
        list = Array.isArray(d) ? d : (d && (d.items || d.contacts)) || [];
      } else {
        const r = await fetch('/api/contacts/list'); if (!r.ok) return;
        const j = await r.json(); list = j.contacts || j.data || j.items || [];
      }
      allies.clear(); for (const it of list) { const id = it.userId || it.user?.id || it.user?._id || it.user; if (typeof id === 'string') allies.set(id, it._id || it.id || ''); }
      allyKnown = true;
    } catch { /* гость: союзников нет */ }
  }
  function showPopup(c) {
    if (popFor !== c) { popFor = c; if (c) { pop.innerHTML = popupHtml(c); } }
    pop.classList.toggle('on', !!c);
    if (c) mascot.parentElement.classList.add('off');
  }
  function placePopup() {
    const c = popFor; if (!c || !c._r) return;
    const sx = c._r.x * view.s + view.x, top = (c._r.y - c._r.h / 2) * view.s + view.y, bot = (c._r.y + c._r.h / 2) * view.s + view.y;
    const pw = pop.offsetWidth || 280, ph = pop.offsetHeight || 160;
    let left = Math.max(8, Math.min(W - pw - 8, sx - pw / 2));
    let y = top - ph - 10, below = false;
    // 03.10.2026 (Александр): картка під будинком не закриває його назву --
    // стаємо нижче плашки з назвою (вона на ~18 px під точкою компанії).
    const labelBot = c.y * view.s + view.y + 18;
    if (y < 8) { y = Math.max(bot, labelBot) + 8; below = true; }
    // 02.10.2026 (Александр): на телефоні знизу кнопки сайту (чат, «+») --
    // картку тримаємо вище, щоб «+» союзника натискався спокійно.
    const bottomPad = coarse ? 100 : 8;
    y = Math.max(8, Math.min(H - ph - bottomPad, y));
    // Якщо місця не вистачило і картка все одно лягла на назву -- назву гасимо
    // (вона й так є в картці).
    popCoversLabel = y < labelBot && y + ph > labelBot - 18 && Math.abs(sx - (left + pw / 2)) < pw / 2 + 40;
    pop.style.transform = `translate(${Math.round(left)}px,${Math.round(y)}px)`;
    const ax = Math.max(16, Math.min(pw - 16, sx - left));
    pop.style.setProperty('--ax', `${ax}px`); pop.classList.toggle('below', below);
  }

  // ---------- ввод ----------
  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1); W = root.clientWidth; H = root.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
    minS = Math.max(W / geo.w, H / geo.h); maxS = minS * Math.max(7, 2.4 / dens) * 4; // 02.10.2026 (Александр): наближення в 4 рази глибше -- спрайти 512px, зблизька чіткі
    if (view.s < minS) view.s = minS; clamp(); baseCache = null;
  }
  function clamp() {
    const w = geo.w * view.s, h = geo.h * view.s;
    view.x = Math.min(0, Math.max(W - w, view.x)); view.y = Math.min(0, Math.max(H - h, view.y));
  }
  function zoomAt(px, py, ns) {
    ns = Math.max(minS, Math.min(maxS, ns)); const mx = (px - view.x) / view.s, my = (py - view.y) / view.s;
    view.s = ns; view.x = px - mx * ns; view.y = py - my * ns; clamp();
  }
  let anim = null;
  function flyTo(px, py, ns) { const from = { ...view }; const start = performance.now();
    const mx = (px - view.x) / view.s, my = (py - view.y) / view.s; const target = Math.max(minS, Math.min(maxS, ns));
    anim = () => { const k = Math.min(1, (performance.now() - start) / 320); const e = 1 - (1 - k) ** 3;
      const s = from.s + (target - from.s) * e; view.s = s; view.x = px - mx * s; view.y = py - my * s; clamp(); if (k >= 1) anim = null; };
  }
  function hit(px, py) {
    // 07.10.2026: кластер «+N» має перевагу (навіть над «липким» наведенням) -- маленька булавка серед будинків інакше «не натискається».
    // Ціль -- булавка разом із підписом «+N» під нею.
    for (const c of cos) { if (!c.cluster || !c._r) continue;
      const sx = c.x * view.s + view.x, tipY = c.y * view.s + view.y, ph = c._r.h * view.s;
      if (Math.abs(px - sx) < 18 && py > tipY - ph - 6 && py < tipY + 20) return c; }
    if (hover && hover._r) {
      const c = hover, sx = c._r.x * view.s + view.x, sy = c._r.y * view.s + view.y;
      const hw = Math.max(16, c._r.w * view.s * 0.55), hh = Math.max(16, c._r.h * view.s * 0.55);
      if (Math.abs(px - sx) < hw && Math.abs(py - sy) < hh) return c;
    }
    let best = null, bd = 1e9;
    for (const c of cos) { if (!c._r) continue; const sx = c._r.x * view.s + view.x, sy = c._r.y * view.s + view.y;
      const hw = Math.max(14, c._r.w * view.s * 0.5), hh = Math.max(14, c._r.h * view.s * 0.5);
      const dx = px - sx, dy = py - sy; if (Math.abs(dx) < hw && Math.abs(dy) < hh) { const d = dx * dx + dy * dy; if (d < bd) { bd = d; best = c; } } }
    return best;
  }
  const pts = new Map(); let drag = null, pinch = null, moved = 0;
  const on = (el, ev, fn, o) => { el.addEventListener(ev, fn, o); cleanup.push(() => el.removeEventListener(ev, fn, o)); };
  cleanup.push(music.subscribe(() => musicLabel()));
  // 03.10.2026 (Александр): на невисоких екранах кругла кнопка чатів сайту
  // (position: fixed, поза картою) закривала «+»/«−». Піднімаємо їх рівно
  // настільки, наскільки їх щось закриває; якщо нічого -- лишаються на місці.
  const zoomEl = root.querySelector('.gm-zoom');
  let zShift = 0, zRaf = 0;
  function liftZoom() {
    zRaf = 0;
    if (!zoomEl || destroyed) return;
    let need = 0;
    const full = root.classList.contains('gm-full') || (document.fullscreenElement || document.webkitFullscreenElement) === root;
    if (!full && getComputedStyle(zoomEl).display !== 'none') {
      const zr = zoomEl.getBoundingClientRect(), top = zr.top + zShift, bottom = zr.bottom + zShift;
      for (const e of document.querySelectorAll('body .fixed, body [style*="fixed"]')) {
        if (root.contains(e) || e.contains(root)) continue;
        const cs = getComputedStyle(e); if (cs.position !== 'fixed' || cs.visibility === 'hidden' || +cs.opacity < 0.05) continue;
        const r = e.getBoundingClientRect(); if (!r.width || !r.height) continue;
        if (r.left < zr.right && r.right > zr.left && r.top < bottom && r.bottom > top) need = Math.max(need, bottom - r.top + 10);
      }
    }
    if (need !== zShift) { zShift = need; zoomEl.style.transform = need ? `translateY(${-need}px)` : ''; }
  }
  const queueLift = () => { if (!zRaf) zRaf = requestAnimationFrame(liftZoom); };
  on(window, 'scroll', queueLift, { passive: true });
  on(window, 'resize', queueLift);
  const zTimer = setInterval(queueLift, 1500); cleanup.push(() => { clearInterval(zTimer); cancelAnimationFrame(zRaf); });
  queueLift();
  // Людина лишила музику ввімкненою минулого разу -- вмикаємо від першого
  // дотику до карти (браузер не дає грати без жесту). pointerdown -- для
  // миші, pointerup -- для пальця (так рахують жест браузери).
  const wake = (e) => { if (!e.target.closest('.gm-music')) music.autoResume(); };
  on(root, 'pointerdown', (e) => { if (e.pointerType === 'mouse') wake(e); }, true);
  on(root, 'pointerup', (e) => { if (e.pointerType !== 'mouse') wake(e); }, true);
  on(cv, 'pointerdown', (e) => { cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = 0;
    if (pts.size === 1) drag = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y }; else { drag = null; const a = [...pts.values()]; pinch = { d: Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y), s: view.s }; } });
  on(cv, 'pointermove', (e) => {
    const r = cv.getBoundingClientRect();
    if (!pts.has(e.pointerId)) { if (e.pointerType === 'mouse' && !pinned) { const c = hit(e.clientX - r.left, e.clientY - r.top); if (c !== hover) { hover = c; showPopup(c); } cv.style.cursor = c ? 'pointer' : 'grab'; } return; }
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); const a = [...pts.values()];
    if (a.length >= 2 && pinch) { const d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); zoomAt((a[0].x + a[1].x) / 2 - r.left, (a[0].y + a[1].y) / 2 - r.top, pinch.s * d / pinch.d); moved = 99; }
    else if (drag) { const dx = e.clientX - drag.x, dy = e.clientY - drag.y; moved = Math.max(moved, Math.abs(dx) + Math.abs(dy)); view.x = drag.vx + dx; view.y = drag.vy + dy; clamp();
      // 03.10.2026 (Александр): тягнемо карту -- лапка «стискається»
      if (moved > 3 && e.pointerType === 'mouse' && cv.style.cursor !== 'grabbing') cv.style.cursor = 'grabbing'; }
  });
  let tapT = 0;
  const up = (e) => { const tap = moved < 6 && pts.size === 1; pts.delete(e.pointerId); if (pts.size < 2) pinch = null; drag = null;
    const r = cv.getBoundingClientRect();
    if (e.pointerType === 'mouse') { const c = hit(e.clientX - r.left, e.clientY - r.top); cv.style.cursor = c ? 'pointer' : 'grab'; }
    if (tap) { const c = hit(e.clientX - r.left, e.clientY - r.top);
      // 07.10.2026: «+N» здалеку -- плавно наближаємо до міста (як кластер у Google Maps), потім список компаній
      if (c && c.cluster) expandCluster(c); else { pinned = c; hover = c; showPopup(c); }
      // клік по сусідній країні чекає мить: якщо це подвійний клік (зум),
      // країну не перемикаємо
      if (!c) { const sx = e.clientX - r.left, sy = e.clientY - r.top; clearTimeout(tapT); tapT = setTimeout(() => { if (!destroyed) tapCountry(sx, sy); }, e.pointerType === 'mouse' ? 280 : 0); } } };
  // 03.10.2026 (Александр): подвійний клік (миша, тачпад) -- один крок
  // наближення до точки під курсором, як кнопка «+».
  on(cv, 'dblclick', (e) => { e.preventDefault(); clearTimeout(tapT); const r = cv.getBoundingClientRect(); flyTo(e.clientX - r.left, e.clientY - r.top, view.s * 1.6); });
  on(cv, 'mousedown', (e) => { if (e.detail > 1) e.preventDefault(); });
  cleanup.push(() => clearTimeout(tapT));
  // 02.10.2026 (Александр: «відкотився, клацаю по Польщі -- і нічого»).
  // Клік по сусідній країні, де є вакансії, -- переходимо до неї (з
  // України -- на карту Європи, одразу на цю країну).
  function tapCountry(sx, sy) {
    if (!geo) return;
    const x = (sx - view.x) / view.s, y = (sy - view.y) / view.s;
    const co = geo.countries.find((k) => k.r.some((r) => inRing(r, x, y)));
    const cc = co && A2[co.a3];
    if (!cc || cc === focusCC || (region === 'ua' && cc === 'UA')) return;
    loadCountries().then((list) => {
      const hit = list.find((k) => k.cc === cc);
      if (!hit || destroyed) return;
      if (hit.r === 'ua' && region !== 'ua') chooseRegion('ua', null);
      else chooseRegion(hit.r, hit.r === 'ua' ? null : cc);
    });
  }
  on(cv, 'pointerup', up); on(cv, 'pointercancel', (e) => { pts.delete(e.pointerId); pinch = null; drag = null; });
  // 02.10.2026 (Александр: «при наведенні підколбашує»): курсор, що зайшов
  // на саму картку, її не ховає; ховаємо, лише коли пішов і з картки.
  on(cv, 'pointerleave', (e) => { if (e.pointerType === 'mouse' && !pinned && !(e.relatedTarget && pop.contains(e.relatedTarget))) { hover = null; showPopup(null); } });
  on(pop, 'pointerleave', (e) => { if (e.pointerType === 'mouse' && !pinned && e.relatedTarget !== cv) { hover = null; showPopup(null); } });
  on(cv, 'wheel', (e) => { e.preventDefault(); const r = cv.getBoundingClientRect(); zoomAt(e.clientX - r.left, e.clientY - r.top, view.s * Math.exp(-e.deltaY * 0.0016)); }, { passive: false });
  on(root, 'click', (e) => {
    if (e.target.closest('.gm-music')) { music.toggle(); return; }
    if (e.target.closest('.gm-info')) { openGl(!glP.classList.contains('on')); return; }
    if (glP.classList.contains('on') && !e.target.closest('.gm-gl')) openGl(false);
    const z = e.target.closest('[data-z]'); if (z) { flyTo(W / 2, H / 2, view.s * (z.dataset.z === 'in' ? 1.6 : 1 / 1.6)); return; }
    if (e.target.closest('.gm-x')) { pinned = null; hover = null; showPopup(null); return; }
    if (e.target.closest('.gm-theme')) setTheme(theme === 'dark' ? 'light' : 'dark');
    if (e.target.closest('.gm-ally') && popFor) toggleAlly(popFor);
    if (e.target.closest('.gm-fs')) toggleFs();
    if (e.target.closest('.gm-close')) closeApp();
    const si = e.target.closest('[data-ci]'); if (si) { pickCompany(byCi(si.dataset.ci)); }
  });
  // ---------- режим приложения ----------
  // 04.10.2026 (Александр): карта внутри приложения A1 (WebView). Сразу на
  // весь экран без меню сайта; тему и язык задаёт приложение, поэтому
  // кнопок темы и «на весь экран» нет, вместо них -- «закрыть». Кнопка
  // «союзник» работает через приложение (07.10.2026, см. appApi).
  // Профиль и вакансии -- обычные ссылки /u/... и /jobs/...: приложение
  // перехватывает их и открывает свои экраны.
  function closeApp() {
    try { if (window.A1Map && window.A1Map.postMessage) { window.A1Map.postMessage('close'); return; } } catch { /* not in the app */ }
    history.back();
  }
  // ---------- на весь экран ----------
  function toggleFs(force) {
    if (appMode) return;
    const on = force ?? !root.classList.contains('gm-full');
    if (on === root.classList.contains('gm-full')) return;
    // Режим 2: справжній повний екран (без меню сайту й браузера). Де браузер
    // не вміє (iPhone) -- карта просто накриває всю сторінку.
    root.classList.toggle('gm-full', on); document.documentElement.classList.toggle('gm-noscroll', on);
    const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
    if (on && !fsEl) { const rq = root.requestFullscreen || root.webkitRequestFullscreen; if (rq) { try { const pr = rq.call(root); if (pr && pr.catch) pr.catch(() => {}); } catch { /* overlay only */ } } }
    if (!on && fsEl === root) { const ex = document.exitFullscreen || document.webkitExitFullscreen; if (ex) { try { const pr = ex.call(document); if (pr && pr.catch) pr.catch(() => {}); } catch { /* ignore */ } } }
    setFsBtn(on);
    root.classList.remove('gm-enter'); void root.offsetWidth; root.classList.add('gm-enter');
    requestAnimationFrame(() => resize());
  }
  cleanup.push(() => document.documentElement.classList.remove('gm-noscroll'));
  const onFsChange = () => { const fsEl = document.fullscreenElement || document.webkitFullscreenElement; if (!fsEl && root.classList.contains('gm-full')) toggleFs(false); else requestAnimationFrame(() => resize()); };
  on(document, 'fullscreenchange', onFsChange); on(document, 'webkitfullscreenchange', onFsChange);
  // ---------- поиск компании ----------
  let sugIdx = -1, sugList = [];
  function renderSug() {
    const q = qIn.value.trim().toLowerCase();
    sugList = q.length < 1 ? [] : [...cos.map((c, i) => ({ c, i })), ...offMap.map((c, i) => ({ c, i: 'o' + i }))].map((o) => ({ ...o, p: (o.c.cluster ? (o.c.names || []).join(' | ') : o.c.name).toLowerCase().indexOf(q) })).filter((o) => o.p >= 0).sort((a, b) => a.p - b.p || b.c.n - a.c.n).slice(0, 8);
    sugIdx = sugList.length ? 0 : -1;
    sug.innerHTML = sugList.length ? sugList.map((o, k) => `<button type="button" class="gm-si${k === sugIdx ? ' on' : ''}" data-ci="${o.i}" role="option"><b>${esc(o.c.cluster ? ((o.c.names || []).find((x) => x.toLowerCase().includes(q)) || o.c.name) : o.c.name)}</b><small>${o.c.off ? esc(tr('offMap')) : `${esc(cityName(o.c.ck, lang))} · ${nForm(o.c.n, 'vac')}`}</small></button>`).join('')
      : (q ? `<div class="gm-none">${esc(tr('none'))}</div>` : '');
    sug.classList.toggle('on', !!q);
  }
  function byCi(ci) { return String(ci).startsWith('o') ? offMap[Number(String(ci).slice(1))] : cos[Number(ci)]; }
  // 07.10.2026 (Александр: «як зробити, щоб піни відкривались»): натиск на «+N» довантажує
  // компанії саме цього міста (маленький запит, лише по натиску) і ставить їх будинками на місце піна,
  // потім карта плавно наближається до міста. Не вийшло завантажити -- як раніше: політ і список.
  async function expandCluster(c) {
    if (c._loading) return; c._loading = true;
    let list = null;
    try { const r = await fetch(`/game-map/data?region=${encodeURIComponent(region)}&cluster=${encodeURIComponent(c.id)}`); if (r.ok) list = await r.json(); } catch {}
    c._loading = false;
    if (destroyed) return;
    if (!Array.isArray(list) || !list.length) { focusCluster(c); return; }
    const i = companiesIn.findIndex((x) => x.id === c.id);
    if (i >= 0) companiesIn.splice(i, 1, ...list);
    pinned = null; hover = null; showPopup(null);
    cos = layout(); buildCityGroups(); baseCache = null;
    const target = Math.min(maxS, Math.max(view.s, minS * 3.4));
    const from = { ...view }, start = performance.now();
    const tx = W / 2 - c.hx * target, ty = H / 2 - c.hy * target;
    anim = () => { const k = Math.min(1, (performance.now() - start) / 650); const e = 1 - (1 - k) ** 3;
      view.s = from.s + (target - from.s) * e; view.x = from.x + (tx - from.x) * e; view.y = from.y + (ty - from.y) * e; clamp(); baseCache = null;
      if (k >= 1) anim = null; };
  }
  // кластер -- політ і список (запасний шлях, якщо компанії не довантажились)
  function focusCluster(c) {
    pinned = null; hover = null; showPopup(null);
    const target = Math.min(maxS, Math.max(view.s * 1.8, minS * 3.2));
    const from = { ...view }, start = performance.now();
    const tx = W / 2 - c.x * target, ty = H / 2 - c.y * target + 120;
    anim = () => { const k = Math.min(1, (performance.now() - start) / 650); const e = 1 - (1 - k) ** 3;
      view.s = from.s + (target - from.s) * e; view.x = from.x + (tx - from.x) * e; view.y = from.y + (ty - from.y) * e; clamp(); baseCache = null;
      if (k >= 1) { anim = null; pinned = c; hover = c; showPopup(c); } };
  }
  function pickCompany(c) {
    if (!c) return;
    if (c.off) { if (c.username) location.href = profileHref(c); return; } qIn.value = c.name; sug.classList.remove('on'); qIn.blur();
    const target = Math.min(maxS, Math.max(view.s, minS * 2.5, 70 / c.w));
    const from = { ...view }, start = performance.now();
    const tx = W / 2 - c.x * target, ty = H / 2 - c.y * target + 120;
    anim = () => { const k = Math.min(1, (performance.now() - start) / 650); const e = 1 - (1 - k) ** 3;
      view.s = from.s + (target - from.s) * e; view.x = from.x + (tx - from.x) * e; view.y = from.y + (ty - from.y) * e; clamp(); baseCache = null;
      if (k >= 1) { anim = null; pinned = c; hover = c; showPopup(c); } };
  }
  on(regBtn, 'click', () => openReg(!regP.classList.contains('on')));
  on(regP, 'click', (e) => { const b = e.target.closest('.gm-ri'); if (b) chooseRegion(b.dataset.r, b.dataset.cc); });
  on(document, 'pointerdown', (e) => { if (regP.classList.contains('on') && !e.target.closest('.gm-regw')) openReg(false); });
  on(regBtn, 'keydown', (e) => { if (e.key === 'ArrowDown') { e.preventDefault(); openReg(true); const f = regP.querySelector('.gm-ri.on') || regP.querySelector('.gm-ri'); if (f) f.focus(); } });
  on(regP, 'keydown', (e) => {
    const items = [...regP.querySelectorAll('.gm-ri')]; const i = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); const n = items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]; if (n) n.focus(); }
    else if (e.key === 'Escape') { openReg(false); regBtn.focus(); }
  });
  on(qIn, 'input', renderSug);
  on(qIn, 'focus', renderSug);
  on(qIn, 'keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (!sugList.length) return; sugIdx = (sugIdx + (e.key === 'ArrowDown' ? 1 : -1) + sugList.length) % sugList.length; sug.querySelectorAll('.gm-si').forEach((b, k) => b.classList.toggle('on', k === sugIdx)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (sugIdx >= 0) pickCompany(sugList[sugIdx].c); }
    else if (e.key === 'Escape') { sug.classList.remove('on'); qIn.blur(); }
  });
  on(qIn, 'blur', () => setTimeout(() => sug.classList.remove('on'), 150));
  on(window, 'resize', () => resize());
  on(document, 'keydown', (e) => { if (e.key === 'Escape' && glP.classList.contains('on')) { openGl(false); return; } });
  on(document, 'keydown', (e) => { if (e.key === 'Escape' && regP.classList.contains('on')) { openReg(false); return; } if (e.key === 'Escape' && document.activeElement !== qIn) { if (popFor) { pinned = null; hover = null; showPopup(null); } else if (root.classList.contains('gm-full')) toggleFs(false); } });

  async function setTheme(th) {
    theme = th; root.classList.toggle('gm-dark', th === 'dark'); baseCache = null;
    themeLabel();
    mascot.src = `${base}/${th}/mascot/mascot-wave.webp`;
    await loadTheme(th);
  }

  let raf = 0;
  applyLang();
  if (opts.theme === 'dark') root.classList.add('gm-dark');
  if (appMode) {
    root.classList.add('gm-full', 'gm-app'); document.documentElement.classList.add('gm-noscroll');
    const ct = { uk: 'Закрити', ru: 'Закрыть', en: 'Close', de: 'Schließen', es: 'Cerrar', fr: 'Fermer', pl: 'Zamknij', ptBR: 'Fechar', zh: '关闭' };
    const cb = root.querySelector('.gm-close'); cb.setAttribute('aria-label', ct[lang] || ct.en); cb.title = ct[lang] || ct.en;
  }
  (async () => {
    let styleMan, styleFlags;
    [geo, man, flagMeta, styleMan, styleFlags] = await Promise.all([
      fetch(`${base}/${region === 'ua' ? 'geo' : 'geo-' + region}.json?v=${GEO_VERSION}`).then((r) => r.json()),
      fetch(`${base}/manifest.json`).then((r) => r.json()),
      fetch(`${base}/flags.json`).then((r) => r.json()).catch(() => ({})),
      fetch(`${base}/styles/${style}/manifest.json?v=${GEO_VERSION}`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch(`${base}/styles/${style}/flags.json?v=${GEO_VERSION}`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]);
    if (styleMan) for (const k in styleMan) { man[k] = styleMan[k]; styleKeys.add(k); }
    // Регіональний сет без лісових будинків -- усі компанії в будинках регіону.
    noForest = styleKeys.has('buildings/level-01') && !styleKeys.has('forest/level-01');
    if (styleFlags) { Object.assign(flagMeta, styleFlags); for (const k in styleFlags) for (const e of styleFlags[k].f) styleKeys.add('flags/' + e[0]); }
    for (const k in flagMeta) for (const e of flagMeta[k].f) man['flags/' + e[0]] = [e[3], e[4]];
    bVar = {};
    for (const kk in man) { const m = /^buildings\/level-0(\d)(-[a-z])?$/.exec(kk); if (m) (bVar[m[1]] = bVar[m[1]] || []).push(kk); }
    for (const l in bVar) bVar[l].sort();
    loadAllies();
    if (destroyed) return;
    cos = layout();
    buildCityGroups();
    const cities = Object.values(geo.cities);
    const cats = ['cat-amber', 'cat-coral', 'cat-honey', 'cat-lilac', 'cat-peach', 'cat-rose', 'cat-sage', 'cat-teal'];
    // 03.10.2026 (Александр: «коти не мають ходити по воді»). Пару міст
    // беремо лише тоді, коли вся пряма між ними -- суша (без морів і озер;
    // річки перетинати можна, там мости).
    const dry = (x, y) => {
      onLand(x, y); // ініціалізує uaRings
      if (uaRings && uaRings.length) {
        if (region === 'ua') { let n = 0; for (const r of uaRings) if (inRing(r, x, y)) n++; if (n % 2 !== 1) return false; }
        else if (!uaRings.some((r) => inRing(r, x, y))) return false;
      }
      for (const r of geo.lakes) if (inRing(r, x, y)) return false;
      return true;
    };
    const dryPath = (a, b) => { for (let k = 0; k <= 24; k++) { const u = k / 24; if (!dry(a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u)) return false; } return true; };
    const used = new Set();
    for (let tries = 0, i = 0; i < 6 && tries < 400 && cities.length > 1; tries++) {
      const ai = (tries * 7 + 3) % cities.length, bi = (tries * 13 + 5) % cities.length;
      if (ai === bi || used.has(ai + ':' + bi)) continue;
      const a = cities[ai], b = cities[bi], d = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (d < 40 || d > geo.w * 0.45 || !dryPath(a, b)) continue;
      used.add(ai + ':' + bi); used.add(bi + ':' + ai);
      walkers.push({ k: cats[i], a, b, v: 0.012 + i * 0.002, ph: i * 0.37 }); i++;
    }
    await setTheme(theme);
    const ld = root.querySelector('.gm-load'); if (ld) { ld.classList.add('done'); setTimeout(() => ld.remove(), 900); }
    resize();
    if (!(focusCC && focusCountry(focusCC, false))) showRegion(false);
    startLoop();
  })();
  // Плавно переводимо камеру (або одразу, якщо animate=false).
  function moveView(s, cx, cy, animate) {
    const ts = Math.max(minS, Math.min(maxS, s)), tx = W / 2 - cx * ts, ty = H / 2 - cy * ts;
    if (!animate || reduce) { view.s = ts; view.x = tx; view.y = ty; clamp(); baseCache = null; seenView = viewKey(); return; }
    const from = { ...view }, start = performance.now();
    anim = () => { const k = Math.min(1, (performance.now() - start) / 700); const e = 1 - (1 - k) ** 3;
      view.s = from.s + (ts - from.s) * e; view.x = from.x + (tx - from.x) * e; view.y = from.y + (ty - from.y) * e; clamp(); baseCache = null; if (k >= 1) { anim = null; seenView = viewKey(); } };
  }
  function showRegion(animate) {
    const kyiv = geo.cities['Київ'];
    if (region === 'ua' && kyiv) {
      // Україна цілком у кадрі
      const top = kyiv[1] - 140, bottom = island ? island.cy + island.ry + 25 : kyiv[1] + 680;
      moveView(Math.min(W / 1250, H / (bottom - top)), kyiv[0] + 60, (top + bottom) / 2, animate);
    } else {
      // інший регіон: де більше компаній -- туди й дивимось, трохи наблизивши
      let cx = geo.w / 2, cy = geo.h / 2;
      if (cos.length && region !== 'us') { cx = cos.reduce((a, c) => a + c.x, 0) / cos.length; cy = cos.reduce((a, c) => a + c.y, 0) / cos.length; }
      moveView(minS * (region === 'us' ? 1.15 : region === 'latam' || region === 'asia' || region === 'oceania' ? 1.2 : 1.6), cx, cy, animate);
    }
  }
  // Країна: кадр по всіх її офісах на карті (з полями).
  function focusCountry(cc, animate) {
    const own = cos.filter((c) => c.cc === cc);
    if (!own.length) return false;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const c of own) { x0 = Math.min(x0, c.x); x1 = Math.max(x1, c.x); y0 = Math.min(y0, c.y); y1 = Math.max(y1, c.y); }
    const pad = 90, s = Math.min(W / (x1 - x0 + pad * 2), H / (y1 - y0 + pad * 2), minS * 9);
    moveView(s, (x0 + x1) / 2, (y0 + y1) / 2, animate);
    return true;
  }
  // 02.10.2026 (Александр: «переключення на сусідню країну / зум-аут»).
  // Кнопка регіону йде за камерою: віддалились -- «Європа · N», підвели
  // центр карти до сусідньої країни -- «🇵🇱 Польща · N». Камеру не чіпаємо.
  let seenView = '', seenAt = 0;
  const viewKey = () => `${Math.round(view.x)}|${Math.round(view.y)}|${view.s.toFixed(4)}`;
  const ccOfCountry = {};
  function trackCountry(now) {
    if (region === 'ua' || anim || now - seenAt < 300) return;
    seenAt = now;
    const key = viewKey();
    if (key === seenView) return; seenView = key;
    let cc = null;
    if (view.s >= minS * 1.9) {
      const cx = (W / 2 - view.x) / view.s, cy = (H / 2 - view.y) / view.s;
      const co = geo.countries.find((c) => c.r.some((r) => inRing(r, cx, cy)));
      const a2 = co && A2[co.a3];
      if (a2) { if (!(a2 in ccOfCountry)) ccOfCountry[a2] = cos.some((c) => c.cc === a2); if (ccOfCountry[a2]) cc = a2; }
      if (!cc && focusCC) cc = focusCC; // над морем / країною без офісів -- лишаємо як було
    }
    if (cc !== focusCC) { focusCC = cc; regLabel(); }
  }
  function startLoop() { cancelAnimationFrame(raf); raf = requestAnimationFrame(function tick(now) { if (destroyed) return; if (anim) anim(); frame(now); trackCountry(now); raf = requestAnimationFrame(tick); }); }
  const vis = () => { if (document.hidden) cancelAnimationFrame(raf); else if (geo) startLoop(); };
  on(document, 'visibilitychange', vis);
  // Підказки кота чергуються: плавно гаснуть і змінюють текст.
  const tipT = setInterval(() => {
    if (document.hidden || destroyed) return;
    const next = (tipI + 1) % TIPS.length;
    if (reduce) { tipI = next; sayEl.textContent = tr(TIPS[tipI]); return; }
    sayEl.style.opacity = '0';
    setTimeout(() => { tipI = next; sayEl.textContent = tr(TIPS[tipI]); sayEl.style.opacity = '1'; }, 320);
  }, 11000);
  cleanup.push(() => clearInterval(tipT));

  const destroy = () => { destroyed = true; cancelAnimationFrame(raf); cleanup.forEach((f) => f()); if (root.classList.contains('gm-full')) { const fsEl = document.fullscreenElement || document.webkitFullscreenElement; if (fsEl === root && document.exitFullscreen) document.exitFullscreen().catch(() => {}); root.classList.remove('gm-full'); } root.innerHTML = ''; };
  destroy.setLang = (l) => { if (!STR[l] || l === lang) return; lang = l; applyLang(); };
  // 02.10.2026 (Александр): тема сайту = тема карти, навіть якщо її змінили
  // вже після відкриття карти.
  destroy.setTheme = (th) => { th = th === 'dark' ? 'dark' : 'light'; if (th === theme) return; if (geo) setTheme(th); else { theme = th; root.classList.toggle('gm-dark', th === 'dark'); } };
  return destroy;
}

export const GAME_MAP_CSS = `
.gm2{position:relative;height:calc(100dvh - 140px);min-height:480px;overflow:hidden;border-radius:18px;border:1px solid #d8c8a2;background:#2f7f9e;font:15px/1.4 system-ui,-apple-system,sans-serif;color:#2b2114;user-select:none;-webkit-user-select:none}
.gm2.gm-dark{border-color:#2b3a52;background:#0f2a43;color:#efe6cf}
.gm2 .gm-cv{display:block;touch-action:none;cursor:grab}
.gm2 .gm-top{position:absolute;left:12px;right:12px;top:12px;display:flex;justify-content:space-between;align-items:center;gap:8px;pointer-events:none}
.gm2 .gm-top>*{pointer-events:auto}
.gm2 .gm-title{box-sizing:border-box;height:36px;display:flex;align-items:center;gap:4px;line-height:1;background:rgba(251,245,230,.92);border:1px solid rgba(160,120,60,.35);border-radius:999px;padding:7px 14px;font:700 15px Georgia,'Times New Roman',serif;color:#4a3518;box-shadow:0 3px 10px rgba(0,0,0,.18)}
.gm2 .gm-count{font:600 13px system-ui;color:#8a6a3a}
.gm2 .gm-btn{border:1px solid rgba(160,120,60,.35);background:rgba(251,245,230,.92);color:#5a4022;border-radius:999px;min-height:38px;min-width:38px;padding:0 14px;font:600 14px system-ui;cursor:pointer;box-shadow:0 3px 10px rgba(0,0,0,.18)}
.gm2.gm-dark .gm-title,.gm2.gm-dark .gm-btn{background:rgba(18,28,44,.9);border-color:rgba(120,150,210,.35);color:#e9dfc4}
.gm2.gm-dark .gm-count{color:#a9b6d8}
.gm2 .gm-zoom{position:absolute;right:12px;bottom:12px;display:flex;flex-direction:column;gap:8px;transition:transform .25s ease}
.gm2 .gm-zoom .gm-btn{width:42px;height:42px;padding:0;font-size:20px;border-radius:13px}
/* 02.10.2026 (Александр): на телефоні масштаб -- пальцями; кнопки заважали кнопкам сайту */
@media (hover:none) and (pointer:coarse){.gm2 .gm-zoom{display:none}}
.gm2 .gm-guide{position:absolute;left:10px;bottom:8px;display:flex;align-items:flex-end;gap:6px;pointer-events:none;transition:opacity .4s}
.gm2 .gm-guide.off{opacity:0}
.gm2 .gm-mascot{width:78px;height:auto;filter:drop-shadow(0 4px 6px rgba(0,0,0,.25))}
.gm2 .gm-say{transition:opacity .3s ease;margin-bottom:46px;max-width:230px;background:rgba(251,245,230,.95);border:1px solid rgba(160,120,60,.35);border-radius:14px 14px 14px 4px;padding:8px 11px;font-size:13px;color:#4a3518;box-shadow:0 3px 10px rgba(0,0,0,.18)}
.gm2.gm-dark .gm-say{background:rgba(18,28,44,.92);color:#e9dfc4;border-color:rgba(120,150,210,.35)}
/* 03.10.2026 (Александр): на телефоні підказка кота не влазить, а кіт без
   підказки нічого не каже -- ховаємо його цілком. */
@media (max-width:560px){.gm2 .gm-guide{display:none}}
.gm2 .gm-pop{position:absolute;left:0;top:0;width:290px;max-width:calc(100% - 16px);background:#fbf5e6;border:2px solid #c99a52;border-radius:16px;padding:12px 13px 13px;box-shadow:0 12px 30px rgba(40,25,5,.35);opacity:0;visibility:hidden;transition:opacity .16s ease,visibility 0s .16s;display:flex;flex-direction:column;gap:9px;will-change:transform}
.gm2 .gm-pop.on{opacity:1;visibility:visible;transition:opacity .16s ease}
.gm2 .gm-pop::after{content:"";position:absolute;left:calc(var(--ax,50%) - 8px);bottom:-9px;width:14px;height:14px;background:#fbf5e6;border-right:2px solid #c99a52;border-bottom:2px solid #c99a52;transform:rotate(45deg)}
.gm2 .gm-pop.below::after{bottom:auto;top:-9px;transform:rotate(225deg)}
.gm2.gm-dark .gm-pop,.gm2.gm-dark .gm-pop::after{background:#16233a;border-color:#7d8fc9}
.gm2 .gm-ph{display:flex;align-items:center;gap:10px}
.gm2 .gm-ava{width:42px;height:42px;border-radius:50%;overflow:hidden;flex:none;background:#e9dcbc;display:grid;place-items:center;font:700 18px Georgia,serif;color:#6b4a1e;box-shadow:0 0 0 2px #c99a52}
.gm2 .gm-ava img{width:100%;height:100%;object-fit:cover}
.gm2 .gm-pt{flex:1;min-width:0;display:flex;flex-direction:column}
.gm2 .gm-pt b{font:700 16px Georgia,'Times New Roman',serif;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gm2 .gm-pt small{opacity:.7;font-size:12px}
.gm2 .gm-x{border:0;background:none;font-size:22px;line-height:1;color:inherit;opacity:.6;cursor:pointer;padding:2px 4px;align-self:flex-start}
.gm2 .gm-badge{align-self:flex-start;font:700 12px system-ui;padding:4px 10px;border-radius:999px;background:#2f7a4d;color:#fff}
.gm2 .gm-jobs{display:flex;flex-direction:column;gap:5px}
.gm2 .gm-jobs a{font-size:13px;color:inherit;text-decoration:none;padding:6px 9px;border-radius:9px;background:rgba(150,110,50,.12);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gm2 .gm-jobs a:hover{background:rgba(150,110,50,.22)}
.gm2.gm-dark .gm-jobs a{background:rgba(140,160,220,.12)}
.gm2 .gm-acts{display:flex;gap:8px}
.gm2 .gm-p{flex:1;text-align:center;text-decoration:none;font:600 13px system-ui;padding:9px 12px;border-radius:10px;background:#a8571f;color:#fff}
.gm2.gm-dark .gm-p{background:#5b6fc0}
.gm2.gm-full{position:fixed;inset:0;z-index:2147483000;width:100vw;height:100dvh!important;min-height:0;border-radius:0;border:0}
.gm2:fullscreen{width:100vw;height:100vh!important}
.gm2.gm-enter{animation:gm-enter .32s cubic-bezier(.2,.8,.2,1)}
@keyframes gm-enter{from{opacity:.4;transform:scale(.985)}to{opacity:1;transform:none}}
.gm2 .gm-btn{transition:transform .18s ease,box-shadow .18s ease,background-color .18s ease,color .18s ease}
.gm2 .gm-btn:hover{transform:translateY(-1px);box-shadow:0 6px 16px rgba(0,0,0,.22)}
.gm2 .gm-btn:active{transform:translateY(0) scale(.96)}
.gm2 .gm-fs,.gm2 .gm-theme,.gm2 .gm-info,.gm2 .gm-music,.gm2 .gm-close{display:grid;place-items:center;padding:0;width:38px}
.gm2 .gm-close{display:none}
.gm2.gm-app .gm-close{display:grid}
.gm2.gm-app .gm-theme,.gm2.gm-app .gm-fs{display:none}
.gm2.gm-app .gm-top{top:calc(env(safe-area-inset-top,0px) + 8px)}
.gm2.gm-app .gm-guide{bottom:calc(env(safe-area-inset-bottom,0px) + 8px)}
.gm2.gm-app .gm-zoom{bottom:calc(env(safe-area-inset-bottom,0px) + 12px)}
.gm2 .gm-eq{display:flex;align-items:flex-end;gap:2.5px;height:16px}
.gm2 .gm-eq i{display:block;width:3px;border-radius:2px;background:currentColor;opacity:.55;transition:opacity .2s ease,height .3s ease}
.gm2 .gm-eq i:nth-child(1){height:6px}.gm2 .gm-eq i:nth-child(2){height:11px}.gm2 .gm-eq i:nth-child(3){height:8px}.gm2 .gm-eq i:nth-child(4){height:13px}
.gm2 .gm-music:hover .gm-eq i{opacity:.85}
.gm2 .gm-music.on .gm-eq i{opacity:1;animation:gm-eq 1.1s ease-in-out infinite alternate}
.gm2 .gm-music.on .gm-eq i:nth-child(2){animation-duration:.8s;animation-delay:-.3s}.gm2 .gm-music.on .gm-eq i:nth-child(3){animation-duration:1.3s;animation-delay:-.6s}.gm2 .gm-music.on .gm-eq i:nth-child(4){animation-duration:.95s;animation-delay:-.15s}
@keyframes gm-eq{0%{height:4px}100%{height:15px}}
@media (prefers-reduced-motion:reduce){.gm2 .gm-music.on .gm-eq i{animation:none}}
/* 03.10.2026 (Александр): анімація при наведенні на «+», «−» і «i». */
.gm2 .gm-zi,.gm2 .gm-ii{display:inline-block;transition:transform .38s cubic-bezier(.3,1.6,.5,1)}
@media (hover:hover){
.gm2 .gm-zoom .gm-btn:hover,.gm2 .gm-info:hover{background:#fffaf0;color:#a8571f}
.gm2.gm-dark .gm-zoom .gm-btn:hover,.gm2.gm-dark .gm-info:hover{background:rgba(30,44,68,.95);color:#9db0f0}
.gm2 [data-z="in"]:hover .gm-zi{transform:rotate(90deg) scale(1.15)}
.gm2 [data-z="out"]:hover .gm-zi{transform:scaleX(1.4)}
.gm2 .gm-info:hover .gm-ii{animation:gm-ii .55s cubic-bezier(.3,1.4,.5,1)}
}
@keyframes gm-ii{0%{transform:translateY(0)}35%{transform:translateY(-3px) rotate(-10deg) scale(1.15)}65%{transform:translateY(0) rotate(6deg) scale(1.05)}100%{transform:none}}
@media (prefers-reduced-motion:reduce){.gm2 .gm-zi,.gm2 .gm-ii{transition:none;animation:none!important}}
.gm2 .gm-music.on{color:#a8571f}.gm2.gm-dark .gm-music.on{color:#9db0f0}
.gm2 .gm-info{font:italic 700 18px Georgia,'Times New Roman',serif}
.gm2 .gm-gl{position:absolute;top:56px;right:12px;width:min(300px,86vw);background:#fbf5e6;border:1px solid #c99a52;border-radius:16px;box-shadow:0 14px 34px rgba(40,25,5,.32);padding:12px 14px 6px;z-index:5;color:#4a3518;font:13px/1.4 system-ui;opacity:0;visibility:hidden;transform:translateY(-6px);transition:opacity .16s ease,transform .16s ease,visibility .16s}
.gm2 .gm-gl.on{opacity:1;visibility:visible;transform:none}
.gm2.gm-dark .gm-gl{background:#16233a;border-color:#7d8fc9;color:#e9dfc4;box-shadow:0 14px 34px rgba(0,0,0,.5)}
.gm2 .gm-glh{font:700 14px system-ui;margin-bottom:4px}
.gm2 .gm-gli{display:flex;flex-direction:column;gap:2px;padding:8px 0;border-top:1px solid rgba(160,120,60,.25)}
.gm2 .gm-gli b{font-size:13px}
.gm2 .gm-gli span{opacity:.88}
@media (prefers-reduced-motion:reduce){.gm2 .gm-gl,.gm2 .gm-say{transition:none}}
.gm2 .gm-theme svg{transition:transform .35s cubic-bezier(.3,1.6,.5,1)}
.gm2 .gm-theme:hover svg{transform:rotate(25deg) scale(1.08)}
.gm2 .gm-fs svg path{transition:transform .28s cubic-bezier(.3,1.7,.5,1)}
.gm2 .gm-fs:hover .c1{transform:translate(-1.6px,-1.6px)}.gm2 .gm-fs:hover .c2{transform:translate(1.6px,-1.6px)}
.gm2 .gm-fs:hover .c3{transform:translate(1.6px,1.6px)}.gm2 .gm-fs:hover .c4{transform:translate(-1.6px,1.6px)}
.gm2 .gm-fs.x{width:44px;min-height:44px}
.gm2 .gm-fs.x svg{transition:transform .35s cubic-bezier(.3,1.5,.5,1)}
.gm2 .gm-fs.x:hover{background:#a8571f;border-color:#a8571f;color:#fff}
.gm2.gm-dark .gm-fs.x:hover{background:#5b6fc0;border-color:#5b6fc0;color:#fff}
.gm2 .gm-fs.x:hover svg{transform:rotate(90deg) scale(1.08)}
@media (prefers-reduced-motion:reduce){.gm2 .gm-fs svg,.gm2 .gm-fs svg path,.gm2.gm-enter{transition:none;animation:none}}
html.gm-noscroll,html.gm-noscroll body{overflow:hidden}
.gm2 .gm-left{display:flex;gap:8px;align-items:flex-start;flex-wrap:wrap}
.gm2 .gm-right{display:flex;gap:8px}
.gm2 .gm-search{position:relative}
.gm2 .gm-regw{position:relative;pointer-events:auto}
.gm2 .gm-reg{height:36px;min-height:36px;display:inline-flex;align-items:center;gap:8px;padding:0 13px 0 14px;font:600 14px system-ui;white-space:nowrap}
.gm2 .gm-reg .gm-chev{color:#a07a40;transition:transform .2s ease}
.gm2 .gm-reg.open .gm-chev{transform:rotate(180deg)}
.gm2.gm-dark .gm-reg .gm-chev{color:#9fb1ff}
.gm2 .gm-regp{position:absolute;top:44px;left:0;min-width:240px;max-width:min(300px,86vw);max-height:min(420px,60vh);overflow-y:auto;overscroll-behavior:contain;background:#fbf5e6;border:1px solid #c99a52;border-radius:16px;box-shadow:0 14px 34px rgba(40,25,5,.32);padding:6px;display:flex;flex-direction:column;gap:1px;z-index:4;opacity:0;transform:translateY(-6px) scale(.98);transform-origin:top left;visibility:hidden;transition:opacity .16s ease,transform .16s ease,visibility 0s .16s}
.gm2 .gm-regp.on{opacity:1;transform:none;visibility:visible;transition:opacity .16s ease,transform .16s ease}
.gm2.gm-dark .gm-regp{background:#16233a;border-color:#7d8fc9;box-shadow:0 14px 34px rgba(0,0,0,.5)}
.gm2 .gm-rh{font:700 11px system-ui;letter-spacing:.06em;text-transform:uppercase;opacity:.55;padding:9px 10px 4px}
.gm2 .gm-rh:not(:first-child){margin-top:4px;border-top:1px solid rgba(160,120,60,.25);padding-top:11px}
.gm2.gm-dark .gm-rh:not(:first-child){border-top-color:rgba(125,143,201,.3)}
.gm2 .gm-ri{display:flex;align-items:center;gap:8px;width:100%;border:0;background:none;color:inherit;text-align:left;padding:8px 10px;border-radius:10px;cursor:pointer;font:500 14px system-ui;flex:none}
.gm2 .gm-ri:hover,.gm2 .gm-ri:focus-visible{background:rgba(150,110,50,.15);outline:none}
.gm2.gm-dark .gm-ri:hover,.gm2.gm-dark .gm-ri:focus-visible{background:rgba(140,160,220,.16)}
.gm2 .gm-ri.on{font-weight:700}
.gm2 .gm-rn{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gm2 .gm-rc{font:600 12px system-ui;opacity:.6;font-variant-numeric:tabular-nums}
.gm2 .gm-rk{color:#2f7a4d;font-weight:700}
.gm2.gm-dark .gm-rk{color:#6fd39a}
.gm2 .gm-rl{padding:8px 10px;font-size:13px;opacity:.6}
@media (prefers-reduced-motion:reduce){.gm2 .gm-regp,.gm2 .gm-reg .gm-chev{transition:none}}
@media (max-width:560px){.gm2 .gm-regw{position:static}.gm2 .gm-regp{left:0;right:0;min-width:0;max-width:none;top:46px;max-height:min(440px,62vh)}}
@media (max-width:560px){.gm2 .gm-left{flex:1;min-width:0}.gm2 .gm-search{flex:1;min-width:64px}.gm2 .gm-search .gm-q{width:100%;max-width:none;padding:0 12px}.gm2 .gm-regw{flex:none}.gm2 .gm-reg{max-width:none;padding:0 10px;gap:6px}}
@media (max-width:420px){.gm2 .gm-regn{display:none}}
.gm2 .gm-regn{font-weight:600;opacity:.75}
@media (max-width:560px){.gm2 .gm-left{flex-wrap:nowrap}.gm2 .gm-q{width:120px}.gm2 .gm-regl{overflow:hidden;text-overflow:ellipsis}}
.gm2 .gm-q{box-sizing:border-box;width:220px;max-width:46vw;height:36px;margin:0;-webkit-appearance:none;appearance:none;border-radius:999px;border:1px solid rgba(160,120,60,.35);background:rgba(251,245,230,.95);padding:0 14px;font:500 14px system-ui;color:#4a3518;box-shadow:0 3px 10px rgba(0,0,0,.18);outline:none}
.gm2 .gm-q::-webkit-search-cancel-button{-webkit-appearance:none;appearance:none;width:18px;height:18px;margin-left:6px;cursor:pointer;background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 18 18'%3E%3Ccircle cx='9' cy='9' r='9' fill='%23b8894a'/%3E%3Cpath d='M6 6l6 6M12 6l-6 6' stroke='%23fbf5e6' stroke-width='1.8' stroke-linecap='round'/%3E%3C/svg%3E") center/18px no-repeat;opacity:.85}.gm2 .gm-q::-webkit-search-cancel-button:hover{opacity:1}.gm2.gm-dark .gm-q::-webkit-search-cancel-button{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 18 18'%3E%3Ccircle cx='9' cy='9' r='9' fill='%236f86b8'/%3E%3Cpath d='M6 6l6 6M12 6l-6 6' stroke='%23121c2c' stroke-width='1.8' stroke-linecap='round'/%3E%3C/svg%3E")}
.gm2 .gm-q:focus{border-color:#c99a52;box-shadow:0 0 0 3px rgba(201,154,82,.3)}
.gm2.gm-dark .gm-q{background:rgba(18,28,44,.92);color:#e9dfc4;border-color:rgba(120,150,210,.35)}
.gm2 .gm-sug{position:absolute;top:44px;left:0;width:300px;max-width:80vw;background:#fbf5e6;border:1px solid #c99a52;border-radius:14px;box-shadow:0 12px 30px rgba(40,25,5,.3);padding:5px;display:none;flex-direction:column;gap:2px;z-index:3}
.gm2 .gm-sug.on{display:flex}
.gm2.gm-dark .gm-sug{background:#16233a;border-color:#7d8fc9}
.gm2 .gm-si{display:flex;flex-direction:column;align-items:flex-start;text-align:left;border:0;background:none;color:inherit;padding:8px 10px;border-radius:10px;cursor:pointer;font:inherit}
.gm2 .gm-si small{opacity:.65;font-size:12px}
.gm2 .gm-si small:only-of-type{white-space:normal}
.gm2 .gm-si.on,.gm2 .gm-si:hover{background:rgba(150,110,50,.15)}
.gm2 .gm-none{padding:10px;font-size:13px;opacity:.7}
@media (max-width:560px){.gm2 .gm-title{display:none}.gm2 .gm-q{width:170px}}
@media (max-width:560px){.gm2 .gm-reg{width:38px;height:38px;min-height:38px;padding:0;justify-content:center;gap:0}.gm2 .gm-reg .gm-rnm,.gm2 .gm-reg .gm-regn,.gm2 .gm-reg .gm-chev{display:none}.gm2 .gm-regl{overflow:visible;font-size:18px;line-height:1}.gm2 .gm-search{min-width:0}}
.gm2 .gm-pop{width:330px}

.gm2 .gm-chips{display:flex;flex-wrap:wrap;gap:5px}
.gm2 .gm-chip{font:600 12px system-ui;padding:4px 9px;border-radius:999px;background:rgba(150,110,50,.14)}
.gm2 .gm-chip.g{background:#2f7a4d;color:#fff}
.gm2.gm-dark .gm-chip{background:rgba(140,160,220,.16)}.gm2.gm-dark .gm-chip.g{background:#2f7a4d}
.gm2 .gm-bio{margin:0;font-size:13px;line-height:1.45;opacity:.9;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.gm2 .gm-site{font-size:13px;color:#a8571f;text-decoration:none;align-self:flex-start}
.gm2.gm-dark .gm-site{color:#9fb1ff}
.gm2 .gm-ally{flex:none;width:40px;border-radius:10px;border:2px solid #a8571f;background:none;color:#a8571f;font:700 20px system-ui;cursor:pointer;line-height:1;display:grid;place-items:center;transition:background-color .2s,color .2s,border-color .2s;-webkit-tap-highlight-color:transparent}
.gm2 .gm-ally>span{grid-area:1/1}
.gm2 .gm-ally span{display:block;transition:transform .3s cubic-bezier(.3,1.6,.5,1)}
.gm2 .gm-ally:not(.on):hover{background:#a8571f;color:#fff}
.gm2 .gm-ally:not(.on):hover span{transform:rotate(90deg) scale(1.1)}
.gm2 .gm-ally:active span{transform:scale(.85)}
.gm2 .gm-ally .rm{opacity:0;transform:rotate(-90deg) scale(.6);transition:opacity .2s,transform .3s cubic-bezier(.3,1.6,.5,1)}
.gm2 .gm-ally .ok{transition:opacity .2s,transform .3s cubic-bezier(.3,1.6,.5,1)}
.gm2 .gm-ally.on:hover{background:#b33a2b;border-color:#b33a2b}
.gm2 .gm-ally.on:hover .ok{opacity:0;transform:rotate(90deg) scale(.6)}
.gm2 .gm-ally.on:hover .rm{opacity:1;transform:none}
.gm2 .gm-ally.err{border-color:#b33a2b;color:#b33a2b}
.gm2 .gm-toast.gone{border-color:#8a6a3a}.gm2 .gm-toast.gone .gm-tk,.gm2 .gm-toast.gone .gm-tk i{background:#8a6a3a}
.gm2 .gm-ally.pop span{animation:gm-pop .5s cubic-bezier(.3,1.8,.5,1)}
@keyframes gm-pop{0%{transform:scale(.3) rotate(-45deg)}100%{transform:none}}
.gm2.gm-dark .gm-ally:not(.on):hover{background:#5b6fc0;border-color:#5b6fc0;color:#fff}
.gm2 .gm-toast{position:absolute;left:50%;top:60px;z-index:6;display:flex;align-items:center;gap:11px;padding:10px 18px 10px 10px;border-radius:16px;background:#fbf5e6;border:2px solid #2f7a4d;box-shadow:0 14px 34px rgba(40,25,5,.32);color:#3a2a14;opacity:0;visibility:hidden;transform:translate(-50%,-14px) scale(.96);transition:opacity .25s,transform .35s cubic-bezier(.3,1.5,.5,1),visibility 0s .35s;pointer-events:none;max-width:calc(100% - 24px)}
.gm2 .gm-toast.on{opacity:1;visibility:visible;transform:translate(-50%,0) scale(1);transition:opacity .25s,transform .35s cubic-bezier(.3,1.5,.5,1)}
.gm2.gm-dark .gm-toast{background:#16233a;color:#efe6cf}
.gm2 .gm-tk{position:relative;width:38px;height:38px;flex:none;border-radius:50%;background:#2f7a4d;display:grid;place-items:center}
.gm2 .gm-tk img{width:100%;height:100%;border-radius:50%;object-fit:cover}
.gm2 .gm-tk i{position:absolute;right:-4px;bottom:-4px;width:20px;height:20px;border-radius:50%;background:#2f7a4d;color:#fff;font:700 12px/20px system-ui;text-align:center;font-style:normal;border:2px solid #fbf5e6;animation:gm-pop .5s .1s both cubic-bezier(.3,1.8,.5,1)}
.gm2 .gm-tk img+i{}
.gm2 .gm-tt2{display:flex;flex-direction:column;line-height:1.25}
.gm2 .gm-tt2 b{font:700 15px Georgia,'Times New Roman',serif}
.gm2 .gm-tt2 small{font-size:12.5px;opacity:.75}
.gm2 .gm-ally.on{background:#2f7a4d;border-color:#2f7a4d;color:#fff}
.gm2.gm-dark .gm-ally{border-color:#7d8fc9;color:#c9d3ff}.gm2.gm-dark .gm-ally.on{background:#2f7a4d;border-color:#2f7a4d;color:#fff}
.gm2.gm-ov{position:absolute;inset:0;height:auto;min-height:0}
.gm2.gm-ov.gm-full{position:fixed;inset:0;height:100dvh;z-index:2147483001}
.gm2 .gm-load{position:absolute;inset:0;display:grid;place-items:center;overflow:hidden;background:#cfd9a6;transition:opacity .8s ease;z-index:5}
.gm2 .gm-load.done{opacity:0;pointer-events:none}
.gm2 .gm-lbg{position:absolute;inset:-40px;background:url(/game-map/map-preview.webp) center/cover;filter:blur(22px) saturate(1.15);transform:scale(1.08);transition:filter .8s ease,transform .8s ease;animation:gm-breathe 3.2s ease-in-out infinite}
html.dark .gm2 .gm-lbg,.gm2.gm-dark .gm-lbg{background-image:url(/game-map/map-preview-dark.webp)}
html.dark .gm2 .gm-load,.gm2.gm-dark .gm-load{background:#1c2b3a}
.gm2 .gm-load.done .gm-lbg{filter:blur(0) saturate(1);transform:scale(1)}
.gm2 .gm-load::after{content:"";position:absolute;inset:0;background:linear-gradient(110deg,transparent 30%,rgba(255,250,230,.28) 50%,transparent 70%);background-size:250% 100%;animation:gm-sheen 2.2s linear infinite}
.gm2 .gm-lpill{position:relative;z-index:1;display:flex;align-items:center;gap:10px;padding:10px 18px 10px 12px;border-radius:999px;background:rgba(251,245,230,.9);border:1px solid rgba(160,120,60,.4);color:#5a3d16;font:700 italic 16px Georgia,'Times New Roman',serif;box-shadow:0 8px 24px rgba(40,25,5,.25);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);transition:opacity .4s,transform .4s}
html.dark .gm2 .gm-lpill,.gm2.gm-dark .gm-lpill{background:rgba(18,28,44,.88);border-color:rgba(120,150,210,.4);color:#e9dfc4}
.gm2 .gm-load.done .gm-lpill{opacity:0;transform:translateY(-6px) scale(.96)}
.gm2 .gm-needle{transform-origin:20px 20px;animation:gm-needle 2.4s cubic-bezier(.45,0,.2,1) infinite}
@keyframes gm-needle{0%{transform:rotate(-30deg)}35%{transform:rotate(200deg)}55%{transform:rotate(160deg)}75%{transform:rotate(370deg)}100%{transform:rotate(330deg)}}
@keyframes gm-sheen{from{background-position:120% 0}to{background-position:-130% 0}}
@keyframes gm-breathe{0%,100%{transform:scale(1.08)}50%{transform:scale(1.12)}}
@media (prefers-reduced-motion:reduce){.gm2 .gm-needle,.gm2 .gm-load::after,.gm2 .gm-lbg{animation:none}}
`;
