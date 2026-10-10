import { EventsIndexPage } from "@/components/events/index-page";
import { indexMeta } from "@/lib/events/routes";

export const runtime = "nodejs";
export const revalidate = 600;
export const metadata = indexMeta("en");

export default function Page() {
  return <EventsIndexPage lang="en" />;
}
