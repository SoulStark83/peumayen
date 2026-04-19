"use client";

import {
  ArrowLeftRight,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  PieChart,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { ScopePicker } from "@/components/common/scope-picker";
import { useHousehold } from "@/components/providers/household-provider";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatEUR } from "@/lib/currency";
import { formatMonthTitle, monthKeyMadrid, shiftMonth } from "@/lib/date";
import { createClient } from "@/lib/supabase/client";
import type { Item, ItemType, Scope } from "@/lib/types";
import { cn } from "@/lib/utils";

type TxData = {
  amount: number;
  kind: "expense" | "income" | "transfer";
  category?: string;
  subcategory?: string;
};

type RealtimePayload = {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: Item;
  old: Partial<Item>;
};

const ITEM_COLUMNS =
  "id, household_id, project_id, type, scope, title, description, data, due_at, completed_at, recurrence, created_by, assigned_to, created_at, updated_at";

const MONTH_SHORT = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

const CAT_LABELS: Record<string, string> = {
  vivienda: "Vivienda",
  ninos: "Niños",
  mascotas: "Mascotas",
  transporte: "Transporte",
  alimentacion: "Alimentación",
  restauracion: "Restauración",
  salud: "Salud",
  moda: "Moda",
  ocio: "Ocio",
  tecnologia: "Tecnología",
  servicios: "Servicios",
  financiero: "Financiero",
  impuestos: "Impuestos",
  ingresos: "Ingresos",
  traspasos: "Traspasos",
  efectivo: "Efectivo",
  otros: "Otros",
};

