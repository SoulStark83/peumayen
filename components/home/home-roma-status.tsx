import Link from "next/link";
import { PawPrint, Scale, Stethoscope } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { relativeDayLabel } from "@/lib/date";
import type { Item, Member } from "@/lib/types";

export async function HomeRomaStatus({
  householdId,
  members: _members,
}: {
  householdId: string;
  members: Member[];
}) {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const [lastWalkRes, lastWeightRes, nextVetRes] = await Promise.all([
    supabase
      .from("items")
      .select("id, due_at, data")
      .eq("household_id", householdId)
      .eq("type", "walk")
      .not("due_at", "is", null)
      .order("due_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("items")
      .select("id, due_at, data")
      .eq("household_id", householdId)
      .eq("type", "weight")
      .not("due_at", "is", null)
      .order("due_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("items")
      .select("id, title, due_at")
      .eq("household_id", householdId)
      .eq("type", "vet_visit")
      .gte("due_at", nowIso)
      .order("due_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  const walk = lastWalkRes.data as Pick<Item, "id" | "due_at" | "data"> | null;
  const weight = lastWeightRes.data as Pick<Item, "id" | "due_at" | "data"> | null;
  const vet = nextVetRes.data as Pick<Item, "id" | "title" | "due_at"> | null;

  const weightValue = weight?.data as { kg?: number } | undefined;

  return (
    <section aria-label="Roma">
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
          Roma
        </h3>
        <Link href="/roma" className="text-primary text-xs font-medium">
          Ver ficha
        </Link>
      </div>

      <Link
        href="/roma"
        className="bg-card hover:border-primary/40 active:scale-[0.99] block rounded-xl border p-4 transition"
      >
        <div className="flex items-center gap-3">
          <div className="bg-member-roma/15 text-member-roma flex h-11 w-11 items-center justify-center rounded-full">
            <PawPrint className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Roma</p>
            <p className="text-muted-foreground text-sm">
              {walk?.due_at
                ? `Último paseo · ${relativeDayLabel(walk.due_at).toLowerCase()}`
                : "Aún sin paseos registrados"}
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="bg-muted/50 flex items-center gap-2 rounded-lg p-2.5">
            <Scale className="text-muted-foreground h-4 w-4 shrink-0" />
            <div className="min-w-0">
              <p className="text-muted-foreground text-xs">Peso</p>
              <p className="truncate text-sm font-medium tabular-nums">
                {weightValue?.kg != null ? `${weightValue.kg} kg` : "—"}
              </p>
            </div>
          </div>
          <div className="bg-muted/50 flex items-center gap-2 rounded-lg p-2.5">
            <Stethoscope className="text-muted-foreground h-4 w-4 shrink-0" />
            <div className="min-w-0">
              <p className="text-muted-foreground text-xs">Próx. veterinario</p>
              <p className="truncate text-sm font-medium">
                {vet ? relativeDayLabel(vet.due_at!) : "Sin cita"}
              </p>
            </div>
          </div>
        </div>
      </Link>
    </section>
  );
}
