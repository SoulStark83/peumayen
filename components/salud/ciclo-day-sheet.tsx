"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { formatDayMonth } from "@/lib/date";
import { FLOW_LABEL } from "@/lib/salud/cycle-calc";
import { createClient } from "@/lib/supabase/client";
import type {
  DischargeType,
  FlowLevel,
  HealthSettingsData,
  Item,
  PeriodDayData,
  PeriodMood,
  PeriodSymptom,
} from "@/lib/types";

const SYMPTOMS: { value: PeriodSymptom; label: string; emoji: string }[] = [
  { value: "cramps", label: "Calambres", emoji: "😣" },
  { value: "headache", label: "Dolor de cabeza", emoji: "🤕" },
  { value: "bloating", label: "Hinchazón", emoji: "😮‍💨" },
  { value: "breast_tenderness", label: "Sensibilidad pecho", emoji: "💢" },
  { value: "back_pain", label: "Dolor lumbar", emoji: "🔙" },
  { value: "acne", label: "Acné", emoji: "😤" },
  { value: "nausea", label: "Náuseas", emoji: "🤢" },
  { value: "fatigue", label: "Fatiga", emoji: "😴" },
  { value: "insomnia", label: "Insomnio", emoji: "🌙" },
  { value: "constipation", label: "Estreñimiento", emoji: "🫤" },
  { value: "diarrhea", label: "Diarrea", emoji: "🚽" },
  { value: "dizziness", label: "Mareos", emoji: "💫" },
];

const MOODS: { value: PeriodMood; label: string; emoji: string }[] = [
  { value: "happy", label: "Feliz", emoji: "😊" },
  { value: "calm", label: "Tranquila", emoji: "😌" },
  { value: "energetic", label: "Con energía", emoji: "⚡" },
  { value: "mood_swings", label: "Cambios de humor", emoji: "🎭" },
  { value: "irritable", label: "Irritable", emoji: "😤" },
  { value: "sad", label: "Triste", emoji: "😔" },
  { value: "anxious", label: "Ansiosa", emoji: "😰" },
  { value: "tired", label: "Cansada", emoji: "😩" },
];

const DISCHARGE_OPTIONS: { value: DischargeType; label: string }[] = [
  { value: "none", label: "Ninguno" },
  { value: "white_creamy", label: "Blanco/cremoso" },
  { value: "clear_stretchy", label: "Transparente/elástico" },
  { value: "yellow_green", label: "Amarillo/verdoso" },
  { value: "brown", label: "Marrón" },
];

function toggle<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
}

