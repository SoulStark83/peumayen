"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { colorForName, initialsFor, memberTextForName } from "@/lib/colors";
import { messageTimeLabel } from "@/lib/date";
import type { ChatMessage, Member } from "@/lib/types";
import { cn } from "@/lib/utils";

export function MessageBubble({
  message,
  sender,
  mine,
  groupedWithPrev,
  pending,
}: {
  message: ChatMessage;
  sender: Member | undefined;
  mine: boolean;
  groupedWithPrev: boolean;
  pending?: boolean;
}) {
  const senderName = sender?.display_name ?? "Alguien";

  return (
    <div
      className={cn(
        "flex w-full gap-2",
        mine ? "flex-row-reverse" : "flex-row",
        groupedWithPrev ? "mt-0.5" : "mt-3",
      )}
    >
      {/* Avatar column (only for others, only first in group) */}
      <div className="w-8 shrink-0">
        {!mine && !groupedWithPrev && (
          <Avatar className="h-8 w-8">
            <AvatarFallback className={cn("text-xs font-semibold", colorForName(senderName))}>
              {initialsFor(senderName)}
            </AvatarFallback>
          </Avatar>
        )}
      </div>

      <div className={cn("flex max-w-[75%] flex-col", mine ? "items-end" : "items-start")}>
        {!mine && !groupedWithPrev && (
          <span className={cn("mb-0.5 px-2 text-xs font-semibold", memberTextForName(senderName))}>
            {senderName.split(" ")[0]}
          </span>
        )}
        <div
          className={cn(
            "relative rounded-2xl px-3 py-1.5 text-sm leading-snug shadow-sm",
            mine
              ? "bg-primary text-primary-foreground rounded-br-sm"
              : "bg-muted text-foreground rounded-bl-sm",
            !mine && groupedWithPrev && "rounded-tl-sm",
            mine && groupedWithPrev && "rounded-tr-sm",
          )}
        >
          <p className="whitespace-pre-wrap break-words">{message.body}</p>
          <div
            className={cn(
              "mt-0.5 flex items-center justify-end gap-1 text-xs",
              mine ? "text-primary-foreground/70" : "text-muted-foreground",
            )}
          >
            <span>{messageTimeLabel(message.created_at)}</span>
            {pending && <span className="italic">· enviando…</span>}
            {message.edited_at && !pending && <span className="italic">· editado</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
