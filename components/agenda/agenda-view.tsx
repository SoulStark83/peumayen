"use client";

import { CalendarDays, CheckSquare, ListTodo, Plus, ShoppingCart } from "lucide-react";
import { useMemo, useState } from "react";
import { useHousehold } from "@/components/providers/household-provider";
import { Button } from "@/components/ui/button";
import { useRealtimeItems } from "@/lib/hooks/use-realtime-items";
import {
  dayKeyMadrid,
  formatDayMonth,
  todayISODateMadrid,
} from "@/lib/date";
import type { EventData, Item } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AgendaAddSheet } from "./agenda-add-sheet";
import { AgendaRow } from "./agenda-row";

type Filter = "all" | "task" | "event" | "shopping";

const FILTERS: readonly { value: Filter; label: string; icon: typeof ListTodo }[] = [
  { value: "all", label: "Todo", icon: ListTodo },
  { value: "task", label: "Tareas", icon: CheckSquare },
  { value: "event", label: "Eventos", icon: CalendarDays },
  { value: "shopping", label: "Compras", icon: ShoppingCart },
];

function itemDayKey(item: Item): string | null {
  if (item.type === "event") {
    const data = item.data as EventData;
    const iso = data.start_at ?? item.due_at;
    return iso ? dayKeyMadrid(iso) : null;
  }
  return item.due_at ? dayKeyMadrid(item.due_at) : null;
}

function itemTimeSort(item: Item): string {
  if (item.type === "event") {
    const data = item.data as EventData;
    return data.start_at ?? item.due_at ?? "";
  }
  return item.due_at ?? "";
}

function dayLabel(key: string, today: string): string {
  if (key === today) return "Hoy";
  const todayDate = new Date(`${today}T12:00:00`);
  const targetDate = new Date(`${key}T12:00:00`);
  const diffDays = Math.round(
    (targetDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays === 1) return "Mañana";
  if (diffDays === -1) return "Ayer";
  return formatDayMonth(targetDate);
}

export function AgendaView({ initial }: { initial: Item[] }) {
  const household = useHousehold();
  const items = useRealtimeItems(household.id, initial, ["task", "event", "shopping"]);

  const [filter, setFilter] = useState<Filter>("all");
  const [showDone, setShowDone] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const today = todayISODateMadrid();

  const { overdue, byDay, undated } = useMemo(() => {
    const overdue: Item[] = [];
    const byDay = new Map<string, Item[]>();
    const undated: Item[] = [];

    const filtered = items.filter((i) => filter === "all" || i.type === filter);

    for (const item of filtered) {
      const done = !!item.completed_at;
      const isCheckable = item.type === "task" || item.type === "shopping";

      if (!showDone && done) continue;

      const key = itemDayKey(item);

      if (!key) {
        if (isCheckable) undated.push(item);
        continue;
      }

      if (isCheckable && !done && key < today) {
        overdue.push(item);
        continue;
      }

      if (!isCheckable && key < today && !showDone) continue;

      const list = byDay.get(key) ?? [];
      list.push(item);
      byDay.set(key, list);
    }

    overdue.sort((a, b) => (a.due_at ?? "").localeCompare(b.due_at ?? ""));
    undated.sort((a, b) => a.created_at.localeCompare(b.created_at));
    for (const list of byDay.values()) {
      list.sort((a, b) => itemTimeSort(a).localeCompare(itemTimeSort(b)));
    }

    return { overdue, byDay, undated };
  }, [items, filter, showDone, today]);

  const sortedDays = useMemo(() => [...byDay.keys()].sort(), [byDay]);
  const hasAny = overdue.length > 0 || byDay.size > 0 || undated.length > 0;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b">
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <div className="flex gap-1.5 overflow-x-auto">
            {FILTERS.map(({ value, label, icon: Icon }) => {
              const active = filter === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition",
                    active
                      ? "bg-primary border-primary text-primary-foreground"
                      : "bg-card text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => setShowDone((s) => !s)}
            className="text-muted-foreground hover:text-foreground shrink-0 text-xs"
          >
            {showDone ? "Ocultar hechas" : "Ver hechas"}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 py-4 pb-24">
          {!hasAny ? (
            <EmptyState filter={filter} />
          ) : (
            <div className="flex flex-col gap-5">
              {overdue.length > 0 && (
                <DaySection
                  title="Vencidas"
                  accent="text-destructive"
                  items={overdue}
                />
              )}
              {sortedDays.map((key) => (
                <DaySection
                  key={key}
                  title={dayLabel(key, today)}
                  accent={key === today ? "text-primary" : undefined}
                  items={byDay.get(key) ?? []}
                />
              ))}
              {undated.length > 0 && (
                <DaySection title="Sin fecha" items={undated} />
              )}
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setAddOpen(true)}
        aria-label="Añadir"
        className="bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 fixed right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition"
        style={{
          bottom: "calc(env(safe-area-inset-bottom) + 4.75rem)",
        }}
      >
        <Plus className="h-6 w-6" strokeWidth={2.5} />
      </button>

      <AgendaAddSheet open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}

function DaySection({
  title,
  accent,
  items,
}: {
  title: string;
  accent?: string;
  items: Item[];
}) {
  return (
    <section>
      <h3
        className={cn(
          "mb-2 text-xs font-semibold uppercase tracking-wider",
          accent ?? "text-muted-foreground",
        )}
      >
        {title}
      </h3>
      <ul className="flex flex-col gap-2">
        {items.map((i) => (
          <AgendaRow key={i.id} item={i} />
        ))}
      </ul>
    </section>
  );
}

function EmptyState({ filter }: { filter: Filter }) {
  const meta = (() => {
    if (filter === "task") return { Icon: CheckSquare, text: "Sin tareas pendientes." };
    if (filter === "event") return { Icon: CalendarDays, text: "Sin eventos próximos." };
    if (filter === "shopping") return { Icon: ShoppingCart, text: "Nada en la lista." };
    return { Icon: ListTodo, text: "Nada pendiente." };
  })();
  const { Icon, text } = meta;
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
      <div className="bg-primary/10 text-primary flex h-14 w-14 items-center justify-center rounded-full">
        <Icon className="h-7 w-7" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-base font-medium">Todo al día</p>
        <p className="text-muted-foreground text-sm">{text}</p>
      </div>
    </div>
  );
}
