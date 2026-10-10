import { PlaceRoute, placeMeta } from "@/lib/events/routes";

export const runtime = "nodejs";
export const revalidate = 600;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return placeMeta((await params).slug, "en");
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <PlaceRoute slug={(await params).slug} lang="en" />;
}
