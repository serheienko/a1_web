import { EventPage } from "@/components/events/event-page";
import { eventMeta } from "@/lib/events/routes";

export const runtime = "nodejs";
export const revalidate = 600;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return eventMeta((await params).slug, "en");
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <EventPage slug={(await params).slug} lang="en" />;
}
