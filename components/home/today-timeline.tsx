"use client";

import Link from "next/link";
import {
  CalendarDays,
  CheckSquare,
  Clock,
  ShoppingCart,
} from "lucide-react";
import { useMemo } from "react";
import { useHousehold } from "@/components/providers/household-provider";
import { useRealtimeItems } from "@/lib/hooks/use-realtime-items";
import {
  dayKeyMadrid,
  todayISODateMadrid,
} from "@/lib/date";
import { colorForName } from "@/lib/colors";
import type { EventData, Item, Member } from "@/lib/types";
import { cn } from "@/lib/utils";

const MAX_VISIBLE = 6;

const TYPE_ICON = {
  task: CheckSquare,
  event: CalendarDays,
  shopping: ShoppingCart,
} as const;

const TYPE_ACCENT = {
  task: "text-sky-600 dark:text-sky-400",
  event: "text-violet-600 dark:text-violet-400",
  shopping: "text-amber-600 dark:text-amber-400",
} as const;

type Props = {
  initial: Item[];
  members: Member[];
};

export function TodayTimeline({ initial, members }: Props) {
  const household = useHousehold();
  const items = useRealtimeItems(household.id, initial, [
    "task",
    "event",
    "shopping",
  ]);
  const membersById = useMemo(
    () => new Map(members.map((m) => [m.id, m])),
    [members],
  );

  const today = todayISODateMadrid();

  const todayItems = useMemo(() => {
    const out: Item[] = [];
    for (const item of items) {
      if (item.completed_at) continue;
      const iso =
        item.type === "event"
          ? (item.data as EventData).start_at ?? item.due_at
          : item.due_at;
      if (!iso) continue;
      if (dayKeyMadrid(iso) !== today) continue;
      out.push(item);
    }
    out.sort((a, b) => {
      const aIso =
        (a.type === "event" ? (a.data as EventData).start_at : null) ??
        a.due_at ??
        "";
      const bIso =
        (b.type === "event" ? (b.data as EventData).start_at : null) ??
        b.due_at ??
        "";
      return aIso.localeCompare(bIso);
    });
    return out;
  }, [items, today]);

  const visible = todayItems.slice(0, MAX_VISIBLE);
  const extra = todayItems.length - visible.length;

  if (visible.length === 0) {
    return (
      <div className="bg-card rounded-xl border p-5 text-center">
        <p className="text-muted-foreground text-sm">Día tranquilo.</p>
        <Link
          href="/agenda"
          className="text-primary text-sm font-medium hover:underline"
        >
          Añadir algo →
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-card flex flex-col overflow-hidden rounded-xl border">
      <ul>
        {visible.map((item, idx) => {
          const ownerId = item.assigned_to ?? item.created_by;
          const owner = ownerId ? membersById.get(ownerId) : undefined;
          const typeKey = (item.type === "task" || item.type === "event" || item.type === "shopping"
            ? item.type
            : "task") as keyof typeof TYPE_ICON;
          const Icon = TYPE_ICON[typeKey];
          const accent = TYPE_ACCENT[typeKey];

          const timeLabel = (() => {
            if (item.type === "event") {
              const data = item.data as EventData;
              if (data.all_day) return "Día";
              return (data.start_at ?? item.due_at ?? "").slice(11, 16);
            }
            if (item.type === "task" && item.due_at) {
              const hhmm = item.due_at.slice(11, 16);
              if (hhmm === "23:59") return "Hoy";
              return hhmm;
            }
            return null;
          })();

          return (
            <li
              key={item.id}
              className={cn(
                "flex items-center gap-3 px-4 py-3",
                idx !== visible.length - 1 && "border-b",
              )}
            >
              <div className="w-12 shrink-0">
                {timeLabel ? (
                  <span className="text-sm font-semibold tabular-nums">
                    {timeLabel}
                  </span>
                ) : (
                  <Clock className="text-muted-foreground/60 h-3.5 w-3.5" />
                )}
              </div>
              <Icon className={cn("h-4 w-4 shrink-0", accent)} />
              <p className="min-w-0 flex-1 truncate text-[15px] font-medium">
                {item.title}
              </p>
              {owner && (
                <div
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                    colorForName(owner.display_name),
                  )}
                  title={owner.display_name}
                  aria-hidden
                >
                  {owner.display_name[0]?.toUpperCase()}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {extra > 0 && (
        <Link
          href="/agenda"
          className="text-muted-foreground hover:text-foreground border-t px-4 py-2.5 text-center text-sm"
        >
          Ver {extra} más →
        </Link>
      )}
    </div>
  );
}
