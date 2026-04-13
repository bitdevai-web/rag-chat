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
        {/* 4 concentric stroke arcs — white variant */}
        <path d="M22 88 A52 52 0 1 0 22 12" stroke="white" strokeWidth="9" strokeLinecap="round" fill="none" opacity="1" />
        <path d="M34 78 A37 37 0 1 0 34 22" stroke="white" strokeWidth="9" strokeLinecap="round" fill="none" opacity="0.8" />
        <path d="M44 68 A24 24 0 1 0 44 32" stroke="white" strokeWidth="9" strokeLinecap="round" fill="none" opacity="0.65" />
        <path d="M52 61 A13 13 0 1 0 52 39" stroke="white" strokeWidth="9" strokeLinecap="round" fill="none" opacity="0.5" />
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <defs>
        <linearGradient id={id} x1="0" y1="50" x2="65" y2="50" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00CFFF" />
          <stop offset="1" stopColor="#6060EE" />
        </linearGradient>
      </defs>
      {/* 4 concentric stroke arcs — large-arc flag=1, sweep=0 (counterclockwise open-right C-shape) */}
      <path d="M22 88 A52 52 0 1 0 22 12" stroke={`url(#${id})`} strokeWidth="9" strokeLinecap="round" fill="none" />
      <path d="M34 78 A37 37 0 1 0 34 22" stroke={`url(#${id})`} strokeWidth="9" strokeLinecap="round" fill="none" />
      <path d="M44 68 A24 24 0 1 0 44 32" stroke={`url(#${id})`} strokeWidth="9" strokeLinecap="round" fill="none" />
      <path d="M52 61 A13 13 0 1 0 52 39" stroke={`url(#${id})`} strokeWidth="9" strokeLinecap="round" fill="none" />
    </svg>
  );
}
