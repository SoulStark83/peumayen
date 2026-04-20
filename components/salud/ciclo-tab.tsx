"use client";

import { useMemo, useState } from "react";
import { useHousehold } from "@/components/providers/household-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { dayKeyMadrid, formatDayMonth, relativeDayLabel } from "@/lib/date";
import { useRealtimeItems } from "@/lib/hooks/use-realtime-items";
import {
  avgCycleLength,
  avgPeriodDuration,
  buildCycles,
  computeCycleState,
  PHASE_BG,
  PHASE_COLOR,
  PHASE_LABEL,
} from "@/lib/salud/cycle-calc";
import type { HealthSettingsData, Item, PeriodDayData } from "@/lib/types";
import { CicloCalendar } from "./ciclo-calendar";
import { CicloDaySheet } from "./ciclo-day-sheet";

export function CicloTab({
  memberId,
  householdId,
  initialPeriod,
  initialSettings,
}: {
  memberId: string;
  householdId: string;
  initialPeriod: Item[];
  initialSettings: Item | null;
}) {
  const household = useHousehold();
  const allItems = useRealtimeItems(household.id, initialPeriod, ["period_day"]);
  const [sheetDate, setSheetDate] = useState<string | null>(null);

  const items = useMemo(
    () => allItems.filter((i) => i.type === "period_day" && i.created_by === memberId),
    [allItems, memberId],
  );

  const settings = initialSettings?.data as HealthSettingsData | null;
  const state = useMemo(() => computeCycleState(items, settings), [items, settings]);
  const cycles = useMemo(() => buildCycles(items), [items]);
  const avgCycleDays = useMemo(() => avgCycleLength(cycles), [cycles]);
  const avgPeriodDays = useMemo(() => avgPeriodDuration(cycles), [cycles]);

  const sheetItem = useMemo(() => {
    if (!sheetDate) return null;
    return items.find((i) => i.due_at && dayKeyMadrid(i.due_at) === sheetDate) ?? null;
  }, [items, sheetDate]);

  const today = dayKeyMadrid(new Date());
  const todayItem = useMemo(
    () => items.find((i) => i.due_at && dayKeyMadrid(i.due_at) === today) ?? null,
    [items, today],
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Phase card */}
      <div className={`rounded-xl border p-4 ${PHASE_BG[state.phase]}`}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
              Fase actual
            </p>
            <p className={`text-2xl font-bold ${PHASE_COLOR[state.phase]}`}>
              {PHASE_LABEL[state.phase]}
            </p>
            {state.cycleDay !== null && (
              <p className="text-muted-foreground text-sm">
                Día {state.cycleDay} del ciclo
              </p>
            )}
          </div>
          <div className="text-right">
            {state.nextPeriodDate && (
              <div>
                <p className="text-muted-foreground text-xs">Próxima regla</p>
                <p className="text-sm font-semibold">
                  {state.daysUntilNextPeriod === 0
                    ? "Hoy"
                    : state.daysUntilNextPeriod === 1
                    ? "Mañana"
                    : state.daysUntilNextPeriod !== null && state.daysUntilNextPeriod > 0
                    ? `En ${state.daysUntilNextPeriod} días`
                    : formatDayMonth(state.nextPeriodDate)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Fertile / ovulation info */}
        {state.phase === "follicular" && state.ovulationDate && (
          <p className="text-muted-foreground mt-2 text-xs">
            Ovulación estimada: {relativeDayLabel(state.ovulationDate + "T12:00:00Z")} ·{" "}
            Ventana fértil: {formatDayMonth(state.fertileStart!)} – {formatDayMonth(state.fertileEnd!)}
          </p>
        )}
        {state.phase === "ovulation" && (
          <p className="mt-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
            Estás en tu día de ovulación estimado
          </p>
        )}
        {state.phase === "pms" && (
          <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-300">
            Fase premenstrual · cuídate mucho
          </p>
        )}
      </div>

      {/* Log today button */}
      <Button
        variant={todayItem ? "outline" : "default"}
        className="w-full"
        onClick={() => setSheetDate(today)}
      >
        {todayItem ? "✏️ Editar registro de hoy" : "🩸 Registrar cómo estás hoy"}
      </Button>

      {/* Calendar */}
      <CicloCalendar
        periodItems={items}
        cycleState={state}
        onDayPress={setSheetDate}
      />

      {/* Stats */}
      <section>
        <h3 className="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wider">
          Estadísticas
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-card rounded-xl border p-3 text-center">
            <p className="text-2xl font-bold">{avgCycleDays}</p>
            <p className="text-muted-foreground text-xs">Duración media ciclo</p>
          </div>
          <div className="bg-card rounded-xl border p-3 text-center">
            <p className="text-2xl font-bold">{avgPeriodDays}</p>
            <p className="text-muted-foreground text-xs">Duración media regla</p>
          </div>
          <div className="bg-card col-span-2 rounded-xl border p-3 text-center">
            <p className="text-2xl font-bold">{cycles.length}</p>
            <p className="text-muted-foreground text-xs">
              {cycles.length === 1 ? "Ciclo registrado" : "Ciclos registrados"}
            </p>
          </div>
        </div>
      </section>

      {/* Cycle history */}
      {cycles.length > 0 && (
        <section>
          <h3 className="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wider">
            Historial de ciclos
          </h3>
          <ul className="flex flex-col gap-1.5">
            {cycles.map((cycle, idx) => (
              <li key={cycle.startDate} className="bg-card flex items-center gap-3 rounded-lg border px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {formatDayMonth(cycle.startDate + "T12:00:00Z")}
                    {cycle.endDate && ` – ${formatDayMonth(cycle.endDate + "T12:00:00Z")}`}
                  </p>
                  {cycle.endDate && (
                    <p className="text-muted-foreground text-xs">
                      {Math.round(
                        (new Date(cycle.endDate + "T12:00:00Z").getTime() -
                          new Date(cycle.startDate + "T12:00:00Z").getTime()) /
                          86_400_000,
                      ) + 1}{" "}
                      días de regla
                    </p>
                  )}
                </div>
                {cycle.length && (
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    Ciclo {cycle.length}d
                  </Badge>
                )}
                {idx === 0 && !cycle.length && (
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    Actual
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Day sheet */}
      {sheetDate !== null && (
        <CicloDaySheet
          open
          onOpenChange={(v) => { if (!v) setSheetDate(null); }}
          dateKey={sheetDate}
          memberId={memberId}
          householdId={householdId}
          existingItem={sheetItem}
        />
      )}
    </div>
  );
}
