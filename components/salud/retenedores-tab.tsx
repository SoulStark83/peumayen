"use client";

import { AlignJustify, CheckCircle2, Clock, Pencil, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useHousehold } from "@/components/providers/household-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { dayKeyMadrid, relativeDayLabel } from "@/lib/date";
import { useRealtimeItems } from "@/lib/hooks/use-realtime-items";
import {
  computeRetainerState,
  DEFAULT_RETAINER_DAYS,
} from "@/lib/salud/cycle-calc";
import { createClient } from "@/lib/supabase/client";
import type { HealthSettingsData, Item, RetainerChangeData } from "@/lib/types";
import { RetainerChangeDialog } from "./retainer-change-dialog";

export function RetentoresTab({
  memberId,
  householdId,
  initialRetainer,
  initialSettings,
}: {
  memberId: string;
  householdId: string;
  initialRetainer: Item[];
  initialSettings: Item | null;
}) {
  const household = useHousehold();
  const items = useRealtimeItems(household.id, initialRetainer, ["retainer_change"]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDays, setEditingDays] = useState(false);
  const [daysInput, setDaysInput] = useState("");
  const [savingDays, setSavingDays] = useState(false);

  const [localSettings, setLocalSettings] = useState<HealthSettingsData | null>(
    initialSettings?.data as HealthSettingsData | null ?? null,
  );
  const [settingsItemId, setSettingsItemId] = useState<string | null>(
    initialSettings?.id ?? null,
  );

  const totalDays = localSettings?.retainer_change_days ?? DEFAULT_RETAINER_DAYS;

  async function saveDays() {
    const val = parseInt(daysInput, 10);
    if (!val || val < 1 || val > 365) {
      toast.error("Introduce un número de días válido (1–365)");
      return;
    }
    setSavingDays(true);
    const supabase = createClient();
    const newSettings: HealthSettingsData = {
      cycle_length: localSettings?.cycle_length ?? 28,
      period_duration: localSettings?.period_duration ?? 5,
      retainer_change_days: val,
      retainer_start_type: localSettings?.retainer_start_type ?? "A",
    };

    let error;
    if (settingsItemId) {
      ({ error } = await supabase
        .from("items")
        .update({ data: newSettings })
        .eq("id", settingsItemId));
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from("items")
        .insert({
          household_id: householdId,
          type: "health_settings",
          scope: "personal",
          title: "Ajustes de salud",
          data: newSettings,
          created_by: memberId,
        })
        .select("id")
        .single();
      error = insertError;
      if (inserted) setSettingsItemId(inserted.id);
    }

    setSavingDays(false);
    if (error) {
      toast.error("No se pudo guardar", { description: error.message });
      return;
    }
    setLocalSettings(newSettings);
    setEditingDays(false);
    toast.success(`Intervalo actualizado a ${val} días`);
  }

  const filtered = useMemo(
    () => items.filter((i) => i.type === "retainer_change" && i.created_by === memberId),
    [items, memberId],
  );

  const state = useMemo(() => computeRetainerState(filtered, localSettings), [filtered, localSettings]);

  const history = useMemo(
    () =>
      [...filtered].sort((a, b) =>
        (b.due_at ?? b.created_at).localeCompare(a.due_at ?? a.created_at),
      ),
    [filtered],
  );

  const progressPct = state
    ? Math.min(100, ((state.dayNumber - 1) / state.totalDays) * 100)
    : 0;

  async function deleteEntry(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("items").delete().eq("id", id);
    if (error) toast.error("No se pudo borrar", { description: error.message });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Current state card */}
      <div className="bg-card rounded-xl border p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
              Retenedor actual
            </p>
            {state ? (
              <>
                <p className="text-2xl font-bold">Tipo {state.currentType}</p>
                <p className="text-muted-foreground text-sm">
                  Día {state.dayNumber} de {state.totalDays}
                </p>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">Sin registro todavía</p>
            )}
          </div>
          <AlignJustify className="text-muted-foreground h-7 w-7" />
        </div>

        {state && (
          <>
            <Progress value={progressPct} className="mb-2 h-2" />
            <div className="mb-3 flex items-center gap-1.5">
              {state.overdueBy > 0 ? (
                <Badge variant="destructive">
                  Vencido hace {state.overdueBy} {state.overdueBy === 1 ? "día" : "días"}
                </Badge>
              ) : state.daysLeft === 0 ? (
                <Badge variant="destructive">¡Cambiar hoy!</Badge>
              ) : state.daysLeft <= 2 ? (
                <Badge className="bg-amber-500 text-white hover:bg-amber-500">
                  Cambiar en {state.daysLeft} {state.daysLeft === 1 ? "día" : "días"}
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <Clock className="mr-1 h-3 w-3" />
                  {state.daysLeft} días restantes
                </Badge>
              )}
            </div>
          </>
        )}

        <Button
          className="w-full"
          onClick={() => setDialogOpen(true)}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Registrar cambio de retenedor
        </Button>

        {/* Interval setting */}
        <div className="border-t pt-3 mt-1">
          {editingDays ? (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs shrink-0">Cambiar cada</span>
              <input
                type="number"
                min={1}
                max={365}
                value={daysInput}
                onChange={(e) => setDaysInput(e.target.value)}
                className="border-input bg-background focus-visible:ring-ring h-8 w-20 rounded-md border px-2 text-sm tabular-nums focus-visible:ring-1 focus-visible:outline-none"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") saveDays(); if (e.key === "Escape") setEditingDays(false); }}
              />
              <span className="text-muted-foreground text-xs shrink-0">días</span>
              <Button size="sm" onClick={saveDays} disabled={savingDays} className="ml-auto h-7 text-xs">
                {savingDays ? "…" : "Guardar"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingDays(false)} className="h-7 text-xs">
                Cancelar
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => { setDaysInput(String(totalDays)); setEditingDays(true); }}
              className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs transition"
            >
              <Pencil className="h-3 w-3" />
              Cambiar cada {totalDays} días · tocar para editar
            </button>
          )}
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <section>
          <h3 className="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wider">
            Historial
          </h3>
          <ul className="flex flex-col gap-1.5">
            {history.map((item, idx) => {
              const data = item.data as RetainerChangeData;
              const dateStr = item.due_at ?? item.created_at;
              const isCurrent = idx === 0;

              // Days worn (until next change or today)
              const nextItem = idx > 0 ? history[idx - 1] : null;
              const endDate = nextItem
                ? dayKeyMadrid(nextItem.due_at ?? nextItem.created_at)
                : dayKeyMadrid(new Date());
              const startDate = dayKeyMadrid(dateStr);
              const daysWorn = Math.max(
                1,
                Math.round(
                  (new Date(endDate + "T12:00:00Z").getTime() -
                    new Date(startDate + "T12:00:00Z").getTime()) /
                    86_400_000,
                ) + 1,
              );

              return (
                <li
                  key={item.id}
                  className="bg-card flex items-center gap-3 rounded-lg border px-3 py-2.5"
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      data.retainer_type === "A"
                        ? "bg-sky-100 text-sky-700 dark:bg-sky-900/40"
                        : "bg-violet-100 text-violet-700 dark:bg-violet-900/40"
                    }`}
                  >
                    {data.retainer_type}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      Tipo {data.retainer_type}
                      {isCurrent && (
                        <span className="text-muted-foreground ml-1.5 text-xs">(actual)</span>
                      )}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {relativeDayLabel(dateStr)} · {daysWorn}{" "}
                      {daysWorn === 1 ? "día" : "días"} llevado
                    </p>
                    {data.notes && (
                      <p className="text-muted-foreground mt-0.5 truncate text-xs italic">
                        {data.notes}
                      </p>
                    )}
                  </div>
                  {isCurrent && (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <RetainerChangeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        memberId={memberId}
        householdId={householdId}
        suggestedType={state ? (state.currentType === "A" ? "B" : "A") : "A"}
      />
    </div>
  );
}
