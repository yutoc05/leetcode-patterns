import type { Metadata } from "next";
import { Hanken_Grotesk, Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegistrar from "@/components/layout/ServiceWorkerRegistrar";
import { AuthProvider } from "@/components/layout/AuthContext";

const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

// The wordmark only.
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["800"],
  display: "swap",
});

// Code, key hints and the ASCII dog only.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

const siteUrl = "https://yutoc05.github.io/yeetcode-patterns";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: "Yeetcode Patterns",
  description:
    "A curated list of LeetCode questions grouped by pattern to help you prepare for coding interviews. Filter by difficulty, company, and topic.",
  manifest: `${basePath}/manifest.json`,
  metadataBase: new URL(siteUrl),
  alternates: { canonical: "/" },
  openGraph: {
    title: "Yeetcode Patterns",
    description:
      "A curated list of LeetCode questions grouped by pattern to help you prepare for coding interviews.",
    url: siteUrl,
    siteName: "Yeetcode Patterns",
    images: [
      {
        url: `${basePath}/images/og-image.png`,
        width: 1200,
        height: 630,
        alt: "Yeetcode Patterns: a curated list of LeetCode questions grouped by pattern",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Yeetcode Patterns",
    description:
      "A curated list of LeetCode questions grouped by pattern to help you prepare for coding interviews.",
    images: [`${basePath}/images/og-image.png`],
  },
  keywords: [
    "leetcode",
    "coding interview",
    "data structures",
    "algorithms",
    "interview prep",
    "blind 75",
    "leetcode patterns",
    "yeetcode patterns",
  ],
  authors: [{ name: "Yuto Chau", url: "https://github.com/yutoc05" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${hanken.variable} ${jakarta.variable} ${geistMono.variable}`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");if(t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme:dark)").matches))document.documentElement.classList.add("dark")}catch(e){}})();if(location.hash&&location.hash.indexOf("access_token")>-1)window.__SUPABASE_AUTH_HASH__=location.hash`,
          }}
        />
      </head>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
