import { FinancesView } from "@/components/finances/finances-view";
import { requireHouseholdContext } from "@/lib/auth";
import { monthBounds, shiftMonth } from "@/lib/date";
import { createClient } from "@/lib/supabase/server";
import type { Item } from "@/lib/types";

export const metadata = {
  title: "Finanzas",
};

const ITEM_COLUMNS =
  "id, household_id, project_id, type, scope, title, description, data, due_at, completed_at, recurrence, created_by, assigned_to, created_at, updated_at";

export default async function FinancesPage() {
  const { household } = await requireHouseholdContext();
  const supabase = await createClient();

  const now = new Date();
  // Load current + previous 5 months for quick month-scroll.
  const { from } = monthBounds(now.getUTCFullYear(), now.getUTCMonth() - 5);
  const { to } = monthBounds(now.getUTCFullYear(), now.getUTCMonth() + 1);

  const [txRes, subRes] = await Promise.all([
    supabase
      .from("items")
      .select(ITEM_COLUMNS)
      .eq("household_id", household.id)
      .eq("type", "transaction")
      .gte("due_at", from)
      .lte("due_at", to)
      .order("due_at", { ascending: false })
      .limit(1000),
    supabase
      .from("items")
      .select(ITEM_COLUMNS)
      .eq("household_id", household.id)
      .eq("type", "subscription")
      .order("created_at", { ascending: false }),
  ]);

  const initialTransactions = (txRes.data as Item[] | null) ?? [];
  const initialSubscriptions = (subRes.data as Item[] | null) ?? [];

  // Month keys already included in the initial query (currentMonth-5 … currentMonth+1).
  const initialLoadedMonths: string[] = [];
  for (let delta = -5; delta <= 1; delta++) {
    const s = shiftMonth(now.getUTCFullYear(), now.getUTCMonth(), delta);
    initialLoadedMonths.push(`${s.year}-${String(s.month0 + 1).padStart(2, "0")}`);
  }

  return (
    <FinancesView
      initialTransactions={initialTransactions}
      initialSubscriptions={initialSubscriptions}
      initialLoadedMonths={initialLoadedMonths}
    />
  );
}
