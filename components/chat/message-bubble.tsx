"use client";

import { Check, CheckCheck, Reply, Pencil, Trash2, SmilePlus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AudioPlayer } from "@/components/chat/audio-player";
import { colorForName, initialsFor, memberTextForName } from "@/lib/colors";
import { messageTimeLabel } from "@/lib/date";
import type { ChatMessage, Member, MessageReaction, ReadStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const EMOJI_ONLY_LIMIT = 6;
const QUICK_REACTIONS = ["❤️", "👍", "😂", "😮", "😢"];

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

function Ticks({ status }: { status: ReadStatus }) {
  if (status === "pending") return <Check className="h-3.5 w-3.5 opacity-60" />;
  if (status === "read") return <CheckCheck className="h-3.5 w-3.5 text-blue-400" />;
  return <CheckCheck className="h-3.5 w-3.5 opacity-60" />;
}

function ReplySnippet({
  replyTo,
  senderName,
  mine,
}: {
  replyTo: ChatMessage;
  senderName: string;
  mine: boolean;
}) {
  const preview = replyTo.deleted_at
    ? "Mensaje eliminado"
    : replyTo.audio_url
      ? "🎤 Nota de voz"
      : replyTo.image_url
        ? "🖼 Imagen"
        : replyTo.body.slice(0, 80);

  return (
    <div
      className={cn(
        "mb-1 rounded border-l-2 px-2 py-1 text-xs opacity-80",
        mine ? "border-primary-foreground/60 bg-primary-foreground/10" : "border-foreground/30 bg-foreground/5",
      )}
    >
      <p className="font-semibold">{senderName.split(" ")[0]}</p>
      <p className="truncate">{preview}</p>
    </div>
  );
}

function ReactionBar({
  reactions,
  myMemberId,
  onReact,
}: {
  reactions: MessageReaction[];
  myMemberId: string;
  onReact: (emoji: string) => void;
}) {
  const grouped = reactions.reduce<Record<string, { count: number; mine: boolean }>>(
    (acc, r) => {
      if (!acc[r.emoji]) acc[r.emoji] = { count: 0, mine: false };
      acc[r.emoji].count++;
      if (r.member_id === myMemberId) acc[r.emoji].mine = true;
      return acc;
    },
    {},
  );

  return (
    <div className="mt-0.5 flex flex-wrap gap-1">
      {Object.entries(grouped).map(([emoji, { count, mine }]) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onReact(emoji)}
          className={cn(
            "flex h-6 items-center gap-0.5 rounded-full border px-1.5 text-xs transition-colors",
            mine
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-border bg-background hover:bg-muted",
          )}
        >
          <span>{emoji}</span>
          <span className="font-medium">{count}</span>
        </button>
      ))}
    </div>
  );
}

