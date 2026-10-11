// Подключает scripts/alias-hooks.mjs. Нужен отдельным файлом: node
// регистрирует хуки резолвера только из другого модуля.
import { register } from "node:module";
import { pathToFileURL } from "node:url";

register("./alias-hooks.mjs", pathToFileURL(`${import.meta.dirname}/`));
