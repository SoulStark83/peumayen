"use client";

import Link from "next/link";
import { useMemo } from "react";
import { AgendaRow } from "@/components/agenda/agenda-row";
import { useHousehold } from "@/components/providers/household-provider";
import { useRealtimeItems } from "@/lib/hooks/use-realtime-items";
import { dayKeyMadrid, todayISODateMadrid } from "@/lib/date";
import type { EventData, Item } from "@/lib/types";

const MAX_VISIBLE = 6;

export function TodayTimeline({ initial }: { initial: Item[] }) {
  const household = useHousehold();
  const items = useRealtimeItems(household.id, initial, ["task", "event", "shopping"]);
  const today = todayISODateMadrid();

  const todayItems = useMemo(() => {
    const out: Item[] = [];
    for (const item of items) {
      if (item.completed_at) continue;
      const iso =
        item.type === "event"
          ? (item.data as EventData).start_at ?? item.due_at
          : item.due_at;
      if (!iso || dayKeyMadrid(iso) !== today) continue;
      out.push(item);
    }
    out.sort((a, b) => {
      const aIso =
        (a.type === "event" ? (a.data as EventData).start_at : null) ??
        a.due_at ?? "";
      const bIso =
        (b.type === "event" ? (b.data as EventData).start_at : null) ??
        b.due_at ?? "";
      return aIso.localeCompare(bIso);
    });
    return out;
  }, [items, today]);

  const visible = todayItems.slice(0, MAX_VISIBLE);
  const extra = todayItems.length - visible.length;

  if (visible.length === 0) {
    return (
      <div className="family-card flex flex-col items-center gap-2 px-6 py-8 text-center">
        <span className="text-3xl">😌</span>
        <p className="font-bold">Hoy pinta tranquilo</p>
        <p className="text-muted-foreground text-sm">
          No hay nada urgente. Disfruta el día.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-2">
        {visible.map((item) => (
          <AgendaRow key={item.id} item={item} hideDate />
        ))}
      </ul>
      {extra > 0 && (
        <Link
          href="/agenda"
          className="text-primary py-1 text-center text-sm font-bold"
        >
          Ver {extra} más en el plan →
        </Link>
      )}
    </div>
  );
}
