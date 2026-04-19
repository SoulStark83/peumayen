import { AgendaView } from "@/components/agenda/agenda-view";
import { requireHouseholdContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Item } from "@/lib/types";

export const metadata = {
  title: "Agenda",
};

const ITEM_COLUMNS =
  "id, household_id, project_id, type, scope, title, description, data, due_at, completed_at, recurrence, created_by, assigned_to, created_at, updated_at";

export default async function AgendaPage() {
  const { household } = await requireHouseholdContext();
  const supabase = await createClient();

  // Window: ~14 days back (to catch overdue + recent completions) to ~90 days ahead.
  const now = new Date();
  const from = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const to = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();

  const [datedRes, undatedRes] = await Promise.all([
    supabase
      .from("items")
      .select(ITEM_COLUMNS)
      .eq("household_id", household.id)
      .in("type", ["task", "event", "shopping"])
      .gte("due_at", from)
      .lte("due_at", to)
      .order("due_at", { ascending: true })
      .limit(500),
    supabase
      .from("items")
      .select(ITEM_COLUMNS)
      .eq("household_id", household.id)
      .in("type", ["task", "shopping"])
      .is("due_at", null)
      .is("completed_at", null)
      .order("created_at", { ascending: false })
      .limit(300),
  ]);

  const initial = [
    ...((datedRes.data as Item[] | null) ?? []),
    ...((undatedRes.data as Item[] | null) ?? []),
  ];

  return <AgendaView initial={initial} />;
}
