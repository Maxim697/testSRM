import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AUDIT_ACTIONS, logAudit } from "@/lib/audit-log";
import { roleLabel, type Role } from "@/lib/roles";

const VALID_ROLES: Role[] = ["manager", "lead", "admin"];

export async function POST(request: Request) {
  const current = await getCurrentProfile();
  if (!current) {
    return NextResponse.json({ error: "Потрібно увійти в систему." }, { status: 401 });
  }
  if (current.profile.role !== "admin") {
    return NextResponse.json({ error: "Створювати користувачів може лише адміністратор." }, { status: 403 });
  }

  let body: { email?: unknown; fullName?: unknown; telegram?: unknown; role?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некоректний запит." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
  const telegram = typeof body.telegram === "string" ? body.telegram.trim() : "";
  const role = typeof body.role === "string" ? body.role : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !fullName || !password) {
    return NextResponse.json({ error: "Заповніть email, ім'я та пароль." }, { status: 400 });
  }
  if (!VALID_ROLES.includes(role as Role)) {
    return NextResponse.json({ error: "Оберіть коректну роль." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Пароль має містити щонайменше 8 символів." }, { status: 400 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json(
      { error: "Сервіс створення користувачів не налаштовано. Зверніться до адміністратора." },
      { status: 500 },
    );
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (createError || !created.user) {
    const message = createError?.message?.toLowerCase().includes("already")
      ? "Користувач з такою поштою вже існує."
      : "Не вдалося створити користувача. Спробуйте ще раз.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({ role, telegram: telegram || null, full_name: fullName })
    .eq("id", created.user.id);

  await logAudit(supabase, {
    actorId: current.userId,
    action: AUDIT_ACTIONS.USER_CREATED,
    entityType: "profile",
    entityId: created.user.id,
    entityLabel: fullName,
    newValue: `Роль: ${roleLabel(role)}`,
  });

  return NextResponse.json({ id: created.user.id });
}
