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

  let body: {
    email?: unknown;
    fullName?: unknown;
    telegram?: unknown;
    role?: unknown;
    password?: unknown;
    teamId?: unknown;
    newTeamName?: unknown;
  };
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
  const teamId = typeof body.teamId === "string" && body.teamId ? body.teamId : null;
  const newTeamName = typeof body.newTeamName === "string" ? body.newTeamName.trim() : "";

  if (!email || !fullName || !password) {
    return NextResponse.json({ error: "Заповніть email, ім'я та пароль." }, { status: 400 });
  }
  if (!VALID_ROLES.includes(role as Role)) {
    return NextResponse.json({ error: "Оберіть коректну роль." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Пароль має містити щонайменше 8 символів." }, { status: 400 });
  }
  if (role === "manager" && !teamId) {
    return NextResponse.json({ error: "Для менеджера обов'язково оберіть команду." }, { status: 400 });
  }
  if (role === "lead" && teamId && newTeamName) {
    return NextResponse.json({ error: "Оберіть наявну команду або створіть нову — не обидва варіанти." }, { status: 400 });
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

  // A brand-new team for a lead being created right now: insert it first
  // (lead_id set once we know this profile is actually going to hold that
  // role — see below) so the profile update just below can point its
  // team_id at a real row in one pass instead of two.
  let resolvedTeamId = teamId;
  let resolvedTeamName: string | null = null;
  if (role === "lead" && newTeamName) {
    const { data: newTeam, error: teamError } = await supabase
      .from("teams")
      .insert({ name: newTeamName, lead_id: created.user.id })
      .select("id, name")
      .single();
    if (teamError || !newTeam) {
      // The auth user already exists at this point — leave it as a
      // teamless lead rather than failing the whole request; the admin
      // can create/assign a team for them afterwards from Структура.
      resolvedTeamId = null;
    } else {
      resolvedTeamId = newTeam.id;
      resolvedTeamName = newTeam.name;
    }
  }

  await supabase
    .from("profiles")
    .update({ role, telegram: telegram || null, full_name: fullName, team_id: resolvedTeamId })
    .eq("id", created.user.id);

  // A lead assigned to an *existing* teamless team (not the "create new
  // team" branch above, which already set lead_id on insert): point that
  // team's lead_id back at them.
  if (role === "lead" && teamId && !newTeamName) {
    await supabase.from("teams").update({ lead_id: created.user.id }).eq("id", teamId);
  }

  await logAudit(supabase, {
    actorId: current.userId,
    action: AUDIT_ACTIONS.USER_CREATED,
    entityType: "profile",
    entityId: created.user.id,
    entityLabel: fullName,
    newValue: `Роль: ${roleLabel(role)}`,
  });

  return NextResponse.json({ id: created.user.id, teamId: resolvedTeamId, teamName: resolvedTeamName });
}
