import type { Metadata } from "next";

/*
 * Everything under /admin: kept out of search engines, and nothing on the
 * public site links here. This layout deliberately does no auth check — a
 * layout is not re-rendered on navigation and cannot stop its children from
 * rendering. Each page / action / route handler calls requireAdmin() itself
 * (src/lib/admin-auth.ts).
 */
export const metadata: Metadata = {
  title: { absolute: "Admin · Hudhud Saba" },
  description: null,
  robots: { index: false, follow: false, nocache: true },
  openGraph: null,
  twitter: null,
};

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
