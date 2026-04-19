"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ChatMessage } from "@/lib/types";

type Payload = {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: ChatMessage;
  old: Partial<ChatMessage>;
};

export function useRealtimeMessages(
  householdId: string,
  initial: ChatMessage[],
): {
  messages: ChatMessage[];
  addOptimistic: (m: ChatMessage) => void;
  replaceOptimistic: (tempId: string, real: ChatMessage) => void;
  removeOptimistic: (tempId: string) => void;
} {
  const [messages, setMessages] = useState<ChatMessage[]>(initial);
  const seenIds = useRef(new Set(initial.map((m) => m.id)));

  useEffect(() => {
    seenIds.current = new Set(messages.map((m) => m.id));
  }, [messages]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`messages:${householdId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `household_id=eq.${householdId}`,
        },
        (raw) => {
          const p = raw as unknown as Payload;
          if (p.eventType === "INSERT") {
            if (seenIds.current.has(p.new.id)) return;
            seenIds.current.add(p.new.id);
            setMessages((prev) => [...prev, p.new]);
          } else if (p.eventType === "UPDATE") {
            setMessages((prev) => prev.map((m) => (m.id === p.new.id ? p.new : m)));
          } else if (p.eventType === "DELETE") {
            const oldId = p.old.id;
            if (!oldId) return;
            seenIds.current.delete(oldId);
            setMessages((prev) => prev.filter((m) => m.id !== oldId));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [householdId]);

  const addOptimistic = useCallback((m: ChatMessage) => {
    seenIds.current.add(m.id);
    setMessages((prev) => [...prev, m]);
  }, []);

  const replaceOptimistic = useCallback((tempId: string, real: ChatMessage) => {
    seenIds.current.delete(tempId);
    seenIds.current.add(real.id);
    setMessages((prev) => prev.map((m) => (m.id === tempId ? real : m)));
  }, []);

  const removeOptimistic = useCallback((tempId: string) => {
    seenIds.current.delete(tempId);
    setMessages((prev) => prev.filter((m) => m.id !== tempId));
  }, []);

  return { messages, addOptimistic, replaceOptimistic, removeOptimistic };
}
