// app/de/page.tsx -- у языковой версии нет своей ленты: /de ведёт в каталог добірок этого языка.
import { permanentRedirect } from "next/navigation";

export default function Page() {
  permanentRedirect("/de/jobs/catalog");
}
