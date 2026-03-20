import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Map2Minecraft - Turn Any Place Into a Minecraft World",
  description: "Convert real-world locations into playable Minecraft worlds with interactive 3D preview.",
  icons: {
    icon: "/favicon.svg",
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
        <link rel="stylesheet" href="https://unpkg.com/maplibre-gl@5.20.2/dist/maplibre-gl.css" />
        <script src="https://unpkg.com/maplibre-gl@5.20.2/dist/maplibre-gl.js" async></script>
      </head>
      <body className={`${inter.className} bg-[#F5F5F0] text-[#3B3B3B] min-h-screen flex flex-col`}>
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
