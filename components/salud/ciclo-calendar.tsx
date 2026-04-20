"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  buildMonthGrid,
  dayKeyMadrid,
  formatDayNum,
  formatMonthTitle,
  isSameMonth,
  isToday,
  shiftMonth,
  WEEKDAY_LABELS,
} from "@/lib/date";
import { type CycleState, type DayKind } from "@/lib/salud/cycle-calc";
import type { Item, PeriodDayData } from "@/lib/types";

function dayDotColor(kind: DayKind, isLogged: boolean): string {
  if (isLogged) return "bg-rose-500";
  switch (kind) {
    case "ovulation": return "bg-emerald-500";
    case "fertile": return "bg-emerald-300";
    case "pms": return "bg-amber-400";
    default: return "";
  }
}

function cellBg(kind: DayKind, isLogged: boolean): string {
  if (isLogged) return "bg-rose-100 dark:bg-rose-900/30";
  switch (kind) {
    case "ovulation": return "bg-emerald-100 dark:bg-emerald-900/30";
    case "fertile": return "bg-emerald-50 dark:bg-emerald-900/20";
    case "pms": return "bg-amber-50 dark:bg-amber-900/20";
    default: return "";
  }
}

export function CicloCalendar({
  periodItems,
  cycleState,
  onDayPress,
}: {
  periodItems: Item[];
  cycleState: CycleState;
  onDayPress: (dateKey: string) => void;
}) {
  const today = new Date();
  const [year, setYear] = useState(today.getUTCFullYear());
  const [month0, setMonth0] = useState(today.getUTCMonth());

  const loggedDays = useMemo(() => {
    const map = new Map<string, Item>();
    for (const item of periodItems) {
      if (item.due_at) {
        map.set(dayKeyMadrid(item.due_at), item);
      }
    }
    return map;
  }, [periodItems]);

  const grid = useMemo(() => buildMonthGrid(year, month0), [year, month0]);

  function prev() {
    const s = shiftMonth(year, month0, -1);
    setYear(s.year);
    setMonth0(s.month0);
  }
  function next() {
    const s = shiftMonth(year, month0, 1);
    setYear(s.year);
    setMonth0(s.month0);
  }

  const { fertileStart, fertileEnd, ovulationDate, pmsStart, nextPeriodDate } = cycleState;

  function kindForDate(dateStr: string): DayKind {
    if (!nextPeriodDate) return "none";
    if (dateStr === ovulationDate) return "ovulation";
    if (fertileStart && fertileEnd && dateStr >= fertileStart && dateStr <= fertileEnd)
      return "fertile";
    if (pmsStart && dateStr >= pmsStart && dateStr < (nextPeriodDate ?? "")) return "pms";
    return "none";
  }

  return (
    <div className="bg-card rounded-xl border p-3">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between px-1">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prev}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <p className="text-sm font-semibold capitalize">{formatMonthTitle(year, month0)}</p>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={next}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Weekday labels */}
      <div className="mb-1 grid grid-cols-7 text-center">
        {WEEKDAY_LABELS.map((l) => (
          <div key={l} className="text-muted-foreground text-[10px] font-semibold py-0.5">
            {l}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {grid.flat().map((d) => {
          const dateStr = dayKeyMadrid(d);
          const inMonth = isSameMonth(d, year, month0);
          const today_ = isToday(d);
          const loggedItem = loggedDays.get(dateStr);
          const isLogged = !!(loggedItem && (loggedItem.data as PeriodDayData).is_period);
          const kind = inMonth ? kindForDate(dateStr) : "none";
          const dot = inMonth ? dayDotColor(kind, isLogged) : "";
          const bg = inMonth ? cellBg(kind, isLogged) : "";

          return (
            <button
              key={dateStr}
              type="button"
              disabled={!inMonth}
              onClick={() => inMonth && onDayPress(dateStr)}
              className={`relative flex flex-col items-center justify-center rounded-lg py-1 transition ${
                inMonth ? "hover:bg-muted/60 cursor-pointer" : "cursor-default"
              } ${bg}`}
            >
              <span
                className={`text-xs font-medium leading-tight ${
                  !inMonth
                    ? "text-muted-foreground/30"
                    : today_
                    ? "text-primary font-bold"
                    : "text-foreground"
                }`}
              >
                {formatDayNum(d)}
              </span>
              {dot && (
                <span className={`mt-0.5 h-1.5 w-1.5 rounded-full ${dot}`} />
              )}
              {!dot && inMonth && <span className="mt-0.5 h-1.5 w-1.5" />}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 px-1">
        {[
          { color: "bg-rose-500", label: "Regla" },
          { color: "bg-emerald-300", label: "Fértil" },
          { color: "bg-emerald-500", label: "Ovulación" },
          { color: "bg-amber-400", label: "SPM" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1">
            <span className={`h-2 w-2 rounded-full ${color}`} />
            <span className="text-muted-foreground text-[10px]">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
