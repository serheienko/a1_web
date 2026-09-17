#!/usr/bin/env python3
"""Пересобирает lib/a1/emoji-keywords.ts из lib/a1/emoji-data.ts.

Слова берутся из самого Юникода (unicodedata.name по каждому
codepoint), а не из интернета -- сети для этого не нужно. Запуск из
корня репозитория:

    python3 scripts/gen-emoji-keywords.py
"""
import io
import json
import re
import unicodedata

SOURCE = "lib/a1/emoji-data.ts"
TARGET = "lib/a1/emoji-keywords.ts"

# Служебные слова из имён Юникода: в поиске от них только шум.
NOISE = {
    "variation", "selector", "zero", "width", "joiner", "emoji",
    "modifier", "sign", "symbol", "and", "with", "of", "the", "character",
}

HEADER = '''// lib/a1/emoji-keywords.ts
//
// СГЕНЕРИРОВАННЫЙ ФАЙЛ. Не правьте руками -- перегенерируйте.
//
// Александр, 17.09.2026: «Поиск в панели эмодзи ищет по названиям
// категорий, а не по эмодзи». Так и было: искать было не по чему --
// у набора в lib/a1/emoji-data.ts нет ни одного слова на эмодзи.
//
// Тянуть emoji-mart ради этого не хотелось (реальная новая
// зависимость), а слова уже лежат в самом Юникоде: у каждого символа
// есть официальное имя ("DOG FACE", "FIRE", "RED HEART"). Файл собран
// из них скриптом (unicodedata.name по каждому codepoint, служебные
// слова выброшены), поэтому поиск работает по-английски: "dog",
// "heart", "fire", "car".
//
// Русские и украинские слова переводятся в эти же английские через
// EMOJI_QUERY_ALIASES в lib/a1/emoji-search.ts -- список там короткий и
// ведётся руками, дополняйте по мере жалоб.
//
// Перегенерировать:
//   python3 scripts/gen-emoji-keywords.py

/** Эмодзи -> английские слова из имён Юникода, через пробел. */
export const EMOJI_KEYWORDS: Record<string, string> = {
'''


def main() -> None:
    source = io.open(SOURCE, encoding="utf-8").read()
    blocks = re.findall(r"emojis:\s*\[(.*?)\]", source, re.S)
    ordered: list[str] = []
    seen: set[str] = set()
    for block in blocks:
        for emoji in re.findall(r'"([^"]+)"', block):
            if emoji not in seen:
                seen.add(emoji)
                ordered.append(emoji)

    rows: list[str] = []
    for emoji in ordered:
        words: list[str] = []
        for char in emoji:
            if char in ("️", "‍", "︎"):
                continue
            try:
                name = unicodedata.name(char)
            except ValueError:
                continue
            for word in re.split(r"[ \-]+", name.lower()):
                if word and word not in NOISE and word not in words:
                    words.append(word)
        if words:
            rows.append(
                "  %s: %s," % (json.dumps(emoji, ensure_ascii=False), json.dumps(" ".join(words)))
            )

    io.open(TARGET, "w", encoding="utf-8").write(HEADER + "\n".join(rows) + "\n};\n")
    print("%s: %d emoji" % (TARGET, len(rows)))


if __name__ == "__main__":
    main()
