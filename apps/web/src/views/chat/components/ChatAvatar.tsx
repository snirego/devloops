import { twMerge } from "tailwind-merge";

/**
 * Deterministic colour palette for chat avatars.
 * Each sender gets a consistent colour based on their name hash.
 */
const AVATAR_COLORS = [
  "bg-indigo-600",
  "bg-rose-500",
  "bg-emerald-600",
  "bg-amber-500",
  "bg-cyan-600",
  "bg-violet-600",
  "bg-pink-500",
  "bg-teal-600",
  "bg-orange-500",
  "bg-sky-600",
];

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (
      (parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")
    ).toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase();
}

interface ChatAvatarProps {
  name: string | null | undefined;
  size?: "xs" | "sm" | "md";
  className?: string;
}

const SIZE_CLASSES = {
  xs: "h-5 w-5 text-[8px]",
  sm: "h-6 w-6 text-[9px]",
  md: "h-7 w-7 text-[10px]",
} as const;

export default function ChatAvatar({
  name,
  size = "sm",
  className,
}: ChatAvatarProps) {
  const displayName = name || "?";
  const initials = getInitials(displayName);
  const colorIdx = hashName(displayName) % AVATAR_COLORS.length;
  const bgColor = AVATAR_COLORS[colorIdx]!;

  return (
    <span
      className={twMerge(
        "inline-flex flex-shrink-0 items-center justify-center rounded-full font-semibold leading-none text-white",
        SIZE_CLASSES[size],
        bgColor,
        className,
      )}
      title={displayName}
    >
      {initials}
    </span>
  );
}
