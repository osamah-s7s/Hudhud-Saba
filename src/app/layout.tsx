import type { Viewport } from "next";
import { Amiri, Cormorant_Garamond, Hanken_Grotesk } from "next/font/google";
import { siteMetadata } from "@/lib/site-metadata";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-cormorant",
});

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-hanken",
});

// Arabic is only two short phrases; don't let it compete with the hero for bandwidth.
const amiri = Amiri({
  subsets: ["arabic"],
  weight: "700",
  display: "swap",
  preload: false,
  variable: "--font-amiri",
});

export const metadata = siteMetadata;

export const viewport: Viewport = {
  themeColor: "#1d1a18",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${hanken.variable} ${amiri.variable} antialiased`}
    >
      <body className="min-h-dvh bg-night font-sans text-sand">{children}</body>
    </html>
  );
}
