"use client";

import { useEffect, useState } from "react";
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
import { createClient } from "@/lib/supabase/client";

const UNITS = ["ud", "kg", "g", "L", "ml"] as const;
type Unit = (typeof UNITS)[number];

export function PantryFormDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const household = useHousehold();
  const currentMember = useCurrentMember();
  const [title, setTitle] = useState("");
  const [qty, setQty] = useState("1");
  const [unit, setUnit] = useState<Unit>("ud");
  const [expires, setExpires] = useState("");
  const [location, setLocation] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle("");
      setQty("1");
      setUnit("ud");
      setExpires("");
      setLocation("");
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || saving) return;
    const qtyNum = parseFloat(qty.replace(",", "."));
    if (Number.isNaN(qtyNum) || qtyNum <= 0) {
      toast.error("Cantidad inválida");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("items").insert({
      household_id: household.id,
      type: "pantry",
      scope: "family",
      title: title.trim(),
      created_by: currentMember.id,
      data: {
        quantity: qtyNum,
        unit,
        location: location.trim() || undefined,
        expires_at: expires || undefined,
      },
    });
    setSaving(false);
    if (error) {
      toast.error("No se pudo añadir", { description: error.message });
      return;
    }
    toast.success("Añadido a la despensa");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Añadir a la despensa</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pantry-title">Artículo</Label>
            <Input
              id="pantry-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Arroz, aceite, atún…"
              required
              autoFocus
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="pantry-qty">Cantidad</Label>
              <Input
                id="pantry-qty"
                inputMode="decimal"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Unidad</Label>
              <Select value={unit} onValueChange={(v) => setUnit(v as Unit)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pantry-expires">Caduca el</Label>
            <Input
              id="pantry-expires"
              type="date"
              value={expires}
              onChange={(e) => setExpires(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pantry-location">Lugar</Label>
            <Input
              id="pantry-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Despensa, nevera, congelador…"
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
              {saving ? "Guardando…" : "Añadir"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
