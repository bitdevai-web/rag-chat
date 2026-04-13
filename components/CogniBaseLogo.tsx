let _counter = 0;

export function CogniBaseLogo({
  size = 32,
  variant = "color", // "color" | "white"
}: {
  size?: number;
  variant?: "color" | "white";
}) {
  // Unique ID per render to avoid SVG gradient conflicts when multiple logos on page
  const id = `cbg-${++_counter}`;

  if (variant === "white") {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M50 4a46 46 0 1 1 0 92A28 28 0 1 0 50 4z"
          fill="white"
          opacity="0.95"
        />
        <path d="M46 50 A14 14 0 0 1 60 50" stroke="white" strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.4"/>
        <path d="M46 50 A24 24 0 0 1 70 50" stroke="white" strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.3"/>
        <path d="M46 50 A35 35 0 0 1 81 50" stroke="white" strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.2"/>
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22D3EE" />
          <stop offset="1" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
      {/* Crescent moon */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M50 4a46 46 0 1 1 0 92A28 28 0 1 0 50 4z"
        fill={`url(#${id})`}
      />
      {/* WiFi-style arcs */}
      <path d="M46 50 A14 14 0 0 1 60 50" stroke="white" strokeWidth="6" strokeLinecap="round" fill="none" />
      <path d="M46 50 A24 24 0 0 1 70 50" stroke="white" strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.75" />
      <path d="M46 50 A35 35 0 0 1 81 50" stroke="white" strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.5" />
    </svg>
  );
}
