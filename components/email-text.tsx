// components/email-text.tsx -- адрес почты текстом, который Cloudflare не «защищает».
//
// 18.10.2026. Cloudflare «Email Address Obfuscation» находит в готовой HTML-странице всё, что похоже на
// адрес почты, и подменяет его на «[email protected]». Сервер отдаёт браузеру уже подменённый текст, а React
// при загрузке строит свой (с настоящим адресом), видит расхождение (ошибка #418) и перерисовывает страницу
// с нуля: у страницы слетает язык (всё становится украинским) и она долго грузится. Так вела себя
// /ai-assistant и /privacy. Если разделить адрес на части элементом, подмена не срабатывает, а человек видит
// обычный адрес и может его выделить и скопировать.
export function Email({ user = "support", domain = "a1appp.com" }: { user?: string; domain?: string }) {
  return (
    <span className="whitespace-nowrap">
      {user}
      <span>@</span>
      {domain}
    </span>
  );
}
