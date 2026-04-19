"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { MessageList } from "@/components/chat/message-list";
import { MessageComposer } from "@/components/chat/message-composer";
import { useCurrentMember, useHousehold } from "@/components/providers/household-provider";
import { useRealtimeMessages } from "@/lib/hooks/use-realtime-messages";
import { createClient } from "@/lib/supabase/client";
import type { ChatMessage } from "@/lib/types";

function tempId() {
  return `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function ChatView({ initialMessages }: { initialMessages: ChatMessage[] }) {
  const household = useHousehold();
  const me = useCurrentMember();
  const { messages, addOptimistic, replaceOptimistic, removeOptimistic } = useRealtimeMessages(
    household.id,
    initialMessages,
  );
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());

  const send = useCallback(
    async (body: string) => {
      const tId = tempId();
      const optimistic: ChatMessage = {
        id: tId,
        household_id: household.id,
        sender_id: me.id,
        body,
        reply_to_id: null,
        created_at: new Date().toISOString(),
        edited_at: null,
        deleted_at: null,
      };
      addOptimistic(optimistic);
      setPendingIds((s) => new Set(s).add(tId));

      const supabase = createClient();
      const { data, error } = await supabase
        .from("messages")
        .insert({
          household_id: household.id,
          sender_id: me.id,
          body,
        })
        .select()
        .single();

      setPendingIds((s) => {
        const next = new Set(s);
        next.delete(tId);
        return next;
      });

      if (error || !data) {
        removeOptimistic(tId);
        toast.error("No se pudo enviar el mensaje", {
          description: error?.message ?? "Inténtalo de nuevo.",
        });
        return;
      }

      replaceOptimistic(tId, data as ChatMessage);
    },
    [household.id, me.id, addOptimistic, replaceOptimistic, removeOptimistic],
  );

  return (
    <div className="flex h-full flex-col">
      <MessageList messages={messages} currentMemberId={me.id} pendingIds={pendingIds} />
      <MessageComposer onSend={send} />
    </div>
  );
}
