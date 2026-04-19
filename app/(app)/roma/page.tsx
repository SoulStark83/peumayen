import { RomaView } from "@/components/roma/roma-view";
import { requireHouseholdContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Item } from "@/lib/types";

export const metadata = {
  title: "Roma",
};

const ITEM_COLUMNS =
  "id, household_id, project_id, type, scope, title, description, data, due_at, completed_at, recurrence, created_by, assigned_to, created_at, updated_at";

export default async function RomaPage() {
  const { household } = await requireHouseholdContext();
  const supabase = await createClient();

  const now = new Date();
  const walksFrom = new Date(
    now.getUTCFullYear(),
    now.getUTCMonth() - 2,
    1,
  ).toISOString();

  const [walksRes, weightsRes, vetRes] = await Promise.all([
    supabase
      .from("items")
      .select(ITEM_COLUMNS)
      .eq("household_id", household.id)
      .eq("type", "walk")
      .gte("due_at", walksFrom)
      .order("due_at", { ascending: false })
      .limit(500),
    supabase
      .from("items")
      .select(ITEM_COLUMNS)
      .eq("household_id", household.id)
      .eq("type", "weight")
      .order("due_at", { ascending: false })
      .limit(200),
    supabase
      .from("items")
      .select(ITEM_COLUMNS)
      .eq("household_id", household.id)
      .eq("type", "vet_visit")
      .order("due_at", { ascending: false })
      .limit(200),
  ]);

  return (
    <RomaView
      initialWalks={(walksRes.data as Item[] | null) ?? []}
      initialWeights={(weightsRes.data as Item[] | null) ?? []}
      initialVet={(vetRes.data as Item[] | null) ?? []}
    />
  );
}
