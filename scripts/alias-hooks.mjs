// Резолвер импортов вида "@/lib/..." для тестов, которые гоняются голым
// node (см. scripts/job-stats.test.ts). Next.js читает эти алиасы из
// tsconfig.json сам, node -- нет, а тянуть ради двух тестов сборщик
// дороже, чем десять строк здесь.
import { existsSync } from "node:fs";
import { dirname, resolve as resolvePath } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolvePath(dirname(fileURLToPath(import.meta.url)), "..");

function withExtension(path) {
  if (/\.(ts|tsx|mjs|js|json)$/.test(path)) return path;
  for (const ext of [".ts", ".tsx", ".js", "/index.ts", "/index.tsx"]) {
    if (existsSync(path + ext)) return path + ext;
  }
  return path;
}

export async function resolve(specifier, context, next) {
  if (specifier.startsWith("@/")) {
    return next(pathToFileURL(withExtension(`${ROOT}/${specifier.slice(2)}`)).href, context);
  }
  // Внутри проекта импорты пишутся без расширения -- node требует его.
  if (specifier.startsWith(".") && context.parentURL?.startsWith("file://")) {
    const target = new URL(specifier, context.parentURL);
    const fixed = withExtension(target.pathname);
    if (fixed !== target.pathname) return next(pathToFileURL(fixed).href, context);
  }
  return next(specifier, context);
}
