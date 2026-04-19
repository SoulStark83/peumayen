"use client";

import { Plus, StickyNote, CheckSquare } from "lucide-react";
import { useMemo, useState } from "react";
import { ScopePicker } from "@/components/common/scope-picker";
import { useHousehold } from "@/components/providers/household-provider";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRealtimeItems } from "@/lib/hooks/use-realtime-items";
import type { Item, Scope } from "@/lib/types";
import { NoteItem } from "./note-item";
import { TaskFormDialog } from "./task-form-dialog";
import { TaskItem } from "./task-item";

type Kind = "task" | "note";

export function TasksView({
  initialTasks,
  initialNotes,
}: {
  initialTasks: Item[];
  initialNotes: Item[];
}) {
  const household = useHousehold();
  const tasks = useRealtimeItems(household.id, initialTasks, ["task"]);
  const notes = useRealtimeItems(household.id, initialNotes, ["note"]);

  const [kind, setKind] = useState<Kind>("task");
  const [scopeFilter, setScopeFilter] = useState<Scope | "all">("all");
  const [formOpen, setFormOpen] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const filteredTasks = useMemo(() => {
    const list = tasks.filter((t) => scopeFilter === "all" || t.scope === scopeFilter);
    const pending = list.filter((t) => !t.completed_at);
    const done = list.filter((t) => !!t.completed_at);
    pending.sort((a, b) => {
      const ad = a.due_at ?? "9999";
      const bd = b.due_at ?? "9999";
      if (ad !== bd) return ad.localeCompare(bd);
      return a.created_at.localeCompare(b.created_at);
    });
    done.sort((a, b) =>
      (b.completed_at ?? "").localeCompare(a.completed_at ?? ""),
    );
    return { pending, done };
  }, [tasks, scopeFilter]);

  const filteredNotes = useMemo(() => {
    return notes
      .filter((n) => scopeFilter === "all" || n.scope === scopeFilter)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [notes, scopeFilter]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Tabs value={kind} onValueChange={(v) => setKind(v as Kind)} className="h-full">
        <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
          <TabsList>
            <TabsTrigger value="task" className="gap-1.5">
              <CheckSquare className="h-4 w-4" />
              Tareas
            </TabsTrigger>
            <TabsTrigger value="note" className="gap-1.5">
              <StickyNote className="h-4 w-4" />
              Notas
            </TabsTrigger>
          </TabsList>
          <Button
            type="button"
            size="sm"
            onClick={() => setFormOpen(true)}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Nuevo
          </Button>
        </div>

        <div className="overflow-x-auto px-3 py-2">
          <ScopePicker
            value={scopeFilter}
            onChange={setScopeFilter}
            allOption
            size="sm"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-3xl px-4 pb-6">
            <TabsContent value="task" className="mt-0">
              {filteredTasks.pending.length === 0 && filteredTasks.done.length === 0 ? (
                <EmptyState kind="task" />
              ) : (
                <>
                  <ul className="flex flex-col gap-2">
                    {filteredTasks.pending.map((t) => (
                      <TaskItem key={t.id} item={t} hideScope={scopeFilter !== "all"} />
                    ))}
                  </ul>
                  {filteredTasks.done.length > 0 && (
                    <div className="mt-6">
                      <button
                        type="button"
                        onClick={() => setShowCompleted((s) => !s)}
                        className="text-muted-foreground hover:text-foreground mb-2 text-xs"
                      >
                        {showCompleted ? "Ocultar" : "Mostrar"} completadas (
                        {filteredTasks.done.length})
                      </button>
                      {showCompleted && (
                        <ul className="flex flex-col gap-2">
                          {filteredTasks.done.map((t) => (
                            <TaskItem key={t.id} item={t} hideScope={scopeFilter !== "all"} />
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="note" className="mt-0">
              {filteredNotes.length === 0 ? (
                <EmptyState kind="note" />
              ) : (
                <ul className="flex flex-col gap-2">
                  {filteredNotes.map((n) => (
                    <NoteItem key={n.id} item={n} hideScope={scopeFilter !== "all"} />
                  ))}
                </ul>
              )}
            </TabsContent>
          </div>
        </div>
      </Tabs>

      <TaskFormDialog open={formOpen} onOpenChange={setFormOpen} kind={kind} />
    </div>
  );
}

function EmptyState({ kind }: { kind: Kind }) {
  const Icon = kind === "task" ? CheckSquare : StickyNote;
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="bg-primary/10 text-primary flex h-14 w-14 items-center justify-center rounded-full">
        <Icon className="h-7 w-7" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-base font-medium">
          {kind === "task" ? "Todo al día" : "Aún no hay notas"}
        </p>
        <p className="text-muted-foreground text-sm">
          {kind === "task"
            ? "Nada pendiente por aquí. Disfruta."
            : "Guarda lo que no quieras olvidar."}
        </p>
      </div>
    </div>
  );
}
