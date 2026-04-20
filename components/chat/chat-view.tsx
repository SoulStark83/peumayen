"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { MessageList } from "@/components/chat/message-list";
import { MessageComposer } from "@/components/chat/message-composer";
import { useCurrentMember, useHousehold, useMembers } from "@/components/providers/household-provider";
import { useRealtimeMessages } from "@/lib/hooks/use-realtime-messages";
import { useMessageReactions } from "@/lib/hooks/use-message-reactions";
import { useMessageReads } from "@/lib/hooks/use-message-reads";
import { createClient } from "@/lib/supabase/client";
import type { ChatMessage, MessageReaction, MessageRead } from "@/lib/types";

function tempId() {
  return `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function ChatView({
  initialMessages,
  initialReactions,
  initialReads,
}: {
  initialMessages: ChatMessage[];
  initialReactions: MessageReaction[];
  initialReads: MessageRead[];
}) {
  const household = useHousehold();
  const me = useCurrentMember();
  const members = useMembers();
  const { messages, addOptimistic, replaceOptimistic, removeOptimistic } = useRealtimeMessages(
    household.id,
    initialMessages,
  );
  const reactions = useMessageReactions(household.id, initialReactions);
  const reads = useMessageReads(household.id, me.id, initialReads);
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);

  // ── Send / Edit ───────────────────────────────────────────────────────────
  const send = useCallback(
    async (body: string, imageFile?: File) => {
      if (editingMessage) {
        // Edit mode: UPDATE
        const supabase = createClient();
        const { error } = await supabase
          .from("messages")
          .update({ body, edited_at: new Date().toISOString() })
          .eq("id", editingMessage.id);
        if (error) {
          toast.error("No se pudo editar el mensaje");
        }
        setEditingMessage(null);
        return;
      }

      const tId = tempId();
      const localPreview = imageFile ? URL.createObjectURL(imageFile) : null;

      const optimistic: ChatMessage = {
        id: tId,
        household_id: household.id,
        sender_id: me.id,
        body,
        image_url: localPreview,
        audio_url: null,
        reply_to_id: replyTo?.id ?? null,
        created_at: new Date().toISOString(),
        edited_at: null,
        deleted_at: null,
      };
      addOptimistic(optimistic);
      setPendingIds((s) => new Set(s).add(tId));
      setReplyTo(null);

      const supabase = createClient();
      let imageUrl: string | null = null;

      if (imageFile) {
        const ext = imageFile.name.split(".").pop() ?? "jpg";
        const path = `${household.id}/${me.id}-${Date.now()}.${ext}`;
        const { data: uploaded, error: uploadError } = await supabase.storage
          .from("chat-images")
          .upload(path, imageFile, { contentType: imageFile.type });

        if (uploadError || !uploaded) {
          if (localPreview) URL.revokeObjectURL(localPreview);
          removeOptimistic(tId);
          setPendingIds((s) => { const n = new Set(s); n.delete(tId); return n; });
          toast.error("No se pudo subir la imagen");
          return;
        }
        const { data: urlData } = supabase.storage.from("chat-images").getPublicUrl(uploaded.path);
        imageUrl = urlData.publicUrl;
      }

      const { data, error } = await supabase
        .from("messages")
        .insert({
          household_id: household.id,
          sender_id: me.id,
          body,
          ...(imageUrl ? { image_url: imageUrl } : {}),
          ...(replyTo ? { reply_to_id: replyTo.id } : {}),
        })
        .select()
        .single();

      if (localPreview) URL.revokeObjectURL(localPreview);
      setPendingIds((s) => { const n = new Set(s); n.delete(tId); return n; });

      if (error || !data) {
        removeOptimistic(tId);
        toast.error("No se pudo enviar el mensaje", { description: error?.message });
        return;
      }
      replaceOptimistic(tId, data as ChatMessage);
    },
    [
      editingMessage,
      replyTo,
      household.id,
      me.id,
      addOptimistic,
      replaceOptimistic,
      removeOptimistic,
    ],
  );

  // ── Send audio ────────────────────────────────────────────────────────────
  const sendAudio = useCallback(
    async (blob: Blob, mimeType: string) => {
      const tId = tempId();
      const localPreview = URL.createObjectURL(blob);
      const optimistic: ChatMessage = {
        id: tId,
        household_id: household.id,
        sender_id: me.id,
        body: "",
        image_url: null,
        audio_url: localPreview,
        reply_to_id: replyTo?.id ?? null,
        created_at: new Date().toISOString(),
        edited_at: null,
        deleted_at: null,
      };
      addOptimistic(optimistic);
      setPendingIds((s) => new Set(s).add(tId));
      setReplyTo(null);

      const supabase = createClient();
      const ext = mimeType.split(";")[0].split("/")[1] ?? "webm";
      const path = `${household.id}/${me.id}-${Date.now()}.${ext}`;
      const { data: uploaded, error: uploadError } = await supabase.storage
        .from("chat-audio")
        .upload(path, blob, { contentType: mimeType.split(";")[0] });

      URL.revokeObjectURL(localPreview);

      if (uploadError || !uploaded) {
        removeOptimistic(tId);
        setPendingIds((s) => { const n = new Set(s); n.delete(tId); return n; });
        toast.error("No se pudo subir la nota de voz");
        return;
      }

      const { data: urlData } = supabase.storage.from("chat-audio").getPublicUrl(uploaded.path);

      const { data, error } = await supabase
        .from("messages")
        .insert({
          household_id: household.id,
          sender_id: me.id,
          body: "",
          audio_url: urlData.publicUrl,
          ...(replyTo ? { reply_to_id: replyTo.id } : {}),
        })
        .select()
        .single();

      setPendingIds((s) => { const n = new Set(s); n.delete(tId); return n; });

      if (error || !data) {
        removeOptimistic(tId);
        toast.error("No se pudo enviar la nota de voz");
        return;
      }
      replaceOptimistic(tId, data as ChatMessage);
    },
    [replyTo, household.id, me.id, addOptimistic, replaceOptimistic, removeOptimistic],
  );

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = useCallback(async (msg: ChatMessage) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("messages")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", msg.id);
    if (error) toast.error("No se pudo eliminar el mensaje");
  }, []);

  // ── React ─────────────────────────────────────────────────────────────────
  const handleReact = useCallback(
    async (messageId: string, emoji: string) => {
      const supabase = createClient();
      const existing = reactions.get(messageId)?.find(
        (r) => r.member_id === me.id && r.emoji === emoji,
      );
      if (existing) {
        await supabase.from("message_reactions").delete().eq("id", existing.id);
      } else {
        await supabase.from("message_reactions").insert({
          household_id: household.id,
          message_id: messageId,
          member_id: me.id,
          emoji,
        });
      }
    },
    [reactions, household.id, me.id],
  );

  const replyToSender = replyTo
    ? members.find((m) => m.id === replyTo.sender_id)
    : undefined;

  return (
    <div className="flex h-full flex-col">
      <MessageList
        messages={messages}
        currentMemberId={me.id}
        pendingIds={pendingIds}
        totalMembers={members.length}
        reactions={reactions}
        reads={reads}
        onReply={setReplyTo}
        onEdit={setEditingMessage}
        onDelete={handleDelete}
        onReact={handleReact}
      />
      <MessageComposer
        onSend={send}
        onSendAudio={sendAudio}
        replyTo={replyTo}
        replyToSender={replyToSender}
        editingMessage={editingMessage}
        onCancelReply={() => setReplyTo(null)}
        onCancelEdit={() => setEditingMessage(null)}
      />
    </div>
  );
}
