"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { MessageReaction } from "@/lib/types";

type Payload = {
  eventType: "INSERT" | "DELETE";
  new: MessageReaction;
  old: Partial<MessageReaction>;
};

export function useMessageReactions(
  householdId: string,
  initial: MessageReaction[],
): Map<string, MessageReaction[]> {
  const [byMessage, setByMessage] = useState<Map<string, MessageReaction[]>>(() => {
    const m = new Map<string, MessageReaction[]>();
    for (const r of initial) {
      const list = m.get(r.message_id) ?? [];
      list.push(r);
      m.set(r.message_id, list);
    }
    return m;
  });

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`reactions:${householdId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "message_reactions",
          filter: `household_id=eq.${householdId}`,
        },
        (raw) => {
          const p = raw as unknown as Payload;
          if (p.eventType === "INSERT") {
            setByMessage((prev) => {
              const next = new Map(prev);
              const list = [...(next.get(p.new.message_id) ?? []), p.new];
              next.set(p.new.message_id, list);
              return next;
            });
          } else if (p.eventType === "DELETE" && p.old.id) {
            const oldId = p.old.id;
            const msgId = p.old.message_id;
            if (!msgId) return;
            setByMessage((prev) => {
              const next = new Map(prev);
              const filtered = (next.get(msgId) ?? []).filter((r) => r.id !== oldId);
              if (filtered.length === 0) next.delete(msgId);
              else next.set(msgId, filtered);
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

  return byMessage;
}
