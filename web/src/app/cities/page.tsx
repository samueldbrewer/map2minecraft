import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, ArrowRight } from "lucide-react";
import { cities, continents } from "@/lib/cities";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://map2minecraft.com";

export const metadata: Metadata = {
  title: "Minecraft City Maps — Download Real-World Cities | Map2Minecraft",
  description:
    "Browse 90+ real-world cities available as Minecraft worlds. Download New York, London, Tokyo, Paris, and more with real buildings, roads, and terrain. Java & Bedrock Edition.",
  keywords: [
    "minecraft city maps",
    "minecraft city download",
    "real world minecraft maps",
    "minecraft world download",
    "minecraft cities",
  ],
  openGraph: {
    title: "Minecraft City Maps — Download Real-World Cities | Map2Minecraft",
    description:
      "Browse 90+ real-world cities available as Minecraft worlds. From $2.",
    url: `${APP_URL}/cities`,
    type: "website",
    images: [{ url: "/showcase/hero.jpg", width: 1920, height: 1019 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Minecraft City Maps — Download Real-World Cities",
    description:
      "Browse 90+ real-world cities available as Minecraft worlds. From $2.",
  },
  alternates: { canonical: "/cities" },
};

const sizeColors: Record<string, string> = {
  Small: "bg-blue-50 text-blue-700",
  Medium: "bg-green-50 text-green-700",
  Large: "bg-orange-50 text-orange-700",
  XL: "bg-purple-50 text-purple-700",
};

export default function CitiesPage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-b from-[#F5F5F0] to-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl md:text-5xl font-bold text-[#3B3B3B] mb-4">
            Real-World Cities in{" "}
            <span className="text-[#5B8C3E]">Minecraft</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
            Browse {cities.length}+ cities from around the world. Every
            building, road, and park from OpenStreetMap — ready to play in
            Minecraft Java or Bedrock Edition.
          </p>
          <Link
            href="/create?new=1"
            className="inline-flex items-center gap-2 bg-[#5B8C3E] text-white px-8 py-3 rounded-lg font-semibold hover:bg-[#4A7332] transition-colors shadow-lg shadow-green-900/20"
          >
            Or Create Any Location
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* City grid by continent */}
      {continents.map((continent) => {
        const continentCities = cities.filter(
          (c) => c.continent === continent
        );
        return (
          <section key={continent} className="py-12 even:bg-white odd:bg-[#F5F5F0]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-2xl font-bold mb-2">{continent}</h2>
              <p className="text-sm text-gray-500 mb-6">
                {continentCities.length} cities
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {continentCities.map((city) => (
                  <Link
                    key={city.slug}
                    href={`/cities/${city.slug}`}
                    className="group bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:border-[#5B8C3E]/30 transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-[#3B3B3B] group-hover:text-[#5B8C3E] transition-colors">
                        {city.name}
                      </h3>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${sizeColors[city.sizeLabel] || ""}`}
                      >
                        {city.sizeLabel}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
                      <MapPin className="h-3 w-3" />
                      {city.country}
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2">
                      {city.description}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        );
      })}

      {/* Bottom CTA */}
      <section className="py-16 bg-[#3B3B3B] text-white text-center">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-2xl font-bold mb-4">
            Don&apos;t See Your City?
          </h2>
          <p className="text-gray-300 mb-8">
            You can generate any location on Earth — not just the cities listed
            here. Draw any area on the map and create your world in minutes.
          </p>
          <Link
            href="/create?new=1"
            className="inline-flex items-center gap-2 bg-[#5B8C3E] text-white px-10 py-4 rounded-lg text-lg font-semibold hover:bg-[#4A7332] transition-colors"
          >
            Create Any Location
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
