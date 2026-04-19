"use client";

import { CalendarDays, ChevronLeft, ChevronRight, Loader2, Plus, Wallet } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { useHousehold } from "@/components/providers/household-provider";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatEUR } from "@/lib/currency";
import { formatMonthTitle, monthBounds, monthKeyMadrid, shiftMonth } from "@/lib/date";
import { createClient } from "@/lib/supabase/client";
import type { Item, ItemType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { TransactionFormDialog } from "./transaction-form-dialog";
import { TransactionRow } from "./transaction-row";

type TxData = {
  amount: number;
  kind: "expense" | "income" | "transfer";
  category?: string;
};

const ITEM_COLUMNS =
  "id, household_id, project_id, type, scope, title, description, data, due_at, completed_at, recurrence, created_by, assigned_to, created_at, updated_at";

const MONTH_SHORT = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

type RealtimePayload = {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: Item;
  old: Partial<Item>;
};

export function TransactionsList({
  initial,
  initialLoadedMonths,
}: {
  initial: Item[];
  initialLoadedMonths: string[];
}) {
  const household = useHousehold();
  const [items, setItems] = useState<Item[]>(initial);
  const [loadedMonths, setLoadedMonths] = useState<Set<string>>(
    () => new Set(initialLoadedMonths),
  );
  const [loading, setLoading] = useState(false);
  const instanceId = useId();

  const now = new Date();
  const [cursor, setCursor] = useState({
    year: now.getUTCFullYear(),
    month0: now.getUTCMonth(),
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(cursor.year);
  const [formOpen, setFormOpen] = useState(false);

  const monthKey = `${cursor.year}-${String(cursor.month0 + 1).padStart(2, "0")}`;

  // Fetch a month on demand if not already loaded.
  useEffect(() => {
    if (loadedMonths.has(monthKey)) return;
    let cancelled = false;
    setLoading(true);
    const supabase = createClient();
    const { from, to } = monthBounds(cursor.year, cursor.month0);
    supabase
      .from("items")
      .select(ITEM_COLUMNS)
      .eq("household_id", household.id)
      .eq("type", "transaction")
      .gte("due_at", from)
      .lte("due_at", to)
      .order("due_at", { ascending: false })
      .limit(1000)
      .then(({ data }) => {
        if (cancelled) return;
        const fetched = (data as Item[] | null) ?? [];
        setItems((prev) => {
          const ids = new Set(prev.map((i) => i.id));
          return [...prev, ...fetched.filter((i) => !ids.has(i.id))];
        });
        setLoadedMonths((prev) => {
          const next = new Set(prev);
          next.add(monthKey);
          return next;
        });
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [monthKey, cursor.year, cursor.month0, household.id, loadedMonths]);

  // Realtime subscription for the transactions tab.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`tx-list:${household.id}:${instanceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "items",
          filter: `household_id=eq.${household.id}`,
        },
        (raw) => {
          const p = raw as unknown as RealtimePayload;
          const isTx = (t: ItemType | undefined) => t === "transaction";
          if (p.eventType === "INSERT") {
            if (!isTx(p.new.type)) return;
            setItems((prev) =>
              prev.some((i) => i.id === p.new.id) ? prev : [...prev, p.new],
            );
          } else if (p.eventType === "UPDATE") {
            if (!isTx(p.new.type)) {
              setItems((prev) => prev.filter((i) => i.id !== p.new.id));
              return;
            }
            setItems((prev) => {
              const exists = prev.some((i) => i.id === p.new.id);
              return exists
                ? prev.map((i) => (i.id === p.new.id ? p.new : i))
                : [...prev, p.new];
            });
          } else if (p.eventType === "DELETE") {
            const oldId = p.old.id;
            if (!oldId) return;
            setItems((prev) => prev.filter((i) => i.id !== oldId));
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [household.id, instanceId]);

  const { rows, income, expense } = useMemo(() => {
    const filtered = items.filter(
      (i) => i.due_at && monthKeyMadrid(i.due_at) === monthKey,
    );
    filtered.sort((a, b) => (b.due_at ?? "").localeCompare(a.due_at ?? ""));

    let income = 0;
    let expense = 0;
    for (const item of filtered) {
      const d = item.data as TxData;
      if (d.kind === "transfer") continue;
      if (d.kind === "income") income += Math.abs(d.amount);
      else expense += Math.abs(d.amount);
    }
    return { rows: filtered, income, expense };
  }, [items, monthKey]);

  const balance = income - expense;

  const jumpTo = useCallback((year: number, month0: number) => {
    setCursor({ year, month0 });
    setPickerOpen(false);
  }, []);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b">
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setCursor((c) => shiftMonth(c.year, c.month0, -1))}
              aria-label="Mes anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Popover
              open={pickerOpen}
              onOpenChange={(o) => {
                setPickerOpen(o);
                if (o) setPickerYear(cursor.year);
              }}
            >
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 px-2 text-sm font-medium"
                  aria-label="Elegir mes"
                >
                  <CalendarDays className="h-3.5 w-3.5" />
                  {formatMonthTitle(cursor.year, cursor.month0)}
                  {loading && (
                    <Loader2 className="text-muted-foreground h-3 w-3 animate-spin" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="center" className="w-64 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setPickerYear((y) => y - 1)}
                    aria-label="Año anterior"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-semibold tabular-nums">
                    {pickerYear}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setPickerYear((y) => y + 1)}
                    aria-label="Año siguiente"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {MONTH_SHORT.map((label, idx) => {
                    const isCurrent =
                      pickerYear === cursor.year && idx === cursor.month0;
                    return (
                      <Button
                        key={label}
                        type="button"
                        size="sm"
                        variant={isCurrent ? "default" : "ghost"}
                        className="h-8 text-xs"
                        onClick={() => jumpTo(pickerYear, idx)}
                      >
                        {label}
                      </Button>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setCursor((c) => shiftMonth(c.year, c.month0, 1))}
              aria-label="Mes siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => setFormOpen(true)}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Nueva
          </Button>
        </div>

        <div className="mx-auto grid w-full max-w-3xl grid-cols-3 gap-2 px-4 pb-3">
          <MiniKpi label="Ingresos" value={formatEUR(income, true)} tone="pos" />
          <MiniKpi label="Gastos" value={formatEUR(expense, true)} tone="neg" />
          <MiniKpi
            label="Balance"
            value={formatEUR(balance, true)}
            tone={balance >= 0 ? "pos" : "neg"}
            emphasis
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 py-4 pb-6">
          {loading && rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
              <p className="text-muted-foreground text-sm">Cargando…</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="bg-primary/10 text-primary flex h-14 w-14 items-center justify-center rounded-full">
                <Wallet className="h-7 w-7" />
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-base font-medium">Mes en blanco</p>
                <p className="text-muted-foreground text-sm">
                  Sin movimientos registrados este mes.
                </p>
              </div>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {rows.map((i) => (
                <TransactionRow key={i.id} item={i} />
              ))}
            </ul>
          )}
        </div>
      </div>

      <TransactionFormDialog open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}

function MiniKpi({
  label,
  value,
  tone,
  emphasis,
}: {
  label: string;
  value: string;
  tone: "pos" | "neg";
  emphasis?: boolean;
}) {
  return (
    <div
      className={cn(
        "bg-card flex flex-col gap-0.5 rounded-lg border px-3 py-2",
        emphasis && "border-primary/30",
      )}
    >
      <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
        {label}
      </span>
      <span
        className={cn(
          "text-base font-semibold tabular-nums",
          tone === "pos" ? "text-emerald-600" : "text-rose-600",
        )}
      >
        {value}
      </span>
    </div>
  );
}
