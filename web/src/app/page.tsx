import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { MapPin, Box, Download, Eye } from "lucide-react";

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#F5F5F0] to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="text-center max-w-3xl mx-auto">
            <div className="flex justify-center mb-6">
              <Logo className="h-16 w-16" />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-[#3B3B3B] mb-6">
              Turn Any Place on Earth Into a{" "}
              <span className="text-[#5B8C3E]">Minecraft World</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-600 mb-8">
              Select a real-world location, generate a detailed Minecraft map, preview it in 3D,
              and download it ready to play. Powered by OpenStreetMap data.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/create"
                className="bg-[#5B8C3E] text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-[#4A7332] transition-colors shadow-lg shadow-green-900/20"
              >
                Create Your World
              </Link>
              <a
                href="#features"
                className="border-2 border-[#3B3B3B] text-[#3B3B3B] px-8 py-3 rounded-lg text-lg font-semibold hover:bg-[#3B3B3B] hover:text-white transition-colors"
              >
                Learn More
              </a>
            </div>
          </div>
        </div>
        {/* Decorative grid */}
        <div className="absolute inset-0 -z-10 opacity-[0.03]" style={{
          backgroundImage: 'repeating-linear-gradient(0deg, #3B3B3B 0 1px, transparent 1px 32px), repeating-linear-gradient(90deg, #3B3B3B 0 1px, transparent 1px 32px)',
        }} />
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-white">
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
      <section className="py-20 bg-[#F5F5F0]">
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
              <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
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
      <section className="py-20 bg-[#3B3B3B] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Build Your World?</h2>
          <p className="text-gray-300 mb-8 max-w-xl mx-auto">
            Pick any place on Earth and turn it into a Minecraft masterpiece in minutes.
          </p>
          <Link
            href="/create"
            className="inline-block bg-[#5B8C3E] text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-[#4A7332] transition-colors"
          >
            Start Creating
          </Link>
        </div>
      </section>
    </div>
  );
}
