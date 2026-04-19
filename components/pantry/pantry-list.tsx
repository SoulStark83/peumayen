"use client";

import { Archive, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useHousehold } from "@/components/providers/household-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRealtimeItems } from "@/lib/hooks/use-realtime-items";
import { dayKeyMadrid, todayISODateMadrid } from "@/lib/date";
import type { Item } from "@/lib/types";
import { PantryFormDialog } from "./pantry-form-dialog";
import { PantryItem } from "./pantry-item";

type PantryData = {
  expires_at?: string;
  location?: string;
};

export function PantryList({ initial }: { initial: Item[] }) {
  const household = useHousehold();
  const items = useRealtimeItems(household.id, initial, ["pantry"]);
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);

  const groups = useMemo(() => {
    const today = todayISODateMadrid();
    const q = query.trim().toLowerCase();
    const filtered = q
      ? items.filter((i) => i.title.toLowerCase().includes(q))
      : items;

    const expired: Item[] = [];
    const soon: Item[] = [];
    const rest: Item[] = [];
    for (const item of filtered) {
      const exp = (item.data as PantryData)?.expires_at;
      if (!exp) {
        rest.push(item);
        continue;
      }
      const expKey = dayKeyMadrid(exp);
      if (expKey < today) expired.push(item);
      else {
        const diff =
          (new Date(expKey).getTime() - new Date(today).getTime()) /
          (1000 * 60 * 60 * 24);
        if (diff <= 3) soon.push(item);
        else rest.push(item);
      }
    }

    const byTitle = (a: Item, b: Item) => a.title.localeCompare(b.title);
    const byExpiry = (a: Item, b: Item) => {
      const ae = (a.data as PantryData)?.expires_at ?? "";
      const be = (b.data as PantryData)?.expires_at ?? "";
      return ae.localeCompare(be);
    };
    expired.sort(byExpiry);
    soon.sort(byExpiry);
    rest.sort(byTitle);

    return { expired, soon, rest };
  }, [items, query]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar en despensa…"
          className="h-8 flex-1"
        />
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
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <Archive className="text-muted-foreground h-8 w-8" />
              <p className="text-muted-foreground text-sm">Despensa vacía.</p>
            </div>
          ) : (
            <>
              {groups.expired.length > 0 && (
                <Section title="Caducados" tone="danger" list={groups.expired} />
              )}
              {groups.soon.length > 0 && (
                <Section title="Caducan pronto" tone="warning" list={groups.soon} />
              )}
              {groups.rest.length > 0 && (
                <Section title="En despensa" tone="neutral" list={groups.rest} />
              )}
            </>
          )}
        </div>
      </div>

      <PantryFormDialog open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}

function Section({
  title,
  tone,
  list,
}: {
  title: string;
  tone: "danger" | "warning" | "neutral";
  list: Item[];
}) {
  const toneClass =
    tone === "danger"
      ? "text-destructive"
      : tone === "warning"
        ? "text-amber-700 dark:text-amber-400"
        : "text-muted-foreground";
  return (
    <section className="mb-4">
      <h3
        className={`mb-1.5 text-xs font-semibold tracking-wider uppercase ${toneClass}`}
      >
        {title} ({list.length})
      </h3>
      <ul className="flex flex-col gap-2">
        {list.map((i) => (
          <PantryItem key={i.id} item={i} />
        ))}
      </ul>
    </section>
  );
}
