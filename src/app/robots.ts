import type { MetadataRoute } from "next";
import { isSearchIndexable, SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  if (!isSearchIndexable()) {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/app", "/api/", "/sign-in", "/sign-up"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
