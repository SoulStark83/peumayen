"use client";

import {
  CalendarDays,
  CheckSquare,
  Clock,
  MapPin,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useMemberById } from "@/components/providers/household-provider";
import { colorForName, initialsFor, memberBgForName } from "@/lib/colors";
import { createClient } from "@/lib/supabase/client";
import type { EventData, Item } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  item: Item;
  hideDate?: boolean;
};

const TYPE_META = {
  task: { icon: CheckSquare, color: "text-sky-600 dark:text-sky-400" },
  event: { icon: CalendarDays, color: "text-violet-600 dark:text-violet-400" },
  shopping: { icon: ShoppingCart, color: "text-amber-600 dark:text-amber-400" },
} as const;

export function AgendaRow({ item, hideDate }: Props) {
  const assignee = useMemberById(item.assigned_to);
  const [busy, setBusy] = useState(false);
  const completed = !!item.completed_at;
  const checkable = item.type === "task" || item.type === "shopping";

  const typeKey = (item.type === "task" || item.type === "event" || item.type === "shopping"
    ? item.type
    : "task") as keyof typeof TYPE_META;
  const meta = TYPE_META[typeKey];
  const Icon = meta.icon;

  const timeLabel = (() => {
    if (item.type === "event") {
      const data = item.data as EventData;
      if (data.all_day) return "Todo el día";
      const iso = data.start_at ?? item.due_at;
      if (!iso) return null;
      return iso.slice(11, 16);
    }
    return null;
  })();

  const locationLabel =
    item.type === "event" ? (item.data as EventData).location : undefined;

  const stripeClass = assignee
    ? memberBgForName(assignee.display_name)
    : "bg-muted-foreground/20";

  async function toggleComplete() {
    if (busy || !checkable) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("items")
      .update({
        completed_at: completed ? null : new Date().toISOString(),
      })
      .eq("id", item.id);
    setBusy(false);
    if (error) toast.error("No se pudo actualizar", { description: error.message });
  }

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
        "bg-card group relative flex items-center gap-3 overflow-hidden rounded-xl border px-4 py-3 transition",
        completed && "opacity-60",
        busy && "pointer-events-none opacity-50",
      )}
    >
      <span
        aria-hidden
        className={cn("absolute top-0 bottom-0 left-0 w-1", stripeClass)}
      />

      {checkable ? (
        <Checkbox
          checked={completed}
          onCheckedChange={toggleComplete}
          className="size-5 shrink-0"
          aria-label={completed ? "Marcar pendiente" : "Marcar hecho"}
        />
      ) : (
        <div
          className={cn(
            "bg-background flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
            meta.color,
          )}
          aria-hidden
        >
          <Icon className="h-5 w-5" />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {checkable && <Icon className={cn("h-3.5 w-3.5 shrink-0", meta.color)} />}
          <p
            className={cn(
              "truncate text-base font-medium leading-snug",
              completed && "line-through",
            )}
          >
            {item.title}
          </p>
        </div>

        <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
          {timeLabel && !hideDate && (
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Clock className="h-3 w-3" />
              {timeLabel}
            </span>
          )}
          {locationLabel && (
            <span className="inline-flex max-w-[12rem] items-center gap-1 truncate">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{locationLabel}</span>
            </span>
          )}
          {assignee && (
            <span className="inline-flex items-center gap-1.5">
              <Avatar className="h-5 w-5">
                {assignee.avatar_url && (
                  <AvatarImage src={assignee.avatar_url} alt={assignee.display_name} />
                )}
                <AvatarFallback
                  className={cn("text-[10px]", colorForName(assignee.display_name))}
                >
                  {initialsFor(assignee.display_name)}
                </AvatarFallback>
              </Avatar>
              {assignee.display_name.split(" ")[0]}
            </span>
          )}
        </div>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={remove}
        disabled={busy}
        className="text-muted-foreground/50 hover:text-destructive h-8 w-8 shrink-0"
        aria-label="Borrar"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </li>
  );
}
