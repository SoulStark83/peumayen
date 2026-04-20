import { redirect } from "next/navigation";
import { SaludView } from "@/components/salud/salud-view";
import { requireHouseholdContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Item } from "@/lib/types";

export const metadata = { title: "Salud" };

const ITEM_COLUMNS =
  "id, household_id, project_id, type, scope, title, description, data, due_at, completed_at, recurrence, created_by, assigned_to, created_at, updated_at";

// Feature flag: health section is enabled for these display names
const HEALTH_MEMBERS = ["Cris"];

export default async function SaludPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { household, currentMember } = await requireHouseholdContext();
  const { tab } = await searchParams;

  if (!HEALTH_MEMBERS.includes(currentMember.display_name)) {
    redirect("/");
  }

  const supabase = await createClient();

  // Fetch last 12 months of period days + all retainer changes + settings
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const [periodRes, retainerRes, settingsRes] = await Promise.all([
    supabase
      .from("items")
      .select(ITEM_COLUMNS)
      .eq("household_id", household.id)
      .eq("type", "period_day")
      .eq("scope", "personal")
      .eq("created_by", currentMember.id)
      .gte("due_at", twelveMonthsAgo.toISOString())
      .order("due_at", { ascending: false })
      .limit(500),
    supabase
      .from("items")
      .select(ITEM_COLUMNS)
      .eq("household_id", household.id)
      .eq("type", "retainer_change")
      .eq("scope", "personal")
      .eq("created_by", currentMember.id)
      .order("due_at", { ascending: false })
      .limit(200),
    supabase
      .from("items")
      .select(ITEM_COLUMNS)
      .eq("household_id", household.id)
      .eq("type", "health_settings")
      .eq("scope", "personal")
      .eq("created_by", currentMember.id)
      .limit(1)
      .maybeSingle(),
  ]);

  return (
    <SaludView
      memberId={currentMember.id}
      householdId={household.id}
      initialPeriod={(periodRes.data as Item[] | null) ?? []}
      initialRetainer={(retainerRes.data as Item[] | null) ?? []}
      initialSettings={(settingsRes.data as Item | null) ?? null}
      initialTab={tab === "retenedores" ? "retenedores" : "ciclo"}
    />
  );
}
