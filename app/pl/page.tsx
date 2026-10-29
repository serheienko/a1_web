// app/pl/page.tsx -- у языковой версии нет своей ленты: /pl ведёт в каталог добірок этого языка.
import { permanentRedirect } from "next/navigation";

export default function Page() {
  permanentRedirect("/pl/jobs/catalog");
}
