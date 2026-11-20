import type { Metadata } from "next";
import { site } from "@/data/survey";

/**
 * Absolute base URL for metadata (Open Graph / Twitter image URLs must be
 * absolute). Resolved at build time from Vercel's system environment
 * variables, so nothing has to be configured by hand:
 *   1. NEXT_PUBLIC_SITE_URL or SITE_URL — optional override (e.g. a custom domain)
 *   2. Preview deployments: the branch / deployment URL
 *   3. VERCEL_PROJECT_PRODUCTION_URL — the project's production domain
 *   4. VERCEL_URL — this deployment's own URL
 *   5. http://localhost:3000 for local development
 * Reading process.env at module scope is not request-time data, so it is
 * compatible with Cache Components and the page shell stays prerendered.
 */
function resolveSiteUrl(): URL {
  const withProtocol = (host: string) => (/^https?:\/\//i.test(host) ? host : `https://${host}`);
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.SITE_URL,
    process.env.VERCEL_ENV === "preview"
      ? process.env.VERCEL_BRANCH_URL || process.env.VERCEL_URL
      : undefined,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
  ];
  for (const candidate of candidates) {
    const value = candidate?.trim();
    if (!value) continue;
    try {
      return new URL(withProtocol(value));
    } catch {
      // Ignore a malformed value and try the next one.
    }
  }
  return new URL(`http://localhost:${process.env.PORT || 3000}`);
}

const title = `${site.name} — ${site.tagline}`;

// Built only from wording in src/data/survey.ts.
const description =
  `${site.kicker} for ${site.name}, a ${site.tagline}: ` +
  `a message from Yemen to the people of Pakistan. ` +
  `Participation is voluntary. No name is required.`;

export const siteMetadata: Metadata = {
  metadataBase: resolveSiteUrl(),
  title: { default: title, template: `%s · ${site.name}` },
  description,
  applicationName: site.name,
  openGraph: {
    type: "website",
    siteName: site.name,
    title,
    description,
    locale: "en",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
  robots: { index: true, follow: true },
};
