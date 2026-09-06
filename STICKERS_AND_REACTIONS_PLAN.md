# Стикеры / GIF / Эмодзи-панель + Реакции — технический справочник

Дата: 2026-09-06. Это справочник для реализации, не отдельная задача —
короткий план-чеклист смотри в чате/PLAN.md §6.237. Всё ниже добыто из
исходников мобилки (`aone_private`) и бэкенда, не придумано.

## Блок 1. Панель стикеров/GIF/эмодзи (клик по коту)

### Откуда данные (бэкенд, все через POST `/api/v1/<method>`)

- `media.globalSearch` — `{q, documentType: 'gif', next}` → `GifSearchEntity`.
  Это НАШ бэкенд, не Tenor/Giphy (проверено grep по всей мобилке — ни
  одного упоминания). GIF-документ — тот же generic media-document shape
  (`{_id, mimetype, fileReference, sizes:[{w,h,bytes,object}], object}`),
  что у обычных фото/видео вложений → можно переиспользовать существующий
  `getStableMediaProxyUrl`/медиа-прокси на вебе.
- `messages.getAllStickers` → `StickerSetsEntity` — все наборы стикеров.
- `messages.getRecentStickers` → `RecentStickersEntity` — недавние.

### Формы данных (Dart-энтити → ориентир для TS-типов)

```
GifSearchEntity { documents: GifDocumentEntity[], pagination: GifPaginationEntity }
GifDocumentEntity { _id, mimetype, sizes: GifSizeEntity[], isMp4, preferredDisplaySize, strippedThumbnail, ... }

StickerSetEntity { id, title, shortName, count, thumb, documents: StickerDocumentEntity[] }
StickerDocumentEntity { ..., isTgsSticker, vectorPathBytes } // .tgs = gzip Lottie JSON
```

### Мобильная архитектура (`sticker_panel.dart`, 733 строки — прочитан полностью)

- Виджет `StickerPanel`, три таба в фиксированном порядке: **GIFs, Stickers,
  Emoji** (Stickers — стартовый/дефолтный таб).
- Круглый 3-way segmented control закреплён внизу панели.
- Поиск есть только на табах GIF и Emoji (не на Stickers).
- На табе GIF под полем поиска — ряд иконок быстрых категорий/настроений
  (сердце, палец вверх/вниз, конфетти, набор смайликов) для быстрого
  подбора GIF по "настроению", отдельно от текстового поиска.
- На табе Emoji под полем поиска — ряд иконок категорий эмодзи: недавние
  (часы), смайлы/эмоции, животные, еда, спорт, транспорт, символы/фигуры —
  стандартный набор категорий, сетка эмодзи в 8 колонок под ними.
- На табе Emoji — доп. иконки сбоку: смена языка (глобус), backspace с
  ускорением при удержании.
- Жест pull-down для сворачивания панели.
- Горизонтальный свайп между табами с отдельной физикой скролла на GIF-табе
  (чтобы не конфликтовать с iOS back-swipe).
- Тяжёлая нативная оптимизация (текстурный кэш стикеров, native texture
  controllers) — **на вебе не воспроизводим**, будет проще:
  просто декодируем + кэшируем Lottie JSON на клиенте.
- Константы разметки: `_collapsedHeight`, `_panelBottomBarHeight = 44.0`,
  `_panelSideActionSlotWidth`, `_panelSideActionAnimDuration = 340ms`.
- Со скриншота (референс MR.KIT, доп. деталь, ранее не зафиксирована):
  над сеткой стикеров — иконка "часы" (recent) слева, по центру — маленькая
  превью-аватарка активного набора, под ней название набора (например
  "MR.KIT"), затем сетка стикеров в 4 колонки. Учитывать при вёрстке
  шапки панели набора стикеров на вебе.

### Не прочитано (техническое ограничение, не критично для архитектуры)

`gif_panel_tab.dart` и `emoji_panel_tab.dart` — 8 папок вглубь от корня
подключённой папки, `device_stage_files` отказал по лимиту глубины (макс.
7). Обходной путь через `cp` тоже не сработал (файл был выгружен из iCloud,
`cp` требует полного чтения, как и `cat`). Открыть их разово в своём
редакторе на Mac (это форсирует скачивание) — тогда их получится прочитать
в следующей сессии. Не блокирует старт реализации: контракты видны из
родительского `sticker_panel.dart` и репозиториев ниже.

### Кэш/репозиторий-слой (полностью прочитан)

- `MediaRepositoryImpl`: для стикеров — memory-кэш → disk-кэш → сеть, с
  fallback на кэш при сетевой ошибке. GIF-поиск и recent-стикеры — прямой
  проброс к датасорсу без кэша.
- `MediaDatasourceImpl` (Dio): `searchGifs`, `fetchAllStickers`,
  `fetchRecentStickers` — все POST с Bearer-токеном.

### .tgs формат

`.tgs` = gzip-сжатый Lottie JSON (подтверждено:
`LottieBuilder.asset(widget.asset, decoder: LottieComposition.decodeGZip)`).
На вебе достаточно `gunzip` + существующий `lottie-web` (уже в
`package.json`: `"lottie-web": "^5.13.0"`) — конвертация не нужна.
Готовый паттерн уже есть: `public/animations/*.json` + `components/lottie-player.tsx`.

### Что уже подготовлено на вебе

- Реальные стикеры (mimetype `application/x-tgsticker`) сейчас рендерятся
  как плейсхолдер-чип (фиолетовый кружок), не как настоящая анимация —
  см. `app/chats/[chatId]/page.tsx`, ветка `isStickerMediaDocument(doc)`.
  Уже есть комментарий в коде, что это "отдельный follow-up" — вот он.
