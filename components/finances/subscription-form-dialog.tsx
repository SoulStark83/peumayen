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
import { parseAmount } from "@/lib/currency";
import { createClient } from "@/lib/supabase/client";

type Cadence = "monthly" | "yearly";

export function SubscriptionFormDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const household = useHousehold();
  const currentMember = useCurrentMember();
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [cadence, setCadence] = useState<Cadence>("monthly");
  const [billingDay, setBillingDay] = useState("1");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle("");
      setAmount("");
      setCadence("monthly");
      setBillingDay("1");
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving || !title.trim()) return;
    const parsed = parseAmount(amount);
    if (parsed === null || parsed <= 0) {
      toast.error("Importe inválido");
      return;
    }
    const day = parseInt(billingDay, 10);
    if (Number.isNaN(day) || day < 1 || day > 28) {
      toast.error("Día de cobro entre 1 y 28");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("items").insert({
      household_id: household.id,
      type: "subscription",
      scope: "couple",
      title: title.trim(),
      created_by: currentMember.id,
      data: {
        amount: parsed,
        cadence,
        billing_day: day,
      },
    });
    setSaving(false);
    if (error) {
      toast.error("No se pudo guardar", { description: error.message });
      return;
    }
    toast.success("Suscripción registrada");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva suscripción</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sub-title">Servicio</Label>
            <Input
              id="sub-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Netflix, luz, gimnasio…"
              required
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sub-amount">Importe</Label>
              <Input
                id="sub-amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="12,99"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Periodicidad</Label>
              <Select value={cadence} onValueChange={(v) => setCadence(v as Cadence)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mensual</SelectItem>
                  <SelectItem value="yearly">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sub-day">Día de cobro (1–28)</Label>
            <Input
              id="sub-day"
              inputMode="numeric"
              value={billingDay}
              onChange={(e) => setBillingDay(e.target.value)}
              required
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
            <Button type="submit" disabled={saving || !title.trim() || !amount}>
              {saving ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
