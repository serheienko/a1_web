// app/download-new/page.tsx
// 23.10.2026: черновик утверждён и стал главной установочной страницей /download.
// Старый адрес черновика ведёт туда же, чтобы отправленные ссылки не ломались.
import { permanentRedirect } from "next/navigation";

export default function DownloadNewRedirect() {
  permanentRedirect("/download");
}
