"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
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
import {
  useCurrentMember,
  useHousehold,
  useMembers,
} from "@/components/providers/household-provider";
import { createClient } from "@/lib/supabase/client";

const UNASSIGNED = "__unassigned";

export function TaskFormDialog({
  open,
  onOpenChange,
  kind,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: "task" | "note";
}) {
  const household = useHousehold();
  const currentMember = useCurrentMember();
  const members = useMembers();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState<string>(UNASSIGNED);
  const [dueDate, setDueDate] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle("");
      setDescription("");
      setAssignedTo(UNASSIGNED);
      setDueDate("");
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || saving) return;
    setSaving(true);

    const supabase = createClient();
    const { error } = await supabase.from("items").insert({
      household_id: household.id,
      type: kind,
      scope: "family",
      title: title.trim(),
      description: description.trim() || null,
      due_at: kind === "task" && dueDate ? `${dueDate}T23:59:00` : null,
      assigned_to: kind === "task" && assignedTo !== UNASSIGNED ? assignedTo : null,
      created_by: currentMember.id,
    });

    setSaving(false);
    if (error) {
      toast.error(`No se pudo crear la ${kind === "task" ? "tarea" : "nota"}`, {
        description: error.message,
      });
      return;
    }
    toast.success(kind === "task" ? "Tarea creada" : "Nota creada");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {kind === "task" ? "Nueva tarea" : "Nueva nota"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-title">Título</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                kind === "task"
                  ? "Llevar a Roma al veterinario…"
                  : "Recordar cuenta del gasoil…"
              }
              required
              autoFocus
            />
          </div>

          {kind === "task" && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="task-assignee">Asignar a</Label>
                <Select value={assignedTo} onValueChange={setAssignedTo}>
                  <SelectTrigger id="task-assignee" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNASSIGNED}>Sin asignar</SelectItem>
                    {members.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="task-due">Vence el</Label>
                <Input
                  id="task-due"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-description">Notas</Label>
            <Textarea
              id="task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
              {saving ? "Guardando…" : "Crear"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
