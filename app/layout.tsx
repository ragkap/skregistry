import type { Metadata } from "next";
import { Roboto, Roboto_Mono } from "next/font/google";
import "./globals.css";

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Shareholder Registry",
  description: "Institutional shareholder data, peer comparison and AI-powered registry analysis.",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
  openGraph: {
    title: "Smartkarma Shareholder Registry",
    description: "Institutional shareholder data, peer comparison and AI-powered registry analysis.",
    url: "https://skregistry.smartkarma.com",
    siteName: "Smartkarma",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Smartkarma Shareholder Registry" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Smartkarma Shareholder Registry",
    description: "Institutional shareholder data, peer comparison and AI-powered registry analysis.",
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${roboto.variable} ${robotoMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-[var(--font-roboto)]">{children}</body>
    </html>
  );
}
