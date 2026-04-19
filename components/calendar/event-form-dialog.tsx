"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentMember, useHousehold } from "@/components/providers/household-provider";
import { createClient } from "@/lib/supabase/client";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Preselected YYYY-MM-DD for new events. */
  defaultDateKey: string;
};

export function EventFormDialog({ open, onOpenChange, defaultDateKey }: Props) {
  const household = useHousehold();
  const currentMember = useCurrentMember();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(defaultDateKey);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [allDay, setAllDay] = useState(false);
  const [location, setLocation] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setDate(defaultDateKey);
      setTitle("");
      setDescription("");
      setStartTime("09:00");
      setEndTime("10:00");
      setAllDay(false);
      setLocation("");
    }
  }, [open, defaultDateKey]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || saving) return;
    setSaving(true);

    const startAt = allDay
      ? `${date}T00:00:00`
      : `${date}T${startTime}:00`;
    const endAt = allDay
      ? null
      : endTime
        ? `${date}T${endTime}:00`
        : null;

    const supabase = createClient();
    const { error } = await supabase.from("items").insert({
      household_id: household.id,
      type: "event",
      scope: "family",
      title: title.trim(),
      description: description.trim() || null,
      due_at: startAt,
      created_by: currentMember.id,
      data: {
        start_at: startAt,
        end_at: endAt,
        location: location.trim() || undefined,
        all_day: allDay,
      },
    });

    setSaving(false);
    if (error) {
      toast.error("No se pudo crear el evento", { description: error.message });
      return;
    }
    toast.success("Evento creado");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo evento</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="event-title">Título</Label>
            <Input
              id="event-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Cumpleaños, cita médica…"
              required
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="event-date">Fecha</Label>
            <Input
              id="event-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="event-all-day"
              checked={allDay}
              onCheckedChange={(v) => setAllDay(v === true)}
            />
            <Label htmlFor="event-all-day" className="font-normal">
              Todo el día
            </Label>
          </div>

          {!allDay && (
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="event-start">Inicio</Label>
                <Input
                  id="event-start"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="event-end">Fin</Label>
                <Input
                  id="event-end"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="event-location">Lugar</Label>
            <Input
              id="event-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Opcional"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="event-description">Notas</Label>
            <Textarea
              id="event-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
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
              {saving ? "Guardando…" : "Crear evento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
