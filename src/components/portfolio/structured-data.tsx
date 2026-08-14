import { serializeStructuredData } from "@/lib/site-metadata";

export function StructuredData({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      dangerouslySetInnerHTML={{ __html: serializeStructuredData(data) }}
      type="application/ld+json"
    />
  );
}
