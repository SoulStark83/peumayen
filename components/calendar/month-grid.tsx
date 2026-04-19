"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  WEEKDAY_LABELS,
  buildMonthGrid,
  dayKeyMadrid,
  formatDayNum,
  formatMonthTitle,
  isSameMonth,
  isToday,
} from "@/lib/date";
import { cn } from "@/lib/utils";

export type DayMarker = {
  count: number;
  schoolLabel?: string;
};

export function MonthGrid({
  year,
  month0,
  selectedKey,
  markers,
  onPrev,
  onNext,
  onSelect,
}: {
  year: number;
  month0: number;
  selectedKey: string | null;
  markers: Map<string, DayMarker>;
  onPrev: () => void;
  onNext: () => void;
  onSelect: (key: string, date: Date) => void;
}) {
  const grid = buildMonthGrid(year, month0);

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-1 py-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onPrev}
          aria-label="Mes anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-sm font-medium">{formatMonthTitle(year, month0)}</div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onNext}
          aria-label="Mes siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="text-muted-foreground grid grid-cols-7 gap-1 px-1 pb-1 text-xs font-medium uppercase">
        {WEEKDAY_LABELS.map((d) => (
          <div key={d} className="flex h-5 items-center justify-center">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 px-1 pb-1">
        {grid.flat().map((d) => {
          const key = dayKeyMadrid(d);
          const inMonth = isSameMonth(d, year, month0);
          const today = isToday(d);
          const selected = selectedKey === key;
          const marker = markers.get(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key, d)}
              className={cn(
                "relative flex aspect-square flex-col items-center justify-center rounded-lg text-sm transition",
                "hover:bg-accent",
                !inMonth && "text-muted-foreground/50",
                selected && "bg-primary text-primary-foreground hover:bg-primary/90",
                !selected && today && "ring-primary ring-1",
              )}
              aria-pressed={selected}
            >
              <span>{formatDayNum(d)}</span>
              {marker && marker.count > 0 && (
                <span
                  className={cn(
                    "absolute bottom-1 flex gap-0.5",
                    selected ? "text-primary-foreground" : "text-primary",
                  )}
                  aria-label={`${marker.count} eventos`}
                >
                  {Array.from({ length: Math.min(marker.count, 3) }).map((_, i) => (
                    <span
                      key={i}
                      className={cn(
                        "h-1 w-1 rounded-full",
                        selected ? "bg-primary-foreground" : "bg-primary",
                      )}
                    />
                  ))}
                </span>
              )}
              {marker?.schoolLabel && (
                <span
                  className={cn(
                    "absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full",
                    selected ? "bg-primary-foreground" : "bg-amber-500",
                  )}
                  aria-label={marker.schoolLabel}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