export function CicloDaySheet({
  open,
  onOpenChange,
  dateKey,
  memberId,
  householdId,
  existingItem,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  dateKey: string;
  memberId: string;
  householdId: string;
  existingItem: Item | null;
}) {
  const existing = existingItem?.data as PeriodDayData | null;

  const [isPeriod, setIsPeriod] = useState(existing?.is_period ?? false);
  const [flow, setFlow] = useState<FlowLevel | undefined>(existing?.flow);
  const [symptoms, setSymptoms] = useState<PeriodSymptom[]>(existing?.symptoms ?? []);
  const [mood, setMood] = useState<PeriodMood[]>(existing?.mood ?? []);
  const [sexualActivity, setSexualActivity] = useState(existing?.sexual_activity ?? false);
  const [discharge, setDischarge] = useState<DischargeType | undefined>(existing?.discharge);
  const [temperature, setTemperature] = useState(
    existing?.temperature?.toString() ?? "",
  );
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [busy, setBusy] = useState(false);

  const displayDate = formatDayMonth(dateKey + "T12:00:00Z");

  async function save() {
    setBusy(true);
    const supabase = createClient();
    const data: PeriodDayData = {
      is_period: isPeriod,
      ...(isPeriod && flow ? { flow } : {}),
      ...(symptoms.length ? { symptoms } : {}),
      ...(mood.length ? { mood } : {}),
      ...(sexualActivity ? { sexual_activity: true } : {}),
      ...(discharge && discharge !== "none" ? { discharge } : {}),
      ...(temperature ? { temperature: parseFloat(temperature) } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };

    let error;
    if (existingItem) {
      ({ error } = await supabase
        .from("items")
        .update({ data, title: `Ciclo ${dateKey}` })
        .eq("id", existingItem.id));
    } else {
      ({ error } = await supabase.from("items").insert({
        household_id: householdId,
        type: "period_day",
        scope: "personal",
        title: `Ciclo ${dateKey}`,
        data,
        due_at: `${dateKey}T12:00:00+02:00`,
        created_by: memberId,
      }));
    }

    setBusy(false);
    if (error) {
      toast.error("No se pudo guardar", { description: error.message });
      return;
    }
    toast.success("Día guardado");
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90dvh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="pb-2">
          <SheetTitle className="capitalize">{displayDate}</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-5 py-2">
          {/* Period toggle */}
          <div>
            <Label className="mb-2 block text-sm font-semibold">¿Tienes la regla?</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsPeriod(true)}
                className={`rounded-xl border-2 py-3 text-sm font-medium transition ${
                  isPeriod
                    ? "border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-900/30"
                    : "border-border bg-card text-muted-foreground"
                }`}
              >
                🩸 Sí
              </button>
              <button
                type="button"
                onClick={() => setIsPeriod(false)}
                className={`rounded-xl border-2 py-3 text-sm font-medium transition ${
                  !isPeriod
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground"
                }`}
              >
                No
              </button>
            </div>
          </div>

          {/* Flow (only when period) */}
          {isPeriod && (
            <div>
              <Label className="mb-2 block text-sm font-semibold">Flujo</Label>
              <div className="grid grid-cols-4 gap-1.5">
                {(["spotting", "light", "medium", "heavy"] as FlowLevel[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFlow(f === flow ? undefined : f)}
                    className={`rounded-lg border py-2 text-xs font-medium transition ${
                      flow === f
                        ? "border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-900/30"
                        : "border-border bg-card text-muted-foreground"
                    }`}
                  >
                    {FLOW_LABEL[f]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Symptoms */}
          <div>
            <Label className="mb-2 block text-sm font-semibold">Síntomas</Label>
            <div className="flex flex-wrap gap-1.5">
              {SYMPTOMS.map(({ value, label, emoji }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSymptoms(toggle(symptoms, value))}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                    symptoms.includes(value)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground"
                  }`}
                >
                  {emoji} {label}
                </button>
              ))}
            </div>
          </div>

          {/* Mood */}
          <div>
            <Label className="mb-2 block text-sm font-semibold">Estado de ánimo</Label>
            <div className="flex flex-wrap gap-1.5">
              {MOODS.map(({ value, label, emoji }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMood(toggle(mood, value))}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                    mood.includes(value)
                      ? "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-900/30"
                      : "border-border bg-card text-muted-foreground"
                  }`}
                >
                  {emoji} {label}
                </button>
              ))}
            </div>
          </div>

          {/* Discharge */}
          <div>
            <Label className="mb-2 block text-sm font-semibold">Flujo vaginal</Label>
            <div className="flex flex-wrap gap-1.5">
              {DISCHARGE_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDischarge(value === discharge ? undefined : value)}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                    discharge === value
                      ? "border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-900/30"
                      : "border-border bg-card text-muted-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Sexual activity */}
          <div>
            <Label className="mb-2 block text-sm font-semibold">Actividad sexual</Label>
            <button
              type="button"
              onClick={() => setSexualActivity(!sexualActivity)}
              className={`rounded-xl border-2 px-4 py-2 text-sm font-medium transition ${
                sexualActivity
                  ? "border-pink-500 bg-pink-50 text-pink-700 dark:bg-pink-900/30"
                  : "border-border bg-card text-muted-foreground"
              }`}
            >
              {sexualActivity ? "💕 Sí" : "Sin actividad"}
            </button>
          </div>

          {/* Temperature */}
          <div>
            <Label htmlFor="temp" className="mb-1 block text-sm font-semibold">
              Temperatura basal <span className="text-muted-foreground font-normal">(°C, opcional)</span>
            </Label>
            <input
              id="temp"
              type="number"
              step="0.1"
              min="35"
              max="40"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              placeholder="36.5"
              className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring h-9 w-32 rounded-md border px-3 text-sm focus-visible:ring-1 focus-visible:outline-none"
            />
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="cycle-notes" className="mb-1 block text-sm font-semibold">
              Notas <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Textarea
              id="cycle-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Cómo te has sentido hoy…"
              rows={2}
              className="resize-none"
            />
          </div>
        </div>

        <SheetFooter className="pt-4">
          <Button className="w-full" onClick={save} disabled={busy}>
            {busy ? "Guardando…" : "Guardar día"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