function prettySub(sub: string): string {
  return sub.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function monthKeyOf(year: number, month0: number) {
  return `${year}-${String(month0 + 1).padStart(2, "0")}`;
}

export function SummaryTab({
  initial,
  initialLoadedMonths,
}: {
  initial: Item[];
  initialLoadedMonths: string[];
}) {
  const household = useHousehold();
  const instanceId = useId();
  const [items, setItems] = useState<Item[]>(initial);
  const [loadedMonths, setLoadedMonths] = useState<Set<string>>(
    () => new Set(initialLoadedMonths),
  );
  const [loading, setLoading] = useState(false);

  const now = new Date();
  const [cursor, setCursor] = useState({
    year: now.getUTCFullYear(),
    month0: now.getUTCMonth(),
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(cursor.year);
  const [scopeFilter, setScopeFilter] = useState<Scope | "all">("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const monthKey = monthKeyOf(cursor.year, cursor.month0);

  // Ensure the 12-month window ending at `cursor` is loaded (for the trend chart).
  useEffect(() => {
    const missing: Array<{ year: number; month0: number; key: string }> = [];
    for (let delta = 0; delta >= -11; delta--) {
      const s = shiftMonth(cursor.year, cursor.month0, delta);
      const key = monthKeyOf(s.year, s.month0);
      if (!loadedMonths.has(key)) missing.push({ ...s, key });
    }
    if (missing.length === 0) return;

    let cancelled = false;
    setLoading(true);
    const supabase = createClient();

    // Single range query from the oldest missing month to the newest.
    const oldest = missing.reduce((a, b) =>
      a.year < b.year || (a.year === b.year && a.month0 < b.month0) ? a : b,
    );
    const newest = missing.reduce((a, b) =>
      a.year > b.year || (a.year === b.year && a.month0 > b.month0) ? a : b,
    );
    const fromISO = new Date(Date.UTC(oldest.year, oldest.month0, 1)).toISOString();
    const toISO = new Date(
      Date.UTC(newest.year, newest.month0 + 1, 0, 23, 59, 59),
    ).toISOString();

    supabase
      .from("items")
      .select(ITEM_COLUMNS)
      .eq("household_id", household.id)
      .eq("type", "transaction")
      .gte("due_at", fromISO)
      .lte("due_at", toISO)
      .order("due_at", { ascending: false })
      .limit(5000)
      .then(({ data }) => {
        if (cancelled) return;
        const fetched = (data as Item[] | null) ?? [];
        setItems((prev) => {
          const ids = new Set(prev.map((i) => i.id));
          return [...prev, ...fetched.filter((i) => !ids.has(i.id))];
        });
        setLoadedMonths((prev) => {
          const next = new Set(prev);
          for (const m of missing) next.add(m.key);
          return next;
        });
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [cursor.year, cursor.month0, household.id, loadedMonths]);

  // Realtime subscription.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`tx-summary:${household.id}:${instanceId}`)
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

  const filteredItems = useMemo(() => {
    return items.filter((i) =>
      scopeFilter === "all" ? true : i.scope === scopeFilter,
    );
  }, [items, scopeFilter]);

  // Monthly totals for the current cursor month.
  const { income, expense, expenseByCat, transferCount } = useMemo(() => {
    let income = 0;
    let expense = 0;
    let transferCount = 0;
    const byCat = new Map<
      string,
      { total: number; subs: Map<string, number>; count: number }
    >();
    for (const i of filteredItems) {
      if (!i.due_at || monthKeyMadrid(i.due_at) !== monthKey) continue;
      const d = i.data as TxData;
      if (!d) continue;
      if (d.kind === "transfer") {
        transferCount++;
        continue;
      }
      const amount = Math.abs(d.amount);
      if (d.kind === "income") {
        income += amount;
        continue;
      }
      expense += amount;
      const cat = d.category ?? "otros";
      const sub = d.subcategory ?? "otros";
      const entry = byCat.get(cat) ?? {
        total: 0,
        subs: new Map<string, number>(),
        count: 0,
      };
      entry.total += amount;
      entry.count += 1;
      entry.subs.set(sub, (entry.subs.get(sub) ?? 0) + amount);
      byCat.set(cat, entry);
    }
    const expenseByCat = [...byCat.entries()]
      .map(([cat, v]) => ({
        cat,
        total: v.total,
        count: v.count,
        subs: [...v.subs.entries()]
          .map(([sub, total]) => ({ sub, total }))
          .sort((a, b) => b.total - a.total),
      }))
      .sort((a, b) => b.total - a.total);
    return { income, expense, expenseByCat, transferCount };
  }, [filteredItems, monthKey]);

  // 12-month trend (ending at cursor).
  const trend = useMemo(() => {
    const months: Array<{
      key: string;
      year: number;
      month0: number;
      income: number;
      expense: number;
    }> = [];
    for (let delta = -11; delta <= 0; delta++) {
      const s = shiftMonth(cursor.year, cursor.month0, delta);
      months.push({
        key: monthKeyOf(s.year, s.month0),
        year: s.year,
        month0: s.month0,
        income: 0,
        expense: 0,
      });
    }
    const byKey = new Map(months.map((m) => [m.key, m]));
    for (const i of filteredItems) {
      if (!i.due_at) continue;
      const mk = monthKeyMadrid(i.due_at);
      const m = byKey.get(mk);
      if (!m) continue;
      const d = i.data as TxData;
      if (!d || d.kind === "transfer") continue;
      const amount = Math.abs(d.amount);
      if (d.kind === "income") m.income += amount;
      else m.expense += amount;
    }
    return months;
  }, [filteredItems, cursor.year, cursor.month0]);

  const trendMax = useMemo(
    () => Math.max(1, ...trend.map((m) => Math.max(m.income, m.expense))),
    [trend],
  );

  const balance = income - expense;

  const jumpTo = useCallback((year: number, month0: number) => {
    setCursor({ year, month0 });
    setPickerOpen(false);
  }, []);

  const toggleCat = useCallback((cat: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
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
          <ScopePicker
            value={scopeFilter}
            onChange={setScopeFilter}
            allOption
            size="sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-3 py-4 pb-8">
          {/* KPI row */}
          <div className="grid grid-cols-3 gap-2">
            <Kpi
              label="Ingresos"
              value={formatEUR(income, true)}
              tone="pos"
              icon={<TrendingUp className="h-3 w-3" />}
            />
            <Kpi
              label="Gastos"
              value={formatEUR(expense, true)}
              tone="neg"
              icon={<TrendingDown className="h-3 w-3" />}
            />
            <Kpi
              label="Balance"
              value={formatEUR(balance, true)}
              tone={balance >= 0 ? "pos" : "neg"}
            />
          </div>

          {/* Breakdown */}
          <section className="bg-card rounded-xl border p-3">
            <header className="mb-2 flex items-center gap-1.5">
              <PieChart className="text-muted-foreground h-3.5 w-3.5" />
              <h3 className="text-xs font-semibold tracking-wider uppercase">
                Gastos por categoría
              </h3>
            </header>
            {expenseByCat.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center text-sm">
                Sin gastos este mes.
              </p>
            ) : (
              <ul className="flex flex-col gap-1">
                {expenseByCat.map((c) => {
                  const pct = expense > 0 ? (c.total / expense) * 100 : 0;
                  const isOpen = expanded.has(c.cat);
                  return (
                    <li key={c.cat} className="flex flex-col">
                      <button
                        type="button"
                        onClick={() => toggleCat(c.cat)}
                        className="hover:bg-muted/50 flex flex-col gap-1 rounded-md p-2 text-left transition"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-1.5">
                            <ChevronDown
                              className={cn(
                                "text-muted-foreground h-3 w-3 shrink-0 transition-transform",
                                !isOpen && "-rotate-90",
                              )}
                            />
                            <span className="truncate text-sm font-medium">
                              {CAT_LABELS[c.cat] ?? prettySub(c.cat)}
                            </span>
                            <span className="text-muted-foreground text-xs">
                              · {c.count}
                            </span>
                          </div>
                          <div className="flex shrink-0 items-center gap-2 text-sm tabular-nums">
                            <span className="text-muted-foreground text-xs">
                              {pct.toFixed(1)}%
                            </span>
                            <span className="font-semibold">
                              {formatEUR(c.total, true)}
                            </span>
                          </div>
                        </div>
                        <div className="bg-muted relative h-1 w-full overflow-hidden rounded-full">
                          <div
                            className="bg-rose-500/70 absolute top-0 left-0 h-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </button>
                      {isOpen && c.subs.length > 0 && (
                        <ul className="ml-6 flex flex-col gap-0.5 border-l pl-2 py-1">
                          {c.subs.map((s) => {
                            const subPct =
                              c.total > 0 ? (s.total / c.total) * 100 : 0;
                            return (
                              <li
                                key={s.sub}
                                className="flex items-center justify-between gap-2 px-1 py-0.5 text-xs"
                              >
                                <span className="text-muted-foreground truncate">
                                  {prettySub(s.sub)}
                                </span>
                                <span className="flex items-center gap-2 tabular-nums">
                                  <span className="text-muted-foreground">
                                    {subPct.toFixed(0)}%
                                  </span>
                                  <span className="font-medium">
                                    {formatEUR(s.total, true)}
                                  </span>
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {transferCount > 0 && (
              <p className="text-muted-foreground mt-2 flex items-center gap-1 text-[10px]">
                <ArrowLeftRight className="h-3 w-3" />
                {transferCount} traspaso{transferCount === 1 ? "" : "s"} interno
                {transferCount === 1 ? "" : "s"} excluido
                {transferCount === 1 ? "" : "s"}
              </p>
            )}
          </section>

          {/* Trend */}
          <section className="bg-card rounded-xl border p-3">
            <header className="mb-3 flex items-center gap-1.5">
              <TrendingUp className="text-muted-foreground h-3.5 w-3.5" />
              <h3 className="text-xs font-semibold tracking-wider uppercase">
                Últimos 12 meses
              </h3>
            </header>
            <div className="flex items-end gap-1 overflow-x-auto pb-1">
              {trend.map((m) => {
                const incH = (m.income / trendMax) * 100;
                const expH = (m.expense / trendMax) * 100;
                const isCurrent = m.key === monthKey;
                return (
                  <button
                    type="button"
                    key={m.key}
                    onClick={() => jumpTo(m.year, m.month0)}
                    className={cn(
                      "group flex min-w-0 flex-1 flex-col items-center gap-1 rounded-md px-0.5 py-1 transition",
                      isCurrent ? "bg-muted" : "hover:bg-muted/50",
                    )}
                    aria-label={`${MONTH_SHORT[m.month0]} ${m.year}: ingresos ${m.income.toFixed(0)} €, gastos ${m.expense.toFixed(0)} €`}
                  >
                    <div className="flex h-24 w-full items-end justify-center gap-0.5">
                      <div
                        className="w-2 rounded-sm bg-emerald-500/70"
                        style={{ height: `${incH}%` }}
                      />
                      <div
                        className="w-2 rounded-sm bg-rose-500/70"
                        style={{ height: `${expH}%` }}
                      />
                    </div>
                    <span
                      className={cn(
                        "text-[10px] tabular-nums",
                        isCurrent
                          ? "font-semibold"
                          : "text-muted-foreground",
                      )}
                    >
                      {MONTH_SHORT[m.month0]}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="text-muted-foreground mt-2 flex items-center justify-center gap-4 text-[10px]">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-sm bg-emerald-500/70" />
                Ingresos
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-sm bg-rose-500/70" />
                Gastos
              </span>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string;
  tone: "pos" | "neg";
  icon?: React.ReactNode;
}) {
  return (
    <div className="bg-card flex flex-col gap-0.5 rounded-xl border p-3">
      <span className="text-muted-foreground inline-flex items-center gap-1 text-[10px] font-semibold tracking-wider uppercase">
        {icon}
        {label}
      </span>
      <span
        className={cn(
          "text-lg font-semibold tabular-nums",
          tone === "pos" ? "text-emerald-600" : "text-rose-600",
        )}
      >
        {value}
      </span>
    </div>
  );
}
