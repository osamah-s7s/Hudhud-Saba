/** @type {import('next').NextConfig} */
const nextConfig = {
  // Cache Components (stable in Next 16). Docs ask for partialPrefetching to
  // be set explicitly alongside it; leaving it unset logs a warning.
  cacheComponents: true,
  partialPrefetching: true,

  // Tailwind CSS v4 via its Turbopack loader (Turbopack is the default
  // bundler for `next dev` and `next build` in Next 16).
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },

  images: {
    // AVIF first, WebP fallback; the original format is used otherwise.
    formats: ["image/avif", "image/webp"],
    // Next 16 only serves qualities on this allowlist (default [75]).
    qualities: [75],
    // Any local image in public/, but without query strings, so the optimizer
    // cannot be made to produce endless cache-busting variants.
    localPatterns: [{ pathname: "/**", search: "" }],
  },

  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          // Only frame-ancestors: a full CSP could break Next's inline scripts.
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
