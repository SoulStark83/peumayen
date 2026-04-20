"use client";

import { useEffect, useMemo, useRef } from "react";
import { MessageBubble } from "@/components/chat/message-bubble";
import { useMembers } from "@/components/providers/household-provider";
import { dayKeyMadrid, relativeDayLabel, shouldGroupWithPrevious } from "@/lib/date";
import type { ChatMessage, MessageReaction, ReadStatus } from "@/lib/types";

type Entry =
  | { kind: "day"; key: string; label: string }
  | {
      kind: "message";
      message: ChatMessage;
      groupedWithPrev: boolean;
      mine: boolean;
      pending: boolean;
      readStatus: ReadStatus;
      reactions: MessageReaction[];
    };

export function MessageList({
  messages,
  currentMemberId,
  pendingIds,
  totalMembers,
  reactions,
  reads,
  onReply,
  onEdit,
  onDelete,
  onReact,
}: {
  messages: ChatMessage[];
  currentMemberId: string;
  pendingIds: Set<string>;
  totalMembers: number;
  reactions: Map<string, MessageReaction[]>;
  reads: Map<string, string>;
  onReply: (msg: ChatMessage) => void;
  onEdit: (msg: ChatMessage) => void;
  onDelete: (msg: ChatMessage) => void;
  onReact: (msgId: string, emoji: string) => void;
}) {
  const members = useMembers();
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastMessageCount = useRef(messages.length);
  const stickToBottom = useRef(true);

  // Build a map for reply lookups
  const messagesById = useMemo(
    () => new Map(messages.map((m) => [m.id, m])),
    [messages],
  );

  function getReadStatus(message: ChatMessage, mine: boolean, pending: boolean): ReadStatus {
    if (pending) return "pending";
    if (!mine) return "sent";
    // Count other members who have read past this message's created_at
    const otherCount = totalMembers - 1;
    if (otherCount <= 0) return "sent";
    let readCount = 0;
    for (const [memberId, lastReadAt] of reads.entries()) {
      if (memberId === currentMemberId) continue;
      if (lastReadAt >= message.created_at) readCount++;
    }
    return readCount >= otherCount ? "read" : "sent";
  }

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
      const mine = m.sender_id === currentMemberId;
      const pending = pendingIds.has(m.id);
      out.push({
        kind: "message",
        message: m,
        groupedWithPrev: shouldGroupWithPrevious(m, prev),
        mine,
        pending,
        readStatus: getReadStatus(m, mine, pending),
        reactions: reactions.get(m.id) ?? [],
      });
      prev = m;
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, currentMemberId, pendingIds, reactions, reads, totalMembers]);

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

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const isNew = messages.length > lastMessageCount.current;
    lastMessageCount.current = messages.length;
    if (isNew && stickToBottom.current) {
      requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
    }
  }, [messages]);

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
              readStatus={e.readStatus}
              reactions={e.reactions}
              myMemberId={currentMemberId}
              replyToMessage={e.message.reply_to_id ? messagesById.get(e.message.reply_to_id) : undefined}
              replyToSender={
                e.message.reply_to_id
                  ? members.find(
                      (m) => m.id === messagesById.get(e.message.reply_to_id!)?.sender_id,
                    )
                  : undefined
              }
              onReply={() => onReply(e.message)}
              onEdit={() => onEdit(e.message)}
              onDelete={() => onDelete(e.message)}
              onReact={(emoji) => onReact(e.message.id, emoji)}
            />
          ),
        )}
      </div>
    </div>
  );
}
