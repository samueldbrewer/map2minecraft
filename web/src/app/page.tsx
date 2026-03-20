import Link from "next/link";
import Image from "next/image";
import { Logo } from "@/components/brand/Logo";
import { MapPin, Box, Download, Eye } from "lucide-react";

const showcaseItems = [
  {
    label: "Historic City Center",
    desc: "Dense streets, churches, and brick row houses faithfully recreated block by block.",
    src: "/showcase/city.jpg",
  },
  {
    label: "Parks & Countryside",
    desc: "Open fields, tree lines, and landmarks surrounded by lush terrain.",
    src: "/showcase/park.jpg",
  },
  {
    label: "Urban Intersections",
    desc: "Wide boulevards, traffic circles, and mixed-use buildings at true scale.",
    src: "/showcase/intersection.jpg",
  },
  {
    label: "Downtown Skyline",
    desc: "Skyscrapers, office towers, and dense high-rises reaching into the clouds.",
    src: "/showcase/skyline.jpg",
  },
];

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#F5F5F0] to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Text */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <Logo className="h-12 w-12" />
                <span className="text-sm font-semibold text-[#5B8C3E] tracking-wide uppercase">Map2Minecraft</span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#3B3B3B] mb-6 leading-tight">
                Turn Any Place on Earth Into a{" "}
                <span className="text-[#5B8C3E]">Minecraft World</span>
              </h1>
              <p className="text-lg text-gray-600 mb-8 max-w-lg">
                Select a real-world location, and our engine builds a detailed Minecraft world
                with real buildings, roads, terrain elevation, and more. Powered by OpenStreetMap.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/create"
                  className="bg-[#5B8C3E] text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-[#4A7332] transition-colors shadow-lg shadow-green-900/20 text-center"
                >
                  Create Your World
                </Link>
                <a
                  href="#showcase"
                  className="border-2 border-[#3B3B3B] text-[#3B3B3B] px-8 py-3 rounded-lg text-lg font-semibold hover:bg-[#3B3B3B] hover:text-white transition-colors text-center"
                >
                  See Examples
                </a>
              </div>
            </div>

            {/* Hero image */}
            <div className="relative">
              <div className="rounded-2xl overflow-hidden shadow-2xl shadow-black/20 border border-gray-200/50">
                <Image
                  src="/showcase/hero.jpg"
                  alt="Four Minecraft worlds generated from real locations — dense city, park, intersection, and skyline"
                  width={960}
                  height={540}
                  className="w-full h-auto"
                  priority
                />
              </div>
              {/* Floating badge */}
              <div className="absolute -bottom-4 -left-4 bg-white rounded-xl px-4 py-3 shadow-lg border border-gray-100 hidden md:block">
                <div className="text-xs text-gray-500">Generated from</div>
                <div className="font-bold text-[#5B8C3E]">OpenStreetMap data</div>
              </div>
            </div>
          </div>
        </div>
        {/* Decorative grid */}
        <div className="absolute inset-0 -z-10 opacity-[0.03]" style={{
          backgroundImage: 'repeating-linear-gradient(0deg, #3B3B3B 0 1px, transparent 1px 32px), repeating-linear-gradient(90deg, #3B3B3B 0 1px, transparent 1px 32px)',
        }} />
      </section>

      {/* Showcase */}
      <section id="showcase" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-3">Real Cities, Block by Block</h2>
          <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
            Every building, road, and park from OpenStreetMap — transformed into a playable Minecraft world with real elevation data.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {showcaseItems.map((item, i) => (
              <div key={i} className="group relative rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-shadow border border-gray-100">
                <div className="aspect-[4/3] overflow-hidden">
                  <Image
                    src={item.src}
                    alt={item.label}
                    width={480}
                    height={360}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-4 bg-white">
                  <h3 className="font-semibold text-sm mb-1">{item.label}</h3>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-[#F5F5F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              {
                icon: MapPin,
                title: "Select Location",
                desc: "Choose any area on the map by drawing a rectangle. Search for cities, landmarks, or coordinates.",
              },
              {
                icon: Box,
                title: "Generate World",
                desc: "Our engine converts OpenStreetMap data into a detailed Minecraft world with buildings, roads, and terrain.",
              },
              {
                icon: Eye,
                title: "3D Preview",
                desc: "Explore an interactive 3D preview of your generated world before purchasing. Rotate, zoom, and inspect.",
              },
              {
                icon: Download,
                title: "Download & Play",
                desc: "Get your world as a ready-to-play file for Java or Bedrock Edition. Drop it in your saves folder and go.",
              },
            ].map((feature, i) => (
              <div key={i} className="text-center p-6">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-[#5B8C3E]/10 text-[#5B8C3E] mb-4">
                  <feature.icon className="h-7 w-7" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-4">Simple Pricing</h2>
          <p className="text-center text-gray-600 mb-12">Pay per world based on area size. No subscriptions.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {[
              { name: "Small", area: "< 1 km\u00B2", price: "$2", desc: "Neighborhoods & landmarks" },
              { name: "Medium", area: "1-5 km\u00B2", price: "$5", desc: "Districts & small towns" },
              { name: "Large", area: "5-25 km\u00B2", price: "$10", desc: "Cities & large areas" },
              { name: "XL", area: "25-100 km\u00B2", price: "$15", desc: "Metro areas & regions" },
            ].map((tier, i) => (
              <div key={i} className="bg-[#F5F5F0] rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="text-sm font-medium text-[#5B8C3E] mb-1">{tier.name}</div>
                <div className="text-3xl font-bold mb-1">{tier.price}</div>
                <div className="text-sm text-gray-500 mb-3">{tier.area}</div>
                <div className="text-xs text-gray-400">{tier.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-24 text-white overflow-hidden">
        {/* Background image with overlay */}
        <div className="absolute inset-0">
          <Image
            src="/showcase/hero.jpg"
            alt=""
            fill
            className="object-cover"
            style={{ objectPosition: "center 70%" }}
          />
          <div className="absolute inset-0 bg-[#3B3B3B]/85" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Build Your World?</h2>
          <p className="text-gray-300 mb-8 max-w-xl mx-auto text-lg">
            Pick any place on Earth and turn it into a Minecraft masterpiece in minutes.
          </p>
          <Link
            href="/create"
            className="inline-block bg-[#5B8C3E] text-white px-10 py-4 rounded-lg text-lg font-semibold hover:bg-[#4A7332] transition-colors shadow-lg"
          >
            Start Creating
          </Link>
        </div>
      </section>
    </div>
  );
}