export function MessageBubble({
  message,
  sender,
  mine,
  groupedWithPrev,
  pending,
  readStatus,
  reactions,
  myMemberId,
  replyToMessage,
  replyToSender,
  onReply,
  onEdit,
  onDelete,
  onReact,
}: {
  message: ChatMessage;
  sender: Member | undefined;
  mine: boolean;
  groupedWithPrev: boolean;
  pending?: boolean;
  readStatus: ReadStatus;
  reactions: MessageReaction[];
  myMemberId: string;
  replyToMessage?: ChatMessage;
  replyToSender?: Member;
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReact: (emoji: string) => void;
}) {
  const senderName = sender?.display_name ?? "Alguien";
  const isDeleted = !!message.deleted_at;
  const hasImage = !isDeleted && !!message.image_url;
  const hasAudio = !isDeleted && !!message.audio_url;
  const hasText = !isDeleted && message.body.trim().length > 0;
  const emojiOnly = !hasImage && !hasAudio && !isDeleted && isEmojiOnly(message.body);

  // Context menu trigger button
  const menuTrigger = (
    <DropdownMenuTrigger asChild>
      <button
        type="button"
        className={cn(
          "opacity-0 group-hover:opacity-100 focus:opacity-100",
          "text-muted-foreground hover:text-foreground self-center rounded-full p-1 transition-opacity",
          mine ? "order-first" : "order-last",
        )}
        aria-label="Opciones del mensaje"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="8" cy="3" r="1.5" />
          <circle cx="8" cy="8" r="1.5" />
          <circle cx="8" cy="13" r="1.5" />
        </svg>
      </button>
    </DropdownMenuTrigger>
  );

  const bubbleContent = (
    <div className={cn("flex max-w-[75%] flex-col", mine ? "items-end" : "items-start")}>
      {!mine && !groupedWithPrev && (
        <span className={cn("mb-0.5 px-2 text-xs font-semibold", memberTextForName(senderName))}>
          {senderName.split(" ")[0]}
        </span>
      )}

      {/* Reactions */}
      {reactions.length > 0 && (
        <ReactionBar reactions={reactions} myMemberId={myMemberId} onReact={onReact} />
      )}

      {emojiOnly ? (
        <div className={cn("flex flex-col gap-0.5", mine ? "items-end" : "items-start")}>
          <p className="px-1 text-5xl leading-[1.1] tracking-wide">{message.body}</p>
          <div className="text-muted-foreground flex items-center gap-1 px-1 text-[11px]">
            <span>{messageTimeLabel(message.created_at)}</span>
            {mine && !pending && <Ticks status={readStatus} />}
            {pending && <span className="italic">· enviando…</span>}
            {message.edited_at && !pending && <span className="italic">· editado</span>}
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "relative rounded-2xl text-sm leading-snug shadow-sm",
            hasImage || hasAudio ? "overflow-hidden p-0" : "px-3 py-1.5",
            isDeleted && "italic opacity-60",
            mine
              ? "bg-primary text-primary-foreground rounded-br-sm"
              : "bg-muted text-foreground rounded-bl-sm",
            !mine && groupedWithPrev && "rounded-tl-sm",
            mine && groupedWithPrev && "rounded-tr-sm",
          )}
        >
          {/* Reply preview */}
          {replyToMessage && !isDeleted && (
            <div className={cn(hasImage || hasAudio ? "px-3 pt-2" : "")}>
              <ReplySnippet
                replyTo={replyToMessage}
                senderName={replyToSender?.display_name ?? "Alguien"}
                mine={mine}
              />
            </div>
          )}

          {hasImage && (
            <a href={message.image_url!} target="_blank" rel="noopener noreferrer" className="block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={message.image_url!}
                alt="imagen"
                className="block max-h-64 w-full max-w-[280px] object-cover"
              />
            </a>
          )}

          {hasAudio && <AudioPlayer src={message.audio_url!} mine={mine} />}

          {(isDeleted || hasText) && (
            <div className={cn((hasImage || hasAudio) && "px-3 py-1.5")}>
              {isDeleted ? (
                <p className="text-muted-foreground text-sm italic">Mensaje eliminado</p>
              ) : (
                hasText && <p className="whitespace-pre-wrap break-words">{message.body}</p>
              )}
            </div>
          )}

          {/* Timestamp + ticks row */}
          <div
            className={cn(
              "flex items-center justify-end gap-1 text-xs",
              hasImage || hasAudio ? "px-3 pb-1.5" : "mt-0.5",
              mine ? "text-primary-foreground/70" : "text-muted-foreground",
              isDeleted && "px-3 pb-1.5",
            )}
          >
            <span>{messageTimeLabel(message.created_at)}</span>
            {message.edited_at && !pending && !isDeleted && <span className="italic">· editado</span>}
            {pending && <span className="italic">· enviando…</span>}
            {mine && !pending && <Ticks status={readStatus} />}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div
      className={cn(
        "group flex w-full gap-2",
        mine ? "flex-row-reverse" : "flex-row",
        groupedWithPrev ? "mt-0.5" : "mt-3",
      )}
    >
      <div className="w-8 shrink-0">
        {!mine && !groupedWithPrev && (
          <Avatar className="h-8 w-8">
            {sender?.avatar_url && (
              <AvatarImage src={sender.avatar_url} alt={senderName} />
            )}
            <AvatarFallback className={cn("text-xs font-semibold", colorForName(senderName))}>
              {initialsFor(senderName)}
            </AvatarFallback>
          </Avatar>
        )}
      </div>

      <DropdownMenu>
        <div className={cn("flex items-start gap-1", mine ? "flex-row-reverse" : "flex-row")}>
          {bubbleContent}
          {!isDeleted && !pending && menuTrigger}
        </div>

        <DropdownMenuContent align={mine ? "end" : "start"} side="top" className="w-48">
          {/* Quick reactions */}
          <div className="flex justify-around px-1 py-1">
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => onReact(emoji)}
                className="rounded p-1 text-lg hover:scale-125 transition-transform"
              >
                {emoji}
              </button>
            ))}
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" className="rounded p-1 text-muted-foreground hover:scale-125 transition-transform">
                  <SmilePlus className="h-4 w-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2">
                <div className="grid grid-cols-8 gap-1">
                  {["😀","😂","🥲","😍","🤔","😎","🥳","😅","🙄","😤","🤯","😱","🥹","😇","🤩","😜",
                    "👍","👎","❤️","🔥","👏","🙌","💯","✨","🎉","💀","🤝","💪","🫶","🫡","🫠","🤌"].map((e) => (
                    <button key={e} type="button" onClick={() => onReact(e)} className="rounded p-0.5 text-xl hover:bg-muted">
                      {e}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onReply}>
            <Reply className="mr-2 h-4 w-4" />
            Responder
          </DropdownMenuItem>
          {mine && (
            <>
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
