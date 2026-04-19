"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Item, ItemType } from "@/lib/types";

type Payload = {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: Item;
  old: Partial<Item>;
};

/**
 * Subscribe to peumayen.items for a household, optionally filtered by type
 * on the client side. Returns items ordered by due_at ascending with nulls
 * last, then by created_at descending.
 */
export function useRealtimeItems(
  householdId: string,
  initial: Item[],
  filterTypes?: ItemType[],
): Item[] {
  const [items, setItems] = useState<Item[]>(initial);
  const typesRef = useRef(filterTypes);
  typesRef.current = filterTypes;
  const instanceId = useId();

  useEffect(() => {
    setItems(initial);
  }, [initial]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`items:${householdId}:${instanceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "items",
          filter: `household_id=eq.${householdId}`,
        },
        (raw) => {
          const p = raw as unknown as Payload;
          const types = typesRef.current;
          const matches = (i: Item) => !types || types.includes(i.type);

          if (p.eventType === "INSERT") {
            if (!matches(p.new)) return;
            setItems((prev) =>
              prev.some((i) => i.id === p.new.id) ? prev : [...prev, p.new],
            );
          } else if (p.eventType === "UPDATE") {
            if (!matches(p.new)) {
              setItems((prev) => prev.filter((i) => i.id !== p.new.id));
              return;
            }
            setItems((prev) => {
              const exists = prev.some((i) => i.id === p.new.id);
              return exists
                ? prev.map((i) => (i.id === p.new.id ? p.new : i))
                : [...prev, p.new];
            });
          } else if (p.eventType === "DELETE") {
            const oldId = p.old.id;
            if (!oldId) return;
            setItems((prev) => prev.filter((i) => i.id !== oldId));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [householdId, instanceId]);

  return items;
}
