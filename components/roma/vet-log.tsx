"use client";

import { Stethoscope, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  useCurrentMember,
  useHousehold,
} from "@/components/providers/household-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { dayKeyMadrid, formatDayMonth, todayISODateMadrid } from "@/lib/date";
import { useRealtimeItems } from "@/lib/hooks/use-realtime-items";
import { createClient } from "@/lib/supabase/client";
import type { Item } from "@/lib/types";
import { cn } from "@/lib/utils";

const KINDS = [
  { value: "vaccine", label: "Vacuna" },
  { value: "checkup", label: "Revisión" },
  { value: "deworming", label: "Desparasitación" },
  { value: "illness", label: "Enfermedad" },
  { value: "other", label: "Otro" },
] as const;
type Kind = (typeof KINDS)[number]["value"];

type VetData = {
  kind: Kind;
  next_due?: string;
};

export function VetLog({ initial }: { initial: Item[] }) {
  const household = useHousehold();
  const currentMember = useCurrentMember();
  const items = useRealtimeItems(household.id, initial, ["vet_visit"]);
  const [open, setOpen] = useState(false);

  const { upcoming, past } = useMemo(() => {
    const today = todayISODateMadrid();
    const upcoming: { item: Item; dueKey: string }[] = [];
    const past: Item[] = [];
    for (const item of items) {
      past.push(item);
      const nextDue = (item.data as VetData)?.next_due;
      if (nextDue && dayKeyMadrid(nextDue) >= today) {
        upcoming.push({ item, dueKey: dayKeyMadrid(nextDue) });
      }
    }
    upcoming.sort((a, b) => a.dueKey.localeCompare(b.dueKey));
    past.sort((a, b) => (b.due_at ?? "").localeCompare(a.due_at ?? ""));
    return { upcoming, past };
  }, [items]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Historial veterinario</h3>
        <Button
          type="button"
          size="sm"
          onClick={() => setOpen(true)}
          className="gap-1.5"
        >
          <Stethoscope className="h-3.5 w-3.5" />
          Registrar
        </Button>
      </div>

      {upcoming.length > 0 && (
        <section>
          <h4 className="text-muted-foreground mb-1.5 text-xs font-semibold tracking-wider uppercase">
            Próximas
          </h4>
          <ul className="flex flex-col gap-1.5">
            {upcoming.map(({ item, dueKey }) => (
              <li
                key={`next-${item.id}`}
                className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2"
              >
                <span className="text-sm font-medium">{item.title}</span>
                <span className="text-muted-foreground text-xs">
                  {formatDayMonth(dueKey)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {past.length === 0 ? (
        <p className="text-muted-foreground py-6 text-center text-sm">
          Aún no hay visitas registradas.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {past.map((item) => (
            <VetRow key={item.id} item={item} />
          ))}
        </ul>
      )}

      <VetFormDialog
        open={open}
        onOpenChange={setOpen}
        householdId={household.id}
        currentMemberId={currentMember.id}
      />
    </div>
  );
}

function VetRow({ item }: { item: Item }) {
  const [busy, setBusy] = useState(false);
  const data = (item.data as VetData) ?? { kind: "other" };
  const kindLabel = KINDS.find((k) => k.value === data.kind)?.label ?? "Otro";

  async function remove() {
    if (busy) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("items").delete().eq("id", item.id);
    setBusy(false);
    if (error) toast.error("No se pudo borrar", { description: error.message });
  }

  return (
    <li
      className={cn(
        "bg-card flex items-start gap-3 rounded-lg border p-3",
        busy && "pointer-events-none opacity-50",
      )}
    >
      <Stethoscope className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-sm font-medium">{item.title}</p>
          <span className="text-muted-foreground shrink-0 text-xs">
            {item.due_at ? formatDayMonth(item.due_at) : ""}
          </span>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-muted-foreground">{kindLabel}</span>
          {data.next_due && (
            <span className="text-amber-700 dark:text-amber-400">
              · próxima {formatDayMonth(data.next_due)}
            </span>
          )}
        </div>
        {item.description && (
          <p className="text-muted-foreground mt-1 text-xs whitespace-pre-wrap">
            {item.description}
          </p>
        )}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={remove}
        disabled={busy}
        className="text-muted-foreground hover:text-destructive h-7 w-7 shrink-0"
        aria-label="Borrar"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </li>
  );
}

function VetFormDialog({
  open,
  onOpenChange,
  householdId,
  currentMemberId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  householdId: string;
  currentMemberId: string;
}) {
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<Kind>("checkup");
  const [date, setDate] = useState(todayISODateMadrid());
  const [nextDue, setNextDue] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || saving) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("items").insert({
      household_id: householdId,
      type: "vet_visit",
      scope: "family",
      title: title.trim(),
      description: notes.trim() || null,
      due_at: `${date}T12:00:00`,
      created_by: currentMemberId,
      data: {
        kind,
        next_due: nextDue || undefined,
      },
    });
    setSaving(false);
    if (error) {
      toast.error("No se pudo guardar", { description: error.message });
      return;
    }
    toast.success("Visita registrada");
    setTitle("");
    setKind("checkup");
    setDate(todayISODateMadrid());
    setNextDue("");
    setNotes("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva visita veterinario</DialogTitle>
        </DialogHeader>
        <form onSubmit={save} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="vet-title">Motivo</Label>
            <Input
              id="vet-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Vacuna antirrábica, revisión…"
              required
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1.5">
              <Label>Tipo</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as Kind)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KINDS.map((k) => (
                    <SelectItem key={k.value} value={k.value}>
                      {k.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="vet-date">Fecha</Label>
              <Input
                id="vet-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="vet-next">Próxima dosis / revisión</Label>
            <Input
              id="vet-next"
              type="date"
              value={nextDue}
              onChange={(e) => setNextDue(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="vet-notes">Notas</Label>
            <Textarea
              id="vet-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Opcional"
            />
          </div>
          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || !title.trim()}>
              {saving ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
