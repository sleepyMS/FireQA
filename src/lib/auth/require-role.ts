import { UserRole } from "@/types/enums";

const ROLE_RANK: Record<string, number> = {
  [UserRole.OWNER]: 3,
  [UserRole.ADMIN]: 2,
  [UserRole.MEMBER]: 1,
};

export function hasRole(userRole: string, minRole: string): boolean {
  return (ROLE_RANK[userRole] ?? 0) >= (ROLE_RANK[minRole] ?? 0);
}

export function requireRole(
  userRole: string,
  minRole: string
): { error: string; status: number } | null {
  if (!hasRole(userRole, minRole)) {
    return { error: "권한이 없습니다.", status: 403 };
  }
  return null;
}
