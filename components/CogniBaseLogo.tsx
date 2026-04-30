"use client";

type Props = {
  height?: number;
  variant?: "light" | "dark"; // light = dark wordmark, dark = white wordmark
};

export function CogniBaseLogo({ height = 36, variant = "light" }: Props) {
  const iconW = Math.round(height * (220 / 52));
  const wordmarkFill = variant === "dark" ? "#f1f5f9" : "#1e293b";
  const taglineFill  = variant === "dark" ? "#64748b" : "#94a3b8";

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 220 52"
      fill="none"
      width={iconW}
      height={height}
      aria-label="CogniBase"
      role="img"
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient id="cb-ig" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
        <linearGradient id="cb-dg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#818cf8" />
        </linearGradient>
        <linearGradient id="cb-tg" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
      </defs>

      {/* Hex ring */}
      <path d="M26 4 L44 14 L44 34 L26 44 L8 34 L8 14 Z"
        stroke="url(#cb-ig)" strokeWidth="2.5" strokeLinejoin="round" fill="none" />
      {/* Inner glow */}
      <path d="M26 10 L38 17 L38 31 L26 38 L14 31 L14 17 Z"
        fill="url(#cb-ig)" fillOpacity="0.1" />
      {/* Centre node */}
      <circle cx="26" cy="24" r="3.5" fill="url(#cb-ig)" />

      {/* Spokes */}
      <line x1="26" y1="24" x2="26"   y2="13"   stroke="url(#cb-ig)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="26" y1="24" x2="26"   y2="35"   stroke="url(#cb-ig)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="26" y1="24" x2="35"   y2="18.5" stroke="url(#cb-ig)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="26" y1="24" x2="35"   y2="29.5" stroke="url(#cb-ig)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="26" y1="24" x2="17"   y2="18.5" stroke="url(#cb-ig)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="26" y1="24" x2="17"   y2="29.5" stroke="url(#cb-ig)" strokeWidth="1.5" strokeLinecap="round" />

      {/* Outer nodes */}
      <circle cx="26"   cy="12"   r="2" fill="url(#cb-dg)" />
      <circle cx="26"   cy="36"   r="2" fill="url(#cb-dg)" />
      <circle cx="36.5" cy="17.5" r="2" fill="url(#cb-dg)" />
      <circle cx="36.5" cy="30.5" r="2" fill="url(#cb-dg)" />
      <circle cx="15.5" cy="17.5" r="2" fill="url(#cb-dg)" />
      <circle cx="15.5" cy="30.5" r="2" fill="url(#cb-dg)" />

      {/* "Cogni" wordmark */}
      <text x="58" y="32"
        fontFamily="'Inter','SF Pro Display',-apple-system,BlinkMacSystemFont,sans-serif"
        fontSize="22" fontWeight="600" letterSpacing="-0.5"
        fill={wordmarkFill}>Cogni</text>

      {/* "Base" gradient */}
      <text x="114" y="32"
        fontFamily="'Inter','SF Pro Display',-apple-system,BlinkMacSystemFont,sans-serif"
        fontSize="22" fontWeight="700" letterSpacing="-0.5"
        fill="url(#cb-tg)">Base</text>

      {/* Tagline */}
      <text x="59" y="44"
        fontFamily="'Inter','SF Pro Display',-apple-system,BlinkMacSystemFont,sans-serif"
        fontSize="8.5" fontWeight="400" letterSpacing="1.8"
        fill={taglineFill}>KNOWLEDGE · AI</text>
    </svg>
  );
}
