"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useMemberById } from "@/components/providers/household-provider";
import { SCOPE_STYLES, colorForName, initialsFor, memberBgForName } from "@/lib/colors";
import { formatDayMonth, todayISODateMadrid, dayKeyMadrid } from "@/lib/date";
import { createClient } from "@/lib/supabase/client";
import type { Item } from "@/lib/types";
import { cn } from "@/lib/utils";

export function TaskItem({ item, hideScope }: { item: Item; hideScope?: boolean }) {
  const assignee = useMemberById(item.assigned_to);
  const [busy, setBusy] = useState(false);
  const completed = !!item.completed_at;
  const scopeStyle = SCOPE_STYLES[item.scope];

  const overdue =
    !completed && item.due_at && dayKeyMadrid(item.due_at) < todayISODateMadrid();

  async function toggleComplete() {
    if (busy) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("items")
      .update({ completed_at: completed ? null : new Date().toISOString() })
      .eq("id", item.id);
    setBusy(false);
    if (error) {
      toast.error("No se pudo actualizar", { description: error.message });
    }
  }

  async function remove() {
    if (busy) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("items").delete().eq("id", item.id);
    setBusy(false);
    if (error) {
      toast.error("No se pudo borrar", { description: error.message });
    }
  }

  const stripeClass = assignee
    ? memberBgForName(assignee.display_name)
    : scopeStyle.dot;

  return (
    <li
      className={cn(
        "bg-card relative flex items-start gap-3 overflow-hidden rounded-xl border p-4 pl-5 transition",
        completed && "opacity-60",
        busy && "pointer-events-none opacity-50",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute top-0 bottom-0 left-0 w-1.5",
          stripeClass,
        )}
      />
      <Checkbox
        checked={completed}
        onCheckedChange={toggleComplete}
        className="mt-0.5 size-5"
        aria-label={completed ? "Marcar como pendiente" : "Marcar como completada"}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "text-base font-medium leading-snug",
              completed && "line-through",
            )}
          >
            {item.title}
          </p>
          {!hideScope && (
            <Badge
              variant="outline"
              className={cn("shrink-0 text-xs", scopeStyle.badge)}
            >
              {scopeStyle.label}
            </Badge>
          )}
        </div>

        {item.description && (
          <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
            {item.description}
          </p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          {item.due_at && (
            <span
              className={cn(
                overdue ? "text-destructive font-medium" : "text-muted-foreground",
              )}
            >
              {overdue ? "Vencida · " : "Vence "}
              {formatDayMonth(item.due_at)}
            </span>
          )}
          {assignee && (
            <span className="text-muted-foreground inline-flex items-center gap-1.5">
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
        className="text-muted-foreground hover:text-destructive h-9 w-9 shrink-0"
        aria-label="Borrar"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </li>
  );
}
