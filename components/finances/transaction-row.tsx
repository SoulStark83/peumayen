"use client";

import { ArrowLeftRight, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatEUR } from "@/lib/currency";
import { formatDayMonth } from "@/lib/date";
import { createClient } from "@/lib/supabase/client";
import type { Item } from "@/lib/types";
import { cn } from "@/lib/utils";

type TxData = {
  amount: number;
  kind: "expense" | "income" | "transfer";
  category?: string;
  subcategory?: string;
};

export function TransactionRow({ item }: { item: Item }) {
  const [busy, setBusy] = useState(false);
  const data = (item.data as TxData) ?? { amount: 0, kind: "expense" };
  const isIncome = data.kind === "income";
  const isTransfer = data.kind === "transfer";

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
        "bg-card group flex items-center gap-3 rounded-xl border p-4 transition",
        busy && "pointer-events-none opacity-50",
      )}
    >
      <div
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
          isTransfer
            ? "bg-muted text-muted-foreground"
            : isIncome
              ? "bg-emerald-500/10 text-emerald-600"
              : "bg-rose-500/10 text-rose-600",
        )}
        aria-hidden
      >
        {isTransfer ? (
          <ArrowLeftRight className="h-5 w-5" />
        ) : isIncome ? (
          <TrendingUp className="h-5 w-5" />
        ) : (
          <TrendingDown className="h-5 w-5" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className="truncate text-base font-medium">{item.title}</p>
          <p
            className={cn(
              "shrink-0 text-base font-semibold tabular-nums",
              isIncome ? "text-emerald-600" : "text-foreground",
            )}
          >
            {isIncome ? "+" : "−"}
            {formatEUR(Math.abs(data.amount))}
          </p>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
          {item.due_at && (
            <span className="text-muted-foreground">
              {formatDayMonth(item.due_at)}
            </span>
          )}
          {data.category && (
            <span className="text-muted-foreground">· {data.category}</span>
          )}
          {data.subcategory && (
            <span className="text-muted-foreground">
              · {data.subcategory.replace(/_/g, " ")}
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
        className="text-muted-foreground/60 hover:text-destructive h-9 w-9 shrink-0 transition-colors"
        aria-label="Borrar"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </li>
  );
}
