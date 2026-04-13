export function CogniBaseLogo({ size = 32 }: { size?: number }) {
  const id = "cbgrad";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22D3EE" />
          <stop offset="1" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
      {/* Crescent moon shape: large circle minus offset smaller circle */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M50 4a46 46 0 1 1 0 92A28 28 0 1 0 50 4z"
        fill={`url(#${id})`}
      />
      {/* WiFi-style concentric arcs */}
      <path
        d="M46 50 A14 14 0 0 1 60 50"
        stroke="white"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M46 50 A24 24 0 0 1 70 50"
        stroke="white"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
        opacity="0.75"
      />
      <path
        d="M46 50 A35 35 0 0 1 81 50"
        stroke="white"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
        opacity="0.5"
      />
    </svg>
  );
}
