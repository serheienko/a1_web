// app/es/page.tsx -- у языковой версии нет своей ленты: /es ведёт в каталог добірок этого языка.
import { permanentRedirect } from "next/navigation";

export default function Page() {
  permanentRedirect("/es/jobs/catalog");
}
