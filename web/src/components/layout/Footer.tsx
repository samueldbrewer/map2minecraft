export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Map2Minecraft. Built with{" "}
            <a href="https://github.com/louis-e/arnis" className="text-[#5B8C3E] hover:underline" target="_blank" rel="noopener noreferrer">
              arnis
            </a>
            .
          </div>
          <div className="text-sm text-gray-400">
            Not affiliated with Mojang or Microsoft.
          </div>
        </div>
      </div>
    </footer>
  );
}
