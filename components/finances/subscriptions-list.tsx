"use client";

import { Plus, Repeat, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useHousehold } from "@/components/providers/household-provider";
import { Button } from "@/components/ui/button";
import { formatEUR } from "@/lib/currency";
import { useRealtimeItems } from "@/lib/hooks/use-realtime-items";
import { createClient } from "@/lib/supabase/client";
import type { Item } from "@/lib/types";
import { cn } from "@/lib/utils";
import { SubscriptionFormDialog } from "./subscription-form-dialog";

type SubData = {
  amount: number;
  cadence: "monthly" | "yearly";
  billing_day: number;
};

export function SubscriptionsList({ initial }: { initial: Item[] }) {
  const household = useHousehold();
  const items = useRealtimeItems(household.id, initial, ["subscription"]);
  const [formOpen, setFormOpen] = useState(false);

  const { rows, monthlyTotal } = useMemo(() => {
    const rows = [...items].sort((a, b) => {
      const ad = (a.data as SubData)?.billing_day ?? 1;
      const bd = (b.data as SubData)?.billing_day ?? 1;
      return ad - bd;
    });
    let monthlyTotal = 0;
    for (const item of rows) {
      const d = item.data as SubData;
      if (!d) continue;
      monthlyTotal += d.cadence === "yearly" ? d.amount / 12 : d.amount;
    }
    return { rows, monthlyTotal };
  }, [items]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <p className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground">
            Equivalente mensual
          </p>
          <p className="text-xl font-semibold tabular-nums">
            {formatEUR(monthlyTotal)}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={() => setFormOpen(true)}
          className="gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Nueva
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 py-4 pb-6">
          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <Repeat className="text-muted-foreground h-8 w-8" />
              <p className="text-muted-foreground text-sm">
                Sin suscripciones registradas.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {rows.map((item) => (
                <SubscriptionRow key={item.id} item={item} />
              ))}
            </ul>
          )}
        </div>
      </div>

      <SubscriptionFormDialog open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}

function SubscriptionRow({ item }: { item: Item }) {
  const [busy, setBusy] = useState(false);
  const data = (item.data as SubData) ?? { amount: 0, cadence: "monthly", billing_day: 1 };

  async function remove() {
    if (busy) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("items").delete().eq("id", item.id);
    setBusy(false);
    if (error) toast.error("No se pudo borrar", { description: error.message });
  }

  return (
    <li
      className={cn(
        "bg-card flex items-center gap-3 rounded-xl border p-4",
        busy && "pointer-events-none opacity-50",
      )}
    >
      <div
        className="bg-muted flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
        aria-hidden
      >
        <Repeat className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-base font-medium">{item.title}</p>
          <p className="shrink-0 text-base font-semibold tabular-nums">
            {formatEUR(data.amount)}
          </p>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-muted-foreground">
            {data.cadence === "yearly" ? "Anual" : "Mensual"} · día {data.billing_day}
          </span>
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={remove}
        disabled={busy}
        className="text-muted-foreground/60 hover:text-destructive h-9 w-9 shrink-0"
        aria-label="Borrar"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </li>
  );
}
