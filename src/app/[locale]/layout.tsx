import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import { i18n, type Locale } from "@/lib/i18n-config";
import { GoogleAnalytics } from '@next/third-parties/google';
import { Analytics } from '@vercel/analytics/react';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Custom Murder Mystery Games | Back Pocket Mysteries",
    template: "%s | Back Pocket Mysteries",
  },
  description: "Host a custom murder mystery party built around your actual guest list. Personalised murder mystery packs ready to print in under 20 minutes. Perfect for birthdays and dinner parties.",
  keywords: ["custom murder mystery", "murder mystery party", "personalised mystery", "printable games", "dinner party games", "murder mystery kit", "custom party game"],
  authors: [{ name: "Back Pocket Games" }],
  creator: "Back Pocket Games",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://mysteries.backpocketgames.com",
    siteName: "Back Pocket Mysteries",
    title: "Custom Murder Mystery Games | Back Pocket Mysteries",
    description: "Host a custom murder mystery party built around your actual guest list. Ready in 20 minutes.",
    images: [{ url: "/og-image.png" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Custom Murder Mystery Games | Back Pocket Mysteries",
    description: "Host a custom murder mystery party built around your actual guest list. Ready in 20 minutes.",
    images: ["/og-image.png"],
  },
  metadataBase: new URL("https://mysteries.backpocketgames.com"),
};

export async function generateStaticParams() {
  return i18n.locales.map((locale) => ({ locale }));
}

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Back Pocket Mysteries",
  "url": "https://mysteries.backpocketgames.com",
  "logo": "https://mysteries.backpocketgames.com/logo-primary.png",
  "sameAs": [
    "https://twitter.com/backpocketgames",
    "https://instagram.com/backpocketgames"
  ]
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Back Pocket Mysteries",
  "url": "https://mysteries.backpocketgames.com",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://mysteries.backpocketgames.com/themes?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
};

export default async function RootLayout(props: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const params = await props.params;
  const locale = params.locale;

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {props.children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID as string} />
        <Analytics />
      </body>
    </html>
  );
}
