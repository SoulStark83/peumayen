import { ProvisionsView } from "@/components/provisions/provisions-view";
import { requireHouseholdContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Item } from "@/lib/types";

export const metadata = {
  title: "Compras y despensa",
};

const ITEM_COLUMNS =
  "id, household_id, project_id, type, scope, title, description, data, due_at, completed_at, recurrence, created_by, assigned_to, created_at, updated_at";

export default async function ProvisionsPage() {
  const { household } = await requireHouseholdContext();
  const supabase = await createClient();

  const [shoppingRes, pantryRes] = await Promise.all([
    supabase
      .from("items")
      .select(ITEM_COLUMNS)
      .eq("household_id", household.id)
      .eq("type", "shopping")
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("items")
      .select(ITEM_COLUMNS)
      .eq("household_id", household.id)
      .eq("type", "pantry")
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  const initialShopping = (shoppingRes.data as Item[] | null) ?? [];
  const initialPantry = (pantryRes.data as Item[] | null) ?? [];

  return (
    <ProvisionsView
      initialShopping={initialShopping}
      initialPantry={initialPantry}
    />
  );
}
