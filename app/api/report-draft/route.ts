import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";
import { buildReportDraftContext } from "@/lib/report-draft-context";
import { AUDIT_ACTIONS, logAudit } from "@/lib/audit-log";
import { formatDate } from "@/lib/format";
import type { WeeklyReport, WeeklyReportRow } from "@/lib/types";
import type { ReportDraftResponse } from "@/lib/report-draft-types";

const ANTHROPIC_MODEL = "claude-sonnet-4-6";

const SYSTEM_PROMPT = `Ти — аналітик, який допомагає менеджеру заповнити тижневий звіт по роботі з портфелем трейдерів у P2P-платіжній компанії.
На основі наданих цифр і динаміки пропонуй вірогідні причини зростання та падіння показників.
Пиши українською, коротко, по-діловому, без води — 1-2 речення на пункт.
Не вигадуй фактів, яких немає в наданих даних: якщо причина зміни показника не очевидна з цифр, так і напиши, що причина потребує уточнення від менеджера.
Відповідай ЛИШЕ у форматі JSON, без пояснень, без обгортки у markdown-блоки (без \`\`\`), без жодного тексту до чи після JSON-об'єкта.`;

function buildUserPrompt(context: unknown, metricKeys: string[]): string {
  return `Дані для тижневого звіту менеджера:

${JSON.stringify(context, null, 2)}

Сформуй чернетку звіту у форматі JSON рівно такої форми:
{
  "comments": { "<metric_key>": "текст причини" },
  "work_done": "текст",
  "blockers": "текст",
  "next_week_plan": "текст"
}

У полі "comments" дай по одному короткому коментарю для кожного з таких metric_key: ${metricKeys.join(", ")}.
"work_done" — короткий підсумок того, що видно з даних як зроблену роботу за тиждень.
"blockers" — проблеми/блокери, які випливають з даних (прострочені завдання, трейдери без контакту, падіння показників); якщо явних блокерів не видно, напиши, що явних блокерів за даними не виявлено.
"next_week_plan" — короткий план на наступний тиждень, що випливає з виявлених проблем.
Не додавай жодних полів, окрім перелічених. Значення — прості рядки, без вкладених об'єктів чи списків.`;
}

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1]!.trim() : trimmed;
}

function isValidDraft(value: unknown): value is ReportDraftResponse {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (typeof v.work_done !== "string" || typeof v.blockers !== "string" || typeof v.next_week_plan !== "string") {
    return false;
  }
  if (!v.comments || typeof v.comments !== "object" || Array.isArray(v.comments)) return false;
  return Object.values(v.comments as Record<string, unknown>).every((c) => typeof c === "string");
}

export async function POST(request: Request) {
  const current = await getCurrentProfile();
  if (!current) {
    return NextResponse.json({ error: "Потрібно увійти в систему." }, { status: 401 });
  }

  let body: { report_id?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некоректний запит." }, { status: 400 });
  }

  const reportId = typeof body.report_id === "string" ? body.report_id : null;
  if (!reportId) {
    return NextResponse.json({ error: "Не вказано report_id." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: reportRow } = await supabase.from("weekly_reports").select("*").eq("id", reportId).maybeSingle();
  const report = reportRow as WeeklyReport | null;

  if (!report || report.author_id !== current.userId) {
    return NextResponse.json({ error: "Звіт не знайдено або немає доступу до нього." }, { status: 403 });
  }
  if (report.status !== "draft" && report.status !== "returned") {
    return NextResponse.json(
      { error: "Чернетку можна згенерувати лише для звіту у статусі «Чернетка» або «Повернено на доопрацювання»." },
      { status: 409 },
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Сервіс генерації тимчасово недоступний. Зверніться до адміністратора." }, { status: 500 });
  }

  const { data: rowsData } = await supabase.from("weekly_report_rows").select("*").eq("report_id", reportId);
  const rows = (rowsData ?? []) as WeeklyReportRow[];

  const context = await buildReportDraftContext(current.userId, report, rows);
  const metricKeys = context.metrics.map((m) => m.metric_key);
  const userPrompt = buildUserPrompt(context, metricKeys);

  let anthropicRes: Response;
  try {
    anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });
  } catch {
    return NextResponse.json(
      { error: "Не вдалося з'єднатися із сервісом генерації. Перевірте з'єднання і спробуйте ще раз." },
      { status: 502 },
    );
  }

  if (anthropicRes.status === 429) {
    return NextResponse.json(
      { error: "Перевищено ліміт запитів до Claude. Спробуйте через кілька хвилин." },
      { status: 429 },
    );
  }
  if (!anthropicRes.ok) {
    return NextResponse.json(
      { error: "Сервіс генерації повернув помилку. Спробуйте пізніше." },
      { status: 502 },
    );
  }

  let payload: { content?: { type: string; text?: string }[] };
  try {
    payload = await anthropicRes.json();
  } catch {
    return NextResponse.json({ error: "Не вдалося обробити відповідь сервісу генерації." }, { status: 502 });
  }

  const text = payload.content?.find((block) => block.type === "text")?.text?.trim();
  if (!text) {
    return NextResponse.json({ error: "Сервіс генерації повернув порожню відповідь." }, { status: 502 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFence(text));
  } catch {
    return NextResponse.json({ error: "Не вдалося розпізнати відповідь сервісу генерації як JSON." }, { status: 502 });
  }

  if (!isValidDraft(parsed)) {
    return NextResponse.json({ error: "Відповідь сервісу генерації має неочікуваний формат." }, { status: 502 });
  }

  await logAudit(supabase, {
    actorId: current.userId,
    action: AUDIT_ACTIONS.DRAFT_GENERATED,
    entityType: "report",
    entityId: report.id,
    entityLabel: `Тижневий звіт за ${formatDate(report.week_start)}`,
  });

  return NextResponse.json(parsed satisfies ReportDraftResponse);
}
