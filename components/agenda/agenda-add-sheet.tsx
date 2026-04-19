"use client";

import { CalendarDays, CheckSquare, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { EventFormDialog } from "@/components/calendar/event-form-dialog";
import { ShoppingFormDialog } from "@/components/shopping/shopping-form-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { todayISODateMadrid } from "@/lib/date";
import { cn } from "@/lib/utils";

type Kind = "task" | "event" | "shopping";

type Preset = {
  kind: Kind;
  title: string;
  hint: string;
  icon: typeof CheckSquare;
  accent: string;
};

const PRESETS: readonly Preset[] = [
  {
    kind: "task",
    title: "Tarea",
    hint: "Algo que hay que hacer",
    icon: CheckSquare,
    accent: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  },
  {
    kind: "event",
    title: "Evento",
    hint: "Cita, plan, algo con hora",
    icon: CalendarDays,
    accent: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  },
  {
    kind: "shopping",
    title: "Compra",
    hint: "Añadir a la lista",
    icon: ShoppingCart,
    accent: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
];

export function AgendaAddSheet({
  open,
  onOpenChange,
  defaultDateKey,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDateKey?: string;
}) {
  const [taskOpen, setTaskOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);
  const [shoppingOpen, setShoppingOpen] = useState(false);

  function pick(kind: Kind) {
    onOpenChange(false);
    if (kind === "task") setTaskOpen(true);
    if (kind === "event") setEventOpen(true);
    if (kind === "shopping") setShoppingOpen(true);
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-2xl" showCloseButton={false}>
          <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-muted-foreground/30" aria-hidden />
          <SheetHeader className="pb-2">
            <SheetTitle className="text-lg">Añadir</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-2 px-4 pb-6">
            {PRESETS.map(({ kind, title, hint, icon: Icon, accent }) => (
              <button
                key={kind}
                type="button"
                onClick={() => pick(kind)}
                className="bg-card hover:border-primary/40 active:scale-[0.99] flex items-center gap-4 rounded-xl border p-4 text-left transition"
              >
                <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl", accent)}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold">{title}</p>
                  <p className="text-muted-foreground text-sm">{hint}</p>
                </div>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <TaskFormDialog open={taskOpen} onOpenChange={setTaskOpen} kind="task" />
      <EventFormDialog
        open={eventOpen}
        onOpenChange={setEventOpen}
        defaultDateKey={defaultDateKey ?? todayISODateMadrid()}
      />
      <ShoppingFormDialog open={shoppingOpen} onOpenChange={setShoppingOpen} />
    </>
  );
}
