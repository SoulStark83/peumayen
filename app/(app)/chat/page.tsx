import { ChatView } from "@/components/chat/chat-view";
import { requireHouseholdContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ChatMessage, MessageReaction, MessageRead } from "@/lib/types";

const INITIAL_PAGE_SIZE = 100;

export const metadata = {
  title: "Chat",
};

export default async function ChatPage() {
  const { household } = await requireHouseholdContext();
  const supabase = await createClient();

  const [messagesRes, reactionsRes, readsRes] = await Promise.all([
    supabase
      .from("messages")
      .select(
        "id, household_id, sender_id, body, image_url, audio_url, reply_to_id, created_at, edited_at, deleted_at",
      )
      .eq("household_id", household.id)
      .order("created_at", { ascending: false })
      .limit(INITIAL_PAGE_SIZE),

    supabase
      .from("message_reactions")
      .select("id, household_id, message_id, member_id, emoji, created_at")
      .eq("household_id", household.id),

    supabase
      .from("message_reads")
      .select("household_id, member_id, last_read_at")
      .eq("household_id", household.id),
  ]);

  const initialMessages: ChatMessage[] = (
    (messagesRes.data as ChatMessage[] | null) ?? []
  )
    .slice()
    .reverse();

  const initialReactions: MessageReaction[] =
    (reactionsRes.data as MessageReaction[] | null) ?? [];

  const initialReads: MessageRead[] =
    (readsRes.data as MessageRead[] | null) ?? [];

  return (
    <ChatView
      initialMessages={initialMessages}
      initialReactions={initialReactions}
      initialReads={initialReads}
    />
  );
}
