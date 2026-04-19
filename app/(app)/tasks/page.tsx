import { TasksView } from "@/components/tasks/tasks-view";
import { requireHouseholdContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Item } from "@/lib/types";

export const metadata = {
  title: "Tareas",
};

const ITEM_COLUMNS =
  "id, household_id, project_id, type, scope, title, description, data, due_at, completed_at, recurrence, created_by, assigned_to, created_at, updated_at";

export default async function TasksPage() {
  const { household } = await requireHouseholdContext();
  const supabase = await createClient();

  const [tasksRes, notesRes] = await Promise.all([
    supabase
      .from("items")
      .select(ITEM_COLUMNS)
      .eq("household_id", household.id)
      .eq("type", "task")
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("items")
      .select(ITEM_COLUMNS)
      .eq("household_id", household.id)
      .eq("type", "note")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const initialTasks = (tasksRes.data as Item[] | null) ?? [];
  const initialNotes = (notesRes.data as Item[] | null) ?? [];

  return <TasksView initialTasks={initialTasks} initialNotes={initialNotes} />;
}
