"use client";

import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useCurrentMember,
  useHousehold,
} from "@/components/providers/household-provider";
import { dayKeyMadrid, formatDayMonth, todayISODateMadrid } from "@/lib/date";
import { createClient } from "@/lib/supabase/client";
import type { Item } from "@/lib/types";
import { cn } from "@/lib/utils";

type PantryData = {
  quantity?: number;
  unit?: string;
  location?: string;
  expires_at?: string;
};

function daysUntil(iso: string): number {
  const today = new Date(todayISODateMadrid());
  const target = new Date(iso);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function PantryItem({ item }: { item: Item }) {
  const household = useHousehold();
  const currentMember = useCurrentMember();
  const [busy, setBusy] = useState(false);
  const data = (item.data as PantryData) ?? {};
  const qty = typeof data.quantity === "number" ? data.quantity : 0;

  const expiryDays = data.expires_at ? daysUntil(data.expires_at) : null;
  const expiryStatus =
    expiryDays === null
      ? null
      : expiryDays < 0
        ? "expired"
        : expiryDays <= 3
          ? "soon"
          : "ok";

  async function changeQty(delta: number) {
    if (busy) return;
    const next = qty + delta;
    if (next < 0) return;
    setBusy(true);
    const supabase = createClient();
    if (next === 0) {
      const { error } = await supabase.from("items").delete().eq("id", item.id);
      setBusy(false);
      if (error) toast.error("No se pudo actualizar", { description: error.message });
      else toast.success("Consumido");
      return;
    }
    const { error } = await supabase
      .from("items")
      .update({ data: { ...data, quantity: next } })
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

  async function toShopping() {
    if (busy) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("items").insert({
      household_id: household.id,
      type: "shopping",
      scope: "family",
      title: item.title,
      created_by: currentMember.id,
      data: {
        quantity: data.unit ? `1 ${data.unit}` : undefined,
      },
    });
    setBusy(false);
    if (error) {
      toast.error("No se pudo añadir", { description: error.message });
      return;
    }
    toast.success("Añadido a la compra");
  }

  return (
    <li
      className={cn(
        "bg-card flex items-center gap-2 rounded-lg border p-3 transition",
        busy && "pointer-events-none opacity-50",
        expiryStatus === "expired" && "border-destructive/40 bg-destructive/5",
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.title}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          <span className="text-muted-foreground text-xs">
            {qty} {data.unit ?? "ud"}
          </span>
          {data.location && (
            <span className="text-muted-foreground text-xs">
              · {data.location}
            </span>
          )}
          {data.expires_at && expiryStatus && (
            <Badge
              variant="outline"
              className={cn(
                "text-xs",
                expiryStatus === "expired" &&
                  "border-destructive/40 bg-destructive/10 text-destructive",
                expiryStatus === "soon" &&
                  "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
                expiryStatus === "ok" && "text-muted-foreground",
              )}
            >
              {expiryStatus === "expired"
                ? `Caducó ${formatDayMonth(dayKeyMadrid(data.expires_at))}`
                : `Caduca ${formatDayMonth(dayKeyMadrid(data.expires_at))}`}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => changeQty(-1)}
          disabled={busy}
          className="h-7 w-7"
          aria-label="Menos"
        >
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => changeQty(1)}
          disabled={busy}
          className="h-7 w-7"
          aria-label="Más"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={toShopping}
        disabled={busy}
        className="text-muted-foreground hover:text-primary h-8 w-8 shrink-0"
        aria-label="Añadir a la compra"
        title="Añadir a la compra"
      >
        <ShoppingCart className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={remove}
        disabled={busy}
        className="text-muted-foreground hover:text-destructive h-8 w-8 shrink-0"
        aria-label="Borrar"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </li>
  );
}
