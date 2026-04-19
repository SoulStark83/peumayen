"use client";

import { Plus, ShoppingCart, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ScopePicker } from "@/components/common/scope-picker";
import { useHousehold } from "@/components/providers/household-provider";
import { Button } from "@/components/ui/button";
import { useRealtimeItems } from "@/lib/hooks/use-realtime-items";
import { createClient } from "@/lib/supabase/client";
import type { Item, Scope } from "@/lib/types";
import { ShoppingFormDialog } from "./shopping-form-dialog";
import { ShoppingItem } from "./shopping-item";

export function ShoppingList({ initial }: { initial: Item[] }) {
  const household = useHousehold();
  const items = useRealtimeItems(household.id, initial, ["shopping"]);
  const [scopeFilter, setScopeFilter] = useState<Scope | "all">("all");
  const [formOpen, setFormOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

  const { pending, done, grouped } = useMemo(() => {
    const list = items.filter((i) => scopeFilter === "all" || i.scope === scopeFilter);
    const pending = list.filter((i) => !i.completed_at);
    const done = list.filter((i) => !!i.completed_at);

    const grouped = new Map<string, Item[]>();
    for (const item of pending) {
      const cat = ((item.data as { category?: string })?.category ?? "Sin categoría").trim();
      const key = cat || "Sin categoría";
      const arr = grouped.get(key) ?? [];
      arr.push(item);
      grouped.set(key, arr);
    }

    pending.sort((a, b) => a.created_at.localeCompare(b.created_at));
    done.sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""));

    return { pending, done, grouped };
  }, [items, scopeFilter]);

  async function clearCompleted() {
    if (clearing || done.length === 0) return;
    if (!confirm(`¿Vaciar ${done.length} comprados?`)) return;
    setClearing(true);
    const ids = done.map((i) => i.id);
    const supabase = createClient();
    const { error } = await supabase.from("items").delete().in("id", ids);
    setClearing(false);
    if (error) toast.error("No se pudo vaciar", { description: error.message });
    else toast.success("Limpio");
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <ScopePicker value={scopeFilter} onChange={setScopeFilter} allOption size="sm" />
        <Button
          type="button"
          size="sm"
          onClick={() => setFormOpen(true)}
          className="gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Añadir
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-2xl px-3 py-3 pb-6">
          {pending.length === 0 && done.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <ShoppingCart className="text-muted-foreground h-8 w-8" />
              <p className="text-muted-foreground text-sm">Lista vacía.</p>
            </div>
          ) : (
            <>
              {[...grouped.entries()].map(([category, list]) => (
                <section key={category} className="mb-4">
                  <h3 className="text-muted-foreground mb-1.5 text-xs font-semibold tracking-wider uppercase">
                    {category}
                  </h3>
                  <ul className="flex flex-col gap-2">
                    {list.map((i) => (
                      <ShoppingItem key={i.id} item={i} />
                    ))}
                  </ul>
                </section>
              ))}

              {done.length > 0 && (
                <section className="mt-6">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                      Comprados ({done.length})
                    </h3>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearCompleted}
                      disabled={clearing}
                      className="text-muted-foreground hover:text-destructive h-7 gap-1 text-xs"
                    >
                      <Trash2 className="h-3 w-3" />
                      Vaciar
                    </Button>
                  </div>
                  <ul className="flex flex-col gap-2">
                    {done.map((i) => (
                      <ShoppingItem key={i.id} item={i} />
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>
      </div>

      <ShoppingFormDialog open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}
