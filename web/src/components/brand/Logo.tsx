export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Map pin base */}
      <path
        d="M32 4C21.5 4 13 12.5 13 23c0 14 19 37 19 37s19-23 19-37C51 12.5 42.5 4 32 4z"
        fill="#5B8C3E"
        opacity="0.9"
      />
      {/* Minecraft cube inside pin */}
      <g transform="translate(22, 13)">
        {/* Top face */}
        <path d="M10 0L20 5L10 10L0 5Z" fill="#6BA644" />
        {/* Left face */}
        <path d="M0 5L10 10L10 20L0 15Z" fill="#4A7332" />
        {/* Right face */}
        <path d="M20 5L10 10L10 20L20 15Z" fill="#5B8C3E" />
        {/* Grid lines on top */}
        <path d="M5 2.5L15 7.5" stroke="#4A7332" strokeWidth="0.5" opacity="0.5" />
        <path d="M10 0L10 10" stroke="#4A7332" strokeWidth="0.5" opacity="0.3" />
      </g>
    </svg>
  );
}