- `ChatCatFieldIcon` в компоуз-баре — чисто декоративный (`animate-chat-wiggle`),
  без `onClick`. Это и есть точка входа для открытия панели.

## Блок 2. Реакции на сообщения

### Формы данных (бэкенд, подтверждено в openapi-моделях)

```
ResourceMessageReactionEmoji { emoticon: string, object: string }
ResourceMessagePeerReaction { peer: ResourcePeer, date: DateTime, reaction: ResourceMessageReactionEmoji }
```

Массив `reactions` на сообщении — плоский, БЕЗ дедупликации на бэкенде
(сервер разрешает несколько одновременных разных эмодзи от одного юзера
через `$push` в БД). Правило "одна реакция на юзера, последняя побеждает"
реализовано только на клиенте:

```dart
// reaction_list_normalizer.dart (61 строка, прочитан полностью)
dedupeReactionsToLatestPerUser()
userHasReactionEmoticon()
```

**Важно:** веб должен повторить эту же клиентскую нормализацию, а не
доверять сырому массиву `reactions` как есть.

### Методы API

- `messages.addReaction` — `{id, peerTo, reaction}` → boolean
- `messages.deleteReaction` — `{id, peerTo, reaction: PeerReaction}` → boolean
- `messages.getUnreadReactions`, `messages.readReactions` — непрочитанные реакции (уведомления)

### Текущее состояние на вебе

`components/chat/message-actions-menu.tsx` уже содержит визуальный ряд
реакций в купертино-меню, но он полностью нефункциональный — каждая кнопка
просто вызывает `onClose`, нет `onReact`, нет проброса emoji наружу:

```tsx
const REACTION_EMOJIS = ["👍", "👎", "❤️", "🔥", "🥰", "👏", "😄"];
```

Расхождение с мобильным: на мобиле 7-й эмодзи — 😁, а не 😄. Нужно поправить.

`lib/a1/chat-schemas.ts`: поле `reactions` в реальном payload есть
(подтверждено комментарием с примером), но `RawMessageSchema` его не
объявляет — попадает в `.catchall(z.unknown())` и молча теряется. Нужно
добавить `reactions` в схему.

### Мобильная реализация реакций (частично прочитана)

- `EmojiReactionsPanel` (596 строк, прочитан полностью) — collapsed 46px
  frosted pill с 7 статичными quick-emoji + стрелка разворота → раскрывается
  в 288px грид на 8 колонок с категориями (без поиска).
  Статичный набор для обычных сообщений: `['👍','👎','❤️','🔥','🥰','👏','😁']`.
  Отдельный набор для "calculation"-сообщений: `['💸','⌛️','✅','👍','👎','❤️','🔥']`
  — вероятно, вне скоупа фазы 1.
- `message_reactions_bar.dart` (50KB, только grep, НЕ прочитан полностью) —
  бар реакций под сообщением. Комментарий в коде: `onReactionTap` добавляет
  реакцию, если её нет, и убирает (toggle), если уже стоит. Содержит 4
  отдельных `AnimationController` (entrance/expand/avatar-join/bounce) —
  нужно дочитать перед реализацией анимации бара.
- `reaction_confetti.dart` (356 строк, прочитан полностью) — у каждого
  эмодзи своя "конфетти-личность" (`_Recipe`: направление, гравитация,
  вторая волна и т.д.), ❤️ — исключение, играет Lottie-спалах вместо конфетти
  (`_stickerBursts` map). Уже извлечено (см. ниже).
- `reaction_sticker_overlay.dart` (прочитан) — рендер Lottie-спалаха через
  `LottieBuilder.asset(decoder: LottieComposition.decodeGZip)`.

### Извлечённый актив

`assets/tgs/heart_reaction.tgs` (9583 байта) → распакован в
`public/animations/heart_reaction.json` (182453 байта, валидный Lottie:
512×512, 60fps, 91 кадр, 2 слоя). **Коммит eeac07f.** Готов к использованию,
пока нигде не подключён.

Не извлечены (низкий приоритет, фаза 2 — "calculation"-реакции):
`assets/tgs/reactions/{check,money,time}.tgs`, `assets/tgs/infinite_reactions.tgs`.

## Открытые вопросы к Александру

1. Порядок реализации блока 1: всё сразу (GIF+Стикеры+Эмодзи) или поэтапно —
   например, сначала Эмодзи (не требует новых бэкенд-вызовов, эмодзи-раскладка
   уже есть в браузере/юникоде), потом Стикеры, потом GIF-поиск последним?
2. Нужен ли на десктопе быстрый тогл реакции кликом по уже показанному под
   сообщением чипу реакции — в дополнение к меню по ПКМ?
3. Подтвердить: реакции НЕ делаем для "calculation"-сообщений в фазе 1?
4. Ок ли, что нативные оптимизации рендера стикеров (текстурный кэш и т.п.)
   на вебе не повторяем — будет проще (декод+кэш Lottie JSON на клиенте),
   но менее производительно на больших наборах стикеров?

## Известные технические ограничения при работе с проектом

- `gif_panel_tab.dart` / `emoji_panel_tab.dart` не читались (глубина папок).
- `message_reactions_bar.dart` — только частично исследован (grep, не полное чтение).
- `reaction_confetti.dart`'s per-emoji физика прочитана полностью — пригодится
  для фазы 2, если решим повторять конфетти-эффекты на вебе (для фазы 1
  можно обойтись без конфетти, просто ставить/снимать реакцию).
