"use client";

import { ArrowLeftRight, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SCOPE_STYLES } from "@/lib/colors";
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
  const scopeStyle = SCOPE_STYLES[item.scope];

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
        "bg-card flex items-center gap-3 rounded-lg border p-3 transition",
        busy && "pointer-events-none opacity-50",
      )}
    >
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
          isTransfer
            ? "bg-muted text-muted-foreground"
            : isIncome
              ? "bg-emerald-500/10 text-emerald-600"
              : "bg-rose-500/10 text-rose-600",
        )}
        aria-hidden
      >
        {isTransfer ? (
          <ArrowLeftRight className="h-4 w-4" />
        ) : isIncome ? (
          <TrendingUp className="h-4 w-4" />
        ) : (
          <TrendingDown className="h-4 w-4" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-sm font-medium">{item.title}</p>
          <p
            className={cn(
              "shrink-0 text-sm font-semibold tabular-nums",
              isIncome ? "text-emerald-600" : "text-foreground",
            )}
          >
            {formatEUR(Math.abs(data.amount))}
          </p>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs">
          {item.due_at && (
            <span className="text-muted-foreground">
              {formatDayMonth(item.due_at)}
            </span>
          )}
          {data.category && (
            <span className="text-muted-foreground">· {data.category}</span>
          )}
          <Badge variant="outline" className={cn("text-xs", scopeStyle.badge)}>
            {scopeStyle.label}
          </Badge>
        </div>
      </div>
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
