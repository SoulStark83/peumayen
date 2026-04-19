"use client";

import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useHousehold } from "@/components/providers/household-provider";
import { CalendarDays } from "lucide-react";
import { useRealtimeItems } from "@/lib/hooks/use-realtime-items";
import {
  dayKeyMadrid,
  shiftMonth,
  todayISODateMadrid,
} from "@/lib/date";
import type { EventData, Item } from "@/lib/types";
import { DayEventsList } from "./day-events-list";
import { EventFormDialog } from "./event-form-dialog";
import { MonthGrid, type DayMarker } from "./month-grid";

type SchoolEntry = { date: string; label: string };

export function CalendarView({
  initialEvents,
  schoolEntries,
}: {
  initialEvents: Item[];
  schoolEntries: SchoolEntry[];
}) {
  const household = useHousehold();
  const events = useRealtimeItems(household.id, initialEvents, ["event"]);

  const today = todayISODateMadrid();
  const now = new Date();
  const [cursor, setCursor] = useState({
    year: now.getUTCFullYear(),
    month0: now.getUTCMonth(),
  });
  const [selectedKey, setSelectedKey] = useState<string>(today);
  const [formOpen, setFormOpen] = useState(false);

  const schoolMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of schoolEntries) m.set(e.date, e.label);
    return m;
  }, [schoolEntries]);

  const markers = useMemo(() => {
    const m = new Map<string, DayMarker>();
    for (const item of events) {
      const data = item.data as EventData;
      const iso = data.start_at ?? item.due_at;
      if (!iso) continue;
      const key = dayKeyMadrid(iso);
      const current = m.get(key) ?? { count: 0 };
      current.count += 1;
      m.set(key, current);
    }
    for (const [date, label] of schoolMap) {
      const current = m.get(date) ?? { count: 0 };
      current.schoolLabel = label;
      m.set(date, current);
    }
    return m;
  }, [events, schoolMap]);

  const selectedEvents = useMemo(() => {
    return events
      .filter((item) => {
        const data = item.data as EventData;
        const iso = data.start_at ?? item.due_at;
        return iso ? dayKeyMadrid(iso) === selectedKey : false;
      })
      .sort((a, b) => {
        const aIso = (a.data as EventData).start_at ?? a.due_at ?? "";
        const bIso = (b.data as EventData).start_at ?? b.due_at ?? "";
        return aIso.localeCompare(bIso);
      });
  }, [events, selectedKey]);

  function handleSelect(key: string, date: Date) {
    setSelectedKey(key);
    setCursor({ year: date.getUTCFullYear(), month0: date.getUTCMonth() });
  }

  function handleToday() {
    setSelectedKey(today);
    const now = new Date();
    setCursor({ year: now.getUTCFullYear(), month0: now.getUTCMonth() });
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleToday}
          className="gap-1.5"
        >
          <CalendarDays className="h-4 w-4" />
          Hoy
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => setFormOpen(true)}
          className="gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Nuevo
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-4xl p-4">
          <MonthGrid
            year={cursor.year}
            month0={cursor.month0}
            selectedKey={selectedKey}
            markers={markers}
            onPrev={() => setCursor((c) => shiftMonth(c.year, c.month0, -1))}
            onNext={() => setCursor((c) => shiftMonth(c.year, c.month0, 1))}
            onSelect={handleSelect}
          />
          <div className="mt-4">
            <DayEventsList
              dayKey={selectedKey}
              events={selectedEvents}
              schoolLabel={schoolMap.get(selectedKey) ?? null}
            />
          </div>
        </div>
      </div>

      <EventFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        defaultDateKey={selectedKey}
      />
    </div>
  );
}
