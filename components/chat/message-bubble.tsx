"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { colorForName, initialsFor, memberTextForName } from "@/lib/colors";
import { messageTimeLabel } from "@/lib/date";
import type { ChatMessage, Member } from "@/lib/types";
import { cn } from "@/lib/utils";

const EMOJI_ONLY_LIMIT = 6;

function isEmojiOnly(body: string): boolean {
  const t = body.trim();
  if (!t || t.length > 60) return false;
  if (typeof Intl === "undefined" || typeof Intl.Segmenter === "undefined") return false;
  try {
    const seg = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    let count = 0;
    for (const { segment } of seg.segment(t)) {
      if (/^\s+$/.test(segment)) continue;
      if (!/\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(segment)) return false;
      count++;
      if (count > EMOJI_ONLY_LIMIT) return false;
    }
    return count > 0;
  } catch {
    return false;
  }
}

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
  const emojiOnly = isEmojiOnly(message.body);

  return (
    <div
      className={cn(
        "flex w-full gap-2",
        mine ? "flex-row-reverse" : "flex-row",
        groupedWithPrev ? "mt-0.5" : "mt-3",
      )}
    >
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

        {emojiOnly ? (
          <div className={cn("flex flex-col gap-0.5", mine ? "items-end" : "items-start")}>
            <p className="px-1 text-5xl leading-[1.1] tracking-wide">{message.body}</p>
            <div className="text-muted-foreground flex items-center gap-1 px-1 text-[11px]">
              <span>{messageTimeLabel(message.created_at)}</span>
              {pending && <span className="italic">· enviando…</span>}
              {message.edited_at && !pending && <span className="italic">· editado</span>}
            </div>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
}
