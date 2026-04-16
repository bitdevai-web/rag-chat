"use client";
import Image from "next/image";

type Props = {
  username: string;
  avatar_url?: string | null;
  size?: number;
  className?: string;
};

const COLORS = [
  "from-cyan-500 to-blue-500",
  "from-violet-500 to-purple-500",
  "from-emerald-500 to-teal-500",
  "from-orange-500 to-amber-500",
  "from-pink-500 to-rose-500",
  "from-indigo-500 to-blue-600",
];

function colorFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

export function UserAvatar({ username, avatar_url, size = 32, className = "" }: Props) {
  if (avatar_url) {
    return (
      <Image
        src={avatar_url}
        alt={username}
        width={size}
        height={size}
        className={`rounded-full object-cover flex-shrink-0 ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={`rounded-full bg-gradient-to-br ${colorFor(username)} flex items-center justify-center flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <span className="text-white font-bold" style={{ fontSize: size * 0.38 }}>
        {username.slice(0, 1).toUpperCase()}
      </span>
    </div>
  );
}
