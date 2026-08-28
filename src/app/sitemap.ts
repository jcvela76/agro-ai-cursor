import type { MetadataRoute } from "next";
import { LEGAL_SLUGS } from "@/content/legal/documents";
import { LEGAL_LAST_UPDATED } from "@/content/legal/types";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const legalUpdated = new Date(LEGAL_LAST_UPDATED);

  return [
    {
      url: `${SITE_URL}/`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    ...LEGAL_SLUGS.map((slug) => ({
      url: `${SITE_URL}/legal/${slug}`,
      lastModified: legalUpdated,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];
}
