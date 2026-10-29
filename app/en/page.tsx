// app/en/page.tsx -- у языковой версии нет своей ленты: /en ведёт в каталог добірок этого языка.
import { permanentRedirect } from "next/navigation";

export default function Page() {
  permanentRedirect("/en/jobs/catalog");
}
