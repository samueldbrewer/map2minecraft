import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

const inter = Inter({ subsets: ["latin"] });

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://map2minecraft.com";

export const metadata: Metadata = {
  title: "Map2Minecraft - Turn Any Place Into a Minecraft World",
  description:
    "Convert real-world locations into playable Minecraft worlds with real buildings, roads, terrain, and 3D preview. Java & Bedrock Edition. Powered by OpenStreetMap.",
  metadataBase: new URL(APP_URL),
  alternates: { canonical: "/" },
  keywords: [
    "minecraft world generator",
    "real world minecraft",
    "minecraft map maker",
    "openstreetmap minecraft",
    "minecraft city builder",
    "map to minecraft",
    "minecraft world download",
    "real life minecraft",
  ],
  authors: [{ name: "Map2Minecraft" }],
  openGraph: {
    type: "website",
    title: "Map2Minecraft - Turn Any Place Into a Minecraft World",
    description:
      "Select any location on Earth and generate a detailed Minecraft world with real buildings, roads, and terrain elevation.",
    url: APP_URL,
    siteName: "Map2Minecraft",
    images: [
      {
        url: "/showcase/hero.jpg",
        width: 1920,
        height: 1019,
        alt: "Minecraft worlds generated from real-world locations",
      },
    ],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Map2Minecraft - Turn Any Place Into a Minecraft World",
    description:
      "Select any location on Earth and generate a detailed Minecraft world with real buildings, roads, and terrain.",
    images: ["/showcase/hero.jpg"],
  },
  icons: {
    icon: "/favicon.svg",
    apple: "/favicon.svg",
  },
  manifest: "/manifest.json",
  other: {
    "theme-color": "#5B8C3E",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "Map2Minecraft",
              url: APP_URL,
              description:
                "Convert real-world locations into playable Minecraft worlds with real buildings, roads, and terrain elevation.",
              applicationCategory: "GameApplication",
              operatingSystem: "Web",
              offers: {
                "@type": "AggregateOffer",
                lowPrice: "2",
                highPrice: "15",
                priceCurrency: "USD",
              },
              image: `${APP_URL}/showcase/hero.jpg`,
            }),
          }}
        />
      </head>
      <body className={`${inter.className} bg-[#F5F5F0] text-[#3B3B3B] min-h-screen flex flex-col`}>
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
