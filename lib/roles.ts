export type Role = "manager" | "lead" | "admin";

export const ROLE_LABELS: Record<Role, string> = {
  manager: "Менеджер",
  lead: "Керівник відділу",
  admin: "Адміністратор",
};

export function roleLabel(role: string | null | undefined): string {
  return ROLE_LABELS[role as Role] ?? "Користувач";
}

export function getInitials(fullName: string | null | undefined): string {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 1).toUpperCase();
  return (parts[0]!.slice(0, 1) + parts[1]!.slice(0, 1)).toUpperCase();
}
