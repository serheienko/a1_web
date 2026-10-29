// lib/app-version.ts
//
// Что приложению считать «пора обновиться». 2026-09-17, по разговору с
// Александром про флоу обновлений.
//
// Здесь ДВА числа на каждую платформу и одна строка текста:
//
//   minimum     -- ниже этой версии приложение не работает. Показывает
//                  экран без выхода: «обнови, иначе никак». Поднимать
//                  только когда старая версия реально сломана --
//                  несовместима с API, критический баг, дыра.
//   recommended -- вышла новая версия. Показывает полоску сверху,
//                  которую можно закрыть.
//   note        -- одна фраза о пользе, ровно та же, что в «Что нового»
//                  в магазине: человек должен дважды увидеть одно и то
//                  же обещание.
//
// Почему это живёт в НАШЕМ вебе, а не в бэкенде приложения: правило
// должно меняться без новой сборки и без релиза бэкенда. Файл лежит в
// репозитории, меняется одной строкой и уезжает на прод обычным пушем
// -- то есть за минуту и без чужих рук.
//
// Железное правило на стороне приложения: если этот ответ не пришёл или
// пришёл кривым -- НИЧЕГО не показывать и никого не блокировать. Наша
// недоступность не должна выключать людям приложение.

export type PlatformVersionRule = {
  /** Ниже неё -- блокирующий экран. */
  minimum: string;
  /** Ниже неё -- мягкая полоска сверху. */
  recommended: string;
  /** Одна фраза о том, что нового. Пусто -- полоска покажет общий текст. */
  note: string;
  /** Куда ведёт кнопка. Пусто -- приложение откроет магазин само. */
  storeUrl: string;
};

export type AppVersionConfig = {
  ios: PlatformVersionRule;
  android: PlatformVersionRule;
};

// ВНИМАНИЕ: цифры ниже -- то, что реально увидит каждый пользователь.
// `minimum` поднимается ТОЛЬКО осознанно: это блокировка.
export const APP_VERSION_CONFIG: AppVersionConfig = {
  ios: {
    minimum: "1.0.0",
    recommended: "1.0.8",
    note: "",
    // Числовой id из App Store Connect (карточка приложения
    // «A1: Job Search, Jobs & Hiring»), взят 2026-09-17.
    storeUrl: "https://apps.apple.com/app/id6443859764",
  },
  android: {
    minimum: "1.0.0",
    recommended: "1.0.8",
    note: "",
    storeUrl: "https://play.google.com/store/apps/details?id=com.aone.aoneapp",
  },
};

/**
 * 29.10.2026 (Александр: «как обновлять Mac-версию -- как в Telegram, кнопкой
 * у навигации»). Mac-версия живёт не в магазине, а у нас на сайте
 * (public/downloads/A1-mac.zip). Приложение сравнивает свой номер сборки
 * (CFBundleVersion) с `build`: если здесь больше -- показывает «Оновити»,
 * по нажатию само скачивает архив, проверяет подпись Apple (наша команда
 * 4GFH7RQGJQ), заменяет себя и перезапускается.
 *
 * ПОРЯДОК ВЫКЛАДКИ новой Mac-сборки: сначала положить новый A1-mac.zip,
 * потом поднять здесь `build` до номера этой сборки -- в одном коммите.
 */
export type MacUpdateRule = {
  /** Номер последней выложенной сборки (CFBundleVersion в архиве). */
  build: number;
  /** Версия для подписи на кнопке/в «Про програму». */
  version: string;
  /** Откуда скачивать архив. */
  url: string;
  /** Что нового, одной фразой (пусто -- общий текст). */
  note: string;
};

export const MAC_UPDATE: MacUpdateRule = {
  build: 31,
  version: "1.0.13",
  url: "https://jobs.a1appp.com/downloads/A1-mac.zip",
  note: "",
};

/**
 * Сравнение версий вида «1.2.3». Возвращает -1, 0 или 1.
 * Хвост после цифр (например, «2.0.1+42» или «2.0.1-beta») отбрасывается:
 * номер сборки к решению «пора ли обновиться» отношения не имеет.
 */
export function compareVersions(a: string, b: string): number {
  const parse = (value: string) =>
    value
      .split("+")[0]!
      .split("-")[0]!
      .split(".")
      .map((part) => Number.parseInt(part, 10) || 0);
  const left = parse(a);
  const right = parse(b);
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i += 1) {
    const l = left[i] ?? 0;
    const r = right[i] ?? 0;
    if (l !== r) return l < r ? -1 : 1;
  }
  return 0;
}

export type UpdateVerdict = "blocked" | "recommended" | "ok";

/** Что показывать версии `current` на платформе `rule`. */
export function updateVerdict(current: string, rule: PlatformVersionRule): UpdateVerdict {
  if (compareVersions(current, rule.minimum) < 0) return "blocked";
  if (compareVersions(current, rule.recommended) < 0) return "recommended";
  return "ok";
}

// 18.10.2026 (Александр: «чтобы не надо было вмешиваться»). Рекомендуемая
// версия iOS берётся из самого App Store: как только Apple выпустила новую
// версию, полоска «обновись» появляется у тех, у кого версия ниже. Ручное
// значение в APP_VERSION_CONFIG остаётся нижней границей и запасным
// вариантом: если Apple не ответил -- отдаём его, ничего не ломается.
// `minimum` (блокирующий экран) не автоматизируется намеренно.
const APP_STORE_LOOKUP = "https://itunes.apple.com/lookup?id=6443859764";

export async function liveIosVersion(): Promise<string | null> {
  try {
    const response = await fetch(APP_STORE_LOOKUP, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { results?: Array<{ version?: unknown }> };
    const version = data.results?.[0]?.version;
    return typeof version === "string" && /^\d+(\.\d+){1,3}$/.test(version) ? version : null;
  } catch {
    return null;
  }
}

/** Ручное значение, поднятое до версии, которая реально лежит в App Store. */
export async function resolvedConfig(): Promise<AppVersionConfig> {
  const live = await liveIosVersion();
  if (!live || compareVersions(live, APP_VERSION_CONFIG.ios.recommended) <= 0) {
    return APP_VERSION_CONFIG;
  }
  return {
    ...APP_VERSION_CONFIG,
    ios: { ...APP_VERSION_CONFIG.ios, recommended: live },
  };
}
