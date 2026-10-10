import { TopicRoute, topicMeta } from "@/lib/events/routes";

export const runtime = "nodejs";
export const revalidate = 600;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return topicMeta((await params).slug, "uk");
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <TopicRoute slug={(await params).slug} lang="uk" />;
}
