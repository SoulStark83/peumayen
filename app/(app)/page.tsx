import { AlertsSection } from "@/components/home/alerts-section";
import { FinanceWidget } from "@/components/home/finance-widget";
import { HealthWidget } from "@/components/home/health-widget";
import { HomeFab } from "@/components/home/home-fab";
import { RomaWidget } from "@/components/home/roma-widget";
import { TodayTimeline } from "@/components/home/today-timeline";
import { PresenceWidget } from "@/components/presence/presence-widget";
import { requireHouseholdContext } from "@/lib/auth";
import { todayISODateMadrid } from "@/lib/date";
import { computeAlerts } from "@/lib/alerts";
import { createClient } from "@/lib/supabase/server";
import type { Item, Presence } from "@/lib/types";

const HEALTH_MEMBERS = ["Cris"];
const ITEM_COLUMNS =
  "id, household_id, project_id, type, scope, title, description, data, due_at, completed_at, recurrence, created_by, assigned_to, created_at, updated_at";

export default async function HomePage() {
  const { household, members, currentMember } = await requireHouseholdContext();
  const supabase = await createClient();
  const today = todayISODateMadrid();

  const todayStart = new Date(`${today}T00:00:00`).toISOString();
  const todayEnd = new Date(`${today}T23:59:59`).toISOString();
  const showHealth = HEALTH_MEMBERS.includes(currentMember.display_name);
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const isAdmin = currentMember.role === "admin";

  const [
    presenceRes, todayItemsRes,
    lastWalkRes, nextVetRes, subsRes,
    periodRes, retainerRes, healthSettingsRes,
    overdueRes,
  ] = await Promise.all([
    supabase
      .from("presence")
      .select("id, household_id, member_id, date, status, notes, updated_by, updated_at")
      .eq("household_id", household.id)
      .eq("date", today),
    supabase
      .from("items")
      .select(ITEM_COLUMNS)
      .eq("household_id", household.id)
      .in("type", ["task", "event", "shopping"])
      .gte("due_at", todayStart)
      .lte("due_at", todayEnd)
      .is("completed_at", null)
      .order("due_at", { ascending: true })
      .limit(50),
    // Roma: último paseo
    supabase
      .from("items")
      .select("id, due_at, title, data, type, scope, household_id, project_id, description, completed_at, recurrence, created_by, assigned_to, created_at, updated_at")
      .eq("household_id", household.id)
      .eq("type", "walk")
      .order("due_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    // Roma: próxima cita vet
    supabase
      .from("items")
      .select("id, due_at, title, data, type, scope, household_id, project_id, description, completed_at, recurrence, created_by, assigned_to, created_at, updated_at")
      .eq("household_id", household.id)
      .eq("type", "vet_visit")
      .gte("due_at", new Date().toISOString())
      .order("due_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    // Finanzas: suscripciones (solo admins)
    isAdmin
      ? supabase
          .from("items")
          .select(ITEM_COLUMNS)
          .eq("household_id", household.id)
          .eq("type", "subscription")
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    // Health — solo para miembros habilitados
    showHealth
      ? supabase
          .from("items")
          .select(ITEM_COLUMNS)
          .eq("household_id", household.id)
          .eq("type", "period_day")
          .eq("scope", "personal")
          .eq("created_by", currentMember.id)
          .gte("due_at", twelveMonthsAgo.toISOString())
          .order("due_at", { ascending: false })
          .limit(500)
      : Promise.resolve({ data: [] }),
    showHealth
      ? supabase
          .from("items")
          .select(ITEM_COLUMNS)
          .eq("household_id", household.id)
          .eq("type", "retainer_change")
          .eq("scope", "personal")
          .eq("created_by", currentMember.id)
          .order("due_at", { ascending: false })
          .limit(50)
      : Promise.resolve({ data: [] }),
    showHealth
      ? supabase
          .from("items")
          .select(ITEM_COLUMNS)
          .eq("household_id", household.id)
          .eq("type", "health_settings")
          .eq("scope", "personal")
          .eq("created_by", currentMember.id)
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    // Tareas vencidas (no completadas, due_at pasado)
    supabase
      .from("items")
      .select(ITEM_COLUMNS)
      .eq("household_id", household.id)
      .in("type", ["task", "event"])
      .lt("due_at", todayStart)
      .is("completed_at", null)
      .order("due_at", { ascending: false })
      .limit(10),
  ]);

  const initialPresence  = (presenceRes.data as Presence[] | null) ?? [];
  const initialItems     = (todayItemsRes.data as Item[] | null) ?? [];
  const lastWalk         = (lastWalkRes.data as Item | null) ?? null;
  const nextVet          = (nextVetRes.data as Item | null) ?? null;
  const subs             = (subsRes.data as Item[] | null) ?? [];
  const periodItems      = (periodRes.data as Item[] | null) ?? [];
  const retainerItems    = (retainerRes.data as Item[] | null) ?? [];
  const healthSettingsItem = (healthSettingsRes.data as Item | null) ?? null;
  const overdueTasks     = (overdueRes.data as Item[] | null) ?? [];

  const alerts = computeAlerts({ subs, lastWalk, nextVet, overdueTasks, isAdmin });


  return (
    <div className="flex h-full flex-col overflow-y-auto pb-32">

      {/* ── CABECERA — quién eres + qué día es ── */}
      <header className="px-5 pt-5 pb-4">
        <p className="text-muted-foreground text-sm font-medium">{dateHeadline()}</p>
        <h1 className="mt-0.5 text-2xl font-black tracking-tight">
          {timeOfDayGreeting()}{" "}
          <span className="text-primary">{currentMember.display_name.split(" ")[0]}</span>{" "}
          {timeOfDayEmoji()}
        </h1>
      </header>

      {/* ── AVISOS — alertas rule-based ── */}
      <AlertsSection alerts={alerts} />

      {/* ── PRESENCIA — quién está en casa ── */}
      <section aria-label="Quién está en casa" className="px-5 pb-5">
        <p className="section-label mb-3">¿Quién está?</p>
        <PresenceWidget date={today} initial={initialPresence} />
      </section>

      {/* ── PANEL DEL DÍA — todo lo de hoy, con acciones inline ── */}
      <section aria-label="Panel del día" className="px-5">
        <p className="section-label mb-3">Hoy</p>
        <TodayTimeline initial={initialItems} />
      </section>

      {/* ── SALUD — solo Cris ── */}
      {showHealth && (
        <section aria-label="Salud" className="px-5 pt-7">
          <p className="section-label mb-3">Tu salud</p>
          <HealthWidget
            periodItems={periodItems}
            retainerItems={retainerItems}
            settingsItem={healthSettingsItem}
            memberId={currentMember.id}
          />
        </section>
      )}

      {/* ── ACCESOS RÁPIDOS — Roma + Finanzas ── */}
      <section aria-label="Más" className="flex flex-col gap-2 px-5 pt-7">
        <RomaWidget lastWalk={lastWalk} nextVet={nextVet} />
        {isAdmin && <FinanceWidget subs={subs} />}
      </section>

      {/* FAB persistente */}
      <HomeFab />

    </div>
  );
}

const WEEKDAYS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];
const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

function dateHeadline(): string {
  const d = new Date();
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
}

function timeOfDayGreeting(): string {
  const h = new Date().getHours();
  if (h < 6)  return "Buenas noches,";
  if (h < 13) return "Buenos días,";
  if (h < 20) return "Buenas tardes,";
  return "Buenas noches,";
}

function timeOfDayEmoji(): string {
  const h = new Date().getHours();
  if (h < 6)  return "🌙";
  if (h < 13) return "☀️";
  if (h < 20) return "🌤️";
  return "🌙";
}
