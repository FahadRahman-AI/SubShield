import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";

// PostHog ingestion is proxied through our own origin (/ingest) so analytics
// survive ad blockers and no third-party host is contacted from the browser.
const posthogHost = (process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com").replace(/\/$/, "");
const posthogAssets = posthogHost.replace(".i.posthog.com", "-assets.i.posthog.com");

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Required by PostHog's API paths, which use trailing slashes.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      { source: "/ingest/static/:path*", destination: `${posthogAssets}/static/:path*` },
      { source: "/ingest/:path*", destination: `${posthogHost}/:path*` },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // Only print upload logs in CI.
  silent: !process.env.CI,
  widenClientFileUpload: true,
  // Same-origin tunnel so error reports aren't dropped by ad blockers. Not
  // covered by proxy.ts's matcher, so it never hits the auth redirect.
  tunnelRoute: "/monitoring",
});
