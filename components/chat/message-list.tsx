"use client";

import { useEffect, useMemo, useRef } from "react";
import { MessageBubble } from "@/components/chat/message-bubble";
import { useMembers } from "@/components/providers/household-provider";
import { dayKeyMadrid, relativeDayLabel, shouldGroupWithPrevious } from "@/lib/date";
import type { ChatMessage } from "@/lib/types";

type Entry =
  | { kind: "day"; key: string; label: string }
  | { kind: "message"; message: ChatMessage; groupedWithPrev: boolean; mine: boolean; pending: boolean };

export function MessageList({
  messages,
  currentMemberId,
  pendingIds,
}: {
  messages: ChatMessage[];
  currentMemberId: string;
  pendingIds: Set<string>;
}) {
  const members = useMembers();
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastMessageCount = useRef(messages.length);
  const stickToBottom = useRef(true);

  const entries = useMemo<Entry[]>(() => {
    const out: Entry[] = [];
    let lastDayKey: string | null = null;
    let prev: ChatMessage | undefined;

    for (const m of messages) {
      const dk = dayKeyMadrid(m.created_at);
      if (dk !== lastDayKey) {
        out.push({ kind: "day", key: dk, label: relativeDayLabel(m.created_at) });
        lastDayKey = dk;
        prev = undefined;
      }
      out.push({
        kind: "message",
        message: m,
        groupedWithPrev: shouldGroupWithPrevious(m, prev),
        mine: m.sender_id === currentMemberId,
        pending: pendingIds.has(m.id),
      });
      prev = m;
    }
    return out;
  }, [messages, currentMemberId, pendingIds]);

  // Track whether user is scrolled to the bottom; if so, auto-stick on new msgs.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      stickToBottom.current = nearBottom;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // Scroll to bottom on mount and when new messages arrive (if stuck).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const isNew = messages.length > lastMessageCount.current;
    lastMessageCount.current = messages.length;
    if (isNew && stickToBottom.current) {
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
    }
  }, [messages]);

  // Initial mount: always jump to bottom.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    stickToBottom.current = true;
  }, []);

  if (messages.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
        <p className="text-lg font-semibold">Sé el primero en romper el silencio</p>
        <p className="text-muted-foreground max-w-xs text-sm">
          Este es el canal común. Todos los del hogar pueden leer y escribir.
        </p>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2">
      <div className="mx-auto flex max-w-2xl flex-col">
        {entries.map((e) =>
          e.kind === "day" ? (
            <div key={`day-${e.key}`} className="my-4 flex items-center justify-center">
              <span className="bg-muted text-muted-foreground rounded-full px-3 py-1 text-xs font-medium">
                {e.label}
              </span>
            </div>
          ) : (
            <MessageBubble
              key={e.message.id}
              message={e.message}
              sender={members.find((m) => m.id === e.message.sender_id)}
              mine={e.mine}
              groupedWithPrev={e.groupedWithPrev}
              pending={e.pending}
            />
          ),
        )}
      </div>
    </div>
  );
}
