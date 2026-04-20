"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { AgendaAddSheet } from "@/components/agenda/agenda-add-sheet";

export function HomeFab() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Añadir plan nuevo"
        className="bg-primary text-primary-foreground shadow-lg active:scale-95 fixed z-30 flex items-center gap-2 rounded-full px-5 py-3.5 text-sm font-bold transition-all"
        style={{
          bottom: "calc(env(safe-area-inset-bottom) + 5.25rem)",
          right: "1.25rem",
        }}
      >
        <Plus className="h-5 w-5" strokeWidth={2.5} />
        Plan nuevo
      </button>
      <AgendaAddSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
