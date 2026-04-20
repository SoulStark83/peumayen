"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { MessageRead } from "@/lib/types";

type Payload = {
  eventType: "INSERT" | "UPDATE";
  new: MessageRead;
};

export function useMessageReads(
  householdId: string,
  memberId: string,
  initial: MessageRead[],
): Map<string, string> {
  const [byMember, setByMember] = useState<Map<string, string>>(
    () => new Map(initial.map((r) => [r.member_id, r.last_read_at])),
  );
  const markedRef = useRef(false);

  // Mark as read on mount and whenever the hook re-runs for this household.
  useEffect(() => {
    if (markedRef.current) return;
    markedRef.current = true;

    const supabase = createClient();
    void supabase.from("message_reads").upsert(
      { household_id: householdId, member_id: memberId, last_read_at: new Date().toISOString() },
      { onConflict: "household_id,member_id" },
    );
  }, [householdId, memberId]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`reads:${householdId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "message_reads",
          filter: `household_id=eq.${householdId}`,
        },
        (raw) => {
          const p = raw as unknown as Payload;
          if (p.eventType === "INSERT" || p.eventType === "UPDATE") {
            setByMember((prev) => {
              const next = new Map(prev);
              next.set(p.new.member_id, p.new.last_read_at);
              return next;
            });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [householdId]);

  return byMember;
}
