"use client";

import { Footprints, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useHousehold } from "@/components/providers/household-provider";
import { Button } from "@/components/ui/button";
import { dayKeyMadrid, messageTimeLabel, relativeDayLabel, todayISODateMadrid } from "@/lib/date";
import { useRealtimeItems } from "@/lib/hooks/use-realtime-items";
import { createClient } from "@/lib/supabase/client";
import type { Item } from "@/lib/types";
import { QuickWalkButton } from "./quick-walk-button";

type WalkData = {
  by?: string;
};

export function WalksLog({ initial }: { initial: Item[] }) {
  const household = useHousehold();
  const walks = useRealtimeItems(household.id, initial, ["walk"]);

  const { todayCount, grouped } = useMemo(() => {
    const today = todayISODateMadrid();
    let todayCount = 0;
    const grouped = new Map<string, Item[]>();
    for (const item of walks) {
      const iso = item.due_at ?? item.created_at;
      const dayKey = dayKeyMadrid(iso);
      if (dayKey === today) todayCount++;
      const arr = grouped.get(dayKey) ?? [];
      arr.push(item);
      grouped.set(dayKey, arr);
    }
    for (const list of grouped.values()) {
      list.sort((a, b) => {
        const ai = a.due_at ?? a.created_at;
        const bi = b.due_at ?? b.created_at;
        return bi.localeCompare(ai);
      });
    }
    const ordered = [...grouped.entries()].sort((a, b) => b[0].localeCompare(a[0]));
    return { todayCount, grouped: ordered };
  }, [walks]);

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-card flex flex-col gap-3 rounded-xl border p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
              Hoy
            </p>
            <p className="text-lg font-semibold">
              {todayCount} {todayCount === 1 ? "paseo" : "paseos"}
            </p>
          </div>
          <Footprints className="text-muted-foreground h-6 w-6" />
        </div>
        <QuickWalkButton />
      </div>

      {grouped.length === 0 ? (
        <p className="text-muted-foreground py-6 text-center text-sm">
          Aún no hay paseos registrados.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {grouped.map(([key, list]) => (
            <section key={key}>
              <h3 className="text-muted-foreground mb-1.5 text-xs font-semibold tracking-wider uppercase">
                {relativeDayLabel(`${key}T12:00:00`)}
              </h3>
              <ul className="flex flex-col gap-1.5">
                {list.map((i) => (
                  <WalkRow key={i.id} item={i} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function WalkRow({ item }: { item: Item }) {
  const [busy, setBusy] = useState(false);
  const data = (item.data as WalkData) ?? {};
  const iso = item.due_at ?? item.created_at;

  async function remove() {
    if (busy) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("items").delete().eq("id", item.id);
    setBusy(false);
    if (error) toast.error("No se pudo borrar", { description: error.message });
  }

  return (
    <li className="bg-card flex items-center gap-3 rounded-lg border px-3 py-2">
      <Footprints className="text-muted-foreground h-4 w-4 shrink-0" />
      <span className="text-sm font-medium tabular-nums">
        {messageTimeLabel(iso)}
      </span>
      {data.by && (
        <span className="text-muted-foreground text-xs">· {data.by}</span>
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={remove}
        disabled={busy}
        className="text-muted-foreground hover:text-destructive ml-auto h-7 w-7"
        aria-label="Borrar"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </li>
  );
}
