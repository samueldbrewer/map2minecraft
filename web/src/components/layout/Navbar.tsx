import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

export function Navbar() {
  return (
    <nav className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link href="/" className="flex items-center gap-2">
            <Logo className="h-8 w-8" />
            <span className="font-bold text-xl text-[#3B3B3B]">Map2Minecraft</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/create" className="text-sm font-medium text-gray-600 hover:text-[#5B8C3E] transition-colors">
              Create
            </Link>
            <Link
              href="/create"
              className="bg-[#5B8C3E] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#4A7332] transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
