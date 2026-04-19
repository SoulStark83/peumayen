"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SCOPE_STYLES } from "@/lib/colors";
import { createClient } from "@/lib/supabase/client";
import type { Item } from "@/lib/types";
import { cn } from "@/lib/utils";

export function NoteItem({ item }: { item: Item }) {
  const [busy, setBusy] = useState(false);
  const scopeStyle = SCOPE_STYLES[item.scope];

  async function remove() {
    if (busy) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("items").delete().eq("id", item.id);
    setBusy(false);
    if (error) {
      toast.error("No se pudo borrar", { description: error.message });
    }
  }

  return (
    <li
      className={cn(
        "bg-card flex items-start gap-3 rounded-lg border p-3",
        busy && "pointer-events-none opacity-50",
      )}
    >
      <span
        className={cn("mt-2 h-2 w-2 shrink-0 rounded-full", scopeStyle.dot)}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium">{item.title}</p>
          <Badge
            variant="outline"
            className={cn("shrink-0 text-xs", scopeStyle.badge)}
          >
            {scopeStyle.label}
          </Badge>
        </div>
        {item.description && (
          <p className="text-muted-foreground mt-0.5 whitespace-pre-wrap text-xs">
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
        className="text-muted-foreground hover:text-destructive h-8 w-8 shrink-0"
        aria-label="Borrar"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </li>
  );
}
