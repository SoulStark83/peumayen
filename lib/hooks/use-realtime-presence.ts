"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Presence } from "@/lib/types";

type Payload = {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: Presence;
  old: Partial<Presence>;
};

/**
 * Subscribe to peumayen.presence rows for a specific date (defaults to
 * caller-provided initial.date[0] or today). Returns a map keyed by
 * member_id for quick lookups.
 */
export function useRealtimePresence(
  householdId: string,
  date: string,
  initial: Presence[],
): Map<string, Presence> {
  const [byMember, setByMember] = useState<Map<string, Presence>>(
    () => new Map(initial.map((p) => [p.member_id, p])),
  );

  useEffect(() => {
    setByMember(new Map(initial.map((p) => [p.member_id, p])));
  }, [initial]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`presence:${householdId}:${date}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "presence",
          filter: `household_id=eq.${householdId}`,
        },
        (raw) => {
          const p = raw as unknown as Payload;
          if (p.eventType === "DELETE") {
            const oldId = p.old.member_id;
            if (!oldId) return;
            setByMember((prev) => {
              const next = new Map(prev);
              next.delete(oldId);
              return next;
            });
            return;
          }
          if (p.new.date !== date) return;
          setByMember((prev) => {
            const next = new Map(prev);
            next.set(p.new.member_id, p.new);
            return next;
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [householdId, date]);

  return byMember;
}
