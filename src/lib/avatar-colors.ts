const AVATAR_COLORS = [
  "bg-indigo-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-sky-500",
] as const;

export function getAvatarColor(name: string): string {
  return AVATAR_COLORS[((name?.charCodeAt(0)) || 0) % AVATAR_COLORS.length];
}
