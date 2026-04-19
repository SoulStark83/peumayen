import { ChatView } from "@/components/chat/chat-view";
import { requireHouseholdContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ChatMessage } from "@/lib/types";

const INITIAL_PAGE_SIZE = 100;

export const metadata = {
  title: "Chat",
};

export default async function ChatPage() {
  const { household } = await requireHouseholdContext();
  const supabase = await createClient();

  // Most recent N, then flip to chronological order for display.
  const { data } = await supabase
    .from("messages")
    .select("id, household_id, sender_id, body, reply_to_id, created_at, edited_at, deleted_at")
    .eq("household_id", household.id)
    .order("created_at", { ascending: false })
    .limit(INITIAL_PAGE_SIZE);

  const initialMessages: ChatMessage[] = ((data as ChatMessage[] | null) ?? [])
    .slice()
    .reverse();

  return <ChatView initialMessages={initialMessages} />;
}
