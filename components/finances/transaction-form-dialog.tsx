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
import { parseAmount } from "@/lib/currency";
import { todayISODateMadrid } from "@/lib/date";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Kind = "expense" | "income";

const CATEGORIES = [
  "Súper",
  "Casa",
  "Gasolina",
  "Ocio",
  "Restaurante",
  "Salud",
  "Educación",
  "Ropa",
  "Roma",
  "Otros",
];

export function TransactionFormDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const household = useHousehold();
  const currentMember = useCurrentMember();
  const [kind, setKind] = useState<Kind>("expense");
  const [amount, setAmount] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Súper");
  const [date, setDate] = useState(todayISODateMadrid());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setKind("expense");
      setAmount("");
      setTitle("");
      setCategory("Súper");
      setDate(todayISODateMadrid());
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
    setSaving(true);
    const signed = kind === "expense" ? -parsed : parsed;
    const supabase = createClient();
    const { error } = await supabase.from("items").insert({
      household_id: household.id,
      type: "transaction",
      scope: "couple",
      title: title.trim(),
      due_at: `${date}T12:00:00`,
      created_by: currentMember.id,
      data: {
        amount: signed,
        kind,
        category,
      },
    });
    setSaving(false);
    if (error) {
      toast.error("No se pudo guardar", { description: error.message });
      return;
    }
    toast.success(kind === "expense" ? "Gasto registrado" : "Ingreso registrado");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva transacción</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="bg-muted inline-flex w-full rounded-lg p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setKind("expense")}
              className={cn(
                "flex-1 rounded-md px-3 py-1.5 font-medium transition",
                kind === "expense"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground",
              )}
            >
              Gasto
            </button>
            <button
              type="button"
              onClick={() => setKind("income")}
              className={cn(
                "flex-1 rounded-md px-3 py-1.5 font-medium transition",
                kind === "income"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground",
              )}
            >
              Ingreso
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tx-amount">Importe</Label>
            <Input
              id="tx-amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="45,20"
              required
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tx-title">Concepto</Label>
            <Input
              id="tx-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Mercadona, nómina…"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tx-category">Categoría</Label>
              <select
                id="tx-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="bg-background h-9 rounded-md border px-2 text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tx-date">Fecha</Label>
              <Input
                id="tx-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
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
