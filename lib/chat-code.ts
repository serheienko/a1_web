// lib/chat-code.ts
//
// 2026-09-24 (Александр: «Telegram сам определяет, что это за код —
// пишет сверху Dart, а если вставлю C++, напишет C++. Можем так же?»).
//
// Языки для блоков кода в чатах: угадать язык, назвать его для шапки
// блока и подсветить. Та же логика, что в приложении
// (lib/features/chat/presentation/chat_detail/components/rich/
// code_language.dart): только ~20 популярных языков (на полном наборе
// highlight.js Python и Swift угадывались как Dart), сначала явные
// приметы языка руками, потом оценка highlight.js; слабая догадка —
// null, и блок подписан просто «Код».
import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import c from "highlight.js/lib/languages/c";
import cpp from "highlight.js/lib/languages/cpp";
import csharp from "highlight.js/lib/languages/csharp";
import css from "highlight.js/lib/languages/css";
import dart from "highlight.js/lib/languages/dart";
import go from "highlight.js/lib/languages/go";
import java from "highlight.js/lib/languages/java";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import kotlin from "highlight.js/lib/languages/kotlin";
import objectivec from "highlight.js/lib/languages/objectivec";
import php from "highlight.js/lib/languages/php";
import python from "highlight.js/lib/languages/python";
import ruby from "highlight.js/lib/languages/ruby";
import rust from "highlight.js/lib/languages/rust";
import sql from "highlight.js/lib/languages/sql";
import swift from "highlight.js/lib/languages/swift";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";

const LANGS = {
  dart, kotlin, swift, javascript, typescript, python, java, cpp, c, csharp,
  go, rust, php, sql, json, yaml, xml, css, bash, ruby, objectivec,
} as const;

for (const [name, def] of Object.entries(LANGS)) {
  if (!hljs.getLanguage(name)) hljs.registerLanguage(name, def);
}

const NAMES: Record<string, string> = {
  dart: "Dart", kotlin: "Kotlin", swift: "Swift", javascript: "JavaScript",
  typescript: "TypeScript", python: "Python", java: "Java", cpp: "C++", c: "C",
  csharp: "C#", go: "Go", rust: "Rust", php: "PHP", sql: "SQL", json: "JSON",
  yaml: "YAML", xml: "HTML", css: "CSS", bash: "Bash", ruby: "Ruby",
  objectivec: "Objective-C",
};

const ALIASES: Record<string, string> = {
  js: "javascript", jsx: "javascript", node: "javascript", ts: "typescript",
  tsx: "typescript", py: "python", python3: "python", kt: "kotlin",
  kts: "kotlin", "c++": "cpp", cc: "cpp", h: "c", cs: "csharp", "c#": "csharp",
  golang: "go", rs: "rust", yml: "yaml", html: "xml", htm: "xml", svg: "xml",
  sh: "bash", shell: "bash", zsh: "bash", console: "bash", rb: "ruby",
  objc: "objectivec", "obj-c": "objectivec", postgres: "sql",
  postgresql: "sql", mysql: "sql",
};

/** Наш id для того, что написал отправитель ('Python', 'py', 'C++'). */
export function normalizeLanguage(raw: string | null | undefined): string | null {
  const v = (raw ?? "").trim().toLowerCase();
  if (!v) return null;
  if (NAMES[v]) return v;
  return ALIASES[v] ?? null;
}

/** Подпись в шапке блока: 'Dart', 'C++'; незнакомый язык — как прислали. */
export function languageDisplayName(raw: string | null | undefined): string | null {
  const id = normalizeLanguage(raw);
  if (id) return NAMES[id] ?? null;
  const v = (raw ?? "").trim();
  return v || null;
}

