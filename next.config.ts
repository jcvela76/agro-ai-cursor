import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [
      {
        // Marketing LP HTML — CDN-friendly; ISR revalidate on the page keeps freshness.
        source: "/",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=3600, stale-while-revalidate=86400",
          },
        ],
      },
      {
        source: "/landing/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG ?? "rw-code-sac",
  project: process.env.SENTRY_PROJECT ?? "agro-ai",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  disableLogger: true,
  // Source maps upload only when auth token present (Vercel/CI).
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
});
