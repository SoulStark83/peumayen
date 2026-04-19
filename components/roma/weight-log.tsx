"use client";

import { Scale, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  useCurrentMember,
  useHousehold,
} from "@/components/providers/household-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDayMonth, todayISODateMadrid } from "@/lib/date";
import { useRealtimeItems } from "@/lib/hooks/use-realtime-items";
import { createClient } from "@/lib/supabase/client";
import type { Item } from "@/lib/types";

type WeightData = { kg: number };

export function WeightLog({ initial }: { initial: Item[] }) {
  const household = useHousehold();
  const currentMember = useCurrentMember();
  const entries = useRealtimeItems(household.id, initial, ["weight"]);

  const [kg, setKg] = useState("");
  const [date, setDate] = useState(todayISODateMadrid());
  const [saving, setSaving] = useState(false);

  const sorted = useMemo(
    () =>
      [...entries].sort((a, b) =>
        (b.due_at ?? "").localeCompare(a.due_at ?? ""),
      ),
    [entries],
  );

  const latest = sorted[0];
  const latestKg = latest ? (latest.data as WeightData).kg : null;
  const prevKg =
    sorted.length > 1 ? (sorted[1].data as WeightData).kg : null;
  const delta =
    latestKg !== null && prevKg !== null ? latestKg - prevKg : null;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const val = parseFloat(kg.replace(",", "."));
    if (Number.isNaN(val) || val <= 0 || val > 100) {
      toast.error("Peso inválido (kg)");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("items").insert({
      household_id: household.id,
      type: "weight",
      scope: "family",
      title: `${val.toFixed(1)} kg`,
      due_at: `${date}T12:00:00`,
      created_by: currentMember.id,
      data: { kg: val },
    });
    setSaving(false);
    if (error) {
      toast.error("No se pudo guardar", { description: error.message });
      return;
    }
    toast.success("Peso registrado");
    setKg("");
  }

  async function remove(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("items").delete().eq("id", id);
    if (error) toast.error("No se pudo borrar", { description: error.message });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-card flex items-center gap-4 rounded-xl border p-4">
        <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-full">
          <Scale className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
            Peso actual
          </p>
          <p className="text-lg font-semibold tabular-nums">
            {latestKg !== null ? `${latestKg.toFixed(1)} kg` : "—"}
          </p>
          {delta !== null && (
            <p
              className={`text-xs tabular-nums ${
                delta > 0
                  ? "text-rose-600"
                  : delta < 0
                    ? "text-emerald-600"
                    : "text-muted-foreground"
              }`}
            >
              {delta > 0 ? "+" : ""}
              {delta.toFixed(1)} kg desde el anterior
            </p>
          )}
        </div>
      </div>

      <form onSubmit={save} className="flex items-end gap-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="weight-kg" className="text-xs">
            Kg
          </Label>
          <Input
            id="weight-kg"
            inputMode="decimal"
            value={kg}
            onChange={(e) => setKg(e.target.value)}
            placeholder="7,4"
            className="w-24"
            required
          />
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="weight-date" className="text-xs">
            Fecha
          </Label>
          <Input
            id="weight-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        <Button type="submit" disabled={saving || !kg}>
          {saving ? "…" : "Guardar"}
        </Button>
      </form>

      {sorted.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {sorted.map((item) => {
            const d = item.data as WeightData;
            return (
              <li
                key={item.id}
                className="bg-card flex items-center gap-3 rounded-lg border px-3 py-2"
              >
                <span className="text-sm font-semibold tabular-nums">
                  {d.kg.toFixed(1)} kg
                </span>
                <span className="text-muted-foreground text-xs">
                  {item.due_at ? formatDayMonth(item.due_at) : ""}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(item.id)}
                  className="text-muted-foreground hover:text-destructive ml-auto h-7 w-7"
                  aria-label="Borrar"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