const RX = {
  pythonDef: /^\s*(def|class)\s+\w+.*:\s*$/m,
  pythonImport: /^\s*(from\s+[\w.]+\s+import|import\s+[\w.]+\s*$)/m,
  swift: /import\s+(SwiftUI|UIKit|Foundation)\b|\bsome\s+View\b|\bfunc\s+\w+\s*\(.*\)\s*(->|\{)|\bguard\s+let\b|\bif\s+let\b/,
  dart: /import\s+'package:|\bWidget\s+build\s*\(|\bextends\s+State(less|ful)Widget\b|\bfinal\s+\w+\s*=|\bFuture</,
  kotlin: /\bfun\s+\w+\s*\(|\bval\s+\w+\s*[:=]|\bdata\s+class\b/,
  go: /^package\s+\w+|\bfunc\s+(\(\w+\s+\*?\w+\)\s*)?\w+\s*\(.*\)\s*[\w[\]*]*\s*\{|:=/m,
  rust: /\bfn\s+\w+\s*\(|\blet\s+mut\b|\bimpl\b|println!/,
  cpp: /#include\s*<\w+(\.h)?>|\bstd::|\bcout\s*<</,
  php: /<\?php|\$\w+\s*=/,
  sql: /^\s*(SELECT|INSERT\s+INTO|UPDATE|DELETE\s+FROM|CREATE\s+TABLE|ALTER\s+TABLE)\b/im,
  shell: /^\s*(\$\s+)?((sudo|npm|yarn|pnpm|git|brew|pip3?|flutter|docker|cd|ls|curl|chmod|mkdir)\s|export\s+[A-Z_]+=)/m,
  java: /\bpublic\s+(static\s+)?(final\s+)?(class|void|interface)\b|System\.out\.|import\s+java\.|@Override\s+public/,
  yamlLine: /^\s*(- )?[\w.-]+:(\s.*)?$|^\s*- \S|^\s*#|^\s*$/,
  js: /\bconsole\.\w+\(|\bdocument\.\w+|\bwindow\.\w+|\brequire\(|module\.exports|===|!==|\bfunction\s*\w*\s*\(|addEventListener\(/,
  ts: /\binterface\s+\w+\s*\{|:\s*(string|number|boolean|any|unknown)\b|\btype\s+\w+\s*=|\bas\s+const\b/,
};

function looksLikeJson(s: string): boolean {
  const t = s.trim();
  return (t.startsWith("{") && t.endsWith("}")) || (t.startsWith("[") && t.endsWith("]") && t.includes('"'));
}

function looksLikeYaml(s: string): boolean {
  if (s.includes("{") || s.includes(";") || s.includes("(")) return false;
  const lines = s.split("\n");
  if (lines.length < 2) return false;
  return lines.every((l) => RX.yamlLine.test(l)) && lines.some((l) => l.trimEnd().endsWith(":"));
}

function bySignature(s: string): string | null {
  const first = s.trimStart();
  if ((first.startsWith("{") || first.startsWith("[")) && looksLikeJson(s)) return "json";
  if (RX.php.test(s) && s.includes("<?php")) return "php";
  if (RX.cpp.test(s)) return "cpp";
  if (RX.go.test(s) && s.includes("package ")) return "go";
  if (RX.java.test(s) && !s.includes("using System")) return "java";
  if (RX.ts.test(s) && !RX.dart.test(s)) return "typescript";
  if (RX.js.test(s) && !RX.dart.test(s)) return "javascript";
  if (RX.swift.test(s) && !RX.dart.test(s)) return "swift";
  if (RX.dart.test(s)) return "dart";
  if ((RX.pythonDef.test(s) || RX.pythonImport.test(s)) && (!s.includes(";") || s.includes("print("))) return "python";
  if (RX.rust.test(s) && s.includes("fn ")) return "rust";
  if (RX.kotlin.test(s) && s.includes("fun ")) return "kotlin";
  if (RX.sql.test(s)) return "sql";
  if (looksLikeYaml(s)) return "yaml";
  if (RX.shell.test(s) && s.split("\n").length <= 12) return "bash";
  return null;
}

/** Лучшая догадка о языке кода или null, если не уверены. */
export function detectLanguage(code: string): string | null {
  const src = code.trim();
  if (src.length < 12) return null;
  const hand = bySignature(src);
  if (hand) return hand;
  const r = hljs.highlightAuto(src, Object.keys(NAMES));
  if (!r.language || r.relevance < 6) return null;
  return r.language;
}

/** HTML с подсветкой (экранированный highlight.js) или null. */
export function highlightCode(code: string, language: string | null | undefined): string | null {
  const id = normalizeLanguage(language);
  if (!id) return null;
  try {
    return hljs.highlight(code, { language: id, ignoreIllegals: true }).value;
  } catch {
    return null;
  }
}

/**
 * Дописывает язык к ``` без языка — перед отправкой, чтобы сервер
 * сохранил его в сообщении и все (сайт и приложение) видели одну и ту
 * же подпись.
 */
export function addFenceLanguages(text: string): string {
  return text.replace(/```[ \t]*\n([\s\S]*?)\n?```/g, (whole, body: string) => {
    const lang = detectLanguage(body);
    return lang ? "```" + lang + "\n" + body + "\n```" : whole;
  });
}
