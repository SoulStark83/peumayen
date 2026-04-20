"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { todayISODateMadrid } from "@/lib/date";
import { createClient } from "@/lib/supabase/client";
import type { RetainerType } from "@/lib/types";

export function RetainerChangeDialog({
  open,
  onOpenChange,
  memberId,
  householdId,
  suggestedType,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  memberId: string;
  householdId: string;
  suggestedType: RetainerType;
}) {
  const [type, setType] = useState<RetainerType>(suggestedType);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  // Reset suggested type when dialog opens
  function handleOpenChange(v: boolean) {
    if (v) setType(suggestedType);
    onOpenChange(v);
  }

  async function save() {
    setBusy(true);
    const supabase = createClient();
    const today = todayISODateMadrid();
    const { error } = await supabase.from("items").insert({
      household_id: householdId,
      type: "retainer_change",
      scope: "personal",
      title: `Retenedor tipo ${type}`,
      data: { retainer_type: type, notes: notes.trim() || undefined },
      due_at: `${today}T12:00:00+02:00`,
      created_by: memberId,
    });
    setBusy(false);
    if (error) {
      toast.error("No se pudo guardar", { description: error.message });
      return;
    }
    toast.success(`Retenedor tipo ${type} registrado`);
    setNotes("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Cambio de retenedor</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div>
            <Label className="mb-2 block text-sm">Tipo de retenedor</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["A", "B"] as RetainerType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`rounded-xl border-2 py-4 text-lg font-bold transition ${
                    type === t
                      ? t === "A"
                        ? "border-sky-500 bg-sky-50 text-sky-700 dark:bg-sky-900/30"
                        : "border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-900/30"
                      : "border-border bg-card text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  Tipo {t}
                  {t === suggestedType && (
                    <span className="block text-xs font-normal opacity-70">sugerido</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="retainer-notes" className="mb-1 block text-sm">
              Notas <span className="text-muted-foreground">(opcional)</span>
            </Label>
            <Textarea
              id="retainer-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: revisión en 2 semanas"
              rows={2}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={busy}>
            {busy ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
