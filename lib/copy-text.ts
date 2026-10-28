// lib/copy-text.ts -- скопировать текст в буфер обмена (28.10.2026).
// navigator.clipboard работает не везде (Safari на iPhone иногда отказывает,
// старые браузеры, встроенные в приложения), поэтому запасной путь --
// скрытое поле + document.execCommand("copy").
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* ниже запасной путь */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "0";
    ta.style.left = "0";
    ta.style.opacity = "0";
    ta.style.fontSize = "16px"; // без зума на iPhone
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}
