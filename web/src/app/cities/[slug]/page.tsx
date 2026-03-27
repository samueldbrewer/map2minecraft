import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Download, Box, ArrowRight } from "lucide-react";
import { cities, getCityBySlug } from "@/lib/cities";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://map2minecraft.com";

export async function generateStaticParams() {
  return cities.map((city) => ({ slug: city.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const city = getCityBySlug(slug);
  if (!city) return {};

  const title = `Download ${city.name} as a Minecraft World | Map2Minecraft`;
  const description = `Play ${city.name}, ${city.country} in Minecraft with real buildings, roads, and terrain. Generated from OpenStreetMap data. Java & Bedrock Edition. From $2.`;

  return {
    title,
    description,
    keywords: [
      `${city.name.toLowerCase()} minecraft map`,
      `${city.name.toLowerCase()} minecraft world download`,
      `minecraft ${city.name.toLowerCase()}`,
      `${city.name.toLowerCase()} minecraft city`,
      "real world minecraft map",
      "minecraft city download",
    ],
    openGraph: {
      title,
      description,
      url: `${APP_URL}/cities/${slug}`,
      type: "website",
      images: [{ url: "/showcase/hero.jpg", width: 1920, height: 1019 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    alternates: { canonical: `/cities/${slug}` },
  };
}

const sizeInfo: Record<string, { area: string; price: string }> = {
  Small: { area: "< 1 km²", price: "$2" },
  Medium: { area: "1–5 km²", price: "$5" },
  Large: { area: "5–25 km²", price: "$10" },
  XL: { area: "25–100 km²", price: "$15" },
};

export default async function CityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const city = getCityBySlug(slug);
  if (!city) notFound();

  const size = sizeInfo[city.sizeLabel] || sizeInfo.Medium;

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-b from-[#F5F5F0] to-white py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
            <Link href="/cities" className="hover:text-[#5B8C3E] transition-colors">
              Cities
            </Link>
            <span>/</span>
            <span className="text-[#3B3B3B]">{city.name}</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-bold text-[#3B3B3B] mb-4">
            Download {city.name} as a{" "}
            <span className="text-[#5B8C3E]">Minecraft World</span>
          </h1>

          <p className="text-lg text-gray-600 mb-8 max-w-2xl">
            {city.description}
          </p>

          <div className="flex flex-wrap gap-3 mb-8">
            <span className="inline-flex items-center gap-1.5 bg-[#5B8C3E]/10 text-[#5B8C3E] px-3 py-1.5 rounded-full text-sm font-medium">
              <MapPin className="h-3.5 w-3.5" />
              {city.country}
            </span>
            <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full text-sm font-medium">
              <Box className="h-3.5 w-3.5" />
              {city.sizeLabel} ({size.area})
            </span>
            <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full text-sm font-medium">
              <Download className="h-3.5 w-3.5" />
              From {size.price}
            </span>
          </div>

          <Link
            href={`/create?new=1&lat=${city.lat}&lng=${city.lng}`}
            className="inline-flex items-center gap-2 bg-[#5B8C3E] text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-[#4A7332] transition-colors shadow-lg shadow-green-900/20"
          >
            Create {city.name} World
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Landmarks */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-6">
            What&apos;s Included in the {city.name} World
          </h2>
          <div className="grid sm:grid-cols-2 gap-4 mb-8">
            {city.landmarks.map((landmark) => (
              <div
                key={landmark}
                className="flex items-center gap-3 p-4 bg-[#F5F5F0] rounded-lg"
              >
                <div className="w-2 h-2 rounded-full bg-[#5B8C3E] shrink-0" />
                <span className="text-[#3B3B3B] font-medium">{landmark}</span>
              </div>
            ))}
          </div>
          <p className="text-gray-600 text-sm">
            Plus all streets, buildings, parks, and terrain elevation from
            OpenStreetMap data — faithfully converted to Minecraft blocks.
            Available for both Java and Bedrock Edition.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 bg-[#F5F5F0]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-6">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                step: "1",
                title: "Select Area",
                desc: `Choose how much of ${city.name} you want — from a single neighborhood to the entire metro area.`,
              },
              {
                step: "2",
                title: "Preview in 3D",
                desc: "Explore an interactive 3D preview before purchasing. Rotate, zoom, and inspect every block.",
              },
              {
                step: "3",
                title: "Download & Play",
                desc: "Get your world file for Java or Bedrock Edition. Drop it in your saves folder and start exploring.",
              },
            ].map((item) => (
              <div key={item.step} className="bg-white rounded-xl p-6 shadow-sm">
                <div className="w-8 h-8 rounded-full bg-[#5B8C3E] text-white flex items-center justify-center text-sm font-bold mb-3">
                  {item.step}
                </div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold mb-4">
            Ready to Explore {city.name} in Minecraft?
          </h2>
          <p className="text-gray-600 mb-8">
            From {size.price} — no subscription, no mods, no install required.
          </p>
          <Link
            href={`/create?new=1&lat=${city.lat}&lng=${city.lng}`}
            className="inline-flex items-center gap-2 bg-[#5B8C3E] text-white px-10 py-4 rounded-lg text-lg font-semibold hover:bg-[#4A7332] transition-colors shadow-lg"
          >
            Create {city.name} World
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Schema.org structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: `${city.name} Minecraft World`,
            description: city.description,
            offers: {
              "@type": "Offer",
              price: size.price.replace("$", ""),
              priceCurrency: "USD",
              availability: "https://schema.org/InStock",
              url: `${APP_URL}/cities/${slug}`,
            },
            brand: {
              "@type": "Brand",
              name: "Map2Minecraft",
            },
          }),
        }}
      />
    </div>
  );
}
