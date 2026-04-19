"use client";

import { ArrowDownToLine, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SCOPE_STYLES } from "@/lib/colors";
import { createClient } from "@/lib/supabase/client";
import { useCurrentMember, useHousehold } from "@/components/providers/household-provider";
import type { Item } from "@/lib/types";
import { cn } from "@/lib/utils";

type ShoppingData = {
  quantity?: string;
  category?: string;
};

export function ShoppingItem({ item }: { item: Item }) {
  const household = useHousehold();
  const currentMember = useCurrentMember();
  const [busy, setBusy] = useState(false);
  const completed = !!item.completed_at;
  const data = (item.data as ShoppingData) ?? {};
  const scopeStyle = SCOPE_STYLES[item.scope];

  async function toggle() {
    if (busy) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("items")
      .update({ completed_at: completed ? null : new Date().toISOString() })
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

  async function moveToPantry() {
    if (busy) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("items").insert({
      household_id: household.id,
      type: "pantry",
      scope: item.scope,
      title: item.title,
      created_by: currentMember.id,
      data: {
        quantity: data.quantity,
        category: data.category,
      },
    });
    setBusy(false);
    if (error) {
      toast.error("No se pudo mover", { description: error.message });
      return;
    }
    toast.success("Movido a la despensa");
  }

  return (
    <li
      className={cn(
        "bg-card flex items-center gap-3 rounded-xl border p-4 transition",
        completed && "opacity-60",
        busy && "pointer-events-none opacity-50",
      )}
    >
      <Checkbox
        checked={completed}
        onCheckedChange={toggle}
        className="size-5"
        aria-label={completed ? "Quitar marca" : "Marcar comprado"}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <p className={cn("truncate text-base font-medium", completed && "line-through")}>
            {item.title}
          </p>
          {data.quantity && (
            <span className="text-muted-foreground shrink-0 text-sm tabular-nums">
              · {data.quantity}
            </span>
          )}
        </div>
        {(data.category || item.scope !== "family") && (
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge
              variant="outline"
              className={cn("text-xs", scopeStyle.badge)}
            >
              {scopeStyle.label}
            </Badge>
            {data.category && (
              <span className="text-muted-foreground text-xs">
                {data.category}
              </span>
            )}
          </div>
        )}
      </div>

      {completed && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={moveToPantry}
          disabled={busy}
          className="text-muted-foreground hover:text-primary h-9 w-9"
          aria-label="Mover a despensa"
          title="Mover a despensa"
        >
          <ArrowDownToLine className="h-4 w-4" />
        </Button>
      )}

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={remove}
        disabled={busy}
        className="text-muted-foreground/60 hover:text-destructive h-9 w-9"
        aria-label="Borrar"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </li>
  );
}
