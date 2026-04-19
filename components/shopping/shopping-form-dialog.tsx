"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ScopePicker } from "@/components/common/scope-picker";
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
import { createClient } from "@/lib/supabase/client";
import type { Scope } from "@/lib/types";

export function ShoppingFormDialog({
  open,
  onOpenChange,
  defaultTitle = "",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTitle?: string;
}) {
  const household = useHousehold();
  const currentMember = useCurrentMember();
  const [title, setTitle] = useState(defaultTitle);
  const [quantity, setQuantity] = useState("");
  const [category, setCategory] = useState("");
  const [scope, setScope] = useState<Scope>("family");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(defaultTitle);
      setQuantity("");
      setCategory("");
      setScope("family");
    }
  }, [open, defaultTitle]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || saving) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("items").insert({
      household_id: household.id,
      type: "shopping",
      scope,
      title: title.trim(),
      created_by: currentMember.id,
      data: {
        quantity: quantity.trim() || undefined,
        category: category.trim() || undefined,
      },
    });
    setSaving(false);
    if (error) {
      toast.error("No se pudo añadir", { description: error.message });
      return;
    }
    toast.success("Añadido a la lista");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Añadir a la compra</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="shop-title">Artículo</Label>
            <Input
              id="shop-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Leche, pan, pasta…"
              required
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="shop-qty">Cantidad</Label>
              <Input
                id="shop-qty"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="2 L, 3 ud…"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="shop-category">Categoría</Label>
              <Input
                id="shop-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Frutería…"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Ámbito</Label>
            <ScopePicker value={scope} onChange={(v) => setScope(v as Scope)} />
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
