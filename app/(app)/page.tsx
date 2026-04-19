import { HousePulse } from "@/components/home/house-pulse";
import { TodayTimeline } from "@/components/home/today-timeline";
import { PresenceWidget } from "@/components/presence/presence-widget";
import { requireHouseholdContext } from "@/lib/auth";
import { dayKeyMadrid, todayISODateMadrid } from "@/lib/date";
import { createClient } from "@/lib/supabase/server";
import type { EventData, Item, Presence } from "@/lib/types";

export default async function HomePage() {
  const { household, members } = await requireHouseholdContext();
  const supabase = await createClient();
  const today = todayISODateMadrid();

  const todayStart = new Date(`${today}T00:00:00`).toISOString();
  const todayEnd = new Date(`${today}T23:59:59`).toISOString();

  const [presenceRes, todayItemsRes, pendingTasksRes, shoppingRes, nextEventRes] =
    await Promise.all([
      supabase
        .from("presence")
        .select("id, household_id, member_id, date, status, notes, updated_by, updated_at")
        .eq("household_id", household.id)
        .eq("date", today),
      supabase
        .from("items")
        .select(
          "id, household_id, project_id, type, scope, title, description, data, due_at, completed_at, recurrence, created_by, assigned_to, created_at, updated_at",
        )
        .eq("household_id", household.id)
        .in("type", ["task", "event", "shopping"])
        .gte("due_at", todayStart)
        .lte("due_at", todayEnd)
        .is("completed_at", null)
        .order("due_at", { ascending: true })
        .limit(50),
      supabase
        .from("items")
        .select("id")
        .eq("household_id", household.id)
        .eq("type", "task")
        .is("completed_at", null),
      supabase
        .from("items")
        .select("id")
        .eq("household_id", household.id)
        .eq("type", "shopping")
        .is("completed_at", null),
      supabase
        .from("items")
        .select("data, due_at")
        .eq("household_id", household.id)
        .eq("type", "event")
        .gte("due_at", new Date().toISOString())
        .order("due_at", { ascending: true })
        .limit(1),
    ]);

  const initialPresence = (presenceRes.data as Presence[] | null) ?? [];
  const initialItems = (todayItemsRes.data as Item[] | null) ?? [];

  const tasksPending = pendingTasksRes.data?.length ?? 0;
  const shoppingOpen = shoppingRes.data?.length ?? 0;

  const nextEventRow = (nextEventRes.data as { data: EventData; due_at: string | null }[] | null)?.[0];
  const nextEventIso = nextEventRow?.data?.start_at ?? nextEventRow?.due_at ?? null;
  const nextEventTime = (() => {
    if (!nextEventIso) return null;
    const iso = nextEventIso;
    if (dayKeyMadrid(iso) === today) return iso.slice(11, 16);
    return null;
  })();

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto px-4 pt-5 pb-8 sm:px-6">
      <header className="flex flex-col gap-0.5">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {dateHeadline()}
        </h1>
        <p className="text-muted-foreground text-sm">{timeOfDayContext()}</p>
      </header>

      <PresenceWidget date={today} initial={initialPresence} />

      <section aria-label="Hoy" className="flex flex-col gap-2">
        <TodayTimeline initial={initialItems} members={members} />
        <HousePulse
          shoppingOpen={shoppingOpen}
          tasksPending={tasksPending}
          nextEventTime={nextEventTime}
        />
      </section>
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
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
}

function timeOfDayContext(): string {
  const hour = new Date().getHours();
  if (hour < 6) return "Madrugada";
  if (hour < 13) return "Mañana";
  if (hour < 18) return "Tarde";
  return "Noche";
}
