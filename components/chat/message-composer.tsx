"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { Send, Smile } from "lucide-react";
import { EmojiPicker } from "@/components/chat/emoji-picker";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const MAX_LENGTH = 2000;

export function MessageComposer({
  onSend,
  disabled,
}: {
  onSend: (body: string) => Promise<void> | void;
  disabled?: boolean;
}) {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function handleSend() {
    const body = value.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      await onSend(body);
      setValue("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  function autoGrow(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setValue(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
  }

  function insertEmoji(emoji: string) {
    const ta = textareaRef.current;
    if (!ta) {
      setValue((v) => v + emoji);
      return;
    }
    const start = ta.selectionStart ?? value.length;
    const end = ta.selectionEnd ?? value.length;
    const next = value.slice(0, start) + emoji + value.slice(end);
    setValue(next);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      const pos = start + emoji.length;
      el.focus();
      el.setSelectionRange(pos, pos);
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    });
  }

  return (
    <div
      className="bg-background/95 supports-[backdrop-filter]:bg-background/80 border-t backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-2xl items-end gap-2 p-2">
        <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground h-10 w-10 shrink-0 rounded-full"
              aria-label="Emojis"
            >
              <Smile className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent side="top" align="start" className="w-auto p-2">
            <EmojiPicker onSelect={insertEmoji} />
          </PopoverContent>
        </Popover>
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={autoGrow}
          onKeyDown={handleKeyDown}
          placeholder="Escribe un mensaje…"
          disabled={disabled || sending}
          rows={1}
          maxLength={MAX_LENGTH}
          className={cn(
            "min-h-0 flex-1 resize-none rounded-2xl border px-3 py-2 text-sm leading-snug",
          )}
        />
        <Button
          type="button"
          size="icon"
          onClick={handleSend}
          disabled={disabled || sending || value.trim().length === 0}
          className="h-10 w-10 shrink-0 rounded-full"
          aria-label="Enviar"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
