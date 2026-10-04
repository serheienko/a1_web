#!/usr/bin/env python3
"""Названия городов карты на всех языках сайта (04.10.2026, Александр: «города тоже на актуальном языке»).

Берёт все города, которые сейчас есть на карте (/game-map/data по каждому региону), и для новых
спрашивает у модели название на uk/ru/de/es/fr/pl/pt-BR/zh. Результат -- app/game-map/city-names.json:
  { "Munich": { "uk": "Мюнхен", "ru": "Мюнхен", "de": "München", ... } }
Языки, где название совпадает с английским, не пишем. Уже переведённые города не трогаем, так что
повторный запуск добавляет только новые. Города, которых нет в файле, карта показывает по-английски.

  OPENAI_API_KEY=... python3 scripts/gen-city-names.py            # добавить новые города
  OPENAI_API_KEY=... python3 scripts/gen-city-names.py --redo X   # перевести заново город X
"""
import collections, gzip, json, os, re, sys, urllib.request
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "app" / "game-map" / "city-names.json"
SITE = os.environ.get("SITE", "https://jobs.a1appp.com")
REGIONS = "ua eu us latam asia oceania mideast".split()
LANGS = {"uk": "Ukrainian", "ru": "Russian", "de": "German", "es": "Spanish", "fr": "French",
         "pl": "Polish", "ptBR": "Brazilian Portuguese", "zh": "Simplified Chinese"}
MODEL = os.environ.get("MODEL", "gpt-4.1")


def key_of(city: str) -> str:
    return re.sub(r"^(м\.|г\.|місто|город)\s*", "", (city or "").split(",")[0], flags=re.I).strip()


def fetch_cities() -> dict:
    seen = collections.defaultdict(collections.Counter)
    for r in REGIONS:
        req = urllib.request.Request(f"{SITE}/game-map/data?region={r}", headers={"Accept-Encoding": "gzip"})
        raw = urllib.request.urlopen(req, timeout=60).read()
        try:
            raw = gzip.decompress(raw)
        except OSError:
            pass
        for c in json.loads(raw):
            k = key_of(c.get("city"))
            if k and k != "Remote":
                seen[k][c.get("cc") or ""] += 1
    return {k: v.most_common(1)[0][0] for k, v in seen.items()}


def ask(batch: list[tuple[str, str]]) -> dict:
    lines = "\n".join(f"{i + 1}. {name} ({cc})" for i, (name, cc) in enumerate(batch))
    system = (
        "You localize city names for a map. For each numbered city (English name, ISO country code in brackets) "
        "give its name in each language: " + ", ".join(f"{k} = {v}" for k, v in LANGS.items()) + ". "
        "Use the established local name or exonym that people actually use in that language (Munich -> München in German, "
        "Warsaw -> Варшава in Russian, Cologne -> Köln / Colonia / Cologne). Where no established exonym exists, keep the "
        "city's own name unchanged for Latin-script languages, and transliterate it for Ukrainian, Russian and Chinese "
        "(Chinese: standard Chinese name if one exists, otherwise a phonetic transliteration). Ukrainian cities in Ukrainian "
        "use Ukrainian spelling, in Russian use the common Russian spelling. Never translate a name into something that is "
        "a different place. Do not add the country. Return JSON: {\"1\": {\"uk\": ..., \"ru\": ..., \"de\": ..., \"es\": ..., "
        "\"fr\": ..., \"pl\": ..., \"ptBR\": ..., \"zh\": ...}, \"2\": ...}"
    )
    body = json.dumps({"model": MODEL, "temperature": 0, "response_format": {"type": "json_object"},
                       "messages": [{"role": "system", "content": system}, {"role": "user", "content": lines}]}).encode()
    req = urllib.request.Request("https://api.openai.com/v1/chat/completions", data=body, headers={
        "Authorization": "Bearer " + os.environ["OPENAI_API_KEY"], "Content-Type": "application/json"})
    out = json.loads(json.loads(urllib.request.urlopen(req, timeout=180).read())["choices"][0]["message"]["content"])
    res = {}
    for i, (name, _) in enumerate(batch):
        row = out.get(str(i + 1)) or {}
        clean = {l: str(row[l]).strip() for l in LANGS if isinstance(row.get(l), str) and row[l].strip() and row[l].strip() != name}
        res[name] = clean
    return res


def main():
    have = json.loads(OUT.read_text(encoding="utf-8")) if OUT.exists() else {}
    redo = set(sys.argv[sys.argv.index("--redo") + 1:]) if "--redo" in sys.argv else set()
    cities = fetch_cities()
    todo = [(k, cc) for k, cc in sorted(cities.items()) if k not in have or k in redo]
    print(f"городов на карте: {len(cities)}, уже переведено: {len(have)}, к переводу: {len(todo)}")
    for i in range(0, len(todo), 40):
        batch = todo[i:i + 40]
        try:
            have.update(ask(batch))
        except Exception as e:  # noqa: BLE001
            print("  пачка не вышла:", str(e)[:150])
            continue
        OUT.write_text(json.dumps(dict(sorted(have.items())), ensure_ascii=False, indent=0), encoding="utf-8")
        print(f"  {min(i + 40, len(todo))}/{len(todo)}")
    OUT.write_text(json.dumps(dict(sorted(have.items())), ensure_ascii=False, indent=0), encoding="utf-8")


if __name__ == "__main__":
    main()
