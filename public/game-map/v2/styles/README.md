# Сети будинків за регіонами (карта A1)

Карта бере будинки з `public/game-map/v2/{light,dark}/...`. Якщо для регіону є
папка `public/game-map/v2/styles/<регіон>/`, будинки звідти підміняють загальні.
Регіони: `ua` (Україна), `eu` (Європа), `us` (Америка). Код міняти не треба.

## Що надіслати Claude для нового сету
- 8 будинків за розміром: `level-01` (хатинка) … `level-08` (замок/хмарочос).
- За бажанням 8 «лісових» варіантів (`forest/level-01..08`).
- Дві версії: денна і вечірня (теплі вогники у вікнах).
- PNG з прозорим фоном, ~512 px по більшій стороні, будинок по центру, низ
  будинку внизу картинки.
- Флагштоки без прапорів (прапори карта малює сама в кольорі компанії).

## Завдання для AI-генерації (скопіювати)
"Isometric 3/4 fairy-tale map building, same art style, camera angle and
lighting as the attached reference set, transparent background, 512px,
8 sizes from a tiny cottage (1) to a grand landmark (8), empty flagpole on the
roof, warm window lights. Style: <European old town: half-timbered houses,
red tile roofs, Gothic towers> / <American: brick lofts, wooden barn,
Art Deco skyscraper, Capitol-like dome>. Day and evening versions."

Claude обріже фон, стисне у webp, розкладе по папці й допише manifest.json —
15–30 хвилин.
