import { CalendarView } from "@/components/calendar/calendar-view";
import { requireHouseholdContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Item } from "@/lib/types";

export const metadata = {
  title: "Calendario",
};

export default async function CalendarPage() {
  const { household } = await requireHouseholdContext();
  const supabase = await createClient();

  const now = new Date();
  const from = new Date(now.getUTCFullYear(), now.getUTCMonth() - 2, 1).toISOString();
  const to = new Date(now.getUTCFullYear(), now.getUTCMonth() + 3, 0).toISOString();

  const [eventsRes, schoolRes] = await Promise.all([
    supabase
      .from("items")
      .select(
        "id, household_id, project_id, type, scope, title, description, data, due_at, completed_at, recurrence, created_by, assigned_to, created_at, updated_at",
      )
      .eq("household_id", household.id)
      .eq("type", "event")
      .gte("due_at", from)
      .lte("due_at", to)
      .order("due_at", { ascending: true }),
    supabase
      .from("school_calendar")
      .select("date, type, description")
      .neq("type", "school_day")
      .gte("date", from.slice(0, 10))
      .lte("date", to.slice(0, 10)),
  ]);

  const initialEvents = ((eventsRes.data as Item[] | null) ?? []);
  const schoolRows =
    (schoolRes.data as {
      date: string;
      type: "holiday" | "weekend" | "vacation" | "school_day";
      description: string | null;
    }[] | null) ?? [];
  const schoolEntries = schoolRows.map((r) => ({
    date: r.date,
    label: r.description ?? schoolTypeLabel(r.type),
  }));

  return <CalendarView initialEvents={initialEvents} schoolEntries={schoolEntries} />;
}

function schoolTypeLabel(type: "holiday" | "weekend" | "vacation" | "school_day"): string {
  if (type === "holiday") return "Festivo";
  if (type === "vacation") return "Vacaciones";
  if (type === "weekend") return "Fin de semana";
  return "Lectivo";
}
